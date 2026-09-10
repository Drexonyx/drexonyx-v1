// DR 0107: Quote notification email via Resend.
// RESEND_API_KEY is server-side only — never NEXT_PUBLIC_.
// Best-effort: caller catches failures without state rollback.

import { Resend } from 'resend';

export async function sendQuoteNotificationEmail(params: {
  to: string[];
  quoteId: string;
  organizationName: string;
  totalAmount: string;
  currency: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY environment variable is required');

  const from = process.env.RESEND_FROM_ADDRESS;
  if (!from) throw new Error('RESEND_FROM_ADDRESS environment variable is required');

  const { to, quoteId, organizationName, totalAmount, currency } = params;

  const portalUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/portal/quotes`
    : '/portal/quotes';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your DREXONYX quote is ready for review</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;font-weight:700;margin-bottom:8px;">Quote Ready for Review</h1>
  <p style="color:#4b5563;margin-bottom:20px;">
    Hi ${esc(organizationName)}, a new quote
    <strong style="font-family:monospace;">${esc(quoteId.slice(0, 8))}</strong>
    has been sent for your review.
  </p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <tbody>
      <tr>
        <td style="padding:8px 12px;background:#f9fafb;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;width:40%;">Total</td>
        <td style="padding:8px 12px;">${esc(totalAmount)} ${esc(currency)}</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size:13px;color:#6b7280;">
    Review and respond to your quote on the
    <a href="${esc(portalUrl)}" style="color:#4f46e5;">DREXONYX client portal</a>.
  </p>
</body>
</html>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Your DREXONYX quote is ready for review — ${quoteId.slice(0, 8)}`,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
