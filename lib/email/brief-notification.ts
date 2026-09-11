// Best-effort admin notification email when a campaign brief is submitted.
// Failure must NOT block or roll back the DB insert — caller catches.
// RESEND_API_KEY is server-side only; never NEXT_PUBLIC_.

import { Resend } from 'resend';

export async function sendBriefNotificationEmail(params: {
  inquiryId: string;
  brandName: string;
  contactEmail: string;
  website: string | null;
  campaignObjective: string;
  targetAudience: string | null;
  creativeTypes: string | null;
  platforms: string | null;
  additionalNotes: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // not configured — skip silently

  const from = process.env.RESEND_FROM_ADDRESS;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'drexonyx.studio@gmail.com';
  if (!from) return;

  const row = (label: string, value: string | null) =>
    value
      ? `<tr><td style="padding:6px 12px;font-size:12px;color:#6b7280;font-weight:600;background:#f9fafb;width:35%;">${esc(label)}</td><td style="padding:6px 12px;">${esc(value)}</td></tr>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Campaign Brief — ${esc(params.brandName)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:18px;font-weight:700;margin-bottom:4px;">New Campaign Brief Submitted</h1>
  <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">Inquiry ID: <code>${esc(params.inquiryId.slice(0, 8))}</code></p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <tbody>
      ${row('Brand', params.brandName)}
      ${row('Email', params.contactEmail)}
      ${row('Website', params.website)}
      ${row('Objective', params.campaignObjective)}
      ${row('Audience', params.targetAudience)}
      ${row('Creative Types', params.creativeTypes)}
      ${row('Platforms', params.platforms)}
      ${row('Notes', params.additionalNotes)}
    </tbody>
  </table>
  <p style="font-size:12px;color:#9ca3af;">Next step: create org, campaign, brief and quote in admin.</p>
</body>
</html>`;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: [adminEmail],
    subject: `New brief: ${params.brandName}`,
    html,
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
