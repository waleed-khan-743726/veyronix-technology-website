import { normalizePrivateKey, getSheetsClient } from './_lib/sheets.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || process.env.SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_KEY;
  const rawSheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || process.env.SPREADSHEET_ID;

  let keyStatus = 'missing';
  let keyError = null;
  let keyDiagnostics = {};

  if (rawKey) {
    const normalized = normalizePrivateKey(rawKey);
    keyDiagnostics = {
      rawLength: rawKey.length,
      normalizedLength: normalized.length,
      hasBeginHeader: normalized.includes('-----BEGIN PRIVATE KEY-----') || normalized.includes('BEGIN RSA PRIVATE KEY'),
      hasEndFooter: normalized.includes('-----END PRIVATE KEY-----') || normalized.includes('END RSA PRIVATE KEY'),
      rawStartsWith: rawKey.slice(0, 15),
      rawEndsWith: rawKey.slice(-15)
    };

    try {
      crypto.createPrivateKey(normalized);
      keyStatus = 'valid_pem';
    } catch (e) {
      keyStatus = 'invalid_pem';
      keyError = e.message;
    }
  }

  let sheetsTest = 'pending';
  if (keyStatus === 'valid_pem') {
    try {
      const client = await getSheetsClient();
      if (client) {
        sheetsTest = 'authenticated';
      }
    } catch (e) {
      sheetsTest = `auth_error: ${e.message}`;
    }
  }

  const hasEmail = Boolean(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== 're_your_resend_api_key_here'
  );

  const hasFirebase = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );

  return res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Veyronix Production Backend',
    version: '1.3.0',
    sheets: {
      emailConfigured: Boolean(rawEmail),
      spreadsheetIdConfigured: Boolean(rawSheetId),
      keyStatus,
      keyError,
      keyDiagnostics,
      sheetsTest
    },
    integrations: {
      googleSheets: keyStatus === 'valid_pem' ? 'configured' : `key_issue: ${keyError || keyStatus}`,
      resendEmail: hasEmail ? 'configured' : 'mock_mode',
      firebaseAuth: hasFirebase ? 'configured' : 'pending_env'
    }
  });
}
