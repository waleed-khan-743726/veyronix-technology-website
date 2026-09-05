/**
 * Admin Analytics Telemetry & Conversion Engine
 * GET /api/admin/analytics — Returns real metrics from LEADS, VISITOR_SESSIONS, and EVENTS
 */

import { verifyAdminAuth } from '../_lib/auth.js';
import { getLeadsFromSheet, getSessionsFromSheet, getEventsFromSheet } from '../_lib/sheets.js';

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

  try {
    const [leads, sessions, events] = await Promise.all([
      getLeadsFromSheet().catch(() => []),
      getSessionsFromSheet().catch(() => []),
      getEventsFromSheet({ limit: 200 }).catch(() => [])
    ]);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Session & Visitor Metrics
    const uniqueVisitorsAll = new Set();
    const uniqueVisitorsToday = new Set();
    const uniqueVisitors7d = new Set();
    const uniqueVisitors30d = new Set();

    let sessionsToday = 0;
    let totalPageViews = 0;

    const landingPageCounts = {};
    const pageCounts = {};
    const sourceCounts = {};
    const campaignCounts = {};
    const referrerCounts = {};
    const countryCounts = {};
    const deviceCounts = {};
    const browserCounts = {};
    const osCounts = {};

    let totalPagesAcrossSessions = 0;

    sessions.forEach(sess => {
      const vId = sess['Visitor ID'] || sess['Session ID'];
      const sStart = new Date(sess['Session Start'] || sess['Last Activity'] || now);

      if (vId) uniqueVisitorsAll.add(vId);
      if (sStart >= oneDayAgo && vId) uniqueVisitorsToday.add(vId);
      if (sStart >= sevenDaysAgo && vId) uniqueVisitors7d.add(vId);
      if (sStart >= thirtyDaysAgo && vId) uniqueVisitors30d.add(vId);

      if (sStart >= oneDayAgo) sessionsToday++;

      const pViews = parseInt(sess['Pages Viewed'] || '1', 10);
      totalPagesAcrossSessions += pViews;

      const landing = sess['Landing Page'] || '/';
      landingPageCounts[landing] = (landingPageCounts[landing] || 0) + 1;

      const src = sess['UTM Source'] || (sess['Referrer'] ? 'referral' : 'direct');
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;

      if (sess['UTM Campaign']) {
        campaignCounts[sess['UTM Campaign']] = (campaignCounts[sess['UTM Campaign']] || 0) + 1;
      }

      if (sess['Referrer'] && sess['Referrer'] !== 'direct') {
        referrerCounts[sess['Referrer']] = (referrerCounts[sess['Referrer']] || 0) + 1;
      }

      const country = sess['Country'] || 'Global / Direct';
      countryCounts[country] = (countryCounts[country] || 0) + 1;

      const dev = sess['Device Category'] || 'Desktop';
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;

      const browser = sess['Browser'] || 'Unknown';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;

      const os = sess['Operating System'] || 'Unknown';
      osCounts[os] = (osCounts[os] || 0) + 1;
    });

    // 2. Events breakdown
    let vslPlays = 0;
    let vslCompletes = 0;
    let startProjectClicks = 0;
    let formStarts = 0;
    let formSubmits = 0;
    let contactCtaClicks = 0;

    events.forEach(evt => {
      const name = (evt['Event Name'] || '').toLowerCase();
      if (name === 'page_view') {
        totalPageViews++;
        const p = evt['Page'] || '/';
        pageCounts[p] = (pageCounts[p] || 0) + 1;
      }
      if (name.includes('vsl_play')) vslPlays++;
      if (name.includes('vsl_complete')) vslCompletes++;
      if (name.includes('start_project_click') || name.includes('hero_start_project_click') || name.includes('nav_start_project_click')) {
        startProjectClicks++;
      }
      if (name === 'contact_form_start') formStarts++;
      if (name === 'contact_form_submit') formSubmits++;
      if (name.includes('cta_click') || name === 'email_click' || name === 'phone_click') {
        contactCtaClicks++;
      }
    });

    // 3. Leads Metrics
    const totalLeads = leads.length;
    let leadsToday = 0;
    let leads7d = 0;
    let newLeads = 0;
    let actionableLeads = 0;
    let wonLeads = 0;
    let qualifiedLeads = 0;

    const leadStatusCounts = {};
    const leadProjectTypes = {};
    const leadBudgets = {};

    leads.forEach(lead => {
      const createdAt = new Date(lead['Created At'] || lead['Last Updated'] || now);
      if (createdAt >= oneDayAgo) leadsToday++;
      if (createdAt >= sevenDaysAgo) leads7d++;

      const status = (lead['Status'] || 'NEW').toUpperCase();
      leadStatusCounts[status] = (leadStatusCounts[status] || 0) + 1;

      if (status === 'NEW') newLeads++;
      if (['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'].includes(status)) actionableLeads++;
      if (status === 'QUALIFIED') qualifiedLeads++;
      if (status === 'WON') wonLeads++;

      const pType = lead['Project Type'] || 'General Scope';
      leadProjectTypes[pType] = (leadProjectTypes[pType] || 0) + 1;

      const budget = lead['Budget'] || 'Not Specified';
      leadBudgets[budget] = (leadBudgets[budget] || 0) + 1;
    });

    // Conversion rate: Won / Total Leads (or 0.0%)
    const conversionRate = totalLeads > 0
      ? ((wonLeads / totalLeads) * 100).toFixed(1) + '%'
      : '0.0%';

    const vslCompletionRate = vslPlays > 0
      ? ((vslCompletes / vslPlays) * 100).toFixed(1) + '%'
      : '0.0%';

    const avgPagesPerSession = sessions.length > 0
      ? (totalPagesAcrossSessions / sessions.length).toFixed(1)
      : '1.0';

    // 4. Funnel Construction
    const totalVisitorsCount = Math.max(uniqueVisitorsAll.size, sessions.length, totalLeads);
    const funnel = [
      { step: 'Visitors', count: totalVisitorsCount, rate: '100%' },
      {
        step: 'Start Project Clicks',
        count: startProjectClicks,
        rate: totalVisitorsCount > 0 ? `${((startProjectClicks / totalVisitorsCount) * 100).toFixed(1)}%` : '0.0%'
      },
      {
        step: 'Contact Form Starts',
        count: formStarts,
        rate: startProjectClicks > 0 ? `${((formStarts / startProjectClicks) * 100).toFixed(1)}%` : '0.0%'
      },
      {
        step: 'Form Submits',
        count: formSubmits,
        rate: formStarts > 0 ? `${((formSubmits / formStarts) * 100).toFixed(1)}%` : '0.0%'
      },
      {
        step: 'Successful Leads',
        count: totalLeads,
        rate: totalVisitorsCount > 0 ? `${((totalLeads / totalVisitorsCount) * 100).toFixed(1)}%` : '0.0%'
      }
    ];

    // 5. Recent Activity Feed (combining recent events and lead creations)
    const recentActivity = events.slice(0, 20).map(e => ({
      id: e['Event ID'],
      timestamp: e['Timestamp'],
      visitorId: e['Visitor ID'],
      eventName: e['Event Name'],
      page: e['Page'],
      cta: e['Element / CTA'] || '',
      leadId: e['Lead ID'] || ''
    }));

    return res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      kpis: {
        totalLeads,
        newLeads,
        actionableLeads,
        leadsThisWeek: leads7d,
        leadsToday,
        qualifiedLeads,
        wonLeads,
        conversionRate,
        visitorsToday: uniqueVisitorsToday.size,
        visitors7d: uniqueVisitors7d.size,
        visitors30d: uniqueVisitors30d.size,
        totalVisitors: uniqueVisitorsAll.size,
        sessionsToday,
        totalSessions: sessions.length,
        totalPageViews,
        avgPagesPerSession,
        vslPlays,
        vslCompletionRate,
        contactCtaClicks
      },
      funnel,
      traffic: {
        sources: sourceCounts,
        campaigns: campaignCounts,
        landingPages: landingPageCounts,
        topPages: pageCounts,
        referrers: referrerCounts,
        countries: countryCounts,
        devices: deviceCounts,
        browsers: browserCounts,
        operatingSystems: osCounts
      },
      leadBreakdowns: {
        status: leadStatusCounts,
        projectTypes: leadProjectTypes,
        budgets: leadBudgets
      },
      recentActivity
    });

  } catch (err) {
    console.error('[Admin Analytics Engine Error]', err);
    return res.status(500).json({
      success: false,
      code: 'ANALYTICS_FAILED',
      message: 'Failed to compute analytics telemetry.'
    });
  }
}
