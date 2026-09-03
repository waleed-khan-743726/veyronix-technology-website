/**
 * Firebase Admin Authentication & Admin Whitelist Verification
 */

import admin from 'firebase-admin';

let firebaseApp = null;

function normalizePrivateKey(key) {
  if (!key) return '';
  return key.replace(/\\n/g, '\n').replace(/"/g, '');
}

function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  } else {
    firebaseApp = admin.app();
  }

  return firebaseApp;
}

/**
 * Extracts and verifies Bearer token from request headers
 * @param {object} req 
 * @returns {Promise<{ uid: string, email: string }>}
 */
export async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('UNAUTHORIZED_MISSING_TOKEN');
    error.status = 401;
    throw error;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const app = getFirebaseAdmin();

  if (!app) {
    // If Firebase service account is not yet configured, check if request is in local development or throw
    if (process.env.NODE_ENV !== 'production' && token === 'local-dev-mock-admin-token') {
      return { uid: 'dev-admin-uid', email: 'veyronixtechnologies@gmail.com' };
    }
    const error = new Error('FIREBASE_ADMIN_CREDENTIALS_MISSING');
    error.status = 500;
    throw error;
  }

  try {
    const decoded = await admin.auth(app).verifyIdToken(token);
    const allowedEmails = (process.env.ADMIN_EMAILS || 'veyronixtechnologies@gmail.com')
      .split(',')
      .map(e => e.trim().toLowerCase());

    const userEmail = (decoded.email || '').toLowerCase();

    if (!allowedEmails.includes(userEmail)) {
      const error = new Error('FORBIDDEN_UNAUTHORIZED_ADMIN_EMAIL');
      error.status = 403;
      throw error;
    }

    return { uid: decoded.uid, email: decoded.email };
  } catch (err) {
    if (err.status) throw err;
    const error = new Error('UNAUTHORIZED_INVALID_TOKEN');
    error.status = 401;
    throw error;
  }
}
