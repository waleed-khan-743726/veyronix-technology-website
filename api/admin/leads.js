/**
 * Admin Leads Management Endpoint
 * GET /api/admin/leads — List and filter leads
 * PATCH /api/admin/leads — Update lead status, priority, or notes
 */

import { verifyAdminAuth } from '../_lib/auth.js';
import { getLeadsFromSheet, updateLeadInSheet } from '../_lib/sheets.js';

export default async function handler(req, res) {
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

  // --- GET: List and filter leads ---
  if (req.method === 'GET') {
    try {
      let leads = [];
      try {
        leads = await getLeadsFromSheet();
      } catch (sheetErr) {
        console.warn('[Admin Leads Fetch Warning]', sheetErr.message);
        // If sheet credentials are not yet set, return structured mock data for admin preview
        if (sheetErr.message.includes('CREDENTIALS_MISSING')) {
          leads = [
            {
              'Lead ID': 'VYX-DEMO-001',
              'Created At': new Date().toISOString(),
              'First Name': 'Alex',
              'Last Name': 'Morgan',
              'Email': 'alex@nexusscale.io',
              'Phone': '+1 (555) 349-2041',
              'Company': 'Nexus Scale Corp',
              'Website': 'https://nexusscale.io',
              'Country / Timezone': 'United States (EST)',
              'Project Type': 'GoHighLevel (GHL) Architecture',
              'Budget': '$5,000 – $10,000',
              'Timeline': 'Within 1 Month',
              'Current Tech Stack': 'HubSpot, Zapier, Stripe',
              'Project Description': 'We need a full GoHighLevel pipeline build with multi-stage inbound qualification and SMS reminders.',
              'Page Submitted From': '/contact.html',
              'UTM Source': 'google',
              'UTM Medium': 'cpc',
              'UTM Campaign': 'ghl_automation',
              'Status': 'NEW',
              'Priority': 'HIGH',
              'Admin Notes': 'Demo record for admin dashboard verification.'
            }
          ];
        } else {
          throw sheetErr;
        }
      }

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
          (l['Project Description'] || '').toLowerCase().includes(q)
        );
      }

      return res.status(200).json({
        success: true,
        count: filtered.length,
        total: leads.length,
        leads: filtered
      });

    } catch (err) {
      console.error('[Admin Leads Fetch Error]', err);
      return res.status(500).json({
        success: false,
        code: 'SHEETS_FETCH_FAILED',
        message: 'Failed to retrieve leads from Google Sheets.'
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

      let updatedRecord;
      try {
        updatedRecord = await updateLeadInSheet(
          leadId,
          { status, priority, adminNotes },
          adminUser.email
        );
      } catch (sheetErr) {
        if (sheetErr.message.includes('CREDENTIALS_MISSING')) {
          updatedRecord = { success: true, leadId, status, priority, adminNotes, mocked: true };
        } else {
          throw sheetErr;
        }
      }

      return res.status(200).json({
        success: true,
        message: `Lead ${leadId} updated successfully.`,
        data: updatedRecord
      });

    } catch (err) {
      console.error('[Admin Lead Update Error]', err);
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
