/**
 * DIGIFRONT DOOR — INTERACTIVE CUSTOM QUOTE ESTIMATOR
 * Editable calculation rules, live preview, and contact handoff.
 */

(() => {
  'use strict';

  // Configurable Pricing Matrix (Updated with Sustainable, High-Converting Rates)
  const PRICING_CONFIG = {
    packages: {
      'starter': { name: 'Starter Website (1-3 Pages)', basePrice: 249, deliveryDays: '5-7 Days' },
      'business': { name: 'Business Website (4-7 Pages)', basePrice: 499, deliveryDays: '10-14 Days' },
      'growth': { name: 'Growth / Premium (8-15 Pages)', basePrice: 849, deliveryDays: '2-3 Weeks' },
      'ecommerce': { name: 'E-commerce Storefront', basePrice: 1099, deliveryDays: '3-4 Weeks' }
    },
    animationLevels: {
      'clean': { name: 'Clean & Minimal Transitions', price: 0 },
      'interactive': { name: 'Interactive Micro-interactions', price: 129 },
      'cinematic': { name: 'Full Cinematic Scroll & Canvas Visuals', price: 249 }
    },
    addons: {
      'google-profile': { name: 'Google Business Profile & Map Sync', price: 99 },
      'animation': { name: 'Custom Animations & Micro-interactions', price: 129 },
      'copywriting': { name: 'Professional Content & Copywriting', price: 149 },
      'booking': { name: 'Online Booking & Scheduling Engine', price: 119 },
      'seo': { name: 'Advanced Local SEO & Schema Architecture', price: 139 },
      'maintenance': { name: '1-Year Maintenance & Care Plan', price: 329 }
    },
    timelineMultiplier: {
      'standard': { multiplier: 1.0, label: 'Standard Delivery' },
      'rush': { multiplier: 1.25, label: 'Express Delivery (+25%)' }
    }
  };

  const form = document.getElementById('quoteCalculatorForm');
  if (!form) return;

  const packageRadios = form.querySelectorAll('input[name="quote_package"]');
  const animationRadios = form.querySelectorAll('input[name="quote_animation"]');
  const addonCheckboxes = form.querySelectorAll('input[name="quote_addons"]');
  const timelineSelect = form.querySelector('select[name="quote_timeline"]');

  const displayTotal = document.getElementById('calcTotalEstimate');
  const displayTimeline = document.getElementById('calcDeliveryTimeline');
  const displayPackage = document.getElementById('calcSelectedPackage');
  const displayAddonsList = document.getElementById('calcSelectedAddons');
  const requestQuoteBtn = document.getElementById('calcRequestQuoteBtn');

  function calculateQuote() {
    let selectedPackageKey = 'business';
    packageRadios.forEach(radio => {
      if (radio.checked) selectedPackageKey = radio.value;
    });

    const pkg = PRICING_CONFIG.packages[selectedPackageKey] || PRICING_CONFIG.packages['business'];
    let subtotal = pkg.basePrice;
    const selectedAddons = [];

    // Optional animation tier if selected via radio
    let selectedAnimation = null;
    animationRadios.forEach(radio => {
      if (radio.checked && PRICING_CONFIG.animationLevels[radio.value]) {
        selectedAnimation = PRICING_CONFIG.animationLevels[radio.value];
        if (selectedAnimation.price > 0) {
          subtotal += selectedAnimation.price;
          selectedAddons.push({ name: selectedAnimation.name, price: selectedAnimation.price });
        }
      }
    });

    addonCheckboxes.forEach(chk => {
      if (chk.checked && PRICING_CONFIG.addons[chk.value]) {
        const addon = PRICING_CONFIG.addons[chk.value];
        subtotal += addon.price;
        selectedAddons.push(addon);
      }
    });

    const timelineKey = timelineSelect ? timelineSelect.value : 'standard';
    const timelineData = PRICING_CONFIG.timelineMultiplier[timelineKey] || PRICING_CONFIG.timelineMultiplier['standard'];
    const total = Math.round(subtotal * (timelineKey === 'rush' ? 1.25 : 1.0));

    // Update UI elements
    if (displayTotal) {
      displayTotal.textContent = `$${total.toLocaleString()}`;
    }

    if (displayTimeline) {
      displayTimeline.textContent = timelineKey === 'rush' ? `${pkg.deliveryDays} (Expedited)` : pkg.deliveryDays;
    }

    if (displayPackage) {
      displayPackage.textContent = pkg.name;
    }

    if (displayAddonsList) {
      if (selectedAddons.length === 0) {
        displayAddonsList.innerHTML = '<li class="empty-item">None selected (base package only)</li>';
      } else {
        displayAddonsList.innerHTML = selectedAddons.map(item => `
          <li>
            <span>+ ${item.name}</span>
            <span class="addon-price">+$${item.price}</span>
          </li>
        `).join('');
      }
    }

    // Build URL query params for contact handoff
    if (requestQuoteBtn) {
      const params = new URLSearchParams();
      params.set('package', pkg.name);
      params.set('est', `$${total}`);
      params.set('timeline', timelineData.label);
      if (selectedAnimation) {
        params.set('animation', selectedAnimation.name);
      }
      if (selectedAddons.length > 0) {
        params.set('addons', selectedAddons.map(a => a.name).join(', '));
      }
      requestQuoteBtn.setAttribute('href', `contact.html?${params.toString()}`);
    }
  }

  // Event Listeners
  packageRadios.forEach(radio => radio.addEventListener('change', calculateQuote));
  animationRadios.forEach(radio => radio.addEventListener('change', calculateQuote));
  addonCheckboxes.forEach(chk => chk.addEventListener('change', calculateQuote));
  if (timelineSelect) {
    timelineSelect.addEventListener('change', calculateQuote);
  }

  // Initial calculation on load
  calculateQuote();

})();
