/**
 * Automated Production Backend Test Suite for Veyronix
 * Run with: node test_backend.js
 */

import { sanitizeForSpreadsheet } from './api/_lib/sheets.js';
import { checkRateLimit } from './api/_lib/rateLimit.js';
import healthHandler from './api/health.js';
import contactHandler from './api/contact.js';
import authCheckHandler from './api/admin/auth-check.js';
import leadsHandler from './api/admin/leads.js';
import analyticsHandler from './api/admin/analytics.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

// Mock HTTP Request & Response helpers
function createMockReqRes(options = {}) {
  const req = {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body || {},
    query: options.query || {}
  };

  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    json(data) {
      this.data = data;
      return this;
    },
    send(data) {
      this.data = data;
      return this;
    }
  };

  return { req, res };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  VEYRONIX TECHNOLOGY — BACKEND TEST SUITE');
  console.log('======================================================\n');

  // TEST SUITE 1: Formula Injection Neutralization
  console.log('1. Formula Injection & Spreadsheet Sanitization:');
  assert(sanitizeForSpreadsheet('=SUM(A1:A10)') === "'=SUM(A1:A10)", 'Prepends single quote to formula starting with =');
  assert(sanitizeForSpreadsheet('+12345') === "'+12345", 'Prepends single quote to string starting with +');
  assert(sanitizeForSpreadsheet('-500') === "'-500", 'Prepends single quote to string starting with -');
  assert(sanitizeForSpreadsheet('@danger') === "'@danger", 'Prepends single quote to string starting with @');
  assert(sanitizeForSpreadsheet('\tadmin') === "'admin" || sanitizeForSpreadsheet('\tadmin') === "'\tadmin", 'Prepends single quote to string starting with tab');
  assert(sanitizeForSpreadsheet('Normal Company Name') === 'Normal Company Name', 'Preserves benign strings unaltered');

  // TEST SUITE 2: Sliding-Window IP Rate Limiter
  console.log('\n2. Sliding-Window Rate Limiter:');
  const testIp = '198.51.100.42';
  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(testIp, 5, 1000);
    assert(res.allowed === true, `Request #${i} permitted under threshold`);
  }
  const blockedRes = checkRateLimit(testIp, 5, 1000);
  assert(blockedRes.allowed === false, 'Request #6 blocked by rate limit');

  // TEST SUITE 3: Health Check Endpoint
  console.log('\n3. GET /api/health Endpoint:');
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await healthHandler(req, res);
    assert(res.statusCode === 200, 'Returns HTTP 200');
    assert(res.data && res.data.status === 'healthy', 'Reports healthy status');
    assert(res.data.version === '1.1.0', 'Reports correct version 1.1.0');
  }

  // TEST SUITE 4: Contact API Validation & Anti-Spam
  console.log('\n4. POST /api/contact Input Validation:');
  
  // 4a. Valid Inquiry
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'alex@company.com',
        company: 'Veyronix Test Corp',
        projectType: 'AI Business Automation',
        budget: '$5,000 – $10,000',
        description: 'Need a custom n8n and GoHighLevel pipeline for automated lead processing.',
        _t: (Date.now() - 5000).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 200, 'Valid submission returns HTTP 200');
    assert(res.data && res.data.success === true, 'Response contains success=true');
    assert(res.data && typeof res.data.leadId === 'string' && res.data.leadId.startsWith('VYX-'), 'Generates valid Lead ID format VYX-YYYYMMDD-XXXXXX');
  }

  // 4b. Invalid Email
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'Alex',
        email: 'not-an-email',
        company: 'Company',
        description: 'Test project description at least 10 chars long',
        _t: (Date.now() - 5000).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 400, 'Invalid email returns HTTP 400');
    assert(res.data.code === 'VALIDATION_ERROR', 'Returns VALIDATION_ERROR code');
  }

  // 4c. Honeypot Spam Check
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'Bot',
        email: 'bot@spam.com',
        company: 'Spam Corp',
        description: 'Spam message',
        _hp_company_url: 'http://spam-link.ru',
        _t: (Date.now() - 5000).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 200, 'Honeypot returns silent 200 to not train bot');
  }

  // 4d. Rapid Timing Bot Rejection (< 2s)
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'FastBot',
        email: 'fast@bot.com',
        company: 'Fast Corp',
        description: 'Submitted in 100 milliseconds',
        _t: (Date.now() - 100).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 400, 'Sub-second submission rejected as bot');
    assert(res.data.code === 'SPAM_REJECTED', 'Returns SPAM_REJECTED code');
  }

  // TEST SUITE 5: Admin Security & Authorization
  console.log('\n5. Admin Security & Endpoint Protection:');

  // 5a. Auth Check without Token
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await authCheckHandler(req, res);
    assert(res.statusCode === 401, 'Unauthenticated /api/admin/auth-check returns HTTP 401');
  }

  // 5b. Leads API without Token
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await leadsHandler(req, res);
    assert(res.statusCode === 401, 'Unauthenticated /api/admin/leads returns HTTP 401');
  }

  // 5c. Analytics API without Token
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await analyticsHandler(req, res);
    assert(res.statusCode === 401, 'Unauthenticated /api/admin/analytics returns HTTP 401');
  }

  // 5d. POST /api/admin/login with Valid Credentials
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        email: 'veyronixtechnologies@gmail.com',
        password: 'Veyronix987654321#'
      }
    });
    const loginHandler = (await import('./api/admin/login.js')).default;
    await loginHandler(req, res);
    assert(res.statusCode === 200, 'Valid admin credentials return HTTP 200');
    assert(res.data && res.data.success === true && typeof res.data.token === 'string', 'Returns valid signed session token');

    // Test authenticated request with the generated token
    const token = res.data.token;
    const authReq = createMockReqRes({
      method: 'GET',
      headers: { 'authorization': `Bearer ${token}` }
    });
    await authCheckHandler(authReq.req, authReq.res);
    assert(authReq.res.statusCode === 200, 'Session token passes /api/admin/auth-check');
  }

  // 5e. POST /api/admin/login with Invalid Password
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        email: 'veyronixtechnologies@gmail.com',
        password: 'WrongPassword123!'
      }
    });
    const loginHandler = (await import('./api/admin/login.js')).default;
    await loginHandler(req, res);
    assert(res.statusCode === 401, 'Invalid password returns HTTP 401');
  }

  // Final Summary
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
