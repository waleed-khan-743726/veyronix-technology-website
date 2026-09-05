/**
 * Veyronix First-Party Visitor Analytics & Attribution Engine
 * Features: Anonymous Visitor ID, 30-Minute Session Rollover, First-Touch Attribution,
 * Real-Time Event Dispatcher to /api/analytics/event & Secondary GA4 Bridge
 */

(function () {
  'use strict';

  const STORAGE_VISITOR_KEY = 'veyronix_visitor_id';
  const STORAGE_SESSION_KEY = 'veyronix_session_data';
  const STORAGE_FIRST_ATTRIB_KEY = 'veyronix_first_attribution';
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity

  // 1. Generate / Retrieve Anonymous Visitor ID
  function getOrCreateVisitorId() {
    try {
      let vid = localStorage.getItem(STORAGE_VISITOR_KEY);
      if (!vid) {
        const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        vid = `vyx_v_${rand}`;
        localStorage.setItem(STORAGE_VISITOR_KEY, vid);
      }
      return vid;
    } catch (e) {
      return `vyx_v_temp_${Math.random().toString(36).substring(2, 10)}`;
    }
  }

  // 2. Generate / Manage 30-Minute Inactivity Session ID
  function getOrCreateSessionId() {
    try {
      const now = Date.now();
      const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
      let sessionData = raw ? JSON.parse(raw) : null;

      if (!sessionData || !sessionData.sessionId || (now - sessionData.lastActivityAt > SESSION_TIMEOUT_MS)) {
        const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        sessionData = {
          sessionId: `vyx_s_${rand}`,
          sessionStartedAt: now,
          lastActivityAt: now,
          pagesViewed: 1
        };
      } else {
        sessionData.lastActivityAt = now;
        sessionData.pagesViewed = (sessionData.pagesViewed || 1) + 1;
      }

      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      return sessionData.sessionId;
    } catch (e) {
      return `vyx_s_temp_${Math.random().toString(36).substring(2, 10)}`;
    }
  }

  // 3. First-Touch Attribution Persistence
  function initFirstTouchAttribution() {
    try {
      const existing = localStorage.getItem(STORAGE_FIRST_ATTRIB_KEY);
      if (!existing) {
        const urlParams = new URLSearchParams(window.location.search);
        const attribution = {
          first_utm_source: urlParams.get('utm_source') || '',
          first_utm_medium: urlParams.get('utm_medium') || '',
          first_utm_campaign: urlParams.get('utm_campaign') || '',
          first_utm_term: urlParams.get('utm_term') || '',
          first_utm_content: urlParams.get('utm_content') || '',
          first_referrer: document.referrer || 'direct',
          first_landing_page: window.location.pathname + window.location.search,
          first_seen_at: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_FIRST_ATTRIB_KEY, JSON.stringify(attribution));
      }
    } catch (e) {
      console.warn('[Attribution Engine] Storage error', e);
    }
  }

  function getFirstTouchAttribution() {
    try {
      const data = localStorage.getItem(STORAGE_FIRST_ATTRIB_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  // 4. Device & Browser Detection (Privacy-Preserving)
  function getDeviceInfo() {
    const ua = navigator.userAgent || '';
    let deviceCategory = 'Desktop';
    if (/Mobile|Android|iP(hone|od)/i.test(ua)) {
      deviceCategory = 'Mobile';
    } else if (/iPad|Tablet/i.test(ua)) {
      deviceCategory = 'Tablet';
    }

    let browser = 'Unknown';
    if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';

    let os = 'Unknown';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iOS|iPhone|iPad/i.test(ua)) os = 'iOS';

    const viewport = `${window.innerWidth}x${window.innerHeight}`;

    return { deviceCategory, browser, os, viewport };
  }

  // 5. Global Context Accessor
  window.getVeyronixAnalyticsContext = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const firstAttrib = getFirstTouchAttribution();
    const device = getDeviceInfo();

    return {
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId(),
      utmSource: urlParams.get('utm_source') || firstAttrib.first_utm_source || '',
      utmMedium: urlParams.get('utm_medium') || firstAttrib.first_utm_medium || '',
      utmCampaign: urlParams.get('utm_campaign') || firstAttrib.first_utm_campaign || '',
      utmTerm: urlParams.get('utm_term') || firstAttrib.first_utm_term || '',
      utmContent: urlParams.get('utm_content') || firstAttrib.first_utm_content || '',
      referrer: document.referrer || firstAttrib.first_referrer || 'direct',
      landingPage: firstAttrib.first_landing_page || window.location.pathname,
      page: window.location.pathname,
      ...firstAttrib,
      ...device
    };
  };

  // Backwards compatible accessor
  window.getVeyronixAttribution = window.getVeyronixAnalyticsContext;

  // 6. First-Party & GA4 Custom Event Dispatcher
  window.trackVeyronixEvent = function (eventName, eventParams = {}) {
    const ctx = window.getVeyronixAnalyticsContext();

    const payload = {
      eventName,
      visitorId: ctx.visitorId,
      sessionId: ctx.sessionId,
      page: ctx.page,
      referrer: ctx.referrer,
      utmSource: ctx.utmSource,
      utmMedium: ctx.utmMedium,
      utmCampaign: ctx.utmCampaign,
      utmTerm: ctx.utmTerm,
      utmContent: ctx.utmContent,
      deviceCategory: ctx.deviceCategory,
      browser: ctx.browser,
      os: ctx.os,
      viewport: ctx.viewport,
      element: eventParams.element || eventParams.button_text || eventParams.cta || '',
      projectId: eventParams.project_id || eventParams.content_id || '',
      leadId: eventParams.lead_id || '',
      metadata: eventParams
    };

    // Dispatch to First-Party Backend Endpoint
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => {
        // Silently catch network errors in background analytics
      });
    } catch (e) {}

    // Dispatch to GA4 if configured
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        ...eventParams,
        visitor_id: ctx.visitorId,
        session_id: ctx.sessionId,
        send_to: window.GA_MEASUREMENT_ID || undefined
      });
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log(`[Veyronix Analytics] ${eventName}:`, payload);
    }
  };

  // 7. Initialize and Attach Business Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    initFirstTouchAttribution();
    getOrCreateVisitorId();
    getOrCreateSessionId();

    // Track Page View
    window.trackVeyronixEvent('page_view', {
      page_title: document.title,
      page_path: window.location.pathname
    });

    // Track Email Clicks
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
      link.addEventListener('click', () => {
        window.trackVeyronixEvent('email_click', {
          destination: link.getAttribute('href'),
          element: 'mailto_link'
        });
      });
    });

    // Track Phone Clicks
    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
      link.addEventListener('click', () => {
        window.trackVeyronixEvent('phone_click', {
          phone_number: link.getAttribute('href'),
          element: 'tel_link'
        });
      });
    });

    // Track Navigation CTA Clicks
    document.querySelectorAll('.nav-actions a[href*="contact.html"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.trackVeyronixEvent('nav_start_project_click', {
          element: 'nav_contact_button'
        });
      });
    });

    // Track Hero CTA Clicks
    document.querySelectorAll('.section-hero .btn-primary, .hero-actions .btn-primary').forEach(btn => {
      btn.addEventListener('click', () => {
        window.trackVeyronixEvent('hero_start_project_click', {
          element: 'hero_primary_button'
        });
      });
    });

    document.querySelectorAll('.section-hero .btn-secondary, .hero-actions .btn-secondary').forEach(btn => {
      btn.addEventListener('click', () => {
        window.trackVeyronixEvent('hero_view_work_click', {
          element: 'hero_secondary_button'
        });
      });
    });

    // Track Case Study Views
    if (window.location.pathname.includes('case-study-aervion')) {
      window.trackVeyronixEvent('case_study_view', {
        case_study_id: 'aervion_ai',
        page_title: document.title
      });
    }

    // Track Section / Solution Views
    if (window.location.pathname.includes('solutions')) {
      window.trackVeyronixEvent('solution_view', { page: '/solutions.html' });
    }
    if (window.location.pathname.includes('services')) {
      window.trackVeyronixEvent('service_view', { page: '/services.html' });
    }
    if (window.location.pathname.includes('projects')) {
      window.trackVeyronixEvent('project_view', { page: '/projects.html' });
    }
    if (window.location.pathname.includes('contact')) {
      window.trackVeyronixEvent('contact_page_view', { page: '/contact.html' });
    }
  });

})();
