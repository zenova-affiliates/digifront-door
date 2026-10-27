/**
 * DIGIFRONT DOOR — FAQ ACCORDION & INSTANT SEARCH
 * Accessible keyboard navigation, smooth expansion, and live keyword filter.
 */

(() => {
  'use strict';

  const accordionItems = document.querySelectorAll('.accordion-item');
  const searchInput = document.getElementById('faqSearchInput');

  // Accordion Toggle
  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    const content = item.querySelector('.accordion-content');

    if (!header || !content) return;

    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Toggle current item
      if (isOpen) {
        item.classList.remove('is-open');
        header.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('is-open');
        header.setAttribute('aria-expanded', 'true');
      }
    });

    // Keyboard support
    header.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        header.click();
      }
    });
  });

  // FAQ Live Search
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();

      accordionItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          item.style.display = '';
          if (query.length > 2 && text.includes(query)) {
            // Auto open matching items when user searches
            item.classList.add('is-open');
            item.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'true');
          }
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

})();
