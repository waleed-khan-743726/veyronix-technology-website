/**
 * Admin Analytics Telemetry & KPI Engine
 * GET /api/admin/analytics
 */

import { verifyAdminAuth } from '../_lib/auth.js';
import { getLeadsFromSheet } from '../_lib/sheets.js';

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

    const totalLeads = leads.length;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let leadsToday = 0;
    let leadsThisWeek = 0;
    let leadsThisMonth = 0;
    let newStatusCount = 0;
    let qualifiedCount = 0;
    let wonCount = 0;

    const statusCounts = {};
    const projectTypeCounts = {};
    const budgetCounts = {};
    const sourceCounts = {};

    leads.forEach(lead => {
      const createdAt = new Date(lead['Created At'] || lead['Last Updated'] || now);
      if (createdAt >= oneDayAgo) leadsToday++;
      if (createdAt >= sevenDaysAgo) leadsThisWeek++;
      if (createdAt >= thirtyDaysAgo) leadsThisMonth++;

      const status = (lead['Status'] || 'NEW').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (status === 'NEW') newStatusCount++;
      if (status === 'QUALIFIED') qualifiedCount++;
      if (status === 'WON') wonCount++;

      const pType = lead['Project Type'] || 'General Scope';
      projectTypeCounts[pType] = (projectTypeCounts[pType] || 0) + 1;

      const budget = lead['Budget'] || 'Not Specified';
      budgetCounts[budget] = (budgetCounts[budget] || 0) + 1;

      const src = lead['UTM Source'] || (lead['Referrer'] ? 'referral' : 'direct');
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    const conversionRate = totalLeads > 0
      ? ((wonCount / totalLeads) * 100).toFixed(1) + '%'
      : '0.0%';

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      kpis: {
        totalLeads,
        newLeads: newStatusCount,
        leadsToday,
        leadsThisWeek,
        leadsThisMonth,
        qualifiedLeads: qualifiedCount,
        wonLeads: wonCount,
        conversionRate
      },
      breakdowns: {
        status: statusCounts,
        projectType: projectTypeCounts,
        budget: budgetCounts,
        sources: sourceCounts
      }
    });

  } catch (err) {
    console.error('[Admin Analytics Error]', err);
    return res.status(500).json({
      success: false,
      code: 'ANALYTICS_FAILED',
      message: 'Failed to compute analytics telemetry.'
    });
  }
}
