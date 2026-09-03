/**
 * Transactional Email Delivery via Resend
 * Sends Admin Notification + Client Confirmation
 */

import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_your_resend_api_key_here') {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Sends Admin Notification Email to veyronixtechnologies@gmail.com
 * @param {object} lead 
 */
export async function sendAdminNotificationEmail(lead) {
  const resend = getResendClient();
  const adminEmail = process.env.EMAIL_TO || 'veyronixtechnologies@gmail.com';
  const fromEmail = process.env.EMAIL_FROM || 'Veyronix System <onboarding@resend.dev>';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veyronixtechnologies.vercel.app';

  const subject = `New Veyronix Project Inquiry — ${lead.company || `${lead.firstName} ${lead.lastName}`}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#060709; color:#FFFFFF; margin:0; padding:24px; }
    .card { background:#0E1118; border:1px solid rgba(213, 180, 95, 0.3); border-radius:12px; max-width:620px; margin:0 auto; padding:32px; }
    .eyebrow { font-family: monospace; font-size:12px; color:#D5B45F; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; }
    h1 { font-size:22px; color:#FFFFFF; margin:0 0 20px; font-weight:700; }
    .badge { display:inline-block; padding:4px 10px; background:rgba(213, 180, 95, 0.15); color:#E5CB82; border:1px solid rgba(213, 180, 95, 0.4); border-radius:6px; font-family:monospace; font-size:12px; font-weight:bold; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:24px 0; }
    .field { background:rgba(255, 255, 255, 0.02); border:1px solid rgba(255, 255, 255, 0.06); padding:12px 14px; border-radius:8px; }
    .field-label { font-size:11px; color:#9E9689; text-transform:uppercase; margin-bottom:4px; font-family:monospace; }
    .field-val { font-size:14px; color:#FFFFFF; font-weight:600; word-break:break-all; }
    .full-width { grid-column:1 / -1; }
    .brief-box { background:rgba(213, 180, 95, 0.05); border-left:3px solid #D5B45F; padding:16px; margin:20px 0; border-radius:0 8px 8px 0; font-size:14px; line-height:1.6; color:#E2DDD5; white-space:pre-wrap; }
    .btn { display:inline-block; background:linear-gradient(135deg, #E5CB82 0%, #D5B45F 100%); color:#060709; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px; margin-top:20px; }
    .footer { font-family:monospace; font-size:11px; color:#6B6458; margin-top:32px; border-top:1px solid rgba(255, 255, 255, 0.08); padding-top:16px; text-align:center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">NEW INBOUND INQUIRY</div>
    <h1>Project Brief Received</h1>
    <div>
      <span class="badge">LEAD ID: ${lead.leadId}</span>
    </div>

    <div class="grid">
      <div class="field">
        <div class="field-label">Contact Name</div>
        <div class="field-val">${lead.firstName} ${lead.lastName}</div>
      </div>
      <div class="field">
        <div class="field-label">Company</div>
        <div class="field-val">${lead.company || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Work Email</div>
        <div class="field-val">${lead.email}</div>
      </div>
      <div class="field">
        <div class="field-label">Phone / WhatsApp</div>
        <div class="field-val">${lead.phone || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Primary Scope</div>
        <div class="field-val" style="color:#D5B45F;">${lead.projectType}</div>
      </div>
      <div class="field">
        <div class="field-label">Budget Range</div>
        <div class="field-val">${lead.budget || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Target Timeline</div>
        <div class="field-val">${lead.timeline || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Country / Timezone</div>
        <div class="field-val">${lead.timezone || '—'}</div>
      </div>
    </div>

    <div class="field-label" style="margin-top:16px;">Project Brief & Scope:</div>
    <div class="brief-box">${lead.description}</div>

    ${lead.techStack ? `
    <div class="field" style="margin-bottom:16px;">
      <div class="field-label">Current Software Stack:</div>
      <div class="field-val">${lead.techStack}</div>
    </div>` : ''}

    <div class="field" style="font-size:12px; color:#9E9689;">
      <div class="field-label">Marketing Attribution:</div>
      <div>Source: ${lead.utmSource || 'direct'} · Medium: ${lead.utmMedium || 'none'} · Campaign: ${lead.utmCampaign || 'none'}</div>
      <div>Referrer: ${lead.referrer || 'none'} · Landing: ${lead.landingPage || '/'}</div>
    </div>

    <div style="text-align:center;">
      <a href="${siteUrl}/admin" class="btn">View in Veyronix Admin Dashboard ↗</a>
    </div>

    <div class="footer">
      VEYRONIX TECHNOLOGY PRIVATE LIMITED · VISION • VELOCITY • VENTURE
    </div>
  </div>
</body>
</html>
  `;

  if (!resend) {
    console.log('[Email Mock - Admin Notification]', { to: adminEmail, subject, leadId: lead.leadId });
    return { success: true, mocked: true };
  }

  return await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    replyTo: lead.email,
    subject,
    html: htmlContent
  });
}

/**
 * Sends Confirmation Email to the prospect
 * @param {object} lead 
 */
export async function sendClientConfirmationEmail(lead) {
  const resend = getResendClient();
  const fromEmail = process.env.EMAIL_FROM || 'Veyronix Team <onboarding@resend.dev>';

  const subject = `We've received your project brief — Veyronix`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#060709; color:#FFFFFF; margin:0; padding:24px; }
    .card { background:#0E1118; border:1px solid rgba(213, 180, 95, 0.3); border-radius:12px; max-width:580px; margin:0 auto; padding:36px; }
    .eyebrow { font-family: monospace; font-size:12px; color:#D5B45F; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; }
    h1 { font-size:22px; color:#FFFFFF; margin:0 0 16px; font-weight:700; }
    p { font-size:15px; line-height:1.65; color:#E2DDD5; margin:0 0 16px; }
    .ref-box { background:rgba(213, 180, 95, 0.08); border:1px solid rgba(213, 180, 95, 0.3); border-radius:8px; padding:16px; margin:24px 0; text-align:center; }
    .ref-label { font-family:monospace; font-size:11px; color:#9E9689; text-transform:uppercase; margin-bottom:4px; }
    .ref-code { font-family:monospace; font-size:18px; font-weight:bold; color:#E5CB82; letter-spacing:1px; }
    .footer { font-family:monospace; font-size:11px; color:#6B6458; margin-top:32px; border-top:1px solid rgba(255, 255, 255, 0.08); padding-top:16px; text-align:center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">CONFIRMATION OF RECEIPT</div>
    <h1>Thank you for reaching out to Veyronix</h1>
    
    <p>Hi ${lead.firstName},</p>
    
    <p>
      Your project brief for <strong>${lead.projectType}</strong> has been received by our engineering team.
    </p>

    <div class="ref-box">
      <div class="ref-label">Inquiry Reference Number</div>
      <div class="ref-code">${lead.leadId}</div>
    </div>

    <p>
      Our team will review your requirements, evaluate the technical architecture, and follow up directly via the contact details you provided.
    </p>

    <p style="margin-top:28px; color:#D5B45F; font-weight:600;">
      Vision. Velocity. Venture.
    </p>

    <p style="color:#9E9689; font-size:13px;">
      Veyronix Technology Private Limited<br>
      <a href="mailto:veyronixtechnologies@gmail.com" style="color:#D5B45F; text-decoration:none;">veyronixtechnologies@gmail.com</a> · +92 339 0023451
    </p>

    <div class="footer">
      © ${new Date().getFullYear()} Veyronix Technology Private Limited. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  if (!resend) {
    console.log('[Email Mock - Client Confirmation]', { to: lead.email, subject, leadId: lead.leadId });
    return { success: true, mocked: true };
  }

  return await resend.emails.send({
    from: fromEmail,
    to: lead.email,
    subject,
    html: htmlContent
  });
}
