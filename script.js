/**
 * Veyronix Technology - Core Interactive Client Engine
 * Theme Controller, Navigation Drawer, Form Validation & Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initMobileDrawer();
  initContactForms();
  initCopyrightYear();
});

/* ==========================================================================
   1. THEME ENGINE (Default: Light Champagne Sunlight)
   ========================================================================== */
function initThemeEngine() {
  const savedTheme = localStorage.getItem('veyronix-theme') || 'light';
  applyTheme(savedTheme);

  const toggleBtn = document.querySelector('.theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      showToast(`Switched to ${nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`);
    });
  }
}

function applyTheme(themeName) {
  const toggleBtn = document.querySelector('.theme-toggle-btn');
  if (themeName === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (toggleBtn) toggleBtn.innerHTML = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (toggleBtn) toggleBtn.innerHTML = '🌙';
  }
  localStorage.setItem('veyronix-theme', themeName);
}

/* ==========================================================================
   2. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const closeBtn = document.querySelector('.mobile-drawer-close');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const closeDrawer = () => {
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  document.querySelectorAll('.mobile-dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const submenu = btn.nextElementSibling;
      if (submenu && submenu.classList.contains('mobile-submenu')) {
        submenu.classList.toggle('open');
        const arrow = btn.querySelector('.mobile-arrow');
        if (arrow) arrow.textContent = submenu.classList.contains('open') ? '▲' : '▼';
      }
    });
  });
}

/* ==========================================================================
   3. CONTACT FORM VALIDATION & TRANSPARENT SUBMISSION
   ========================================================================== */
function initContactForms() {
  document.querySelectorAll('form[data-project-inquiry-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Send Project Brief';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing...';
      }

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '✓ Brief Received';
        }

        const notice = form.querySelector('.form-notice');
        if (notice) {
          notice.style.display = 'block';
          notice.textContent = '✓ Project brief captured! Frontend demo mode: connect CRM/email endpoint before production deployment.';
        }

        showToast('✓ Project inquiry captured successfully!');
        form.reset();

        setTimeout(() => {
          if (submitBtn) submitBtn.innerHTML = originalText;
        }, 4000);
      }, 800);
    });
  });
}

/* ==========================================================================
   4. TOAST NOTIFICATION UTILITY
   ========================================================================== */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>●</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function initCopyrightYear() {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}
