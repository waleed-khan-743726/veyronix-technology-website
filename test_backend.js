/**
 * Comprehensive Automated Production Backend Test Suite for Veyronix
 * Run with: node test_backend.js
 */

import {
  sanitizeForSpreadsheet,
  normalizePrivateKey,
  getColumnLetter,
  LEADS_HEADERS,
  VISITOR_SESSIONS_HEADERS,
  EVENTS_HEADERS,
  ACTIVITY_HEADERS,
  ANALYTICS_SUMMARY_HEADERS,
  ERROR_LOG_HEADERS
} from './api/_lib/sheets.js';
import { checkRateLimit } from './api/_lib/rateLimit.js';
import { generateLeadId } from './api/contact.js';
import healthHandler from './api/health.js';
import contactHandler from './api/contact.js';
import authCheckHandler from './api/admin/auth-check.js';
import leadsHandler from './api/admin/leads.js';
import analyticsHandler from './api/admin/analytics.js';
import journeyHandler from './api/admin/journey.js';
import eventHandler from './api/analytics/event.js';
import loginHandler from './api/admin/login.js';

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
  console.log('  VEYRONIX TECHNOLOGY — PRODUCTION BACKEND TEST SUITE');
  console.log('======================================================\n');

  // TEST SUITE 1: Formula Injection Neutralization
  console.log('1. Formula Injection & Spreadsheet Sanitization:');
  assert(sanitizeForSpreadsheet('=SUM(A1:A10)') === "'=SUM(A1:A10)", 'Prepends single quote to formula starting with =');
  assert(sanitizeForSpreadsheet('+12345') === "'+12345", 'Prepends single quote to string starting with +');
  assert(sanitizeForSpreadsheet('-500') === "'-500", 'Prepends single quote to string starting with -');
  assert(sanitizeForSpreadsheet('@danger') === "'@danger", 'Prepends single quote to string starting with @');
  assert(sanitizeForSpreadsheet('\tadmin').startsWith("'"), 'Neutralizes tab character at start of string');
  assert(sanitizeForSpreadsheet('Normal Company Name') === 'Normal Company Name', 'Preserves benign strings unaltered');
  assert(sanitizeForSpreadsheet(null) === '', 'Handles null gracefully');
  assert(sanitizeForSpreadsheet(undefined) === '', 'Handles undefined gracefully');

  // TEST SUITE 2: Column Letter & Private Key Utilities
  console.log('\n2. Google Sheets Utilities:');
  assert(getColumnLetter(1) === 'A', '1 converts to A');
  assert(getColumnLetter(26) === 'Z', '26 converts to Z');
  assert(getColumnLetter(27) === 'AA', '27 converts to AA');
  assert(getColumnLetter(32) === 'AF', '32 converts to AF (LEADS header column)');
  assert(normalizePrivateKey('"-----BEGIN KEY-----\\nMIIE\\n-----END KEY-----"') === '-----BEGIN KEY-----\nMIIE\n-----END KEY-----', 'Unescapes \\n and strips surrounding quotes');

  // TEST SUITE 3: Google Sheets CRM Tab Definitions
  console.log('\n3. Google Sheets CRM Schema Integrity:');
  assert(LEADS_HEADERS.length === 32, 'LEADS schema has exactly 32 columns');
  assert(LEADS_HEADERS.includes('Lead ID') && LEADS_HEADERS.includes('Session ID') && LEADS_HEADERS.includes('Visitor ID'), 'LEADS schema includes identifiers');
  assert(VISITOR_SESSIONS_HEADERS.length === 23, 'VISITOR_SESSIONS schema has 23 columns');
  assert(VISITOR_SESSIONS_HEADERS.includes('Converted') && VISITOR_SESSIONS_HEADERS.includes('Lead ID'), 'VISITOR_SESSIONS includes conversion link fields');
  assert(EVENTS_HEADERS.length === 14, 'EVENTS schema has 14 columns');
  assert(ACTIVITY_HEADERS.length === 7, 'ACTIVITY schema has 7 columns');
  assert(ANALYTICS_SUMMARY_HEADERS.length === 5, 'ANALYTICS_SUMMARY schema has 5 columns');
  assert(ERROR_LOG_HEADERS.length === 6, 'ERROR_LOG schema has 6 columns');

  // TEST SUITE 4: Lead ID Generation
  console.log('\n4. Lead ID Generator:');
  const leadId1 = generateLeadId();
  const leadId2 = generateLeadId();
  assert(leadId1.startsWith('VYX-') && leadId1.length >= 18, `Lead ID format correct: ${leadId1}`);
  assert(leadId1 !== leadId2, 'Generated Lead IDs are unique');

  // TEST SUITE 5: Sliding-Window IP Rate Limiter
  console.log('\n5. Sliding-Window Rate Limiter:');
  const testIp = '198.51.100.99';
  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(testIp, 5, 1000);
    assert(res.allowed === true, `Request #${i} permitted under threshold`);
  }
  const blockedRes = checkRateLimit(testIp, 5, 1000);
  assert(blockedRes.allowed === false, 'Request #6 blocked by rate limit');

  // TEST SUITE 6: Health Check Endpoint
  console.log('\n6. GET /api/health Endpoint:');
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await healthHandler(req, res);
    assert(res.statusCode === 200, 'Health endpoint returns HTTP 200');
    assert(res.data && res.data.status === 'healthy', 'Reports healthy status');
    assert(res.data.version === '1.3.0', 'Reports correct version 1.3.0');
    assert(typeof res.data.integrations === 'object', 'Includes integrations status object');
  }

  // TEST SUITE 7: Contact API Validation & Anti-Spam
  console.log('\n7. POST /api/contact Validation & Security:');
  
  // 7a. Invalid Email Validation
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'invalid-email-address',
        company: 'Veyronix Test Corp',
        description: 'Need a custom pipeline build for testing validation errors.',
        _t: (Date.now() - 5000).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 400, 'Invalid email returns HTTP 400');
    assert(res.data.code === 'VALIDATION_ERROR', 'Returns VALIDATION_ERROR code');
    assert(res.data.field === 'email', 'Identifies email field error');
  }

  // 7b. Missing First Name
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: '',
        lastName: 'Morgan',
        email: 'alex@valid.com',
        company: 'Company',
        description: 'Test project description at least 10 chars',
        _t: (Date.now() - 5000).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 400, 'Missing first name returns HTTP 400');
    assert(res.data.field === 'firstName', 'Identifies firstName error');
  }

  // 7c. Description Too Short (< 10 chars)
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'alex@valid.com',
        company: 'Company',
        description: 'short',
        _t: (Date.now() - 5000).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 400, 'Short description (<10 chars) returns HTTP 400');
    assert(res.data.field === 'description', 'Identifies description error');
  }

  // 7d. Honeypot Spam Check
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'Bot',
        lastName: 'Spammer',
        email: 'bot@spam.com',
        company: 'Spam Corp',
        description: 'Spam message at least 10 chars long',
        _hp_company_url: 'http://spam-bot.ru',
        _t: (Date.now() - 5000).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 200, 'Honeypot returns silent 200 to not educate bot');
    assert(res.data.persisted === false, 'Honeypot submission is NOT persisted');
  }

  // 7e. Rapid Timing Bot Rejection (< 1.5s)
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        firstName: 'FastBot',
        lastName: 'Runner',
        email: 'fast@bot.com',
        company: 'Fast Corp',
        description: 'Submitted in 100 milliseconds',
        _t: (Date.now() - 100).toString()
      }
    });
    await contactHandler(req, res);
    assert(res.statusCode === 400, 'Rapid submission rejected as bot');
    assert(res.data.code === 'SPAM_REJECTED', 'Returns SPAM_REJECTED code');
  }

  // TEST SUITE 8: Analytics Event Endpoint
  console.log('\n8. POST /api/analytics/event Endpoint:');
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        eventName: 'page_view',
        visitorId: 'vyx_v_test123456789',
        sessionId: 'vyx_s_test123456789',
        page: '/solutions.html',
        referrer: 'https://google.com',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'ai_automation'
      }
    });
    await eventHandler(req, res);
    assert(res.statusCode === 200, 'Analytics event returns HTTP 200');
    assert(res.data && res.data.success === true, 'Analytics event succeeds');
  }

  // TEST SUITE 9: Admin Security & Session Authentication
  console.log('\n9. Admin Authentication & Session Security:');

  // 9a. Auth Check without Token
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await authCheckHandler(req, res);
    assert(res.statusCode === 401, 'Unauthenticated /api/admin/auth-check returns HTTP 401');
  }

  // 9b. Leads API without Token
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await leadsHandler(req, res);
    assert(res.statusCode === 401, 'Unauthenticated /api/admin/leads returns HTTP 401');
  }

  // 9c. Analytics API without Token
  {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await analyticsHandler(req, res);
    assert(res.statusCode === 401, 'Unauthenticated /api/admin/analytics returns HTTP 401');
  }

  // 9d. Journey API without Token
  {
    const { req, res } = createMockReqRes({ method: 'GET', query: { leadId: 'VYX-TEST' } });
    await journeyHandler(req, res);
    assert(res.statusCode === 401, 'Unauthenticated /api/admin/journey returns HTTP 401');
  }

  // 9e. POST /api/admin/login with Valid Credentials
  let adminToken = '';
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        email: 'veyronixtechnologies@gmail.com',
        password: 'Veyronix987654321#'
      }
    });
    await loginHandler(req, res);
    assert(res.statusCode === 200, 'Valid admin credentials return HTTP 200');
    assert(res.data && res.data.success === true && typeof res.data.token === 'string', 'Returns valid signed session token');
    adminToken = res.data.token;

    // Test authenticated request with the generated token
    const authReq = createMockReqRes({
      method: 'GET',
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    await authCheckHandler(authReq.req, authReq.res);
    assert(authReq.res.statusCode === 200, 'Generated session token passes /api/admin/auth-check');
  }

  // 9f. POST /api/admin/login with Invalid Password
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        email: 'veyronixtechnologies@gmail.com',
        password: 'WrongPassword123!'
      }
    });
    await loginHandler(req, res);
    assert(res.statusCode === 401, 'Invalid password returns HTTP 401');
  }

  // Final Summary
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
