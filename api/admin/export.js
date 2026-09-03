/**
 * Admin Leads CSV Exporter Endpoint
 * GET /api/admin/export
 */

import { verifyAdminAuth } from '../_lib/auth.js';
import { getLeadsFromSheet } from '../_lib/sheets.js';

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export default async function handler(req, res) {
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

  try {
    let leads = [];
    try {
      leads = await getLeadsFromSheet();
    } catch (sheetErr) {
      if (!sheetErr.message.includes('CREDENTIALS_MISSING')) {
        throw sheetErr;
      }
    }

    const headers = [
      'Lead ID', 'Created At', 'First Name', 'Last Name', 'Email', 'Phone',
      'Company', 'Website', 'Country / Timezone', 'Project Type', 'Budget',
      'Timeline', 'Current Tech Stack', 'Project Description', 'Page Submitted From',
      'UTM Source', 'UTM Medium', 'UTM Campaign', 'Status', 'Priority', 'Admin Notes'
    ];

    const csvLines = [headers.map(escapeCsvCell).join(',')];

    leads.forEach(lead => {
      const row = headers.map(h => escapeCsvCell(lead[h] || ''));
      csvLines.push(row.join(','));
    });

    const csvData = csvLines.join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="veyronix-leads-${dateStr}.csv"`);
    return res.status(200).send(csvData);

  } catch (err) {
    console.error('[Admin Export Error]', err);
    return res.status(500).json({
      success: false,
      code: 'EXPORT_FAILED',
      message: 'Failed to generate CSV export.'
    });
  }
}
