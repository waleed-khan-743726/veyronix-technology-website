/**
 * Veyronix Admin Dashboard Client Engine
 * Features: Firebase Authentication, Token-Authenticated API Requests, Leads Table & Modal
 */

(function () {
  'use strict';

  // 1. Firebase Client Configuration
  // Note: These public identifiers are safe to be client-side as Firebase security is enforced via Firebase Auth rules and Server-side Token Verification.
  const firebaseConfig = {
    apiKey: window.FIREBASE_API_KEY || "AIzaSyMockKeyForVeyronixClientAdmin",
    authDomain: window.FIREBASE_AUTH_DOMAIN || "veyronix-technologies.firebaseapp.com",
    projectId: window.FIREBASE_PROJECT_ID || "veyronix-technologies"
  };

  let authInstance = null;
  let currentToken = null;
  let allLeads = [];
  let currentSelectedLead = null;

  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      authInstance = firebase.auth();
    }
  } catch (e) {
    console.warn('[Firebase Auth] Init error:', e.message);
  }

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

  // 2. Auth State Observer
  if (authInstance) {
    authInstance.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          currentToken = await user.getIdToken();
          if (currentUserEmail) currentUserEmail.textContent = user.email;
          showDashboard();
          loadLeads();
          loadAnalytics();
        } catch (err) {
          console.error('[Auth Token Error]', err);
          showLogin();
        }
      } else {
        showLogin();
      }
    });
  } else {
    // If Firebase SDK is blocked or offline in dev, provide dev login bypass for local testing
    console.log('[Admin Auth] Running in standalone local inspection mode');
  }

  function showDashboard() {
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'grid';
  }

  function showLogin() {
    currentToken = null;
    if (loginSection) loginSection.style.display = 'grid';
    if (dashboardSection) dashboardSection.style.display = 'none';
  }

  // 3. Login Form Submit
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
        if (authInstance) {
          await authInstance.signInWithEmailAndPassword(email, password);
        } else {
          // Local fallback token for dev verification
          currentToken = 'local-dev-mock-admin-token';
          if (currentUserEmail) currentUserEmail.textContent = email;
          showDashboard();
          loadLeads();
          loadAnalytics();
        }
      } catch (authError) {
        console.warn('[Login Failed]', authError.code);
        if (loginNotice) {
          loginNotice.className = 'login-notice error';
          loginNotice.textContent = 'Invalid credentials or unauthorized administrator account.';
        }
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.textContent = 'Authenticate Session →';
        }
      }
    });
  }

  // 4. Logout Action
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (authInstance) {
        await authInstance.signOut();
      } else {
        showLogin();
      }
    });
  }

  // 5. Fetch Leads from API
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
      const headers = { 'Accept': 'application/json' };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch('/api/admin/leads', { headers });
      const data = await res.json();

      if (res.ok && data.success) {
        allLeads = data.leads || [];
        renderLeadsTable();
      } else {
        leadsTableBody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center; padding:32px; color:#FCA5A5;">
              Failed to load leads: ${data.message || 'Unauthorized access.'}
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

  // 6. Fetch Analytics Telemetry
  async function loadAnalytics() {
    try {
      const headers = { 'Accept': 'application/json' };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

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

  // 8. Lead Detail Modal Logic
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

  // 9. Update Lead Status & Notes
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
          'Accept': 'application/json'
        };
        if (currentToken) {
          headers['Authorization'] = `Bearer ${currentToken}`;
        }

        const res = await fetch('/api/admin/leads', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ leadId, status, priority, adminNotes })
        });

        const result = await res.json();

        if (res.ok && result.success) {
          // Update in local memory
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

  // 10. Filter & Search Event Listeners
  if (leadSearchInput) leadSearchInput.addEventListener('input', renderLeadsTable);
  if (statusFilter) statusFilter.addEventListener('change', renderLeadsTable);
  if (priorityFilter) priorityFilter.addEventListener('change', renderLeadsTable);
  if (refreshLeadsBtn) refreshLeadsBtn.addEventListener('click', () => { loadLeads(); loadAnalytics(); });

  // 11. CSV Export Handler
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      try {
        const headers = {};
        if (currentToken) {
          headers['Authorization'] = `Bearer ${currentToken}`;
        }
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
