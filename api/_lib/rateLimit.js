/**
 * In-Memory Sliding-Window IP Rate Limiter for Serverless Endpoints
 */

const ipRequests = new Map();

/**
 * Checks if an IP is rate limited
 * @param {string} ip - Client IP address
 * @param {number} limit - Maximum requests allowed in the window (default: 5)
 * @param {number} windowMs - Window duration in milliseconds (default: 10 minutes)
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(ip, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const safeIp = ip || 'unknown-client';
  
  // Clean up expired entries periodically
  if (ipRequests.size > 10000) {
    for (const [key, timestamps] of ipRequests.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        ipRequests.delete(key);
      } else {
        ipRequests.set(key, valid);
      }
    }
  }

  const timestamps = ipRequests.get(safeIp) || [];
  const recentTimestamps = timestamps.filter(t => now - t < windowMs);

  if (recentTimestamps.length >= limit) {
    const oldest = recentTimestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return { allowed: false, remaining: 0, resetMs };
  }

  recentTimestamps.push(now);
  ipRequests.set(safeIp, recentTimestamps);

  return {
    allowed: true,
    remaining: limit - recentTimestamps.length,
    resetMs: windowMs
  };
}

/**
 * Extracts client IP from Vercel request headers
 * @param {object} req 
 * @returns {string}
 */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}
