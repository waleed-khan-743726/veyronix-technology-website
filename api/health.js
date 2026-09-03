/**
 * Veyronix Backend Health Check Endpoint
 * GET /api/health
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const hasSheets = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  );

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
    version: '1.1.0',
    integrations: {
      googleSheets: hasSheets ? 'configured' : 'pending_env',
      resendEmail: hasEmail ? 'configured' : 'mock_mode',
      firebaseAuth: hasFirebase ? 'configured' : 'pending_env'
    }
  });
}
