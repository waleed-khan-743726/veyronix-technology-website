/**
 * Veyronix Admin Dashboard Client Engine
 * Features: Session Authentication, Live Google Sheets Leads CRM, Real-Time Visitor Telemetry,
 * Conversion Funnel Analytics, Attribution Inspector, and Customer Journey Timeline
 */

(function () {
  'use strict';

  let currentToken = sessionStorage.getItem('veyronix_admin_token') || null;
  let allLeads = [];
  let currentSelectedLead = null;

  // DOM Elements — Auth & Layout
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const loginNotice = document.getElementById('loginNotice');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const currentUserEmail = document.getElementById('currentUserEmail');
  const logoutBtn = document.getElementById('logoutBtn');

  // DOM Elements — Tab Navigation
  const tabNavLeads = document.getElementById('tabNavLeads');
  const tabNavAnalytics = document.getElementById('tabNavAnalytics');
  const viewLeads = document.getElementById('viewLeads');
  const viewAnalytics = document.getElementById('viewAnalytics');

  // DOM Elements — Leads View
  const leadsTableBody = document.getElementById('leadsTableBody');
  const leadSearchInput = document.getElementById('leadSearchInput');
  const statusFilter = document.getElementById('statusFilter');
  const priorityFilter = document.getElementById('priorityFilter');
  const refreshLeadsBtn = document.getElementById('refreshLeadsBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // DOM Elements — Leads KPI Cards
  const kpiTotalLeads = document.getElementById('kpiTotalLeads');
  const kpiNewLeads = document.getElementById('kpiNewLeads');
  const kpiWeekLeads = document.getElementById('kpiWeekLeads');
  const kpiConversionRate = document.getElementById('kpiConversionRate');

  // DOM Elements — Telemetry / Analytics
  const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
  const telemetryVisitorsToday = document.getElementById('telemetryVisitorsToday');
  const telemetryVisitors7d = document.getElementById('telemetryVisitors7d');
  const telemetrySessionsToday = document.getElementById('telemetrySessionsToday');
  const telemetryPageViews = document.getElementById('telemetryPageViews');
  const telemetryAvgPages = document.getElementById('telemetryAvgPages');
  const telemetryCtaClicks = document.getElementById('telemetryCtaClicks');

  const funnelVisitors = document.getElementById('funnelVisitors');
  const funnelStartProject = document.getElementById('funnelStartProject');
  const funnelStartProjectRate = document.getElementById('funnelStartProjectRate');
  const funnelFormStarted = document.getElementById('funnelFormStarted');
  const funnelFormStartedRate = document.getElementById('funnelFormStartedRate');
  const funnelFormSubmitted = document.getElementById('funnelFormSubmitted');
  const funnelFormSubmittedRate = document.getElementById('funnelFormSubmittedRate');
  const funnelLeadsSaved = document.getElementById('funnelLeadsSaved');
  const funnelLeadsSavedRate = document.getElementById('funnelLeadsSavedRate');

  const trafficSourcesList = document.getElementById('trafficSourcesList');
  const landingPagesList = document.getElementById('landingPagesList');
  const countriesList = document.getElementById('countriesList');
  const devicesList = document.getElementById('devicesList');
  const recentActivityTableBody = document.getElementById('recentActivityTableBody');

  // DOM Elements — Lead Detail Modal
  const leadModal = document.getElementById('leadModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const leadUpdateForm = document.getElementById('leadUpdateForm');
  const modalSaveBtn = document.getElementById('modalSaveBtn');
  const modalJourneyContainer = document.getElementById('modalJourneyContainer');

  // 1. Session Verification on Page Load
  initSessionCheck();

  async function initSessionCheck() {
    if (currentToken) {
      try {
        const res = await fetch('/api/admin/auth-check', {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });

        if (res.ok) {
          const userEmail = sessionStorage.getItem('veyronix_admin_email') || 'veyronixtechnologies@gmail.com';
          if (currentUserEmail) currentUserEmail.textContent = userEmail;
          showDashboard();
          loadLeads();
          loadAnalytics();
          return;
        }
      } catch (err) {
        console.warn('[Session Verify Error]', err);
      }
    }
    showLogin();
  }

  function showDashboard() {
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'grid';
  }

  function showLogin() {
    currentToken = null;
    sessionStorage.removeItem('veyronix_admin_token');
    sessionStorage.removeItem('veyronix_admin_email');
    if (loginSection) loginSection.style.display = 'grid';
    if (dashboardSection) dashboardSection.style.display = 'none';
  }

  // 2. Tab Navigation
  function switchTab(tabName) {
    if (tabName === 'leads') {
      if (tabNavLeads) tabNavLeads.classList.add('active');
      if (tabNavAnalytics) tabNavAnalytics.classList.remove('active');
      if (viewLeads) viewLeads.style.display = 'block';
      if (viewAnalytics) viewAnalytics.style.display = 'none';
      loadLeads();
    } else if (tabName === 'analytics') {
      if (tabNavAnalytics) tabNavAnalytics.classList.add('active');
      if (tabNavLeads) tabNavLeads.classList.remove('active');
      if (viewAnalytics) viewAnalytics.style.display = 'block';
      if (viewLeads) viewLeads.style.display = 'none';
      loadAnalytics();
    }
  }

  if (tabNavLeads) tabNavLeads.addEventListener('click', () => switchTab('leads'));
  if (tabNavAnalytics) tabNavAnalytics.addEventListener('click', () => switchTab('analytics'));

  // 3. Login Form Submit Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail')?.value.trim();
      const password = document.getElementById('adminPassword')?.value;

      if (!email || !password) return;

      if (loginNotice) {
        loginNotice.className = 'login-notice';
        loginNotice.style.display = 'none';
      }

      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Authenticating...';
      }

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success && result.token) {
          currentToken = result.token;
          sessionStorage.setItem('veyronix_admin_token', currentToken);
          sessionStorage.setItem('veyronix_admin_email', result.user?.email || email);

          if (currentUserEmail) currentUserEmail.textContent = result.user?.email || email;
          showDashboard();
          loadLeads();
          loadAnalytics();
        } else {
          if (loginNotice) {
            loginNotice.className = 'login-notice error';
            loginNotice.textContent = result.message || 'Invalid credentials or unauthorized administrator account.';
            loginNotice.style.display = 'block';
          }
        }
      } catch (authError) {
        console.error('[Admin Login Error]', authError);
        if (loginNotice) {
          loginNotice.className = 'login-notice error';
          loginNotice.textContent = 'Network error during login. Please check connection.';
          loginNotice.style.display = 'block';
        }
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.textContent = 'Authenticate Session →';
        }
      }
    });
  }

  // 4. Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLogin();
    });
  }

  // 5. Fetch Leads from Real Google Sheets CRM API
  async function loadLeads() {
    if (!leadsTableBody) return;

    if (refreshLeadsBtn) refreshLeadsBtn.textContent = '🔄 Loading...';

    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:32px; color:var(--admin-text-muted);">
          Fetching live lead records from Google Sheets...
        </td>
      </tr>
    `;

    try {
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      };

      const res = await fetch('/api/admin/leads', { headers });
      const data = await res.json();

      if (res.ok && data.success) {
        allLeads = data.leads || [];
        updateLeadKPIs(allLeads);
        renderLeadsTable();
      } else {
        leadsTableBody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center; padding:32px; color:#FCA5A5;">
              ${data.message || 'Unable to load leads from database.'}
            </td>
          </tr>
        `;
      }
    } catch (err) {
      console.error('[Leads Fetch Error]', err);
      leadsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:32px; color:#FCA5A5;">
            Unable to connect to Google Sheets CRM endpoint.
          </td>
        </tr>
      `;
    } finally {
      if (refreshLeadsBtn) refreshLeadsBtn.textContent = '🔄 Refresh';
    }
  }

  // 6. Calculate Real KPIs from Live Leads Data
  function updateLeadKPIs(leads) {
    const total = leads.filter(l => (l['Status'] || '').toUpperCase() !== 'ARCHIVED').length;
    const actionable = leads.filter(l => ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'].includes((l['Status'] || 'NEW').toUpperCase())).length;
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = leads.filter(l => {
      const d = new Date(l['Created At'] || l['Last Updated'] || now);
      return d >= sevenDaysAgo;
    }).length;

    const wonCount = leads.filter(l => (l['Status'] || '').toUpperCase() === 'WON').length;
    const conversion = total > 0 ? ((wonCount / total) * 100).toFixed(1) + '%' : '0.0%';

    if (kpiTotalLeads) kpiTotalLeads.textContent = total;
    if (kpiNewLeads) kpiNewLeads.textContent = actionable;
    if (kpiWeekLeads) kpiWeekLeads.textContent = weekCount;
    if (kpiConversionRate) kpiConversionRate.textContent = conversion;
  }

  // 7. Render Leads Table with Client-Side Filtering
  function renderLeadsTable() {
    if (!leadsTableBody) return;

    const searchTerm = (leadSearchInput?.value || '').trim().toLowerCase();
    const statusVal = statusFilter?.value || 'ALL';
    const priorityVal = priorityFilter?.value || 'ALL';

    const filtered = allLeads.filter(lead => {
      const matchesSearch = !searchTerm ||
        (lead['First Name'] || '').toLowerCase().includes(searchTerm) ||
        (lead['Last Name'] || '').toLowerCase().includes(searchTerm) ||
        (lead['Email'] || '').toLowerCase().includes(searchTerm) ||
        (lead['Company'] || '').toLowerCase().includes(searchTerm) ||
        (lead['Lead ID'] || '').toLowerCase().includes(searchTerm) ||
        (lead['Project Brief'] || lead['Project Description'] || '').toLowerCase().includes(searchTerm);

      const matchesStatus = statusVal === 'ALL' || (lead['Status'] || 'NEW').toUpperCase() === statusVal;
      const matchesPriority = priorityVal === 'ALL' || (lead['Priority'] || 'NORMAL').toUpperCase() === priorityVal;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    if (filtered.length === 0) {
      leadsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:48px; color:var(--admin-text-muted);">
            <div style="font-size:1.1rem; font-weight:600; color:var(--admin-text-secondary); margin-bottom:6px;">No Inquiries Found</div>
            <div style="font-size:0.82rem;">Inbound client project briefs will appear here automatically as they are submitted.</div>
          </td>
        </tr>
      `;
      return;
    }

    leadsTableBody.innerHTML = filtered.map(lead => {
      const leadId = lead['Lead ID'] || '—';
      const dateStr = lead['Created At'] ? new Date(lead['Created At']).toLocaleDateString() : '—';
      const name = `${lead['First Name'] || ''} ${lead['Last Name'] || ''}`.trim() || '—';
      const company = lead['Company'] || '—';
      const scope = lead['Project Type'] || '—';
      const budget = lead['Budget'] || '—';
      const status = (lead['Status'] || 'NEW').toUpperCase();
      const priority = (lead['Priority'] || 'NORMAL').toUpperCase();

      const statusClass = `status-${status.toLowerCase()}`;
      const priorityClass = `priority-${priority.toLowerCase()}`;

      return `
        <tr>
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--admin-gold);">${leadId}</td>
          <td style="font-size:0.78rem; color:var(--admin-text-muted);">${dateStr}</td>
          <td style="font-weight:700; color:#FFFFFF;">${name}</td>
          <td>${company}</td>
          <td style="font-size:0.82rem; color:var(--admin-text-secondary);">${scope}</td>
          <td style="font-family:var(--font-mono); font-size:0.80rem;">${budget}</td>
          <td><span class="badge-status ${statusClass}">${status}</span></td>
          <td class="${priorityClass}" style="font-family:var(--font-mono); font-size:0.75rem;">${priority}</td>
          <td>
            <button class="logout-btn btn-view-lead" data-id="${leadId}" style="padding:4px 10px; font-size:0.78rem;">
              View ↗
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click handlers to View buttons
    document.querySelectorAll('.btn-view-lead').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const found = allLeads.find(l => l['Lead ID'] === id);
        if (found) openLeadModal(found);
      });
    });
  }

  // 8. Lead Detail Modal Logic with Visitor Journey
  async function openLeadModal(lead) {
    currentSelectedLead = lead;
    if (!leadModal) return;

    document.getElementById('modalLeadName').textContent = `${lead['First Name'] || ''} ${lead['Last Name'] || ''}`.trim();
    document.getElementById('modalLeadId').textContent = lead['Lead ID'] || '—';
    document.getElementById('modalDate').textContent = lead['Created At'] || '—';
    document.getElementById('modalEmail').textContent = lead['Email'] || '—';
    document.getElementById('modalPhone').textContent = lead['Phone'] || '—';
    document.getElementById('modalCompany').textContent = lead['Company'] || '—';
    document.getElementById('modalWebsite').textContent = lead['Website'] || '—';
    document.getElementById('modalCountry').textContent = lead['Country'] || lead['Timezone'] || '—';
    document.getElementById('modalTimeline').textContent = lead['Timeline'] || '—';
    document.getElementById('modalTechStack').textContent = lead['Current Stack'] || lead['Current Tech Stack'] || '—';
    document.getElementById('modalScope').textContent = lead['Project Type'] || '—';
    document.getElementById('modalBudget').textContent = lead['Budget'] || '—';
    document.getElementById('modalBrief').textContent = lead['Project Brief'] || lead['Project Description'] || '—';

    // Attribution
    const source = lead['UTM Source'] || 'direct';
    const medium = lead['UTM Medium'] || 'none';
    document.getElementById('modalSourceMedium').textContent = `${source} / ${medium}`;
    document.getElementById('modalCampaign').textContent = lead['UTM Campaign'] || 'none';
    document.getElementById('modalLandingPage').textContent = lead['Landing Page'] || lead['Page Submitted From'] || '/';
    document.getElementById('modalReferrer').textContent = lead['Referrer'] || 'direct';
    document.getElementById('modalVisitorId').textContent = lead['Visitor ID'] || '—';
    document.getElementById('modalSessionId').textContent = lead['Session ID'] || '—';

    // Form values
    document.getElementById('modalStatusSelect').value = (lead['Status'] || 'NEW').toUpperCase();
    document.getElementById('modalPrioritySelect').value = (lead['Priority'] || 'NORMAL').toUpperCase();
    document.getElementById('modalAdminNotes').value = lead['Admin Notes'] || '';

    // Fetch Visitor Journey
    if (modalJourneyContainer) {
      modalJourneyContainer.innerHTML = `<div style="font-size:0.80rem; color:var(--admin-text-muted);">Loading touchpoints...</div>`;
      try {
        const leadId = lead['Lead ID'];
        const res = await fetch(`/api/admin/journey?leadId=${encodeURIComponent(leadId)}`, {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const journeyData = await res.json();

        if (res.ok && journeyData.success && journeyData.journey && journeyData.journey.length > 0) {
          modalJourneyContainer.innerHTML = journeyData.journey.map(step => {
            const timeStr = new Date(step['Timestamp']).toLocaleTimeString();
            const eventName = step['Event Name'] || 'action';
            const page = step['Page'] || '/';
            const cta = step['Element / CTA'] ? ` (${step['Element / CTA']})` : '';

            return `
              <div class="journey-step">
                <div class="journey-dot"></div>
                <div class="journey-content">
                  <div class="journey-time">${timeStr}</div>
                  <div class="journey-action">${eventName}${cta} on <code>${page}</code></div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          modalJourneyContainer.innerHTML = `
            <div class="journey-step">
              <div class="journey-dot"></div>
              <div class="journey-content">
                <div class="journey-time">${new Date(lead['Created At'] || Date.now()).toLocaleTimeString()}</div>
                <div class="journey-action">Direct form inquiry submitted on <code>${lead['Page Submitted From'] || '/contact.html'}</code></div>
              </div>
            </div>
          `;
        }
      } catch (err) {
        modalJourneyContainer.innerHTML = `<div style="font-size:0.80rem; color:var(--admin-text-muted);">Direct website inquiry.</div>`;
      }
    }

    leadModal.classList.add('open');
  }

  function closeLeadModal() {
    if (leadModal) leadModal.classList.remove('open');
    currentSelectedLead = null;
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeLeadModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeLeadModal);

  // 9. Update Lead Status & Notes in Google Sheets
  if (leadUpdateForm) {
    leadUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentSelectedLead) return;

      const leadId = currentSelectedLead['Lead ID'];
      const status = document.getElementById('modalStatusSelect').value;
      const priority = document.getElementById('modalPrioritySelect').value;
      const adminNotes = document.getElementById('modalAdminNotes').value;

      if (modalSaveBtn) {
        modalSaveBtn.disabled = true;
        modalSaveBtn.textContent = 'Saving to Google Sheets...';
      }

      try {
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        };

        const res = await fetch('/api/admin/leads', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ leadId, status, priority, adminNotes })
        });

        const result = await res.json();

        if (res.ok && result.success) {
          currentSelectedLead['Status'] = status;
          currentSelectedLead['Priority'] = priority;
          currentSelectedLead['Admin Notes'] = adminNotes;
          currentSelectedLead['Last Updated'] = new Date().toISOString();
          closeLeadModal();
          updateLeadKPIs(allLeads);
          renderLeadsTable();
        } else {
          alert(`Error updating lead: ${result.message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('[Update Lead Error]', err);
        alert('Network error communicating with Google Sheets API.');
      } finally {
        if (modalSaveBtn) {
          modalSaveBtn.disabled = false;
          modalSaveBtn.textContent = 'Save Changes';
        }
      }
    });
  }

  // 10. Fetch & Render Analytics & Telemetry
  async function loadAnalytics() {
    if (refreshAnalyticsBtn) refreshAnalyticsBtn.textContent = '🔄 Loading...';

    try {
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      };

      const res = await fetch('/api/admin/analytics', { headers });
      const data = await res.json();

      if (res.ok && data.success) {
        const kpis = data.kpis || {};

        // Top summary metrics
        if (telemetryVisitorsToday) telemetryVisitorsToday.textContent = kpis.visitorsToday || 0;
        if (telemetryVisitors7d) telemetryVisitors7d.textContent = kpis.visitors7d || 0;
        if (telemetrySessionsToday) telemetrySessionsToday.textContent = kpis.sessionsToday || 0;
        if (telemetryPageViews) telemetryPageViews.textContent = kpis.totalPageViews || 0;
        if (telemetryAvgPages) telemetryAvgPages.textContent = kpis.avgPagesPerSession || '1.0';
        if (telemetryCtaClicks) telemetryCtaClicks.textContent = kpis.contactCtaClicks || 0;

        // Funnel
        const funnel = data.funnel || [];
        if (funnel.length >= 5) {
          if (funnelVisitors) funnelVisitors.textContent = funnel[0].count;
          if (funnelStartProject) funnelStartProject.textContent = funnel[1].count;
          if (funnelStartProjectRate) funnelStartProjectRate.textContent = funnel[1].rate;
          if (funnelFormStarted) funnelFormStarted.textContent = funnel[2].count;
          if (funnelFormStartedRate) funnelFormStartedRate.textContent = funnel[2].rate;
          if (funnelFormSubmitted) funnelFormSubmitted.textContent = funnel[3].count;
          if (funnelFormSubmittedRate) funnelFormSubmittedRate.textContent = funnel[3].rate;
          if (funnelLeadsSaved) funnelLeadsSaved.textContent = funnel[4].count;
          if (funnelLeadsSavedRate) funnelLeadsSavedRate.textContent = funnel[4].rate;
        }

        // Traffic tables
        renderKeyValueList(trafficSourcesList, data.traffic?.sources || {});
        renderKeyValueList(landingPagesList, data.traffic?.landingPages || {});
        renderKeyValueList(countriesList, data.traffic?.countries || {});
        renderKeyValueList(devicesList, data.traffic?.devices || {});

        // Recent Activity Feed
        renderRecentActivity(data.recentActivity || []);
      }
    } catch (err) {
      console.warn('[Analytics Load Error]', err);
    } finally {
      if (refreshAnalyticsBtn) refreshAnalyticsBtn.textContent = '🔄 Refresh Telemetry';
    }
  }

  function renderKeyValueList(container, obj) {
    if (!container) return;
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      container.innerHTML = `<div class="data-row"><span class="data-key" style="color:var(--admin-text-muted);">No activity recorded yet</span><span class="data-val">—</span></div>`;
      return;
    }

    container.innerHTML = entries.slice(0, 6).map(([key, val]) => `
      <div class="data-row">
        <span class="data-key" title="${key}">${key || 'direct'}</span>
        <span class="data-val">${val}</span>
      </div>
    `).join('');
  }

  function renderRecentActivity(events) {
    if (!recentActivityTableBody) return;
    if (events.length === 0) {
      recentActivityTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:24px; color:var(--admin-text-muted);">
            No recent events recorded.
          </td>
        </tr>
      `;
      return;
    }

    recentActivityTableBody.innerHTML = events.slice(0, 15).map(e => {
      const timeStr = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—';
      const eventName = e.eventName || 'event';
      const page = e.page || '/';
      const cta = e.cta || '—';
      const vId = e.visitorId ? e.visitorId.slice(0, 14) + '...' : '—';
      const leadId = e.leadId ? `<span style="color:var(--admin-gold); font-weight:700;">${e.leadId}</span>` : '—';

      return `
        <tr>
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--admin-text-muted);">${timeStr}</td>
          <td><span class="badge-status status-new" style="font-size:0.65rem;">${eventName}</span></td>
          <td style="font-size:0.80rem;">${page}</td>
          <td style="font-size:0.80rem; color:var(--admin-text-dim);">${cta}</td>
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--admin-text-muted);">${vId}</td>
          <td style="font-family:var(--font-mono); font-size:0.75rem;">${leadId}</td>
        </tr>
      `;
    }).join('');
  }

  // 11. Event Listeners
  if (leadSearchInput) leadSearchInput.addEventListener('input', renderLeadsTable);
  if (statusFilter) statusFilter.addEventListener('change', renderLeadsTable);
  if (priorityFilter) priorityFilter.addEventListener('change', renderLeadsTable);
  if (refreshLeadsBtn) refreshLeadsBtn.addEventListener('click', loadLeads);
  if (refreshAnalyticsBtn) refreshAnalyticsBtn.addEventListener('click', loadAnalytics);

  // 12. CSV Export
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (allLeads.length === 0) {
        alert('No leads to export.');
        return;
      }

      const headers = Object.keys(allLeads[0]).filter(k => !k.startsWith('_'));
      const csvRows = [headers.join(',')];

      allLeads.forEach(lead => {
        const row = headers.map(h => {
          const val = lead[h] || '';
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veyronix-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

})();
