/**
 * Veyronix Technology — Core Interactive Client Engine
 * Features: Light/Dark Theme Controller (Default: Light), Mobile Drawer, Mega Nav, Real Backend Form Integration & GA4 Telemetry
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initMobileDrawer();
  initDropdownA11y();
  initContactFormBackend();
  initCopyrightYear();
});

/* ==========================================================================
   1. THEME ENGINE (Default: Light Champagne Sunlight, Optional: Dark Obsidian)
   ========================================================================== */
function initThemeEngine() {
  const savedTheme = localStorage.getItem('veyronix-theme') || 'light';
  applyTheme(savedTheme, false);

  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
  });
}

function applyTheme(themeName, showNotification = false) {
  const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
  
  if (themeName === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggleBtns.forEach(btn => {
      btn.innerHTML = '☀️';
      btn.setAttribute('aria-label', 'Switch to Light Theme');
      btn.setAttribute('title', 'Switch to Light Theme');
    });
  } else {
    document.documentElement.removeAttribute('data-theme');
    toggleBtns.forEach(btn => {
      btn.innerHTML = '🌙';
      btn.setAttribute('aria-label', 'Switch to Dark Theme');
      btn.setAttribute('title', 'Switch to Dark Theme');
    });
  }
  
  localStorage.setItem('veyronix-theme', themeName);

  if (showNotification && typeof showToast === 'function') {
    showToast(`Switched to ${themeName === 'dark' ? 'Dark Mode' : 'Light Mode'}`);
  }
}

function showToast(message) {
  let toast = document.querySelector('.theme-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'theme-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2200);
}

/* ==========================================================================
   2. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const closeBtn = document.querySelector('.mobile-drawer-close');

  if (!toggleBtn || !drawer) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  document.querySelectorAll('.mobile-dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const submenu = btn.nextElementSibling;
      if (submenu && submenu.classList.contains('mobile-submenu')) {
        const isOpen = submenu.classList.contains('open');
        submenu.classList.toggle('open');
        const arrow = btn.querySelector('.mobile-arrow');
        if (arrow) arrow.textContent = !isOpen ? '▲' : '▼';
      }
    });
  });
}

/* ==========================================================================
   3. DESKTOP DROPDOWN ACCESSIBILITY
   ========================================================================== */
function initDropdownA11y() {
  document.querySelectorAll('.nav-item').forEach(item => {
    const link = item.querySelector('.nav-link');
    const menu = item.querySelector('.dropdown-menu');
    if (!link || !menu) return;

    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');

    item.addEventListener('mouseenter', () => link.setAttribute('aria-expanded', 'true'));
    item.addEventListener('mouseleave', () => link.setAttribute('aria-expanded', 'false'));
    item.addEventListener('focusin', () => link.setAttribute('aria-expanded', 'true'));
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) {
        link.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

/* ==========================================================================
   4. REAL BACKEND CONTACT FORM & SUBMISSION LIFECYCLE
   ========================================================================== */
function initContactFormBackend() {
  const form = document.querySelector('form[data-project-inquiry-form]');
  if (!form) return;

  // Set anti-spam timestamp
  const timestampInput = form.querySelector('#_form_t');
  if (timestampInput) {
    timestampInput.value = Date.now().toString();
  }

  // Live character counter & helper for description
  const descTextarea = form.querySelector('#description');
  const charCounter = form.querySelector('#briefCharCounter');
  if (descTextarea && charCounter) {
    const updateCharCount = () => {
      const len = (descTextarea.value || '').trim().length;
      charCounter.textContent = `${len} / 10 minimum`;
      if (len >= 10) {
        charCounter.classList.add('valid');
        clearFieldError('description');
      } else {
        charCounter.classList.remove('valid');
      }
    };
    descTextarea.addEventListener('input', updateCharCount);
    updateCharCount();
  }

  // Clear field errors on input/change
  function clearFieldError(fieldName) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) field.classList.remove('has-error');
    const errMsg = form.querySelector(`#err-${fieldName}`);
    if (errMsg) errMsg.classList.remove('visible');
  }

  function setFieldError(fieldName, message) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) field.classList.add('has-error');
    const errMsg = form.querySelector(`#err-${fieldName}`);
    if (errMsg) {
      if (message) errMsg.textContent = message;
      errMsg.classList.add('visible');
    }
  }

  form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('input', () => {
      if (input.name) clearFieldError(input.name);
    });
    input.addEventListener('change', () => {
      if (input.name) clearFieldError(input.name);
    });
  });

  // Accordion toggle for optional technical details
  const toggleTechBtn = document.querySelector('[data-toggle-tech-details]');
  const techDetailsPanel = document.querySelector('[data-tech-details-panel]');
  if (toggleTechBtn && techDetailsPanel) {
    toggleTechBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = techDetailsPanel.style.display === 'none';
      techDetailsPanel.style.display = isHidden ? 'grid' : 'none';
      toggleTechBtn.textContent = isHidden
        ? '− Hide Technical Details'
        : '+ Add Technical Details (Timeline, Current Stack, Phone, Timezone)';
    });
  }

  // Form field focus starts tracking
  let formStarted = false;
  form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('focus', () => {
      if (!formStarted) {
        formStarted = true;
        if (typeof window.trackVeyronixEvent === 'function') {
          window.trackVeyronixEvent('contact_form_start', {
            source_page: window.location.pathname
          });
        }
      }
    }, { once: true });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let notice = form.querySelector('.form-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'form-notice';
      form.appendChild(notice);
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Project Brief →';

    const setNotice = (type, message) => {
      notice.style.display = 'block';
      notice.style.padding = '14px 18px';
      notice.style.borderRadius = '8px';
      notice.style.fontSize = '0.88rem';
      notice.style.lineHeight = '1.5';

      if (type === 'success') {
        notice.style.background = 'rgba(185, 133, 63, 0.12)';
        notice.style.border = '1px solid rgba(185, 133, 63, 0.35)';
        notice.style.color = 'var(--ink-heading)';
        notice.innerHTML = message;
      } else if (type === 'rate_limit') {
        notice.style.background = 'rgba(234, 179, 8, 0.15)';
        notice.style.border = '1px solid rgba(234, 179, 8, 0.40)';
        notice.style.color = '#B45309';
        notice.innerHTML = `<strong>⚠️ Rate Limited:</strong> ${message}`;
      } else {
        notice.style.background = 'rgba(239, 68, 68, 0.12)';
        notice.style.border = '1px solid rgba(239, 68, 68, 0.35)';
        notice.style.color = '#B91C1C';
        notice.innerHTML = `<strong>✕ Validation Notice:</strong> ${message}`;
      }
    };

    // Client-side validation check
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    let hasClientError = false;
    let firstErrorField = null;

    // Validate First Name
    const firstNameVal = (data.firstName || '').trim();
    if (!firstNameVal || firstNameVal.length < 2) {
      setFieldError('firstName', 'Please enter a valid first name (at least 2 characters).');
      hasClientError = true;
      if (!firstErrorField) firstErrorField = form.querySelector('[name="firstName"]');
    } else {
      clearFieldError('firstName');
    }

    // Validate Last Name
    const lastNameVal = (data.lastName || '').trim();
    if (!lastNameVal || lastNameVal.length < 2) {
      setFieldError('lastName', 'Please enter your last name.');
      hasClientError = true;
      if (!firstErrorField) firstErrorField = form.querySelector('[name="lastName"]');
    } else {
      clearFieldError('lastName');
    }

    // Validate Email
    const emailVal = (data.email || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailPattern.test(emailVal)) {
      setFieldError('email', 'Please enter a valid email address.');
      hasClientError = true;
      if (!firstErrorField) firstErrorField = form.querySelector('[name="email"]');
    } else {
      clearFieldError('email');
    }

    // Validate Company
    const companyVal = (data.company || '').trim();
    if (!companyVal || companyVal.length < 2) {
      setFieldError('company', 'Please provide your company or organization name.');
      hasClientError = true;
      if (!firstErrorField) firstErrorField = form.querySelector('[name="company"]');
    } else {
      clearFieldError('company');
    }

    // Validate Country
    const countryVal = (data.country || '').trim();
    if (!countryVal) {
      setFieldError('country', 'Please select your country or region.');
      hasClientError = true;
      if (!firstErrorField) firstErrorField = form.querySelector('[name="country"]');
    } else {
      clearFieldError('country');
    }

    // Validate Project Type
    const projectTypeVal = (data.projectType || '').trim();
    if (!projectTypeVal) {
      setFieldError('projectType', 'Please select a primary project type.');
      hasClientError = true;
      if (!firstErrorField) firstErrorField = form.querySelector('[name="projectType"]');
    } else {
      clearFieldError('projectType');
    }

    // Validate Project Description (minimum 10 characters)
    const descVal = (data.description || '').trim();
    if (!descVal || descVal.length < 10) {
      setFieldError('description', 'Please provide at least 10 characters describing your project requirements.');
      hasClientError = true;
      if (!firstErrorField) firstErrorField = form.querySelector('[name="description"]');
    } else {
      clearFieldError('description');
    }

    if (hasClientError) {
      setNotice('error', 'Please complete the highlighted required fields above.');
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Hide previous notices if valid
    notice.style.display = 'none';

    // Merge marketing attribution data
    const attribution = typeof window.getVeyronixAttribution === 'function'
      ? window.getVeyronixAttribution()
      : {};

    const payload = {
      ...data,
      pageSubmittedFrom: window.location.pathname,
      ...attribution
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Transmitting Project Brief...';
    }

    if (typeof window.trackVeyronixEvent === 'function') {
      window.trackVeyronixEvent('contact_form_submit', {
        project_type: data.projectType,
        budget: data.budget
      });
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNotice('success', `
          <strong>✓ Project Brief Received Successfully:</strong><br>
          Your requirements have been securely logged in our system. Our engineering team reviews submissions within 24 business hours.<br>
          <span style="font-family:monospace; font-size:0.85rem; margin-top:8px; display:inline-block; font-weight:700;">
            Reference ID: ${result.leadId}
          </span>
        `);

        if (typeof window.trackVeyronixEvent === 'function') {
          window.trackVeyronixEvent('contact_form_success', {
            lead_id: result.leadId,
            project_type: data.projectType,
            budget: data.budget
          });
        }

        form.reset();
        if (timestampInput) timestampInput.value = Date.now().toString();
        if (charCounter) {
          charCounter.textContent = '0 / 10 minimum';
          charCounter.classList.remove('valid');
        }
        if (submitBtn) submitBtn.innerHTML = '✓ Brief Received';

      } else if (response.status === 429) {
        setNotice('rate_limit', result.message || 'Too many submissions received. Please wait a few minutes.');
        if (typeof window.trackVeyronixEvent === 'function') {
          window.trackVeyronixEvent('contact_form_error', { error_code: 'RATE_LIMITED' });
        }
        if (submitBtn) submitBtn.innerHTML = originalBtnText;

      } else {
        if (result.field) {
          setFieldError(result.field, result.message);
        }
        setNotice('error', result.message || 'We could not submit your brief right now. Please try again or contact veyronixtechnologies@gmail.com directly.');
        if (typeof window.trackVeyronixEvent === 'function') {
          window.trackVeyronixEvent('contact_form_error', { error_code: result.code || 'VALIDATION_ERROR' });
        }
        if (submitBtn) submitBtn.innerHTML = originalBtnText;
      }

    } catch (networkErr) {
      console.error('[Contact Form Network Error]', networkErr);
      setNotice('error', 'Network error connecting to the Veyronix API. Please check your internet connection or email veyronixtechnologies@gmail.com directly.');
      if (submitBtn) submitBtn.innerHTML = originalBtnText;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

/* ==========================================================================
   5. COPYRIGHT YEAR
   ========================================================================== */
function initCopyrightYear() {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}
