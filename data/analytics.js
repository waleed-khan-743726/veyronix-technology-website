/**
 * Veyronix Analytics & First-Touch Attribution Engine
 * Features: GA4 Custom Events, Attribution Persistence, Event Listeners
 */

(function () {
  'use strict';

  // 1. First-Touch Attribution Engine
  const STORAGE_KEY = 'veyronix_attribution';

  function initAttribution() {
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (!existing) {
        const urlParams = new URLSearchParams(window.location.search);
        const attribution = {
          utmSource: urlParams.get('utm_source') || '',
          utmMedium: urlParams.get('utm_medium') || '',
          utmCampaign: urlParams.get('utm_campaign') || '',
          utmTerm: urlParams.get('utm_term') || '',
          utmContent: urlParams.get('utm_content') || '',
          referrer: document.referrer || '',
          landingPage: window.location.pathname + window.location.search,
          firstSeen: new Date().toISOString()
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
      }
    } catch (e) {
      console.warn('[Attribution] Storage inaccessible', e);
    }
  }

  window.getVeyronixAttribution = function () {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  };

  // 2. GA4 Custom Event Dispatcher
  window.trackVeyronixEvent = function (eventName, eventParams = {}) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        ...eventParams,
        send_to: window.GA_MEASUREMENT_ID || undefined
      });
    }
    // Debug log in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log(`[GA4 Event] ${eventName}:`, eventParams);
    }
  };

  // 3. Automated Business Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    initAttribution();

    // Track Outbound & Contact Link Clicks
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
      link.addEventListener('click', () => {
        window.trackVeyronixEvent('email_click', {
          destination: link.getAttribute('href'),
          source_page: window.location.pathname
        });
      });
    });

    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
      link.addEventListener('click', () => {
        window.trackVeyronixEvent('phone_click', {
          phone_number: link.getAttribute('href'),
          source_page: window.location.pathname
        });
      });
    });

    // Track Navigation CTA Clicks
    document.querySelectorAll('.nav-actions a[href*="contact.html"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.trackVeyronixEvent('nav_start_project_click', {
          button_text: btn.textContent.trim(),
          source_page: window.location.pathname
        });
      });
    });

    // Track Hero CTA Clicks
    document.querySelectorAll('.section-hero .btn-primary').forEach(btn => {
      btn.addEventListener('click', () => {
        window.trackVeyronixEvent('hero_start_project_click', {
          source_page: window.location.pathname
        });
      });
    });

    document.querySelectorAll('.section-hero .btn-secondary').forEach(btn => {
      btn.addEventListener('click', () => {
        window.trackVeyronixEvent('hero_view_work_click', {
          source_page: window.location.pathname
        });
      });
    });

    // Track Case Study Views
    if (window.location.pathname.includes('case-study-aervion')) {
      window.trackVeyronixEvent('aervion_case_study_view', {
        page_title: document.title
      });
    }
  });

})();
