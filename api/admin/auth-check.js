/**
 * Admin Session Validation Check Endpoint
 * GET /api/admin/auth-check
 */

import { verifyAdminAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const adminUser = await verifyAdminAuth(req);
    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        uid: adminUser.uid,
        email: adminUser.email,
        role: 'ADMIN'
      }
    });
  } catch (err) {
    return res.status(err.status || 401).json({
      success: false,
      authenticated: false,
      code: err.message || 'UNAUTHORIZED'
    });
  }
}
