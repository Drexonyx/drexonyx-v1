// Lead Hunter Agent — read-only lead pipeline intelligence (DR 0120).
//
// Reads from commercial.inquiries only. No organization_id column on inquiries
// (pre-org records — DR 0106). Authorization is enforced at the agent layer.
//
// HARD BOUNDARIES:
//   - READ ONLY — no writes
//   - contact_email NEVER included in any output (PII boundary)
//   - No external API calls, scraping, or outreach
//   - No invented scores; completenessScore is a deterministic 0–5 field count
//   - No financial data

import { inArray } from 'drizzle-orm';
import { db } from '@/db/index';
import { inquiries } from '@/db/schema/commercial';

// ── Constants ─────────────────────────────────────────────────────────────────

export const STALE_NEW_DAYS = 3;       // NEW not reviewed within this many days
export const STALE_REVIEWED_DAYS = 7;  // REVIEWED not converted/dismissed within this many days
export const DEFAULT_WINDOW_DAYS = 30; // reporting window for "new leads"

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeadStatus = 'NEW' | 'REVIEWED' | 'CONVERTED' | 'DISMISSED';

export interface LeadRecord {
  id: string;
  brand_name: string;
  campaign_objective: string;
  status: LeadStatus;
  submitted_at: string;
  updated_at: string;
  staleDays: number;
  completenessScore: number; // 0–5: count of filled optional fields
}

export interface StaleLeadRecord extends LeadRecord {
  staleReason: 'UNREVIEWED' | 'REVIEW_PENDING_CONVERSION';
}

export interface LeadPipelineSummary {
  total: number;
  byStatus: Record<string, number>;
}

export interface LeadHunterReport {
  generatedAt: string;
  windowDays: number;
  summary: LeadPipelineSummary;
  newLeads: LeadRecord[];
  pendingLeads: LeadRecord[];
  staleLeads: StaleLeadRecord[];
  followUpRequired: LeadRecord[];
  hasActionableLeads: boolean;
}

// Raw row shape returned by the DB query
interface InquiryRow {
  id: string;
  status: string;
  brand_name: string;
  campaign_objective: string;
  website: string | null;
  target_audience: string | null;
  creative_types: string | null;
  platforms: string | null;
  additional_notes: string | null;
  submitted_at: Date;
  updated_at: Date;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function computeStaleDays(updatedAt: Date, now: Date): number {
  return Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000);
}

// Deterministic completeness: 1 point each for website, target_audience,
// creative_types, platforms, additional_notes (all optional fields).
export function computeCompletenessScore(inquiry: {
  website: string | null;
  target_audience: string | null;
  creative_types: string | null;
  platforms: string | null;
  additional_notes: string | null;
}): number {
  return [
    inquiry.website,
    inquiry.target_audience,
    inquiry.creative_types,
    inquiry.platforms,
    inquiry.additional_notes,
  ].filter((v) => v !== null && v !== '').length;
}

function toLeadRecord(row: InquiryRow, now: Date): LeadRecord {
  return {
    id: row.id,
    brand_name: row.brand_name,
    campaign_objective: row.campaign_objective,
    status: row.status as LeadStatus,
    submitted_at: row.submitted_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    staleDays: computeStaleDays(row.updated_at, now),
    completenessScore: computeCompletenessScore(row),
  };
}

// ── Pure classification engine ────────────────────────────────────────────────

export interface ClassifyLeadsOptions {
  windowDays?: number;
  staleNewDays?: number;
  staleReviewedDays?: number;
}

export interface ClassifiedLeads {
  summary: LeadPipelineSummary;
  newLeads: LeadRecord[];
  pendingLeads: LeadRecord[];
  staleLeads: StaleLeadRecord[];
  followUpRequired: LeadRecord[];
}

export function classifyLeads(
  rows: InquiryRow[],
  now: Date,
  opts: ClassifyLeadsOptions = {},
): ClassifiedLeads {
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const staleNewDays = opts.staleNewDays ?? STALE_NEW_DAYS;
  const staleReviewedDays = opts.staleReviewedDays ?? STALE_REVIEWED_DAYS;
  const windowCutoff = new Date(now.getTime() - windowDays * 86_400_000);

  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }

  const newLeads: LeadRecord[] = [];
  const pendingLeads: LeadRecord[] = [];
  const staleLeads: StaleLeadRecord[] = [];
  const followUpRequired: LeadRecord[] = [];

  for (const row of rows) {
    const record = toLeadRecord(row, now);

    if (row.status === 'NEW') {
      if (row.submitted_at >= windowCutoff) {
        newLeads.push(record);
      }
      if (record.staleDays >= staleNewDays) {
        staleLeads.push({ ...record, staleReason: 'UNREVIEWED' });
      }
    }

    if (row.status === 'REVIEWED') {
      pendingLeads.push(record);
      if (record.staleDays >= staleReviewedDays) {
        staleLeads.push({ ...record, staleReason: 'REVIEW_PENDING_CONVERSION' });
        followUpRequired.push(record);
      }
    }
  }

  // Sort by staleDays descending (most stale first) for actionability
  staleLeads.sort((a, b) => b.staleDays - a.staleDays);
  // Sort new leads by completenessScore descending (most complete first)
  newLeads.sort((a, b) => b.completenessScore - a.completenessScore);

  return {
    summary: { total: rows.length, byStatus },
    newLeads,
    pendingLeads,
    staleLeads,
    followUpRequired,
  };
}

// ── Async report builder ──────────────────────────────────────────────────────

export async function buildLeadHunterReport(
  opts: ClassifyLeadsOptions = {},
): Promise<LeadHunterReport> {
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;

  // Read all non-converted, non-dismissed active inquiries + recent converted/dismissed
  const activeStatuses: string[] = ['NEW', 'REVIEWED'];
  const rows = await db
    .select({
      id: inquiries.id,
      status: inquiries.status,
      brand_name: inquiries.brand_name,
      campaign_objective: inquiries.campaign_objective,
      website: inquiries.website,
      target_audience: inquiries.target_audience,
      creative_types: inquiries.creative_types,
      platforms: inquiries.platforms,
      additional_notes: inquiries.additional_notes,
      submitted_at: inquiries.submitted_at,
      updated_at: inquiries.updated_at,
      // contact_email is intentionally NOT selected — PII boundary (DR 0120 §2.2)
    })
    .from(inquiries)
    .where(inArray(inquiries.status, activeStatuses));

  const now = new Date();
  const classified = classifyLeads(rows, now, opts);

  return {
    generatedAt: now.toISOString(),
    windowDays,
    summary: classified.summary,
    newLeads: classified.newLeads,
    pendingLeads: classified.pendingLeads,
    staleLeads: classified.staleLeads,
    followUpRequired: classified.followUpRequired,
    hasActionableLeads:
      classified.newLeads.length > 0 ||
      classified.staleLeads.length > 0 ||
      classified.followUpRequired.length > 0,
  };
}
