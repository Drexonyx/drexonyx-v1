// DR 0099 §2.5: Transactional delivery email via Resend.
// RESEND_API_KEY is server-side only — never exposed to clients or NEXT_PUBLIC_* variables.
// Signed URLs in assetLinks are generated on-demand; they are not persisted (DR 0086 §2.8).

import { Resend } from 'resend';

export type DeliveryAssetLink = {
  assetId: string;
  assetName: string;
  url: string;
  expiresAt: string;
};

export async function sendDeliveryEmail(params: {
  to: string[];
  deliveryId: string;
  organizationName: string;
  assetLinks: DeliveryAssetLink[];
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY environment variable is required');

  const from = process.env.RESEND_FROM_ADDRESS;
  if (!from) throw new Error('RESEND_FROM_ADDRESS environment variable is required');

  const { to, deliveryId, organizationName, assetLinks } = params;

  const assetRows = assetLinks
    .map(
      (link) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${esc(link.assetName)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
        <a href="${esc(link.url)}" style="color:#4f46e5;">Download</a>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
        ${esc(link.expiresAt)}
      </td>
    </tr>`,
    )
    .join('');

  const portalUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/portal/deliveries`
    : '/portal/deliveries';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your DREXONYX delivery is ready</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;font-weight:700;margin-bottom:8px;">Delivery Ready</h1>
  <p style="color:#4b5563;margin-bottom:20px;">
    Hi ${esc(organizationName)}, your delivery
    <strong style="font-family:monospace;">${esc(deliveryId.slice(0, 8))}</strong> is ready for download.
  </p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Asset</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Download</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Expires</th>
      </tr>
    </thead>
    <tbody>${assetRows}</tbody>
  </table>
  <p style="font-size:13px;color:#6b7280;">
    Links expire after 7 days. You can also access your delivery on the
    <a href="${esc(portalUrl)}" style="color:#4f46e5;">DREXONYX client portal</a>.
  </p>
</body>
</html>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Your DREXONYX delivery is ready — ${deliveryId.slice(0, 8)}`,
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
