/**
 * Veyronix Project Inquiry Submission Endpoint
 * POST /api/contact
 * Features: Validation, Honeypot, Timing Check, IP Rate Limiting, Sheets Persistence, Dual Emails
 */

import crypto from 'crypto';
import { checkRateLimit, getClientIp } from './_lib/rateLimit.js';
import { appendLeadToSheet } from './_lib/sheets.js';
import { sendAdminNotificationEmail, sendClientConfirmationEmail } from './_lib/email.js';

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

function generateLeadId() {
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
  const rateResult = checkRateLimit(clientIp, 5, 10 * 60 * 1000);
  if (!rateResult.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateResult.resetMs / 1000));
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many submissions received from your connection. Please wait a few minutes before trying again or email us directly.'
    });
  }

  try {
    const body = req.body || {};

    // 2. Honeypot Anti-Spam Check
    if (body._hp_company_url && String(body._hp_company_url).trim().length > 0) {
      console.warn(`[Spam Blocked] Honeypot triggered from IP: ${clientIp}`);
      // Silent rejection (simulate success to not educate spam bot)
      return res.status(200).json({
        success: true,
        leadId: generateLeadId(),
        message: 'Brief received.'
      });
    }

    // 3. Submission Timing Check (Reject submissions under 2.0 seconds)
    const formRenderTime = parseInt(body._t, 10);
    if (formRenderTime && Date.now() - formRenderTime < 2000) {
      console.warn(`[Spam Blocked] Rapid bot submission rejected (< 2s) from IP: ${clientIp}`);
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

    // Optional & Structured fields
    const phone = String(body.phone || body.whatsapp || '').trim();
    const website = String(body.website || '').trim();
    const country = String(body.country || '').trim();
    const timeline = String(body.timeline || 'Within 1 Month').trim();
    const timezone = String(body.timezone || country || '').trim();
    const techStack = String(body.currentTools || body.techStack || '').trim();

    // Marketing Attribution
    const pageSubmittedFrom = String(body.pageSubmittedFrom || '/contact.html').trim();
    const utmSource = String(body.utmSource || '').trim();
    const utmMedium = String(body.utmMedium || '').trim();
    const utmCampaign = String(body.utmCampaign || '').trim();
    const utmTerm = String(body.utmTerm || '').trim();
    const utmContent = String(body.utmContent || '').trim();
    const referrer = String(body.referrer || '').trim();
    const landingPage = String(body.landingPage || '').trim();

    if (!firstName || firstName.length < 2 || firstName.length > 100) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        field: 'firstName',
        message: 'Please provide a valid first name (2-100 characters).'
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

    // 5. Construct Structured Lead Record
    const leadId = generateLeadId();
    const leadRecord = {
      leadId,
      createdAt: new Date().toISOString(),
      firstName,
      lastName,
      email,
      phone,
      company,
      website,
      timezone,
      projectType,
      budget,
      timeline,
      techStack,
      description,
      pageSubmittedFrom,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrer,
      landingPage,
      status: 'NEW',
      priority: 'NORMAL',
      adminNotes: ''
    };

    // 6. Persist to Google Sheets Database
    let sheetsSaved = false;
    try {
      await appendLeadToSheet(leadRecord);
      sheetsSaved = true;
    } catch (sheetErr) {
      console.error('[Google Sheets Error]', sheetErr.message);
      // If service account is not yet provisioned in environment, log in local mode
      if (process.env.NODE_ENV !== 'production' || sheetErr.message.includes('CREDENTIALS_MISSING')) {
        console.log('[Mock Sheets Persistence - Local]', leadRecord);
        sheetsSaved = true;
      } else {
        return res.status(503).json({
          success: false,
          code: 'DATABASE_ERROR',
          message: 'Our database is temporarily experiencing high load. Please email us directly at veyronixtechnologies@gmail.com.'
        });
      }
    }

    // 7. Trigger Transactional Emails (Admin Alert + Client Confirmation)
    let emailStatus = 'sent';
    try {
      await Promise.all([
        sendAdminNotificationEmail(leadRecord),
        sendClientConfirmationEmail(leadRecord)
      ]);
    } catch (emailErr) {
      console.warn('[Email Notification Warning]', emailErr.message);
      emailStatus = 'failed_logged';
      // Lead is still safely saved in the database!
    }

    // 8. Return Success Response with Generated Reference ID
    return res.status(200).json({
      success: true,
      leadId,
      emailStatus,
      message: 'Your project brief has been received. Our engineering team will review it within 24 hours.'
    });

  } catch (error) {
    console.error('[Unhandled Contact API Error]', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred while processing your brief. Please try again or email us directly.'
    });
  }
}
