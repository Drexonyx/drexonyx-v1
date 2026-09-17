// Internal operational notifications via Resend (DR 0119).
// Best-effort: email failures do not propagate. Missing env vars produce a no-op.
// RESEND_API_KEY, RESEND_FROM_ADDRESS, ORCHESTRATION_ALERT_EMAIL — server-side only.
// NEVER includes financial amounts, margins, costs, or provider rates.

import { Resend } from 'resend';

export type InternalNotificationEventType =
  | 'JOB_FAILED'
  | 'QC_COMPLETED'
  | 'MONITORING_ALERT'
  | 'ANOMALY_DETECTED'
  | 'REPORT_READY';

export interface NotificationEmailContent {
  subject: string;
  html: string;
}

const EVENT_LABELS: Record<InternalNotificationEventType, string> = {
  JOB_FAILED: 'Production Job Failed',
  QC_COMPLETED: 'QC Review Completed',
  MONITORING_ALERT: 'Monitoring Alert',
  ANOMALY_DETECTED: 'Operational Anomaly Detected',
  REPORT_READY: 'Report Ready',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildNotificationEmailContent(params: {
  eventType: InternalNotificationEventType;
  title: string;
  detail: string;
  entityId?: string;
  entityType?: string;
  adminBaseUrl?: string;
}): NotificationEmailContent {
  const { eventType, title, detail, entityId, entityType, adminBaseUrl } = params;
  const label = EVENT_LABELS[eventType];
  const shortId = entityId ? entityId.slice(0, 8) : '';

  const entityRow =
    entityId && entityType
      ? `<tr>
        <td style="padding:8px 12px;background:#f9fafb;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;width:30%;">${esc(entityType)}</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;">${esc(entityId)}</td>
      </tr>`
      : '';

  const adminLinkPara = adminBaseUrl
    ? `<p style="font-size:13px;color:#6b7280;">
    Review on the <a href="${esc(adminBaseUrl)}" style="color:#4f46e5;">DREXONYX admin dashboard</a>.
  </p>`
    : '';

  const subject = shortId
    ? `[DREXONYX] ${label} — ${shortId}`
    : `[DREXONYX] ${label}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(label)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;font-weight:700;margin-bottom:8px;">${esc(label)}</h1>
  <p style="color:#4b5563;margin-bottom:16px;">${esc(title)}</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <tbody>
      ${entityRow}
      <tr>
        <td style="padding:8px 12px;background:#f9fafb;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;width:30%;">Detail</td>
        <td style="padding:8px 12px;">${esc(detail)}</td>
      </tr>
    </tbody>
  </table>
  ${adminLinkPara}
</body>
</html>`;

  return { subject, html };
}

export async function sendInternalNotification(params: {
  organizationId: string;
  eventType: InternalNotificationEventType;
  title: string;
  detail: string;
  entityId?: string;
  entityType?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS;
  const to = process.env.ORCHESTRATION_ALERT_EMAIL;

  if (!apiKey || !from || !to) return;

  const adminBaseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin`
    : undefined;

  const { subject, html } = buildNotificationEmailContent({
    ...params,
    adminBaseUrl,
  });

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to: [to], subject, html });
  } catch {
    // Best-effort — do not propagate email failures
  }
}
