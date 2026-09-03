/**
 * Veyronix Admin Dashboard Client Engine
 * Features: Secure Serverless Session Authentication, Leads CRM Table, Status/Priority Updates, CSV Export
 */

(function () {
  'use strict';

  let currentToken = sessionStorage.getItem('veyronix_admin_token') || null;
  let allLeads = [];
  let currentSelectedLead = null;

  // DOM Elements
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const loginNotice = document.getElementById('loginNotice');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const currentUserEmail = document.getElementById('currentUserEmail');
  const logoutBtn = document.getElementById('logoutBtn');

  const leadsTableBody = document.getElementById('leadsTableBody');
  const leadSearchInput = document.getElementById('leadSearchInput');
  const statusFilter = document.getElementById('statusFilter');
  const priorityFilter = document.getElementById('priorityFilter');
  const refreshLeadsBtn = document.getElementById('refreshLeadsBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // Modal Elements
  const leadModal = document.getElementById('leadModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const leadUpdateForm = document.getElementById('leadUpdateForm');
  const modalSaveBtn = document.getElementById('modalSaveBtn');

  // KPI Elements
  const kpiTotalLeads = document.getElementById('kpiTotalLeads');
  const kpiNewLeads = document.getElementById('kpiNewLeads');
  const kpiWeekLeads = document.getElementById('kpiWeekLeads');
  const kpiConversionRate = document.getElementById('kpiConversionRate');

  // 1. Check existing session on load
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

  // 2. Login Form Submit Handler
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

  // 3. Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLogin();
    });
  }

  // 4. Fetch Leads from CRM API
  async function loadLeads() {
    if (!leadsTableBody) return;

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
        renderLeadsTable();
      } else {
        leadsTableBody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center; padding:32px; color:#FCA5A5;">
              ${data.message || 'Unable to load leads.'}
            </td>
          </tr>
        `;
      }
    } catch (err) {
      console.error('[Leads Fetch Network Error]', err);
      leadsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:32px; color:#FCA5A5;">
            Unable to connect to Google Sheets CRM endpoint.
          </td>
        </tr>
      `;
    }
  }

  // 5. Fetch Analytics Telemetry
  async function loadAnalytics() {
    try {
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      };

      const res = await fetch('/api/admin/analytics', { headers });
      const data = await res.json();

      if (res.ok && data.success && data.kpis) {
        if (kpiTotalLeads) kpiTotalLeads.textContent = data.kpis.totalLeads;
        if (kpiNewLeads) kpiNewLeads.textContent = data.kpis.newLeads;
        if (kpiWeekLeads) kpiWeekLeads.textContent = data.kpis.leadsThisWeek;
        if (kpiConversionRate) kpiConversionRate.textContent = data.kpis.conversionRate;
      }
    } catch (err) {
      console.warn('[Analytics Telemetry Warning]', err.message);
    }
  }

  // 6. Render Leads Table with Client-Side Filtering
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
        (lead['Lead ID'] || '').toLowerCase().includes(searchTerm);

      const matchesStatus = statusVal === 'ALL' || (lead['Status'] || 'NEW').toUpperCase() === statusVal;
      const matchesPriority = priorityVal === 'ALL' || (lead['Priority'] || 'NORMAL').toUpperCase() === priorityVal;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    if (filtered.length === 0) {
      leadsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:32px; color:var(--admin-text-muted);">
            No leads match the current filters.
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

  // 7. Lead Detail Modal Logic
  function openLeadModal(lead) {
    currentSelectedLead = lead;
    if (!leadModal) return;

    document.getElementById('modalLeadName').textContent = `${lead['First Name'] || ''} ${lead['Last Name'] || ''}`.trim();
    document.getElementById('modalLeadId').textContent = lead['Lead ID'] || '—';
    document.getElementById('modalDate').textContent = lead['Created At'] || '—';
    document.getElementById('modalEmail').textContent = lead['Email'] || '—';
    document.getElementById('modalPhone').textContent = lead['Phone'] || '—';
    document.getElementById('modalCompany').textContent = lead['Company'] || '—';
    document.getElementById('modalWebsite').textContent = lead['Website'] || '—';
    document.getElementById('modalTimezone').textContent = lead['Country / Timezone'] || '—';
    document.getElementById('modalTimeline').textContent = lead['Timeline'] || '—';
    document.getElementById('modalScope').textContent = lead['Project Type'] || '—';
    document.getElementById('modalBudget').textContent = lead['Budget'] || '—';
    document.getElementById('modalBrief').textContent = lead['Project Description'] || '—';

    document.getElementById('modalStatusSelect').value = (lead['Status'] || 'NEW').toUpperCase();
    document.getElementById('modalPrioritySelect').value = (lead['Priority'] || 'NORMAL').toUpperCase();
    document.getElementById('modalAdminNotes').value = lead['Admin Notes'] || '';

    leadModal.classList.add('open');
  }

  function closeLeadModal() {
    if (leadModal) leadModal.classList.remove('open');
    currentSelectedLead = null;
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeLeadModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeLeadModal);

  // 8. Update Lead Status & Notes
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
        modalSaveBtn.textContent = 'Saving to Sheets...';
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
          closeLeadModal();
          renderLeadsTable();
          loadAnalytics();
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

  // 9. Filter & Search Event Listeners
  if (leadSearchInput) leadSearchInput.addEventListener('input', renderLeadsTable);
  if (statusFilter) statusFilter.addEventListener('change', renderLeadsTable);
  if (priorityFilter) priorityFilter.addEventListener('change', renderLeadsTable);
  if (refreshLeadsBtn) refreshLeadsBtn.addEventListener('click', () => { loadLeads(); loadAnalytics(); });

  // 10. CSV Export Handler
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      try {
        const headers = {
          'Authorization': `Bearer ${currentToken}`
        };
        const res = await fetch('/api/admin/export', { headers });
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `veyronix-leads-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          alert('Failed to export leads CSV.');
        }
      } catch (e) {
        console.error('[Export Error]', e);
        alert('Network error during export.');
      }
    });
  }

})();
