/**
 * Admin Authentication Endpoint — POST /api/admin/login
 * Validates admin credentials, enforces rate limiting, and returns a signed session token.
 */

import { validateAdminCredentials, createAdminSessionToken } from '../_lib/auth.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

export default async function handler(req, res) {
  // Enforce POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed. Use POST.'
    });
  }

  // Rate limit login attempts per IP: max 5 attempts per 10 minutes
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const rateLimit = checkRateLimit(`login_${clientIp}`, 5, 10 * 60 * 1000);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many failed login attempts. Please wait 10 minutes before retrying.'
    });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_CREDENTIALS',
      message: 'Email and password are required.'
    });
  }

  const isValid = validateAdminCredentials(email, password);

  if (!isValid) {
    // Add artificial delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 400));
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials or unauthorized administrator account.'
    });
  }

  // Generate signed session token
  const token = createAdminSessionToken(email);

  return res.status(200).json({
    success: true,
    token,
    user: {
      email: email.toLowerCase().trim()
    }
  });
}
