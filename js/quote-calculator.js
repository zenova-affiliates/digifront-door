/**
 * DIGIFRONT DOOR — INTERACTIVE CUSTOM QUOTE ESTIMATOR
 * Editable calculation rules, live preview, and contact handoff.
 */

(() => {
  'use strict';

  // Configurable Pricing Matrix
  const PRICING_CONFIG = {
    packages: {
      'starter': { name: 'Starter Website (1-3 Pages)', basePrice: 299, deliveryDays: '5-7 Days' },
      'business': { name: 'Business Website (4-7 Pages)', basePrice: 599, deliveryDays: '10-14 Days' },
      'growth': { name: 'Growth / Premium (8-15 Pages)', basePrice: 999, deliveryDays: '2-3 Weeks' },
      'ecommerce': { name: 'E-commerce Storefront', basePrice: 1299, deliveryDays: '3-4 Weeks' }
    },
    addons: {
      'google-profile': { name: 'Google Business Profile & Map Sync', price: 120 },
      'animation': { name: 'Cinematic / Custom Micro-interactions', price: 150 },
      'copywriting': { name: 'Professional Content & Copywriting', price: 180 },
      'booking': { name: 'Online Booking & Scheduling Engine', price: 140 },
      'seo': { name: 'Advanced Local SEO & Schema Architecture', price: 160 },
      'maintenance': { name: '1-Year Maintenance & Care Plan', price: 390 }
    },
    timelineMultiplier: {
      'standard': { multiplier: 1.0, label: 'Standard Delivery' },
      'rush': { multiplier: 1.25, label: 'Express Delivery (+25%)' }
    }
  };

  const form = document.getElementById('quoteCalculatorForm');
  if (!form) return;

  const packageRadios = form.querySelectorAll('input[name="quote_package"]');
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
      if (selectedAddons.length > 0) {
        params.set('addons', selectedAddons.map(a => a.name).join(', '));
      }
      requestQuoteBtn.setAttribute('href', `contact.html?${params.toString()}`);
    }
  }

  // Event Listeners
  packageRadios.forEach(radio => radio.addEventListener('change', calculateQuote));
  addonCheckboxes.forEach(chk => chk.addEventListener('change', calculateQuote));
  if (timelineSelect) {
    timelineSelect.addEventListener('change', calculateQuote);
  }

  // Initial calculation on load
  calculateQuote();

})();
