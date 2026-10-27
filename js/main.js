/**
 * DIGIFRONT DOOR — CORE JAVASCRIPT
 * Accessible mobile navigation, back-to-top, toast notifications, copy-to-clipboard
 */

(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // Mobile Navigation Drawer
  // -------------------------------------------------------------------------
  const navToggle = document.getElementById('navToggle');
  const navOverlay = document.getElementById('mobileNavOverlay');
  const navDrawer = document.getElementById('mobileNavDrawer');
  const navClose = document.getElementById('navClose');

  function openMobileNav() {
    if (!navDrawer || !navOverlay) return;
    navDrawer.classList.add('is-active');
    navOverlay.classList.add('is-active');
    navToggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    navClose?.focus();
  }

  function closeMobileNav() {
    if (!navDrawer || !navOverlay) return;
    navDrawer.classList.remove('is-active');
    navOverlay.classList.remove('is-active');
    navToggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    navToggle?.focus();
  }

  if (navToggle) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navDrawer?.classList.contains('is-active');
      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (navClose) {
    navClose.addEventListener('click', closeMobileNav);
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', closeMobileNav);
  }

  // Keyboard navigation & Esc key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navDrawer?.classList.contains('is-active')) {
      closeMobileNav();
    }
  });

  // Close mobile nav when clicking any link inside it
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileNav();
    });
  });

  // -------------------------------------------------------------------------
  // Active Navigation Highlight
  // -------------------------------------------------------------------------
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = href.split('/').pop().split('#')[0];
    if (
      linkPath === currentPath ||
      (currentPath === '' && (linkPath === 'index.html' || linkPath === './')) ||
      (currentPath === 'index.html' && (linkPath === 'index.html' || linkPath === '#top' || linkPath === './'))
    ) {
      if (!link.classList.contains('btn-dark')) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('active');
      }
    }
  });

  // -------------------------------------------------------------------------
  // Back to Top Button
  // -------------------------------------------------------------------------
  const backToTopBtn = document.getElementById('backToTop');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // -------------------------------------------------------------------------
  // Toast Notification System
  // -------------------------------------------------------------------------
  let toastTimeout;
  window.showToast = function(message, duration = 3200) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 10l4 4 8-8"/>
      </svg>
      <span>${message}</span>
    `;

    toast.classList.add('is-active');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('is-active');
    }, duration);
  };

  // -------------------------------------------------------------------------
  // Copy to Clipboard buttons
  // -------------------------------------------------------------------------
  const copyBtns = document.querySelectorAll('[data-copy]');
  copyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          window.showToast(`Copied ${textToCopy} to clipboard!`);
        }).catch(() => {
          fallbackCopyText(textToCopy);
        });
      } else {
        fallbackCopyText(textToCopy);
      }
    });
  });

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      window.showToast(`Copied ${text} to clipboard!`);
    } catch (err) {
      window.showToast(`Failed to copy: ${text}`);
    }
    document.body.removeChild(textArea);
  }

  // -------------------------------------------------------------------------
  // Auto Year
  // -------------------------------------------------------------------------
  const yearEls = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();
  yearEls.forEach(el => {
    el.textContent = currentYear;
  });

})();
