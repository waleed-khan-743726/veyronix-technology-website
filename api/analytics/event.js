/**
 * First-Party Visitor Analytics & Event Ingestion Endpoint
 * POST /api/analytics/event
 * Features: IP Rate Limiting, Payload Sanitization, Privacy-Preserving Geo Extraction,
 * Google Sheets EVENTS + VISITOR_SESSIONS Synchronization
 */

import { checkRateLimit, getClientIp } from '../_lib/rateLimit.js';
import { appendEventToSheet } from '../_lib/sheets.js';

export default async function handler(req, res) {
  // Enforce POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed. Use POST.'
    });
  }

  // 1. IP Rate Limiting (Max 60 analytics events per minute per IP)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`analytics_${clientIp}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many analytics events dispatched.'
    });
  }

  try {
    const body = req.body || {};

    const eventName = String(body.eventName || body.event || 'unknown').trim().slice(0, 100);
    const visitorId = String(body.visitorId || '').trim().slice(0, 100);
    const sessionId = String(body.sessionId || '').trim().slice(0, 100);

    if (!eventName || !visitorId || !sessionId) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMETERS',
        message: 'eventName, visitorId, and sessionId are required.'
      });
    }

    // Coarse geolocation from Vercel edge headers (privacy-preserving)
    const country = req.headers['x-vercel-ip-country'] || String(body.country || '').slice(0, 50);
    const region = req.headers['x-vercel-ip-country-region'] || String(body.region || '').slice(0, 50);
    const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : String(body.city || '').slice(0, 50);

    const eventRecord = {
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      visitorId,
      sessionId,
      eventName,
      page: String(body.page || body.path || '/').trim().slice(0, 250),
      referrer: String(body.referrer || '').trim().slice(0, 300),
      element: String(body.element || body.cta || body.buttonText || '').trim().slice(0, 100),
      projectId: String(body.projectId || body.contentId || '').trim().slice(0, 100),
      metadata: typeof body.metadata === 'object' ? body.metadata : {},
      utmSource: String(body.utmSource || '').trim().slice(0, 100),
      utmMedium: String(body.utmMedium || '').trim().slice(0, 100),
      utmCampaign: String(body.utmCampaign || '').trim().slice(0, 100),
      utmTerm: String(body.utmTerm || '').trim().slice(0, 100),
      utmContent: String(body.utmContent || '').trim().slice(0, 100),
      country,
      region,
      city,
      deviceCategory: String(body.deviceCategory || 'Desktop').slice(0, 30),
      browser: String(body.browser || 'Unknown').slice(0, 50),
      os: String(body.os || 'Unknown').slice(0, 50),
      viewport: String(body.viewport || '').slice(0, 30),
      leadId: String(body.leadId || '').trim().slice(0, 50)
    };

    // Asynchronously log to Google Sheets
    await appendEventToSheet(eventRecord);

    return res.status(200).json({
      success: true,
      eventId: eventRecord.eventId
    });

  } catch (err) {
    console.error('[Analytics Ingestion Error]', err.message);
    // Don't fail client on analytics error
    return res.status(200).json({
      success: true,
      warning: 'ANALYTICS_PROCESSED_WITH_WARNING'
    });
  }
}
