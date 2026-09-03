/**
 * Google Sheets Operational CRM Database Integration
 * Features: Service Account Auth, Formula Injection Neutralization, Tab Auto-Provisioning
 */

import { google } from 'googleapis';

const LEADS_HEADERS = [
  'Lead ID', 'Created At', 'First Name', 'Last Name', 'Email', 'Phone',
  'Company', 'Website', 'Country / Timezone', 'Project Type', 'Budget',
  'Timeline', 'Current Tech Stack', 'Project Description', 'Page Submitted From',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Term', 'UTM Content',
  'Referrer', 'Landing Page', 'Status', 'Priority', 'Admin Notes', 'Last Updated', 'Source'
];

const ACTIVITY_HEADERS = [
  'Activity ID', 'Timestamp', 'Lead ID', 'Action', 'Old Value', 'New Value', 'Admin User'
];

const ERROR_LOG_HEADERS = [
  'Timestamp', 'Request ID', 'Endpoint', 'Error Type', 'Error Message', 'IP Hash'
];

/**
 * Neutralizes potential spreadsheet formula injection (=, +, -, @, \t, \r)
 * @param {any} val 
 * @returns {string}
 */
export function sanitizeForSpreadsheet(val) {
  if (val === null || val === undefined) return '';
  const raw = String(val);
  if (/^[=+\-@\t\r]/.test(raw) || /^[=+\-@\t\r]/.test(raw.trim())) {
    return `'${raw.trim()}`;
  }
  return raw.trim();
}

/**
 * Formats private key handling literal \n characters from env
 * @param {string} key 
 * @returns {string}
 */
function normalizePrivateKey(key) {
  if (!key) return '';
  return key.replace(/\\n/g, '\n').replace(/"/g, '');
}

/**
 * Initializes authenticated Google Sheets API client
 * @returns {Promise<{ sheets: any, spreadsheetId: string } | null>}
 */
export async function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !privateKey || !spreadsheetId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

/**
 * Ensures required CRM tabs and headers exist in the spreadsheet
 * @param {any} sheets 
 * @param {string} spreadsheetId 
 */
export async function ensureTabsExist(sheets, spreadsheetId) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (meta.data.sheets || []).map(s => s.properties?.title);

    const requiredSheets = [
      { title: 'LEADS', headers: LEADS_HEADERS },
      { title: 'ACTIVITY', headers: ACTIVITY_HEADERS },
      { title: 'ERROR_LOG', headers: ERROR_LOG_HEADERS }
    ];

    const toCreate = [];
    for (const req of requiredSheets) {
      if (!existingTitles.includes(req.title)) {
        toCreate.push({
          addSheet: { properties: { title: req.title } }
        });
      }
    }

    if (toCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: toCreate }
      });

      // Write headers for newly created sheets
      for (const req of requiredSheets) {
        if (!existingTitles.includes(req.title)) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${req.title}!A1:${String.fromCharCode(64 + req.headers.length)}1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [req.headers] }
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Google Sheets] Note during ensureTabsExist:', err.message);
  }
}

/**
 * Appends a lead row to the LEADS tab
 * @param {object} lead 
 * @returns {Promise<{ success: boolean, leadId: string }>}
 */
export async function appendLeadToSheet(lead) {
  const client = await getSheetsClient();
  if (!client) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS_MISSING');
  }

  const { sheets, spreadsheetId } = client;
  await ensureTabsExist(sheets, spreadsheetId);

  const rowData = [
    sanitizeForSpreadsheet(lead.leadId),
    sanitizeForSpreadsheet(lead.createdAt || new Date().toISOString()),
    sanitizeForSpreadsheet(lead.firstName),
    sanitizeForSpreadsheet(lead.lastName),
    sanitizeForSpreadsheet(lead.email),
    sanitizeForSpreadsheet(lead.phone),
    sanitizeForSpreadsheet(lead.company),
    sanitizeForSpreadsheet(lead.website),
    sanitizeForSpreadsheet(lead.timezone),
    sanitizeForSpreadsheet(lead.projectType),
    sanitizeForSpreadsheet(lead.budget),
    sanitizeForSpreadsheet(lead.timeline),
    sanitizeForSpreadsheet(lead.techStack),
    sanitizeForSpreadsheet(lead.description),
    sanitizeForSpreadsheet(lead.pageSubmittedFrom),
    sanitizeForSpreadsheet(lead.utmSource),
    sanitizeForSpreadsheet(lead.utmMedium),
    sanitizeForSpreadsheet(lead.utmCampaign),
    sanitizeForSpreadsheet(lead.utmTerm),
    sanitizeForSpreadsheet(lead.utmContent),
    sanitizeForSpreadsheet(lead.referrer),
    sanitizeForSpreadsheet(lead.landingPage),
    sanitizeForSpreadsheet(lead.status || 'NEW'),
    sanitizeForSpreadsheet(lead.priority || 'NORMAL'),
    sanitizeForSpreadsheet(lead.adminNotes || ''),
    sanitizeForSpreadsheet(new Date().toISOString()),
    sanitizeForSpreadsheet('Inbound Website Form')
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'LEADS!A:AA',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowData] }
  });

  // Log to ACTIVITY tab
  try {
    const activityId = `ACT-${Date.now()}`;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'ACTIVITY!A:G',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          activityId,
          new Date().toISOString(),
          lead.leadId,
          'LEAD_CREATED',
          '',
          lead.status || 'NEW',
          'System (Inbound Web)'
        ]]
      }
    });
  } catch (actErr) {
    console.warn('[Activity Log Warning]', actErr.message);
  }

  return { success: true, leadId: lead.leadId };
}

/**
 * Fetches all leads from the LEADS tab
 * @param {object} options 
 * @returns {Promise<Array<object>>}
 */
export async function getLeadsFromSheet(options = {}) {
  const client = await getSheetsClient();
  if (!client) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS_MISSING');
  }

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'LEADS!A:AA'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => String(h).trim());
  const leads = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = { _rowIndex: i + 1 };
    headers.forEach((header, idx) => {
      item[header] = row[idx] || '';
    });
    leads.push(item);
  }

  // Reverse so newest are first
  leads.reverse();

  return leads;
}

/**
 * Updates a lead in Google Sheets
 * @param {string} leadId 
 * @param {object} updates 
 * @param {string} adminUser 
 */
export async function updateLeadInSheet(leadId, updates = {}, adminUser = 'Admin') {
  const client = await getSheetsClient();
  if (!client) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS_MISSING');
  }

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'LEADS!A:AA'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) throw new Error('LEAD_NOT_FOUND');

  let targetRowIndex = -1;
  let currentRowData = null;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === leadId) {
      targetRowIndex = i + 1;
      currentRowData = rows[i];
      break;
    }
  }

  if (targetRowIndex === -1) {
    throw new Error('LEAD_NOT_FOUND');
  }

  // Column indexes:
  // 22 = Status (col W), 23 = Priority (col X), 24 = Admin Notes (col Y), 25 = Last Updated (col Z)
  const oldStatus = currentRowData[22] || 'NEW';
  const oldPriority = currentRowData[23] || 'NORMAL';
  const oldNotes = currentRowData[24] || '';

  const newStatus = updates.status || oldStatus;
  const newPriority = updates.priority || oldPriority;
  const newNotes = updates.adminNotes !== undefined ? updates.adminNotes : oldNotes;
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `LEADS!W${targetRowIndex}:Z${targetRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        sanitizeForSpreadsheet(newStatus),
        sanitizeForSpreadsheet(newPriority),
        sanitizeForSpreadsheet(newNotes),
        sanitizeForSpreadsheet(now)
      ]]
    }
  });

  // Log changes in ACTIVITY sheet
  if (oldStatus !== newStatus || oldPriority !== newPriority || oldNotes !== newNotes) {
    const activityRows = [];
    if (oldStatus !== newStatus) {
      activityRows.push([`ACT-${Date.now()}-1`, now, leadId, 'STATUS_CHANGE', oldStatus, newStatus, adminUser]);
    }
    if (oldPriority !== newPriority) {
      activityRows.push([`ACT-${Date.now()}-2`, now, leadId, 'PRIORITY_CHANGE', oldPriority, newPriority, adminUser]);
    }
    if (oldNotes !== newNotes) {
      activityRows.push([`ACT-${Date.now()}-3`, now, leadId, 'NOTES_UPDATED', oldNotes.slice(0, 30), newNotes.slice(0, 30), adminUser]);
    }

    if (activityRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'ACTIVITY!A:G',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: activityRows }
      });
    }
  }

  return { success: true, leadId, status: newStatus, priority: newPriority, adminNotes: newNotes };
}
