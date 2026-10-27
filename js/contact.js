/**
 * DIGIFRONT DOOR — CONTACT FORM & INQUIRY PIPELINE
 * Accessible validation, URL pre-population, anti-spam, Formspree/mailto fallback.
 */

(() => {
  'use strict';

  const form = document.getElementById('contactForm');
  const alertContainer = document.getElementById('formAlert');
  const submitBtn = document.getElementById('submitBtn');

  // URL Query Parameters prefill
  const params = new URLSearchParams(window.location.search);
  const pkgParam = params.get('package');
  const serviceParam = params.get('service');
  const projectParam = params.get('project');
  const estParam = params.get('est');
  const addonsParam = params.get('addons');
  const timelineParam = params.get('timeline');

  const serviceSelect = document.getElementById('serviceField');
  const budgetSelect = document.getElementById('budgetField');
  const messageTextarea = document.getElementById('messageField');

  // Pre-fill fields if parameters exist
  if (serviceSelect) {
    if (serviceParam) {
      // Find matching option
      for (let opt of serviceSelect.options) {
        if (opt.text.toLowerCase().includes(serviceParam.toLowerCase()) || opt.value.toLowerCase().includes(serviceParam.toLowerCase())) {
          opt.selected = true;
          break;
        }
      }
    } else if (pkgParam) {
      for (let opt of serviceSelect.options) {
        if (opt.text.toLowerCase().includes('website') || opt.value.includes('business-website')) {
          opt.selected = true;
          break;
        }
      }
    }
  }

  // Pre-populate message with custom quote context
  if (messageTextarea && (pkgParam || estParam || projectParam)) {
    let prefillNote = '';
    if (projectParam) {
      prefillNote += `Hi DigiFront Door,\n\nI am interested in a website similar to your project "${projectParam}".\n\n`;
    } else if (pkgParam) {
      prefillNote += `Hi DigiFront Door,\n\nI used your online quote estimator and would like to discuss the following package:\n`;
      prefillNote += `- Package: ${pkgParam}\n`;
      if (estParam) prefillNote += `- Estimated Budget: ${estParam}\n`;
      if (addonsParam) prefillNote += `- Add-ons: ${addonsParam}\n`;
      if (timelineParam) prefillNote += `- Preferred Timeline: ${timelineParam}\n`;
      prefillNote += `\nHere are some details about my business and requirements:\n`;
    }
    messageTextarea.value = prefillNote;
  }

  if (!form) return;

  // Validation Helpers
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const setFieldError = (input, message) => {
    input.setAttribute('aria-invalid', 'true');
    const parent = input.closest('.form-group');
    if (parent) {
      let errEl = parent.querySelector('.form-error');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'form-error';
        parent.appendChild(errEl);
      }
      errEl.textContent = message;
      errEl.style.display = 'block';
    }
  };

  const clearFieldError = (input) => {
    input.removeAttribute('aria-invalid');
    const parent = input.closest('.form-group');
    if (parent) {
      const errEl = parent.querySelector('.form-error');
      if (errEl) errEl.style.display = 'none';
    }
  };

  // Live input validation on blur
  const nameInput = document.getElementById('nameField');
  const emailInput = document.getElementById('emailField');
  const phoneInput = document.getElementById('phoneField');
  const consentCheckbox = document.getElementById('consentField');

  [nameInput, emailInput, phoneInput, messageTextarea].forEach(input => {
    if (!input) return;
    input.addEventListener('blur', () => {
      validateSingleField(input);
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        validateSingleField(input);
      }
    });
  });

  function validateSingleField(input) {
    if (input === nameInput) {
      if (!input.value.trim() || input.value.trim().length < 2) {
        setFieldError(input, 'Please enter your full name (at least 2 characters).');
        return false;
      }
    }
    if (input === emailInput) {
      if (!input.value.trim() || !isValidEmail(input.value.trim())) {
        setFieldError(input, 'Please provide a valid email address so we can reply.');
        return false;
      }
    }
    if (input === phoneInput) {
      if (!input.value.trim() || input.value.trim().length < 6) {
        setFieldError(input, 'Please provide a contact phone or WhatsApp number.');
        return false;
      }
    }
    if (input === messageTextarea) {
      if (!input.value.trim() || input.value.trim().length < 10) {
        setFieldError(input, 'Please provide a brief description of your project (at least 10 characters).');
        return false;
      }
    }
    clearFieldError(input);
    return true;
  }

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Spam honeypot check
    const honeypot = form.querySelector('input[name="_gotcha"]');
    if (honeypot && honeypot.value.trim() !== '') {
      // Silently ignore bot submission
      showFormAlert('success', 'Your inquiry has been received. We will be in touch shortly!');
      form.reset();
      return;
    }

    // Validate all required fields
    let isValid = true;
    if (!validateSingleField(nameInput)) isValid = false;
    if (!validateSingleField(emailInput)) isValid = false;
    if (!validateSingleField(phoneInput)) isValid = false;
    if (!validateSingleField(messageTextarea)) isValid = false;

    if (consentCheckbox && !consentCheckbox.checked) {
      alert('Please check the consent box to allow us to contact you regarding your inquiry.');
      consentCheckbox.focus();
      return;
    }

    if (!isValid) {
      showFormAlert('error', 'Please resolve the highlighted fields before submitting.');
      return;
    }

    // Submission UI state
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Inquiry';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Sending inquiry...</span>
      `;
    }

    const formData = new FormData(form);
    const formAction = form.getAttribute('action');

    // If form action is set to Formspree or FormSubmit, post asynchronously
    if (formAction && formAction.startsWith('https://')) {
      try {
        const response = await fetch(formAction, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          showFormAlert('success', 'Thank you! Your project inquiry has been sent to digifrontdoor7@gmail.com. We will respond within 24 business hours.');
          form.reset();
        } else {
          fallbackToMailto(formData);
        }
      } catch (err) {
        fallbackToMailto(formData);
      }
    } else {
      // Default direct fallback to formatted mailto
      fallbackToMailto(formData);
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  function fallbackToMailto(formData) {
    const name = formData.get('name') || '';
    const email = formData.get('email') || '';
    const phone = formData.get('phone') || '';
    const service = formData.get('service') || 'Website Inquiry';
    const budget = formData.get('budget') || 'Not specified';
    const message = formData.get('message') || '';

    const subject = encodeURIComponent(`Project Inquiry from ${name} - ${service}`);
    const body = encodeURIComponent(
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone/WhatsApp: ${phone}\n` +
      `Service: ${service}\n` +
      `Budget Range: ${budget}\n\n` +
      `Project Details:\n${message}\n`
    );

    const mailtoUrl = `mailto:digifrontdoor7@gmail.com?subject=${subject}&body=${body}`;
    showFormAlert('success', `Thank you! Opening your email client to send your inquiry directly to digifrontdoor7@gmail.com...`);
    window.location.href = mailtoUrl;
  }

  function showFormAlert(type, message) {
    if (!alertContainer) {
      alert(message);
      return;
    }
    alertContainer.className = `form-alert form-alert-${type}`;
    alertContainer.innerHTML = `
      <div class="alert-content">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          ${type === 'success' 
            ? '<path d="M4 10l4 4 8-8"/>' 
            : '<circle cx="10" cy="10" r="9"/><line x1="10" y1="6" x2="10" y2="10"/><line x1="10" y1="14" x2="10.01" y2="14"/>'}
        </svg>
        <span>${message}</span>
      </div>
    `;
    alertContainer.style.display = 'block';
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

})();
