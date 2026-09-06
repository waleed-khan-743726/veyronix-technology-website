/**
 * Veyronix Admin Authentication Engine
 * Supports: Signed Cryptographic Session Tokens + Firebase Admin Token Verification
 */

import crypto from 'crypto';
import admin from 'firebase-admin';

const AUTH_SECRET = process.env.ADMIN_SESSION_SECRET || 'veyronix-super-secure-production-auth-secret-key-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Veyronix987654321#';
const ALLOWED_EMAILS = (process.env.ADMIN_EMAILS || 'veyronixtechnologies@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase());

let firebaseApp = null;

function normalizePrivateKey(key) {
  if (!key) return '';
  let str = String(key).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.private_key) str = parsed.private_key;
    } catch (e) {}
  }
  while (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'")) ||
    (str.startsWith('`') && str.endsWith('`'))
  ) {
    str = str.slice(1, -1).trim();
  }
  str = str
    .replace(/\\+r\\+n/g, '\n')
    .replace(/\\+n/g, '\n')
    .replace(/\\+r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  str = str.replace(/\\"/g, '"').trim();

  if (!str.includes('-----BEGIN')) {
    const cleanBase64 = str.replace(/[\r\n\s]/g, '');
    const lines = [];
    for (let i = 0; i < cleanBase64.length; i += 64) {
      lines.push(cleanBase64.slice(i, i + 64));
    }
    str = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
  } else if (!str.includes('-----END')) {
    str = `${str}\n-----END PRIVATE KEY-----\n`;
  }

  return str.trim();
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
 * Creates a cryptographically signed session token for an admin
 * @param {string} email 
 * @returns {string} Signed token
 */
export function createAdminSessionToken(email) {
  const userEmail = email.toLowerCase().trim();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = Buffer.from(JSON.stringify({ email: userEmail, exp: expiresAt })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token
 * @param {string} token 
 * @returns {{ email: string } | null}
 */
export function verifyAdminSessionToken(token) {
  if (!token || !token.includes('.')) return null;

  try {
    const [payloadB64, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');

    if (signature !== expectedSig) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    const email = (payload.email || '').toLowerCase().trim();
    if (!ALLOWED_EMAILS.includes(email)) {
      return null;
    }

    return { email };
  } catch (err) {
    return null;
  }
}

/**
 * Validates admin login credentials directly
 * @param {string} email 
 * @param {string} password 
 * @returns {boolean}
 */
export function validateAdminCredentials(email, password) {
  if (!email || !password) return false;
  const normalizedEmail = email.toLowerCase().trim();

  if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
    return false;
  }

  return password === ADMIN_PASSWORD;
}

/**
 * Extracts and verifies Bearer token from request headers (Session Token or Firebase Token)
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

  // 1. First check signed session token
  const sessionUser = verifyAdminSessionToken(token);
  if (sessionUser) {
    return { uid: 'admin-session-' + sessionUser.email, email: sessionUser.email };
  }

  // 2. Fallback check for local development mock token
  if (process.env.NODE_ENV !== 'production' && token === 'local-dev-mock-admin-token') {
    return { uid: 'dev-admin-uid', email: 'veyronixtechnologies@gmail.com' };
  }

  // 3. Fallback check for Firebase Admin token
  const app = getFirebaseAdmin();
  if (app) {
    try {
      const decoded = await admin.auth(app).verifyIdToken(token);
      const userEmail = (decoded.email || '').toLowerCase();

      if (!ALLOWED_EMAILS.includes(userEmail)) {
        const error = new Error('FORBIDDEN_UNAUTHORIZED_ADMIN_EMAIL');
        error.status = 403;
        throw error;
      }

      return { uid: decoded.uid, email: decoded.email };
    } catch (err) {
      if (err.status) throw err;
    }
  }

  const error = new Error('UNAUTHORIZED_INVALID_TOKEN');
  error.status = 401;
  throw error;
}
