// Vercel Cron Job: builds and emails the daily sales intelligence report.
// Report destination: CENTRAL_REPORTING_EMAIL (Irenfold@gmail.com).
// Idempotency: one report per calendar day enforced via idempotency_keys table.
// Authentication: Vercel sets Authorization: Bearer {CRON_SECRET} on every cron invocation.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { buildSalesDailyReport, CENTRAL_REPORTING_EMAIL } from '@/lib/sales/queries';
import type { SalesDailyReport } from '@/lib/sales/queries';
import { Resend } from 'resend';

export const maxDuration = 60; // seconds

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'DREXONYX_ORG_ID not configured' }, { status: 500 });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const idempotencyKey = `sales-daily-report:${today}`;

  // Check if report was already sent today
  const existing = await db
    .select({ id: idempotencyKeys.id, status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempotencyKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === 'COMPLETED') {
    return NextResponse.json({ sent: false, reason: 'already_sent_today', date: today });
  }

  // Build the report
  const report = await buildSalesDailyReport(now);

  // Record idempotency key as PROCESSING (conflict = concurrent run, skip insert silently)
  try {
    await db
      .insert(idempotencyKeys)
      .values({
        key: idempotencyKey,
        organization_id: organizationId,
        operation_type: 'SALES_DAILY_REPORT',
        status: 'PROCESSING',
        expires_at: new Date(now.getTime() + 7 * 24 * 3_600_000),
      })
      .onConflictDoNothing();
  } catch {
    // Non-fatal — proceed with sending
  }

  // Send email via Resend (best-effort: missing env vars produce a no-op)
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_ADDRESS;
  let emailSent = false;
  let emailError: string | undefined;

  if (resendApiKey && fromAddress) {
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: fromAddress,
        to: [CENTRAL_REPORTING_EMAIL],
        subject: `[DREXONYX] Sales Daily Report — ${today}`,
        html: buildReportHtml(report, today),
      });
      emailSent = true;
    } catch (err) {
      emailError = String(err);
      console.error('[cron/sales-daily-report] email send error:', err);
    }
  }

  // Mark idempotency key as COMPLETED or FAILED
  try {
    await db
      .update(idempotencyKeys)
      .set({ status: emailSent ? 'COMPLETED' : 'FAILED', updated_at: new Date() })
      .where(
        and(
          eq(idempotencyKeys.key, idempotencyKey),
          eq(idempotencyKeys.organization_id, organizationId),
        ),
      );
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    sent: emailSent,
    reportedTo: CENTRAL_REPORTING_EMAIL,
    date: today,
    summary: report.summary,
    ...(emailError ? { emailError } : {}),
  });
}

// ── HTML report builder ───────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReportHtml(report: SalesDailyReport, date: string): string {
  const { summary, topOpportunities, issues } = report;

  const topOpsRows = topOpportunities
    .slice(0, 5)
    .map(
      (op) =>
        `<tr>
          <td style="padding:6px 12px;">${esc(op.businessName)}</td>
          <td style="padding:6px 12px;">${op.leadScore}</td>
          <td style="padding:6px 12px;">${esc(op.priority)}</td>
          <td style="padding:6px 12px;">${esc(op.status)}</td>
          <td style="padding:6px 12px;">${esc(op.recommendedAction)}</td>
        </tr>`,
    )
    .join('');

  const issueRows = issues
    .slice(0, 10)
    .map(
      (issue) =>
        `<tr>
          <td style="padding:6px 12px;">${esc(issue.type)}</td>
          <td style="padding:6px 12px;">${esc(issue.description)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Sales Daily Report</title></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:700px;margin:0 auto;padding:24px;">
  <h1 style="font-size:22px;font-weight:700;">DREXONYX Sales Daily Report</h1>
  <p style="color:#6b7280;">Date: ${esc(date)} &middot; Generated: ${esc(report.generatedAt)}</p>

  <h2 style="font-size:16px;margin-top:24px;">Summary</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
    <tbody>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">New Leads</td><td style="padding:6px 12px;">${summary.newLeads}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Qualified Leads</td><td style="padding:6px 12px;">${summary.qualifiedLeads}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Hot Leads</td><td style="padding:6px 12px;">${summary.hotLeads}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Warm Leads</td><td style="padding:6px 12px;">${summary.warmLeads}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Emails Sent</td><td style="padding:6px 12px;">${summary.emailsSent}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Replies Received</td><td style="padding:6px 12px;">${summary.repliesReceived}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Follow-ups Due</td><td style="padding:6px 12px;">${summary.followUpsDue}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Pending Approvals</td><td style="padding:6px 12px;">${summary.pendingApprovals}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:600;">Won Clients</td><td style="padding:6px 12px;">${summary.wonClients}</td></tr>
    </tbody>
  </table>

  ${topOpportunities.length > 0 ? `
  <h2 style="font-size:16px;margin-top:24px;">Top Opportunities</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
    <thead><tr style="background:#f9fafb;">
      <th style="padding:6px 12px;text-align:left;">Business</th>
      <th style="padding:6px 12px;text-align:left;">Score</th>
      <th style="padding:6px 12px;text-align:left;">Priority</th>
      <th style="padding:6px 12px;text-align:left;">Status</th>
      <th style="padding:6px 12px;text-align:left;">Recommended Action</th>
    </tr></thead>
    <tbody>${topOpsRows}</tbody>
  </table>` : ''}

  ${issues.length > 0 ? `
  <h2 style="font-size:16px;margin-top:24px;">Issues (${issues.length})</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
    <thead><tr style="background:#f9fafb;">
      <th style="padding:6px 12px;text-align:left;">Type</th>
      <th style="padding:6px 12px;text-align:left;">Description</th>
    </tr></thead>
    <tbody>${issueRows}</tbody>
  </table>` : ''}
</body>
</html>`;
}
