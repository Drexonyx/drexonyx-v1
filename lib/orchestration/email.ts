// Orchestration alert emails via Resend (Architecture v2 §20 P2).
// Best-effort: email failures are logged but do not roll back task state.
// RESEND_API_KEY and ORCHESTRATION_ALERT_EMAIL are server-side only.

import { Resend } from 'resend';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getAlertAddress(): { from: string; to: string } | null {
  const from = process.env.RESEND_FROM_ADDRESS;
  const to = process.env.ORCHESTRATION_ALERT_EMAIL;
  if (!from || !to) return null;
  return { from, to };
}

export async function sendEscalationEmail(params: {
  taskId: string;
  organizationId: string;
  reason: string;
}): Promise<void> {
  const resend = getResendClient();
  const addr = getAlertAddress();
  if (!resend || !addr) return;

  const shortId = params.taskId.slice(0, 8);
  const adminUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/agent-tasks/${params.taskId}`
    : `/admin/agent-tasks/${params.taskId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Task Escalated — ${esc(shortId)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;font-weight:700;margin-bottom:8px;">Agent Task Escalated</h1>
  <p style="color:#4b5563;margin-bottom:16px;">Task <strong style="font-family:monospace;">${esc(shortId)}</strong> has been escalated and requires your attention.</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <tbody>
      <tr>
        <td style="padding:8px 12px;background:#f9fafb;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;width:30%;">Task ID</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;">${esc(params.taskId)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f9fafb;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;">Reason</td>
        <td style="padding:8px 12px;">${esc(params.reason)}</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size:13px;color:#6b7280;">
    Review this task on the <a href="${esc(adminUrl)}" style="color:#4f46e5;">DREXONYX admin dashboard</a>.
  </p>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: addr.from,
      to: [addr.to],
      subject: `[DREXONYX] Task escalated — ${shortId}`,
      html,
    });
  } catch {
    // Best-effort — do not propagate email failures
  }
}

export async function sendBoundaryViolationAlert(params: {
  taskId: string;
  organizationId: string;
  attemptedAction: string;
  blockReason: string;
}): Promise<void> {
  const resend = getResendClient();
  const addr = getAlertAddress();
  if (!resend || !addr) return;

  const shortId = params.taskId.slice(0, 8);
  const adminUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/agent-tasks/${params.taskId}`
    : `/admin/agent-tasks/${params.taskId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>BOUNDARY VIOLATION — ${esc(shortId)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#dc2626;">Boundary Violation Detected</h1>
  <p style="color:#4b5563;margin-bottom:16px;">A boundary violation was blocked in task <strong style="font-family:monospace;">${esc(shortId)}</strong>. The attempt was rejected and audited.</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #fca5a5;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <tbody>
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;width:35%;">Task ID</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;">${esc(params.taskId)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;">Attempted Action</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;">${esc(params.attemptedAction)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;">Block Reason</td>
        <td style="padding:8px 12px;">${esc(params.blockReason)}</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size:13px;color:#6b7280;">
    Review this task on the <a href="${esc(adminUrl)}" style="color:#4f46e5;">DREXONYX admin dashboard</a>.
  </p>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: addr.from,
      to: [addr.to],
      subject: `[DREXONYX] BOUNDARY VIOLATION blocked — ${shortId}`,
      html,
    });
  } catch {
    // Best-effort — do not propagate email failures
  }
}
