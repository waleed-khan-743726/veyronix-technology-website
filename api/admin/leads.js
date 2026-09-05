/**
 * Admin Leads Management Endpoint
 * GET /api/admin/leads — Retrieve and filter live lead records from Google Sheets
 * PATCH /api/admin/leads — Update lead status, priority, or admin notes in Google Sheets
 */

import { verifyAdminAuth } from '../_lib/auth.js';
import { getLeadsFromSheet, updateLeadInSheet } from '../_lib/sheets.js';

export default async function handler(req, res) {
  // Enforce no-store caching for real-time CRM updates
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  let adminUser;
  try {
    adminUser = await verifyAdminAuth(req);
  } catch (authErr) {
    return res.status(authErr.status || 401).json({
      success: false,
      code: authErr.message || 'UNAUTHORIZED',
      message: 'Access denied. Please log in with an authorized Veyronix administrator account.'
    });
  }

  // --- GET: List and filter live leads ---
  if (req.method === 'GET') {
    try {
      const leads = await getLeadsFromSheet();

      const { status, priority, search, projectType } = req.query || {};

      let filtered = leads;

      if (status && status !== 'ALL') {
        filtered = filtered.filter(l => (l['Status'] || 'NEW').toUpperCase() === status.toUpperCase());
      }

      if (priority && priority !== 'ALL') {
        filtered = filtered.filter(l => (l['Priority'] || 'NORMAL').toUpperCase() === priority.toUpperCase());
      }

      if (projectType && projectType !== 'ALL') {
        filtered = filtered.filter(l => (l['Project Type'] || '').toLowerCase().includes(projectType.toLowerCase()));
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(l =>
          (l['First Name'] || '').toLowerCase().includes(q) ||
          (l['Last Name'] || '').toLowerCase().includes(q) ||
          (l['Email'] || '').toLowerCase().includes(q) ||
          (l['Company'] || '').toLowerCase().includes(q) ||
          (l['Lead ID'] || '').toLowerCase().includes(q) ||
          (l['Project Brief'] || l['Project Description'] || '').toLowerCase().includes(q) ||
          (l['Country'] || '').toLowerCase().includes(q)
        );
      }

      return res.status(200).json({
        success: true,
        count: filtered.length,
        total: leads.length,
        leads: filtered
      });

    } catch (err) {
      console.error('[Admin Leads Fetch Error]', err.message);
      return res.status(500).json({
        success: false,
        code: 'SHEETS_FETCH_FAILED',
        message: `Failed to retrieve leads from Google Sheets: ${err.message}`
      });
    }
  }

  // --- PATCH: Update lead status, priority, notes ---
  if (req.method === 'PATCH') {
    try {
      const { leadId, status, priority, adminNotes } = req.body || {};

      if (!leadId) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_LEAD_ID',
          message: 'leadId is required to update a lead.'
        });
      }

      const updatedRecord = await updateLeadInSheet(
        leadId,
        { status, priority, adminNotes },
        adminUser.email
      );

      return res.status(200).json({
        success: true,
        message: `Lead ${leadId} updated successfully.`,
        data: updatedRecord
      });

    } catch (err) {
      console.error('[Admin Lead Update Error]', err.message);
      return res.status(500).json({
        success: false,
        code: 'UPDATE_FAILED',
        message: err.message || 'Failed to update lead in Google Sheets.'
      });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
}
