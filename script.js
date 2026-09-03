/**
 * Veyronix Technology — Interactive Client Engine
 * Systems Visualization, Motion Dynamics, Accessible Navigation & Form Micro-UX
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initHeaderScroll();
  initMobileDrawer();
  initDropdownA11y();
  initHeroDataPulse();
  initRealityMatrix();
  initCardSpotlight();
  initContactFormUX();
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

  // Mobile submenu accordion
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
   5. HERO BUSINESS AUTOMATION DATA PULSE (Deliberate Systems Visualization)
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
   8. CONTACT FORM MICRO-UX & EXPANDABLE TECHNICAL DETAILS
   ========================================================================== */
function initContactFormUX() {
  // Accordion toggle for optional technical details
  const toggleTechBtn = document.querySelector('[data-toggle-tech-details]');
  const techDetailsPanel = document.querySelector('[data-tech-details-panel]');
  if (toggleTechBtn && techDetailsPanel) {
    toggleTechBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = techDetailsPanel.style.display === 'none';
      techDetailsPanel.style.display = isHidden ? 'grid' : 'none';
      toggleTechBtn.textContent = isHidden ? '− Hide Technical Details' : '+ Add Technical Details (Timeline, Stack, Timezone)';
    });
  }

  document.querySelectorAll('form[data-project-inquiry-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Send Project Brief';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Validating Scope...';
      }

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '✓ Project Brief Received';
        }

        const notice = form.querySelector('.form-notice');
        if (notice) {
          notice.style.display = 'block';
          notice.style.padding = '14px 18px';
          notice.style.marginTop = '16px';
          notice.style.borderRadius = '8px';
          notice.style.background = 'rgba(213, 180, 95, 0.12)';
          notice.style.border = '1px solid rgba(213, 180, 95, 0.40)';
          notice.style.fontSize = '0.86rem';
          notice.style.color = '#E5CB82';
          notice.innerHTML = '<strong>✓ Brief Captured:</strong> Your project requirements have been validated. Our engineering team reviews inquiries within 24 business hours.';
        }

        form.reset();
      }, 700);
    });
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
