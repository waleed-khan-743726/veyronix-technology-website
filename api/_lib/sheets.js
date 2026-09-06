/**
 * Google Sheets Operational CRM & Visitor Analytics Database Integration
 * Primary Spreadsheet: "Veyronix Business CRM"
 * Tabs: LEADS, VISITOR_SESSIONS, EVENTS, ACTIVITY, ANALYTICS_SUMMARY, ERROR_LOG
 */

import { google } from 'googleapis';

export const LEADS_HEADERS = [
  'Lead ID',
  'Created At',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Company',
  'Website',
  'Country',
  'Timezone',
  'Project Type',
  'Budget',
  'Timeline',
  'Current Stack',
  'Project Brief',
  'Landing Page',
  'Page Submitted From',
  'Referrer',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'UTM Term',
  'UTM Content',
  'Session ID',
  'Visitor ID',
  'Status',
  'Priority',
  'Admin Notes',
  'Last Updated',
  'Email Notification Status',
  'Client Confirmation Status',
  'Source'
];

export const VISITOR_SESSIONS_HEADERS = [
  'Session ID',
  'Visitor ID',
  'Session Start',
  'Last Activity',
  'Landing Page',
  'Current / Exit Page',
  'Referrer',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'UTM Term',
  'UTM Content',
  'Country',
  'Region',
  'City',
  'Device Category',
  'Browser',
  'Operating System',
  'Viewport',
  'Pages Viewed',
  'Events Count',
  'Converted',
  'Lead ID'
];

export const EVENTS_HEADERS = [
  'Event ID',
  'Timestamp',
  'Visitor ID',
  'Session ID',
  'Event Name',
  'Page',
  'Referrer',
  'Element / CTA',
  'Project / Content ID',
  'Metadata JSON',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'Lead ID'
];

export const ACTIVITY_HEADERS = [
  'Activity ID',
  'Timestamp',
  'Lead ID',
  'Action',
  'Old Value',
  'New Value',
  'Admin User'
];

export const ANALYTICS_SUMMARY_HEADERS = [
  'Date',
  'Metric',
  'Value',
  'Category',
  'Last Updated'
];

export const ERROR_LOG_HEADERS = [
  'Timestamp',
  'Request ID',
  'Endpoint',
  'Lead ID',
  'Error Code',
  'Error Summary'
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
 * Normalizes service account private key handling escaped newlines, quotes, JSON strings, and Vercel env formats
 * @param {string} key 
 * @returns {string}
 */
export function normalizePrivateKey(key) {
  if (!key) return '';
  let str = String(key).trim();
  
  // 1. If entire service account JSON string was provided
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.private_key) {
        str = parsed.private_key;
      }
    } catch (e) {}
  }

  // 2. Remove surrounding single, double quotes or backticks repeatedly
  while (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'")) ||
    (str.startsWith('`') && str.endsWith('`'))
  ) {
    str = str.slice(1, -1).trim();
  }

  // 3. Replace any sequence of 1 or more backslashes followed by n or r
  str = str
    .replace(/\\+r\\+n/g, '\n')
    .replace(/\\+n/g, '\n')
    .replace(/\\+r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Strip accidental escaped quotes
  str = str.replace(/\\"/g, '"');

  return str.trim();
}

/**
 * Converts a 1-based column number to Excel/Sheets column letters (e.g., 1 -> A, 27 -> AA, 32 -> AF)
 * @param {number} colNumber 
 * @returns {string}
 */
export function getColumnLetter(colNumber) {
  let letter = '';
  let temp = colNumber;
  while (temp > 0) {
    let mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Initializes authenticated Google Sheets API client
 * @returns {Promise<{ sheets: any, spreadsheetId: string } | null>}
 */
export async function getSheetsClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || process.env.SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_KEY;
  let spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || process.env.SPREADSHEET_ID || '1-JtKrWMtxGkqeMsAXL90Hn9NkSGO6qholaw_ayjpll0';

  // Check if entire service account JSON credentials string was provided in ANY env variable
  const fullCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || process.env.GOOGLE_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (fullCredentials) {
    try {
      const parsed = JSON.parse(fullCredentials);
      if (parsed.client_email && !email) email = parsed.client_email;
      if (parsed.private_key && !privateKey) privateKey = parsed.private_key;
      if (parsed.spreadsheet_id && !spreadsheetId) spreadsheetId = parsed.spreadsheet_id;
    } catch(e) {}
  }

  if (email && email.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(email);
      if (parsed.client_email) email = parsed.client_email;
      if (parsed.private_key && !privateKey) privateKey = parsed.private_key;
    } catch(e) {}
  }

  if (privateKey && privateKey.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(privateKey);
      if (parsed.client_email && !email) email = parsed.client_email;
      if (parsed.private_key) privateKey = parsed.private_key;
    } catch(e) {}
  }

  // Fallback to the configured Veyronix CRM service account email if not set
  if (!email) {
    email = 'veyronix-crm@veyronix-crmveyronix-crm.iam.gserviceaccount.com';
  }

  const normalizedKey = normalizePrivateKey(privateKey);

  if (!email || !normalizedKey || !spreadsheetId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: normalizedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

/**
 * Ensures all required CRM tabs and header schemas exist in the spreadsheet
 * @param {any} sheets 
 * @param {string} spreadsheetId 
 */
export async function ensureTabsExist(sheets, spreadsheetId) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (meta.data.sheets || []).map(s => s.properties?.title);

    const requiredSheets = [
      { title: 'LEADS', headers: LEADS_HEADERS },
      { title: 'VISITOR_SESSIONS', headers: VISITOR_SESSIONS_HEADERS },
      { title: 'EVENTS', headers: EVENTS_HEADERS },
      { title: 'ACTIVITY', headers: ACTIVITY_HEADERS },
      { title: 'ANALYTICS_SUMMARY', headers: ANALYTICS_SUMMARY_HEADERS },
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
    }

    // Ensure headers exist for all required sheets
    for (const req of requiredSheets) {
      const colLetter = getColumnLetter(req.headers.length);
      const headerRange = `${req.title}!A1:${colLetter}1`;
      
      const checkRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: headerRange
      });

      if (!checkRes.data.values || checkRes.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: headerRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [req.headers] }
        });
      }
    }
  } catch (err) {
    console.warn('[Google Sheets] Note during ensureTabsExist:', err.message);
  }
}

/**
 * Appends a lead row to the LEADS tab and updates linked session
 * @param {object} lead 
 * @returns {Promise<{ success: boolean, leadId: string, updatedRows: number }>}
 */
export async function appendLeadToSheet(lead) {
  const client = await getSheetsClient();
  if (!client) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS_MISSING: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or GOOGLE_SHEETS_SPREADSHEET_ID is not configured');
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
    sanitizeForSpreadsheet(lead.country),
    sanitizeForSpreadsheet(lead.timezone || lead.country),
    sanitizeForSpreadsheet(lead.projectType),
    sanitizeForSpreadsheet(lead.budget),
    sanitizeForSpreadsheet(lead.timeline),
    sanitizeForSpreadsheet(lead.techStack || lead.currentStack),
    sanitizeForSpreadsheet(lead.description || lead.projectBrief),
    sanitizeForSpreadsheet(lead.landingPage),
    sanitizeForSpreadsheet(lead.pageSubmittedFrom),
    sanitizeForSpreadsheet(lead.referrer),
    sanitizeForSpreadsheet(lead.utmSource),
    sanitizeForSpreadsheet(lead.utmMedium),
    sanitizeForSpreadsheet(lead.utmCampaign),
    sanitizeForSpreadsheet(lead.utmTerm),
    sanitizeForSpreadsheet(lead.utmContent),
    sanitizeForSpreadsheet(lead.sessionId),
    sanitizeForSpreadsheet(lead.visitorId),
    sanitizeForSpreadsheet(lead.status || 'NEW'),
    sanitizeForSpreadsheet(lead.priority || 'NORMAL'),
    sanitizeForSpreadsheet(lead.adminNotes || ''),
    sanitizeForSpreadsheet(lead.lastUpdated || new Date().toISOString()),
    sanitizeForSpreadsheet(lead.emailNotificationStatus || 'pending'),
    sanitizeForSpreadsheet(lead.clientConfirmationStatus || 'pending'),
    sanitizeForSpreadsheet(lead.source || 'Inbound Website Form')
  ];

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'LEADS!A:AF',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowData] }
  });

  const updatedRows = appendRes.data?.updates?.updatedRows || 1;

  // 1. Log to ACTIVITY tab
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

  // 2. Link Session in VISITOR_SESSIONS tab if sessionId is present
  if (lead.sessionId) {
    try {
      await markSessionConverted(lead.sessionId, lead.leadId);
    } catch (sessErr) {
      console.warn('[Session Conversion Link Warning]', sessErr.message);
    }
  }

  return { success: true, leadId: lead.leadId, updatedRows };
}

/**
 * Fetches all leads from the LEADS tab, mapping columns dynamically by header names
 * @returns {Promise<Array<object>>}
 */
export async function getLeadsFromSheet() {
  const client = await getSheetsClient();
  if (!client) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS_MISSING');
  }

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'LEADS!A:AF'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => String(h).trim());
  const leads = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;
    const item = { _rowIndex: i + 1 };
    headers.forEach((header, idx) => {
      item[header] = row[idx] !== undefined ? String(row[idx]).trim() : '';
    });
    leads.push(item);
  }

  // Reverse so newest leads are first
  leads.reverse();

  return leads;
}

/**
 * Updates a lead in Google Sheets finding row dynamically by Lead ID
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
    range: 'LEADS!A:AF'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) throw new Error('LEAD_NOT_FOUND');

  const headers = rows[0].map(h => String(h).trim());
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

  // Locate column indexes dynamically
  const statusIdx = headers.indexOf('Status') !== -1 ? headers.indexOf('Status') : 25;
  const priorityIdx = headers.indexOf('Priority') !== -1 ? headers.indexOf('Priority') : 26;
  const notesIdx = headers.indexOf('Admin Notes') !== -1 ? headers.indexOf('Admin Notes') : 27;
  const updatedIdx = headers.indexOf('Last Updated') !== -1 ? headers.indexOf('Last Updated') : 28;

  const oldStatus = currentRowData[statusIdx] || 'NEW';
  const oldPriority = currentRowData[priorityIdx] || 'NORMAL';
  const oldNotes = currentRowData[notesIdx] || '';

  const newStatus = updates.status || oldStatus;
  const newPriority = updates.priority || oldPriority;
  const newNotes = updates.adminNotes !== undefined ? updates.adminNotes : oldNotes;
  const now = new Date().toISOString();

  // Create full updated row data preserving all other columns
  const updatedRow = [...currentRowData];
  while (updatedRow.length < headers.length) updatedRow.push('');
  updatedRow[statusIdx] = sanitizeForSpreadsheet(newStatus);
  updatedRow[priorityIdx] = sanitizeForSpreadsheet(newPriority);
  updatedRow[notesIdx] = sanitizeForSpreadsheet(newNotes);
  updatedRow[updatedIdx] = sanitizeForSpreadsheet(now);

  const colLetter = getColumnLetter(headers.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `LEADS!A${targetRowIndex}:${colLetter}${targetRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] }
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
      activityRows.push([`ACT-${Date.now()}-3`, now, leadId, 'NOTES_UPDATED', oldNotes.slice(0, 40), newNotes.slice(0, 40), adminUser]);
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

/**
 * Appends a tracking event to EVENTS tab and updates the session
 * @param {object} event 
 */
export async function appendEventToSheet(event) {
  const client = await getSheetsClient();
  if (!client) return { success: false, reason: 'CREDENTIALS_MISSING' };

  const { sheets, spreadsheetId } = client;
  await ensureTabsExist(sheets, spreadsheetId);

  const eventId = event.eventId || `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = event.timestamp || new Date().toISOString();

  const eventRow = [
    sanitizeForSpreadsheet(eventId),
    sanitizeForSpreadsheet(timestamp),
    sanitizeForSpreadsheet(event.visitorId),
    sanitizeForSpreadsheet(event.sessionId),
    sanitizeForSpreadsheet(event.eventName),
    sanitizeForSpreadsheet(event.page),
    sanitizeForSpreadsheet(event.referrer),
    sanitizeForSpreadsheet(event.element || event.cta),
    sanitizeForSpreadsheet(event.projectId || event.contentId),
    sanitizeForSpreadsheet(typeof event.metadata === 'object' ? JSON.stringify(event.metadata) : event.metadata || ''),
    sanitizeForSpreadsheet(event.utmSource),
    sanitizeForSpreadsheet(event.utmMedium),
    sanitizeForSpreadsheet(event.utmCampaign),
    sanitizeForSpreadsheet(event.leadId || '')
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'EVENTS!A:N',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [eventRow] }
  });

  // Upsert visitor session
  if (event.sessionId) {
    await upsertSessionInSheet({
      sessionId: event.sessionId,
      visitorId: event.visitorId,
      page: event.page,
      referrer: event.referrer,
      utmSource: event.utmSource,
      utmMedium: event.utmMedium,
      utmCampaign: event.utmCampaign,
      utmTerm: event.utmTerm,
      utmContent: event.utmContent,
      country: event.country,
      region: event.region,
      city: event.city,
      deviceCategory: event.deviceCategory,
      browser: event.browser,
      os: event.os,
      viewport: event.viewport,
      timestamp
    });
  }

  return { success: true, eventId };
}

/**
 * Upserts a session in VISITOR_SESSIONS tab
 * @param {object} sessionData 
 */
export async function upsertSessionInSheet(sessionData) {
  const client = await getSheetsClient();
  if (!client) return;

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'VISITOR_SESSIONS!A:W'
  });

  const rows = res.data.values || [];
  const sessionId = sessionData.sessionId;
  let targetRowIndex = -1;
  let existingRow = null;

  if (rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === sessionId) {
        targetRowIndex = i + 1;
        existingRow = rows[i];
        break;
      }
    }
  }

  const now = sessionData.timestamp || new Date().toISOString();

  if (targetRowIndex !== -1 && existingRow) {
    // Existing session — update last activity, exit page, pages viewed, events count
    const pagesViewed = parseInt(existingRow[19] || '1', 10) + (sessionData.page !== existingRow[5] ? 1 : 0);
    const eventsCount = parseInt(existingRow[20] || '1', 10) + 1;

    existingRow[3] = sanitizeForSpreadsheet(now); // Last Activity
    existingRow[5] = sanitizeForSpreadsheet(sessionData.page || existingRow[5]); // Current / Exit Page
    existingRow[19] = sanitizeForSpreadsheet(pagesViewed);
    existingRow[20] = sanitizeForSpreadsheet(eventsCount);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `VISITOR_SESSIONS!A${targetRowIndex}:W${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [existingRow] }
    });
  } else {
    // New session — append
    const newSessionRow = [
      sanitizeForSpreadsheet(sessionId),
      sanitizeForSpreadsheet(sessionData.visitorId),
      sanitizeForSpreadsheet(now), // Session Start
      sanitizeForSpreadsheet(now), // Last Activity
      sanitizeForSpreadsheet(sessionData.page || '/'), // Landing Page
      sanitizeForSpreadsheet(sessionData.page || '/'), // Exit Page
      sanitizeForSpreadsheet(sessionData.referrer || ''),
      sanitizeForSpreadsheet(sessionData.utmSource || ''),
      sanitizeForSpreadsheet(sessionData.utmMedium || ''),
      sanitizeForSpreadsheet(sessionData.utmCampaign || ''),
      sanitizeForSpreadsheet(sessionData.utmTerm || ''),
      sanitizeForSpreadsheet(sessionData.utmContent || ''),
      sanitizeForSpreadsheet(sessionData.country || ''),
      sanitizeForSpreadsheet(sessionData.region || ''),
      sanitizeForSpreadsheet(sessionData.city || ''),
      sanitizeForSpreadsheet(sessionData.deviceCategory || 'Desktop'),
      sanitizeForSpreadsheet(sessionData.browser || 'Unknown'),
      sanitizeForSpreadsheet(sessionData.os || 'Unknown'),
      sanitizeForSpreadsheet(sessionData.viewport || ''),
      sanitizeForSpreadsheet(1), // Pages Viewed
      sanitizeForSpreadsheet(1), // Events Count
      sanitizeForSpreadsheet('FALSE'), // Converted
      sanitizeForSpreadsheet('') // Lead ID
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'VISITOR_SESSIONS!A:W',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [newSessionRow] }
    });
  }
}

/**
 * Marks a session as converted in VISITOR_SESSIONS
 * @param {string} sessionId 
 * @param {string} leadId 
 */
export async function markSessionConverted(sessionId, leadId) {
  const client = await getSheetsClient();
  if (!client) return;

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'VISITOR_SESSIONS!A:W'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === sessionId) {
      const rowIndex = i + 1;
      const updatedRow = [...rows[i]];
      while (updatedRow.length < 23) updatedRow.push('');
      updatedRow[21] = 'TRUE'; // Converted
      updatedRow[22] = sanitizeForSpreadsheet(leadId); // Lead ID

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `VISITOR_SESSIONS!A${rowIndex}:W${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updatedRow] }
      });
      break;
    }
  }
}

/**
 * Fetches all visitor sessions from VISITOR_SESSIONS tab
 * @returns {Promise<Array<object>>}
 */
export async function getSessionsFromSheet() {
  const client = await getSheetsClient();
  if (!client) return [];

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'VISITOR_SESSIONS!A:W'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => String(h).trim());
  const sessions = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;
    const item = {};
    headers.forEach((header, idx) => {
      item[header] = row[idx] !== undefined ? String(row[idx]).trim() : '';
    });
    sessions.push(item);
  }

  sessions.reverse();
  return sessions;
}

/**
 * Fetches events from EVENTS tab
 * @param {object} options 
 * @returns {Promise<Array<object>>}
 */
export async function getEventsFromSheet(options = {}) {
  const client = await getSheetsClient();
  if (!client) return [];

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'EVENTS!A:N'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => String(h).trim());
  let events = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;
    const item = {};
    headers.forEach((header, idx) => {
      item[header] = row[idx] !== undefined ? String(row[idx]).trim() : '';
    });
    events.push(item);
  }

  if (options.sessionId) {
    events = events.filter(e => e['Session ID'] === options.sessionId);
  }

  if (options.leadId) {
    events = events.filter(e => e['Lead ID'] === options.leadId);
  }

  if (options.visitorId) {
    events = events.filter(e => e['Visitor ID'] === options.visitorId);
  }

  events.reverse();

  if (options.limit && options.limit > 0) {
    events = events.slice(0, options.limit);
  }

  return events;
}

/**
 * Logs server error to ERROR_LOG tab
 * @param {object} errData 
 */
export async function logErrorToSheet(errData = {}) {
  try {
    const client = await getSheetsClient();
    if (!client) return;

    const { sheets, spreadsheetId } = client;
    await ensureTabsExist(sheets, spreadsheetId);

    const errorRow = [
      sanitizeForSpreadsheet(new Date().toISOString()),
      sanitizeForSpreadsheet(errData.requestId || `REQ-${Date.now()}`),
      sanitizeForSpreadsheet(errData.endpoint || '/api/contact'),
      sanitizeForSpreadsheet(errData.leadId || ''),
      sanitizeForSpreadsheet(errData.errorCode || 'SERVER_ERROR'),
      sanitizeForSpreadsheet(errData.message || errData.summary || 'Unhandled Exception')
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'ERROR_LOG!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [errorRow] }
    });
  } catch (e) {
    console.warn('[Error Logging To Sheet Failed]', e.message);
  }
}
