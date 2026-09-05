/**
 * Admin Visitor Journey Endpoint
 * GET /api/admin/journey?leadId=VYX-... or ?sessionId=vyx_s_...
 * Returns chronological touchpoints for a specific customer or session
 */

import { verifyAdminAuth } from '../_lib/auth.js';
import { getLeadsFromSheet, getEventsFromSheet, getSessionsFromSheet } from '../_lib/sheets.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    await verifyAdminAuth(req);
  } catch (authErr) {
    return res.status(authErr.status || 401).json({
      success: false,
      code: authErr.message || 'UNAUTHORIZED',
      message: 'Access denied.'
    });
  }

  const { leadId, sessionId, visitorId } = req.query || {};

  if (!leadId && !sessionId && !visitorId) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_PARAM',
      message: 'leadId, sessionId, or visitorId is required.'
    });
  }

  try {
    let targetSessionId = sessionId;
    let targetVisitorId = visitorId;
    let matchedLead = null;

    if (leadId) {
      const leads = await getLeadsFromSheet();
      matchedLead = leads.find(l => l['Lead ID'] === leadId);
      if (matchedLead) {
        targetSessionId = targetSessionId || matchedLead['Session ID'];
        targetVisitorId = targetVisitorId || matchedLead['Visitor ID'];
      }
    }

    const events = await getEventsFromSheet();
    let journeyEvents = events.filter(e => {
      if (leadId && e['Lead ID'] === leadId) return true;
      if (targetSessionId && e['Session ID'] === targetSessionId) return true;
      if (targetVisitorId && e['Visitor ID'] === targetVisitorId) return true;
      return false;
    });

    // Sort chronologically ascending for journey view
    journeyEvents.sort((a, b) => new Date(a['Timestamp']) - new Date(b['Timestamp']));

    return res.status(200).json({
      success: true,
      leadId: leadId || null,
      sessionId: targetSessionId || null,
      visitorId: targetVisitorId || null,
      journey: journeyEvents
    });

  } catch (err) {
    console.error('[Admin Journey Error]', err);
    return res.status(500).json({
      success: false,
      code: 'JOURNEY_FETCH_FAILED',
      message: 'Failed to retrieve journey data.'
    });
  }
}
