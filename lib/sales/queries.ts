// MDA Sales Operating System — read-only query layer.
//
// HARD BOUNDARIES:
//   - READ ONLY — no writes, no sends, no external calls
//   - No PII surfaced beyond what agents already hold
//   - Central reporting destination: Irenfold@gmail.com (caller's responsibility to send)
//   - approval_status logic: NOT_REQUIRED is valid for low-risk standard outreach;
//     PENDING/APPROVED/REJECTED gates medium/high-risk actions — see getApprovalPolicy

import { and, eq, gt, lt, lte, gte, inArray, isNull, isNotNull, desc, asc, sql, ne } from 'drizzle-orm';
import { db } from '@/db/index';
import {
  salesLeads,
  leadSources,
  outreachMessages,
  followUps,
  outreachApprovals,
  emailOptOuts,
} from '@/db/schema/sales';
import { auditEvents } from '@/db/schema/system';

// ── Constants ─────────────────────────────────────────────────────────────────

export const CENTRAL_REPORTING_EMAIL = 'Irenfold@gmail.com';

/** Overdue threshold in hours — a follow-up past its scheduled_at by this much is overdue */
export const OVERDUE_FOLLOWUP_GRACE_HOURS = 2;

/** Top opportunities cap */
export const TOP_OPPORTUNITIES_LIMIT = 10;

/** Recent activity window for dashboard */
export const RECENT_ACTIVITY_DAYS = 7;

// ── Lead status / priority types ──────────────────────────────────────────────

export type SalesLeadStatus =
  | 'NEW'
  | 'REVIEWING'
  | 'QUALIFIED'
  | 'OUTREACH_SENT'
  | 'REPLIED'
  | 'FOLLOW_UP'
  | 'WON'
  | 'REJECTED'
  | 'ARCHIVED';

export type SalesLeadPriority = 'HOT' | 'WARM' | 'COLD';

export type OutreachChannel = 'email' | 'instagram' | 'whatsapp' | 'linkedin' | 'manual';

export type OutreachApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';

// ── Row shapes ────────────────────────────────────────────────────────────────

export interface SalesLeadRow {
  id: string;
  full_name: string | null;
  business_name: string;
  country: string | null;
  city: string | null;
  primary_source_platform: string;
  primary_source_url: string | null;
  source_type: string;
  website: string | null;
  public_email: string | null;
  public_contact_method: string | null;
  lead_score: number | null;
  priority: SalesLeadPriority;
  status: SalesLeadStatus;
  opportunity: string | null;
  portfolio_match: string | null;
  notes: string | null;
  discovered_by: string;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

export interface LeadSourceRow {
  id: string;
  lead_id: string;
  platform: string;
  url: string | null;
  handle: string | null;
  identifier: string;
  discovered_at: Date;
}

export interface OutreachMessageRow {
  id: string;
  lead_id: string;
  channel: string;
  message_type: string;
  status: string;
  approval_status: string;
  sent_at: Date | null;
  reply_received_at: Date | null;
  created_at: Date;
}

export interface FollowUpRow {
  id: string;
  lead_id: string;
  outreach_id: string | null;
  scheduled_at: Date;
  channel: string;
  status: string;
  sent_at: Date | null;
  result: string | null;
}

export interface OutreachApprovalRow {
  id: string;
  lead_id: string;
  outreach_id: string | null;
  approval_type: string;
  reason: string | null;
  requested_at: Date;
  status: string;
}

export interface ActivityEventRow {
  id: string;
  entity_type: string;
  entity_id: string;
  actor_role: string | null;
  action: string;
  payload: unknown;
  created_at: Date;
}

// ── Approval policy helper ────────────────────────────────────────────────────

/**
 * Determines whether an outreach action requires human approval.
 *
 * LOW-RISK normal business outreach → NOT_REQUIRED (can be automated per MDA rules).
 * MEDIUM/HIGH-RISK → requires PENDING approval before sending.
 *
 * This is a pure function — no DB access. Call it before inserting outreach_messages
 * to set the correct approval_status value.
 */
export function getApprovalPolicy(opts: {
  channel: OutreachChannel;
  messageType: string;
  hasDiscount: boolean;
  hasContractualCommitment: boolean;
  hasPricingOffer: boolean;
  isSensitiveContent: boolean;
}): OutreachApprovalStatus {
  const { channel, messageType, hasDiscount, hasContractualCommitment, hasPricingOffer, isSensitiveContent } = opts;

  if (
    hasDiscount ||
    hasContractualCommitment ||
    hasPricingOffer ||
    isSensitiveContent
  ) {
    return 'PENDING';
  }

  if (messageType === 'proposal') {
    return 'PENDING';
  }

  if (channel === 'email' && messageType === 'cold_outreach') {
    return 'NOT_REQUIRED';
  }

  if (channel === 'email' && messageType === 'follow_up') {
    return 'NOT_REQUIRED';
  }

  return 'PENDING';
}

// ── Individual lead queries ───────────────────────────────────────────────────

export async function getSalesLeadById(id: string): Promise<SalesLeadRow | null> {
  const rows = await db
    .select()
    .from(salesLeads)
    .where(eq(salesLeads.id, id))
    .limit(1);
  return (rows[0] as SalesLeadRow) ?? null;
}

export interface GetSalesLeadsOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'last_activity_at' | 'lead_score';
  direction?: 'asc' | 'desc';
}

export async function getSalesLeads(opts: GetSalesLeadsOptions = {}): Promise<SalesLeadRow[]> {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'last_activity_at',
    direction = 'desc',
  } = opts;

  const col =
    orderBy === 'lead_score'
      ? salesLeads.lead_score
      : orderBy === 'created_at'
      ? salesLeads.created_at
      : salesLeads.last_activity_at;

  const rows = await db
    .select()
    .from(salesLeads)
    .orderBy(direction === 'asc' ? asc(col) : desc(col))
    .limit(limit)
    .offset(offset);

  return rows as SalesLeadRow[];
}

export async function getSalesLeadsByStatus(
  status: SalesLeadStatus | SalesLeadStatus[],
  opts: GetSalesLeadsOptions = {},
): Promise<SalesLeadRow[]> {
  const { limit = 50, offset = 0 } = opts;
  const statuses = Array.isArray(status) ? status : [status];

  const rows = await db
    .select()
    .from(salesLeads)
    .where(inArray(salesLeads.status, statuses))
    .orderBy(desc(salesLeads.last_activity_at))
    .limit(limit)
    .offset(offset);

  return rows as SalesLeadRow[];
}

export async function getSalesLeadsByPriority(
  priority: SalesLeadPriority | SalesLeadPriority[],
  opts: GetSalesLeadsOptions = {},
): Promise<SalesLeadRow[]> {
  const { limit = 50, offset = 0 } = opts;
  const priorities = Array.isArray(priority) ? priority : [priority];

  const rows = await db
    .select()
    .from(salesLeads)
    .where(inArray(salesLeads.priority, priorities))
    .orderBy(desc(salesLeads.lead_score), desc(salesLeads.last_activity_at))
    .limit(limit)
    .offset(offset);

  return rows as SalesLeadRow[];
}

// ── Deduplication query ───────────────────────────────────────────────────────

/**
 * Returns the existing lead_source row for a given platform+identifier, if any.
 * Agents call this before creating a new sales_lead to prevent duplicates.
 */
export async function getDuplicateSource(
  platform: string,
  identifier: string,
): Promise<LeadSourceRow | null> {
  const rows = await db
    .select()
    .from(leadSources)
    .where(
      and(
        eq(leadSources.platform, platform),
        eq(leadSources.identifier, identifier),
      ),
    )
    .limit(1);

  return (rows[0] as LeadSourceRow) ?? null;
}

// ── Approval queries ──────────────────────────────────────────────────────────

export async function getPendingApprovals(limit = 50): Promise<OutreachApprovalRow[]> {
  const rows = await db
    .select({
      id: outreachApprovals.id,
      lead_id: outreachApprovals.lead_id,
      outreach_id: outreachApprovals.outreach_id,
      approval_type: outreachApprovals.approval_type,
      reason: outreachApprovals.reason,
      requested_at: outreachApprovals.requested_at,
      status: outreachApprovals.status,
    })
    .from(outreachApprovals)
    .where(eq(outreachApprovals.status, 'PENDING'))
    .orderBy(asc(outreachApprovals.requested_at))
    .limit(limit);

  return rows as OutreachApprovalRow[];
}

// ── Outreach send queue ───────────────────────────────────────────────────────

export interface OutreachSendableRow {
  id: string;
  lead_id: string;
  message_text: string;
  message_type: string;
  channel: string;
  approval_status: string;
  businessName: string;
  publicEmail: string | null;
}

/** Returns outreach messages that are ready to be sent — approved or auto-approved,
 *  not yet dispatched, joined with lead info for the sender. */
export async function getOutreachSendable(limit = 20): Promise<OutreachSendableRow[]> {
  const rows = await db
    .select({
      id: outreachMessages.id,
      lead_id: outreachMessages.lead_id,
      message_text: outreachMessages.message_text,
      message_type: outreachMessages.message_type,
      channel: outreachMessages.channel,
      approval_status: outreachMessages.approval_status,
      businessName: salesLeads.business_name,
      publicEmail: salesLeads.public_email,
    })
    .from(outreachMessages)
    .innerJoin(salesLeads, eq(salesLeads.id, outreachMessages.lead_id))
    .where(
      and(
        inArray(outreachMessages.approval_status, ['APPROVED', 'NOT_REQUIRED']),
        isNull(outreachMessages.external_message_id),
        inArray(outreachMessages.status, ['DRAFT', 'APPROVED']),
      ),
    )
    .orderBy(asc(outreachMessages.created_at))
    .limit(limit);

  return rows as OutreachSendableRow[];
}

// ── Reply poll query ──────────────────────────────────────────────────────────

export interface ReplyPollRow {
  id: string;
  lead_id: string;
  external_thread_id: string | null;
  sent_at: Date | null;
}

/** Returns sent email outreach messages that have not received a reply yet. */
export async function getSentOutreachForReplyPoll(limit = 50): Promise<ReplyPollRow[]> {
  const rows = await db
    .select({
      id: outreachMessages.id,
      lead_id: outreachMessages.lead_id,
      external_thread_id: outreachMessages.external_thread_id,
      sent_at: outreachMessages.sent_at,
    })
    .from(outreachMessages)
    .where(
      and(
        eq(outreachMessages.status, 'SENT'),
        eq(outreachMessages.channel, 'email'),
        isNull(outreachMessages.reply_received_at),
        isNotNull(outreachMessages.external_thread_id),
      ),
    )
    .orderBy(asc(outreachMessages.sent_at))
    .limit(limit);

  return rows as ReplyPollRow[];
}

// ── Follow-up queries ─────────────────────────────────────────────────────────

export async function getOverdueFollowUps(now?: Date): Promise<FollowUpRow[]> {
  const cutoff = new Date(
    (now ?? new Date()).getTime() - OVERDUE_FOLLOWUP_GRACE_HOURS * 3_600_000,
  );

  const rows = await db
    .select({
      id: followUps.id,
      lead_id: followUps.lead_id,
      outreach_id: followUps.outreach_id,
      scheduled_at: followUps.scheduled_at,
      channel: followUps.channel,
      status: followUps.status,
      sent_at: followUps.sent_at,
      result: followUps.result,
    })
    .from(followUps)
    .where(
      and(
        eq(followUps.status, 'PENDING'),
        lte(followUps.scheduled_at, cutoff),
      ),
    )
    .orderBy(asc(followUps.scheduled_at));

  return rows as FollowUpRow[];
}

export interface FollowUpWithLeadRow extends FollowUpRow {
  businessName: string;
  publicEmail: string | null;
  messageText: string | null;
}

/** Like getOverdueFollowUps but includes lead email and business name for actual sending. */
export async function getOverdueFollowUpsWithLeadInfo(now?: Date): Promise<FollowUpWithLeadRow[]> {
  const cutoff = new Date(
    (now ?? new Date()).getTime() - OVERDUE_FOLLOWUP_GRACE_HOURS * 3_600_000,
  );

  const rows = await db
    .select({
      id: followUps.id,
      lead_id: followUps.lead_id,
      outreach_id: followUps.outreach_id,
      scheduled_at: followUps.scheduled_at,
      channel: followUps.channel,
      status: followUps.status,
      sent_at: followUps.sent_at,
      result: followUps.result,
      businessName: salesLeads.business_name,
      publicEmail: salesLeads.public_email,
      messageText: followUps.message_text,
    })
    .from(followUps)
    .innerJoin(salesLeads, eq(salesLeads.id, followUps.lead_id))
    .leftJoin(outreachMessages, eq(outreachMessages.id, followUps.outreach_id))
    .where(
      and(
        eq(followUps.status, 'PENDING'),
        lte(followUps.scheduled_at, cutoff),
        isNull(outreachMessages.reply_received_at),
      ),
    )
    .orderBy(asc(followUps.scheduled_at));

  return rows as FollowUpWithLeadRow[];
}

// ── Activity queries ──────────────────────────────────────────────────────────

export async function getRecentSalesActivity(
  windowDays = RECENT_ACTIVITY_DAYS,
  limit = 100,
): Promise<ActivityEventRow[]> {
  const since = new Date(Date.now() - windowDays * 86_400_000);

  const rows = await db
    .select({
      id: auditEvents.id,
      entity_type: auditEvents.entity_type,
      entity_id: auditEvents.entity_id,
      actor_role: auditEvents.actor_role,
      action: auditEvents.action,
      payload: auditEvents.payload,
      created_at: auditEvents.created_at,
    })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.entity_type, 'sales_lead'),
        gte(auditEvents.created_at, since),
      ),
    )
    .orderBy(desc(auditEvents.created_at))
    .limit(limit);

  return rows as ActivityEventRow[];
}

export async function getLeadActivityTimeline(leadId: string): Promise<ActivityEventRow[]> {
  const rows = await db
    .select({
      id: auditEvents.id,
      entity_type: auditEvents.entity_type,
      entity_id: auditEvents.entity_id,
      actor_role: auditEvents.actor_role,
      action: auditEvents.action,
      payload: auditEvents.payload,
      created_at: auditEvents.created_at,
    })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.entity_type, 'sales_lead'),
        eq(auditEvents.entity_id, leadId),
      ),
    )
    .orderBy(asc(auditEvents.created_at));

  return rows as ActivityEventRow[];
}

// ── Statistics ────────────────────────────────────────────────────────────────

export interface SalesStats {
  totalLeads: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  emailsSent: number;
  repliesReceived: number;
  pendingApprovals: number;
  overdueFollowUps: number;
  wonClients: number;
}

export async function getSalesStats(now?: Date): Promise<SalesStats> {
  const [leadRows, outreachRows, approvalRows, followUpRows] = await Promise.all([
    db.select({ status: salesLeads.status, priority: salesLeads.priority }).from(salesLeads),
    db
      .select({ status: outreachMessages.status, channel: outreachMessages.channel })
      .from(outreachMessages),
    db
      .select({ id: outreachApprovals.id })
      .from(outreachApprovals)
      .where(eq(outreachApprovals.status, 'PENDING')),
    getOverdueFollowUps(now),
  ]);

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const row of leadRows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + 1;
  }

  const emailsSent = outreachRows.filter(
    (r) => r.status === 'SENT' && r.channel === 'email',
  ).length;

  const repliesReceived = outreachRows.filter((r) => r.status === 'SENT').length;

  return {
    totalLeads: leadRows.length,
    byStatus,
    byPriority,
    emailsSent,
    repliesReceived: 0, // tracked via reply_received_at on outreach_messages — see daily report
    pendingApprovals: approvalRows.length,
    overdueFollowUps: followUpRows.length,
    wonClients: byStatus['WON'] ?? 0,
  };
}

// ── Daily report ──────────────────────────────────────────────────────────────

export interface TopOpportunity {
  leadId: string;
  businessName: string;
  fullName: string | null;
  country: string | null;
  city: string | null;
  leadScore: number;
  priority: SalesLeadPriority;
  status: SalesLeadStatus;
  opportunity: string | null;
  portfolioMatch: string | null;
  recommendedAction: string;
}

export interface DailyReportActivity {
  leadId: string;
  businessName: string;
  action: string;
  actorRole: string | null;
  occurredAt: Date;
}

export interface DailyReportIssue {
  type: 'OVERDUE_FOLLOWUP' | 'PENDING_APPROVAL' | 'FAILED_OUTREACH' | 'REJECTED_LEAD';
  leadId: string;
  description: string;
}

export interface SalesDailyReport {
  generatedAt: string;
  reportingEmail: string;
  periodStart: string;
  periodEnd: string;

  summary: {
    newLeads: number;
    qualifiedLeads: number;
    hotLeads: number;
    warmLeads: number;
    emailsSent: number;
    repliesReceived: number;
    followUpsDue: number;
    followUpsSent: number;
    pendingApprovals: number;
    wonClients: number;
  };

  topOpportunities: TopOpportunity[];
  activity: DailyReportActivity[];
  issues: DailyReportIssue[];
}

function deriveRecommendedAction(lead: {
  status: string;
  priority: string;
  public_email: string | null;
}): string {
  if (lead.status === 'NEW' || lead.status === 'REVIEWING') {
    return lead.public_email ? 'Draft cold email outreach' : 'Research public contact method';
  }
  if (lead.status === 'QUALIFIED') {
    return 'Send approved outreach message';
  }
  if (lead.status === 'OUTREACH_SENT') {
    return 'Schedule follow-up in 5–7 days';
  }
  if (lead.status === 'REPLIED') {
    return 'Respond to reply; escalate to human if proposal needed';
  }
  if (lead.status === 'FOLLOW_UP') {
    return 'Execute scheduled follow-up';
  }
  return 'Review lead and determine next step';
}

export async function buildSalesDailyReport(now?: Date): Promise<SalesDailyReport> {
  const reportNow = now ?? new Date();
  const periodStart = new Date(reportNow.getTime() - 24 * 3_600_000);

  const [
    allLeads,
    recentOutreach,
    pendingApprovalRows,
    overdueFollowUpRows,
    activityRows,
    failedOutreachRows,
  ] = await Promise.all([
    db.select().from(salesLeads),
    db
      .select({
        id: outreachMessages.id,
        lead_id: outreachMessages.lead_id,
        channel: outreachMessages.channel,
        status: outreachMessages.status,
        sent_at: outreachMessages.sent_at,
        reply_received_at: outreachMessages.reply_received_at,
        created_at: outreachMessages.created_at,
      })
      .from(outreachMessages)
      .where(gte(outreachMessages.created_at, periodStart)),
    getPendingApprovals(100),
    getOverdueFollowUps(reportNow),
    getRecentSalesActivity(1, 200),
    db
      .select({ id: outreachMessages.id, lead_id: outreachMessages.lead_id })
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.status, ['FAILED', 'BOUNCED']),
          gte(outreachMessages.created_at, periodStart),
        ),
      ),
  ]);

  // Summary counts
  const newLeads = allLeads.filter(
    (l) =>
      l.status === 'NEW' &&
      l.created_at >= periodStart,
  ).length;

  const qualifiedLeads = allLeads.filter(
    (l) =>
      l.status === 'QUALIFIED' &&
      l.updated_at >= periodStart,
  ).length;

  const hotLeads = allLeads.filter((l) => l.priority === 'HOT').length;
  const warmLeads = allLeads.filter((l) => l.priority === 'WARM').length;

  const emailsSent = recentOutreach.filter(
    (m) => m.status === 'SENT' && m.channel === 'email',
  ).length;

  const repliesReceived = recentOutreach.filter(
    (m) => m.reply_received_at !== null,
  ).length;

  const followUpsDueRows = await db
    .select({ id: followUps.id })
    .from(followUps)
    .where(
      and(
        eq(followUps.status, 'PENDING'),
        lte(followUps.scheduled_at, new Date(reportNow.getTime() + 24 * 3_600_000)),
      ),
    );

  const followUpsSent = await db
    .select({ id: followUps.id })
    .from(followUps)
    .where(
      and(
        eq(followUps.status, 'SENT'),
        gte(followUps.sent_at, periodStart),
      ),
    );

  const wonClients = allLeads.filter(
    (l) => l.status === 'WON' && l.updated_at >= periodStart,
  ).length;

  // Top opportunities — HOT and WARM leads not yet WON/REJECTED/ARCHIVED, sorted by score
  const topLeads = allLeads
    .filter((l) => !['WON', 'REJECTED', 'ARCHIVED'].includes(l.status))
    .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
    .slice(0, TOP_OPPORTUNITIES_LIMIT);

  const topOpportunities: TopOpportunity[] = topLeads.map((l) => ({
    leadId: l.id,
    businessName: l.business_name,
    fullName: l.full_name,
    country: l.country,
    city: l.city,
    leadScore: l.lead_score ?? 0,
    priority: l.priority as SalesLeadPriority,
    status: l.status as SalesLeadStatus,
    opportunity: l.opportunity,
    portfolioMatch: l.portfolio_match,
    recommendedAction: deriveRecommendedAction(l),
  }));

  // Activity — map to report shape
  const leadIndex = new Map(allLeads.map((l) => [l.id, l.business_name]));
  const activity: DailyReportActivity[] = activityRows.map((ev) => ({
    leadId: ev.entity_id,
    businessName: leadIndex.get(ev.entity_id) ?? '(unknown)',
    action: ev.action,
    actorRole: ev.actor_role,
    occurredAt: ev.created_at,
  }));

  // Issues
  const issues: DailyReportIssue[] = [];

  for (const fu of overdueFollowUpRows) {
    issues.push({
      type: 'OVERDUE_FOLLOWUP',
      leadId: fu.lead_id,
      description: `Follow-up on ${fu.channel} overdue since ${fu.scheduled_at.toISOString()}`,
    });
  }

  for (const ap of pendingApprovalRows) {
    issues.push({
      type: 'PENDING_APPROVAL',
      leadId: ap.lead_id,
      description: `${ap.approval_type} approval pending since ${ap.requested_at.toISOString()}`,
    });
  }

  for (const fo of failedOutreachRows) {
    issues.push({
      type: 'FAILED_OUTREACH',
      leadId: fo.lead_id,
      description: `Outreach message ${fo.id} failed/bounced`,
    });
  }

  return {
    generatedAt: reportNow.toISOString(),
    reportingEmail: CENTRAL_REPORTING_EMAIL,
    periodStart: periodStart.toISOString(),
    periodEnd: reportNow.toISOString(),

    summary: {
      newLeads,
      qualifiedLeads,
      hotLeads,
      warmLeads,
      emailsSent,
      repliesReceived,
      followUpsDue: followUpsDueRows.length,
      followUpsSent: followUpsSent.length,
      pendingApprovals: pendingApprovalRows.length,
      wonClients,
    },

    topOpportunities,
    activity,
    issues,
  };
}

// ── Sales engine status ───────────────────────────────────────────────────────

/** Returns the next UTC occurrence of a given clock hour (0–23), always strictly in the future. */
export function nextUtcHour(targetHour: number, from?: Date): Date {
  const now = from ?? new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), targetHour, 0, 0, 0),
  );
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export interface SalesEngineStatusResult {
  status: 'ACTIVE' | 'WAITING' | 'ERROR';
  lastActivityAt: Date | null;
  lastOutreachAt: Date | null;
  failedLast24h: number;
  repliesReceived: number;
  pendingFollowUps: number;
  stats: SalesStats;
}

export async function getSalesEngineStatus(now?: Date): Promise<SalesEngineStatusResult> {
  const ts = now ?? new Date();
  const cutoff24h = new Date(ts.getTime() - 86_400_000);

  const [stats, lastActivityRows, failedRows, lastSentRows, repliesRows, pendingFollowUpRows] =
    await Promise.all([
      getSalesStats(ts),
      db
        .select({ created_at: auditEvents.created_at })
        .from(auditEvents)
        .where(eq(auditEvents.entity_type, 'sales_lead'))
        .orderBy(desc(auditEvents.created_at))
        .limit(1),
      db
        .select({ id: outreachMessages.id })
        .from(outreachMessages)
        .where(
          and(
            inArray(outreachMessages.status, ['FAILED', 'BOUNCED']),
            gte(outreachMessages.created_at, cutoff24h),
          ),
        )
        .limit(100),
      db
        .select({ sent_at: outreachMessages.sent_at })
        .from(outreachMessages)
        .where(and(eq(outreachMessages.status, 'SENT'), isNotNull(outreachMessages.sent_at)))
        .orderBy(desc(outreachMessages.sent_at))
        .limit(1),
      db
        .select({ id: outreachMessages.id })
        .from(outreachMessages)
        .where(isNotNull(outreachMessages.reply_received_at)),
      db
        .select({ id: followUps.id })
        .from(followUps)
        .where(eq(followUps.status, 'PENDING')),
    ]);

  const lastActivityAt = lastActivityRows[0]?.created_at ?? null;
  const lastOutreachAt = lastSentRows[0]?.sent_at ?? null;
  const failedLast24h = failedRows.length;
  const repliesReceived = repliesRows.length;
  const pendingFollowUps = pendingFollowUpRows.length;

  let status: 'ACTIVE' | 'WAITING' | 'ERROR';
  if (failedLast24h > 0) {
    status = 'ERROR';
  } else if (lastActivityAt !== null && lastActivityAt >= cutoff24h) {
    status = 'ACTIVE';
  } else {
    status = 'WAITING';
  }

  return {
    status,
    lastActivityAt,
    lastOutreachAt,
    failedLast24h,
    repliesReceived,
    pendingFollowUps,
    stats,
  };
}

// ── Email opt-out helpers ─────────────────────────────────────────────────────

/** Returns the opt-out record for a given email address, or null if none exists. */
export async function getEmailOptOut(email: string): Promise<{
  token: string;
  opted_out_at: Date | null;
} | null> {
  const rows = await db
    .select({ token: emailOptOuts.token, opted_out_at: emailOptOuts.opted_out_at })
    .from(emailOptOuts)
    .where(eq(emailOptOuts.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

/** Ensures an opt-out token exists for the given email address.
 *  Uses INSERT ON CONFLICT DO NOTHING + SELECT to handle concurrent inserts.
 *  Returns the token (pre-existing or newly created). */
export async function ensureOptOutToken(
  email: string,
  sourceMessageId?: string,
): Promise<string> {
  const normalized = email.toLowerCase();
  const newToken = crypto.randomUUID();
  await db.execute(
    sql`INSERT INTO "sales"."email_optouts" (email, token, source_message_id, created_at)
        VALUES (${normalized}, ${newToken}, ${sourceMessageId ?? null}, now())
        ON CONFLICT (email) DO NOTHING`,
  );
  const rows = await db
    .select({ token: emailOptOuts.token })
    .from(emailOptOuts)
    .where(eq(emailOptOuts.email, normalized))
    .limit(1);
  return rows[0]!.token;
}

/** Marks an email as opted out by token. Idempotent if already opted out. */
export async function recordOptOut(token: string): Promise<
  | { ok: true; alreadyOptedOut: boolean }
  | { ok: false; reason: 'TOKEN_NOT_FOUND' }
> {
  const rows = await db
    .select({ opted_out_at: emailOptOuts.opted_out_at })
    .from(emailOptOuts)
    .where(eq(emailOptOuts.token, token))
    .limit(1);

  if (rows.length === 0) return { ok: false, reason: 'TOKEN_NOT_FOUND' };
  if (rows[0].opted_out_at !== null) return { ok: true, alreadyOptedOut: true };

  await db
    .update(emailOptOuts)
    .set({ opted_out_at: new Date() })
    .where(eq(emailOptOuts.token, token));

  return { ok: true, alreadyOptedOut: false };
}
