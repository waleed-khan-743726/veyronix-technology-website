/**
 * Veyronix Project Inquiry Submission Endpoint
 * POST /api/contact
 * Features: Strict Server-Side Validation, Anti-Spam (Honeypot + Timing), IP Rate Limiting,
 * Verified Google Sheets CRM Persistence (Zero False-Positives), Dual Transactional Emails
 */

import crypto from 'crypto';
import { checkRateLimit, getClientIp } from './_lib/rateLimit.js';
import { appendLeadToSheet, logErrorToSheet } from './_lib/sheets.js';
import { sendAdminNotificationEmail, sendClientConfirmationEmail } from './_lib/email.js';

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

export function generateLeadId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VYX-${dateStr}-${randomHex}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are allowed on this endpoint.'
    });
  }

  // 1. Rate Limiting Check (Max 5 submissions per 10 minutes per IP)
  const clientIp = getClientIp(req);
  const rateResult = checkRateLimit(`contact_${clientIp}`, 5, 10 * 60 * 1000);
  if (!rateResult.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateResult.resetMs / 1000));
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many submissions received from your connection. Please wait a few minutes before trying again or email us directly at veyronixtechnologies@gmail.com.'
    });
  }

  const requestId = `REQ-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

  try {
    const body = req.body || {};

    // 2. Honeypot Anti-Spam Check
    if (body._hp_company_url && String(body._hp_company_url).trim().length > 0) {
      console.warn(`[Spam Blocked] Honeypot triggered from IP: ${clientIp}`);
      return res.status(200).json({
        success: true,
        leadId: generateLeadId(),
        persisted: false,
        message: 'Brief received.'
      });
    }

    // 3. Submission Timing Check (Reject submissions under 1.5 seconds)
    const formRenderTime = parseInt(body._t, 10);
    if (formRenderTime && Date.now() - formRenderTime < 1500) {
      console.warn(`[Spam Blocked] Rapid bot submission rejected (< 1.5s) from IP: ${clientIp}`);
      return res.status(400).json({
        success: false,
        code: 'SPAM_REJECTED',
        message: 'Submission completed too quickly. Please try again.'
      });
    }

    // 4. Server-Side Field Validation
    const firstName = String(body.firstName || body.name || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const company = String(body.company || body.organization || '').trim();
    const projectType = String(body.projectType || 'General Engineering Scope').trim();
    const budget = String(body.budget || '$2,500 – $5,000').trim();
    const description = String(body.description || body.projectBrief || body.projectDescription || body.brief || body.message || '').trim();

    // Structured & Optional fields
    const phone = String(body.phone || body.whatsapp || '').trim();
    const website = String(body.website || '').trim();
    const country = String(body.country || '').trim();
    const timeline = String(body.timeline || 'Within 1 Month').trim();
    const timezone = String(body.timezone || country || '').trim();
    const techStack = String(body.currentTools || body.techStack || body.currentStack || '').trim();

    // Visitor & Session Attribution
    const visitorId = String(body.visitorId || '').trim();
    const sessionId = String(body.sessionId || '').trim();
    const pageSubmittedFrom = String(body.pageSubmittedFrom || '/contact.html').trim();
    const utmSource = String(body.utmSource || body.first_utm_source || '').trim();
    const utmMedium = String(body.utmMedium || body.first_utm_medium || '').trim();
    const utmCampaign = String(body.utmCampaign || body.first_utm_campaign || '').trim();
    const utmTerm = String(body.utmTerm || body.first_utm_term || '').trim();
    const utmContent = String(body.utmContent || body.first_utm_content || '').trim();
    const referrer = String(body.referrer || body.first_referrer || '').trim();
    const landingPage = String(body.landingPage || body.first_landing_page || '').trim();

    if (!firstName || firstName.length < 2 || firstName.length > 100) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        field: 'firstName',
        message: 'Please provide a valid first name (2-100 characters).'
      });
    }

    if (!lastName || lastName.length < 1 || lastName.length > 100) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        field: 'lastName',
        message: 'Please provide your last name.'
      });
    }

    if (!isValidEmail(email) || email.length > 150) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        field: 'email',
        message: 'Please provide a valid email address.'
      });
    }

    if (!company || company.length < 2 || company.length > 150) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        field: 'company',
        message: 'Please provide your company or organization name.'
      });
    }

    if (!description || description.length < 10 || description.length > 5000) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        field: 'description',
        message: 'Please provide a brief description of your project requirements (at least 10 characters).'
      });
    }

    // 5. Construct Canonical Lead Record
    const leadId = generateLeadId();
    const createdAt = new Date().toISOString();

    const leadRecord = {
      leadId,
      createdAt,
      firstName,
      lastName,
      email,
      phone,
      company,
      website,
      country,
      timezone,
      projectType,
      budget,
      timeline,
      techStack,
      description,
      landingPage,
      pageSubmittedFrom,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      sessionId,
      visitorId,
      status: 'NEW',
      priority: 'NORMAL',
      adminNotes: '',
      lastUpdated: createdAt,
      emailNotificationStatus: 'pending',
      clientConfirmationStatus: 'pending',
      source: 'Inbound Website Form'
    };

    // 6. STRICT PERSISTENCE: Write to Google Sheets CRM
    // Zero False-Positive Guarantee: If Sheets write fails, FAIL the request!
    try {
      const sheetResult = await appendLeadToSheet(leadRecord);
      if (!sheetResult || !sheetResult.success) {
        throw new Error('SHEETS_APPEND_CONFIRMATION_MISSING');
      }
    } catch (sheetErr) {
      console.error('[Google Sheets Persistence Failure]', sheetErr.message);
      
      // Log failure to error logging
      await logErrorToSheet({
        requestId,
        endpoint: '/api/contact',
        leadId,
        errorCode: 'LEAD_PERSISTENCE_FAILED',
        summary: sheetErr.message
      });

      return res.status(500).json({
        success: false,
        code: 'LEAD_PERSISTENCE_FAILED',
        message: 'We could not save your project brief to our CRM database at this moment. Please email our engineering team directly at veyronixtechnologies@gmail.com.'
      });
    }

    // 7. Transactional Dual Emails (Admin Notification + Prospect Confirmation)
    let emailStatus = 'sent';
    try {
      await Promise.all([
        sendAdminNotificationEmail(leadRecord),
        sendClientConfirmationEmail(leadRecord)
      ]);
      leadRecord.emailNotificationStatus = 'sent';
      leadRecord.clientConfirmationStatus = 'sent';
    } catch (emailErr) {
      console.warn('[Email Dispatch Warning]', emailErr.message);
      emailStatus = 'failed_logged';
      leadRecord.emailNotificationStatus = 'failed';
    }

    // 8. Return Verified HTTP 201 Success Response
    return res.status(201).json({
      success: true,
      persisted: true,
      leadId,
      emailStatus,
      message: 'Your project brief has been received and logged in our system. Our engineering team will review it within 24 business hours.'
    });

  } catch (error) {
    console.error('[Unhandled Contact API Error]', error);
    await logErrorToSheet({
      requestId,
      endpoint: '/api/contact',
      errorCode: 'UNHANDLED_EXCEPTION',
      summary: error.message
    });

    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred while processing your brief. Please email us directly at veyronixtechnologies@gmail.com.'
    });
  }
}
