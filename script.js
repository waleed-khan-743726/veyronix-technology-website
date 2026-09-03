/**
 * Veyronix Technology — Interactive Client Engine
 * Systems Visualization, Motion Dynamics, Navigation & Real Backend Form Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initHeaderScroll();
  initMobileDrawer();
  initDropdownA11y();
  initHeroDataPulse();
  initRealityMatrix();
  initCardSpotlight();
  initContactFormBackend();
  initCopyrightYear();
});

/* ==========================================================================
   1. SCROLL PROGRESS INDICATOR
   ========================================================================== */
function initScrollProgress() {
  const line = document.querySelector('.scroll-progress-line');
  if (!line) return;

  const updateProgress = () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return;
    const progress = (window.scrollY / totalHeight) * 100;
    line.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
}

/* ==========================================================================
   2. STICKY NAVBAR SCROLL DYNAMICS
   ========================================================================== */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ==========================================================================
   3. MOBILE NAVIGATION DRAWER & KEYBOARD A11Y
   ========================================================================== */
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const closeBtn = document.querySelector('.mobile-drawer-close');

  if (!toggleBtn || !drawer) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    toggleBtn.focus();
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
        btn.setAttribute('aria-expanded', !isOpen);
        const arrow = btn.querySelector('.mobile-arrow');
        if (arrow) arrow.textContent = !isOpen ? '▲' : '▼';
      }
    });
  });
}

/* ==========================================================================
   4. DESKTOP DROPDOWN ACCESSIBILITY
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
   5. HERO BUSINESS AUTOMATION DATA PULSE
   ========================================================================== */
function initHeroDataPulse() {
  const nodes = document.querySelectorAll('.arch-node');
  const connectors = document.querySelectorAll('.arch-connector');
  if (!nodes.length) return;

  let currentIndex = 0;

  const cyclePacket = () => {
    nodes.forEach((n, idx) => {
      n.classList.remove('active-packet');
      if (connectors[idx]) connectors[idx].classList.remove('active-line');
    });

    nodes[currentIndex].classList.add('active-packet');
    if (connectors[currentIndex]) connectors[currentIndex].classList.add('active-line');

    currentIndex = (currentIndex + 1) % nodes.length;
  };

  cyclePacket();
  setInterval(cyclePacket, 2800);
}

/* ==========================================================================
   6. OPERATIONAL REALITY MATRIX TABS
   ========================================================================== */
function initRealityMatrix() {
  const tabs = document.querySelectorAll('.reality-tab-btn');
  const panels = document.querySelectorAll('.reality-panel-content');
  if (!tabs.length || !panels.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');

      tab.classList.add('active');
      const activePanel = document.getElementById(targetId);
      if (activePanel) activePanel.style.display = 'block';
    });
  });
}

/* ==========================================================================
   7. CARD MOUSE POINTER SPOTLIGHT (Desktop fine pointer only)
   ========================================================================== */
function initCardSpotlight() {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.glass-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }
}

/* ==========================================================================
   8. REAL BACKEND CONTACT FORM & SUBMISSION LIFECYCLE
   ========================================================================== */
function initContactFormBackend() {
  const form = document.querySelector('form[data-project-inquiry-form]');
  if (!form) return;

  // Set anti-spam timestamp
  const timestampInput = form.querySelector('#_form_t');
  if (timestampInput) {
    timestampInput.value = Date.now().toString();
  }

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

    const notice = form.querySelector('.form-notice');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Project Brief →';

    const setNotice = (type, message) => {
      if (!notice) return;
      notice.style.display = 'block';
      notice.style.padding = '14px 18px';
      notice.style.borderRadius = '8px';
      notice.style.fontSize = '0.88rem';
      notice.style.lineHeight = '1.5';

      if (type === 'success') {
        notice.style.background = 'rgba(213, 180, 95, 0.12)';
        notice.style.border = '1px solid rgba(213, 180, 95, 0.40)';
        notice.style.color = '#E5CB82';
        notice.innerHTML = message;
      } else if (type === 'rate_limit') {
        notice.style.background = 'rgba(234, 179, 8, 0.12)';
        notice.style.border = '1px solid rgba(234, 179, 8, 0.40)';
        notice.style.color = '#FDE047';
        notice.innerHTML = `<strong>⚠️ Rate Limited:</strong> ${message}`;
      } else {
        notice.style.background = 'rgba(239, 68, 68, 0.12)';
        notice.style.border = '1px solid rgba(239, 68, 68, 0.40)';
        notice.style.color = '#FCA5A5';
        notice.innerHTML = `<strong>✕ Error:</strong> ${message}`;
      }
    };

    // Client-side quick check
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.firstName || !data.email || !data.company || !data.description) {
      setNotice('error', 'Please fill in all required fields (Name, Work Email, Company, and Project Brief).');
      return;
    }

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
      submitBtn.innerHTML = 'Validating & Transmitting Brief...';
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
          <span style="font-family:var(--font-mono); font-size:0.80rem; margin-top:8px; display:inline-block; color:#FFFFFF;">
            Reference ID: <strong>${result.leadId}</strong>
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
        if (submitBtn) submitBtn.innerHTML = '✓ Brief Sent';

      } else if (response.status === 429) {
        setNotice('rate_limit', result.message || 'Too many submissions received. Please wait a few minutes.');
        if (typeof window.trackVeyronixEvent === 'function') {
          window.trackVeyronixEvent('contact_form_error', { error_code: 'RATE_LIMITED' });
        }
        if (submitBtn) submitBtn.innerHTML = originalBtnText;

      } else {
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
   9. COPYRIGHT YEAR
   ========================================================================== */
function initCopyrightYear() {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}
