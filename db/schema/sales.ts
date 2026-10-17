import {
  pgSchema,
  uuid,
  text,
  timestamp,
  integer,
  check,
  foreignKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

export const salesSchema = pgSchema('sales');

// ─── Sales Leads ──────────────────────────────────────────────────────────────
// One record per person/business identity. Outbound prospects discovered by
// MDA sales agents via WebSearch and manual research.
// Deduplication across platforms is handled via the lead_sources table.
// Does not require an organization_id — this is an internal MDA operational
// record, not a client-owned data record (same pattern as commercial.inquiries).

export const salesLeads = salesSchema.table(
  'sales_leads',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    full_name: text('full_name'),
    business_name: text('business_name').notNull(),
    country: text('country'),
    city: text('city'),
    primary_source_platform: text('primary_source_platform').notNull(),
    primary_source_url: text('primary_source_url'),
    source_type: text('source_type').notNull(),
    website: text('website'),
    public_email: text('public_email'),
    public_contact_method: text('public_contact_method'),
    lead_score: integer('lead_score').default(0),
    priority: text('priority').notNull().default('COLD'),
    status: text('status').notNull().default('NEW'),
    opportunity: text('opportunity'),
    portfolio_match: text('portfolio_match'),
    notes: text('notes'),
    discovered_by: text('discovered_by').notNull().default('agent'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    last_activity_at: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'sales_leads_priority_check',
      sql`${t.priority} IN ('HOT','WARM','COLD')`,
    ),
    check(
      'sales_leads_status_check',
      sql`${t.status} IN ('NEW','REVIEWING','QUALIFIED','OUTREACH_SENT','REPLIED','FOLLOW_UP','WON','REJECTED','ARCHIVED')`,
    ),
    check(
      'sales_leads_source_type_check',
      sql`${t.source_type} IN ('social_profile','website','directory','websearch','referral','manual')`,
    ),
    check(
      'sales_leads_discovered_by_check',
      sql`${t.discovered_by} IN ('agent','human')`,
    ),
    index('sales_leads_status_idx').on(t.status),
    index('sales_leads_priority_idx').on(t.priority),
    index('sales_leads_score_idx').on(t.lead_score),
    index('sales_leads_created_at_idx').on(t.created_at),
    index('sales_leads_last_activity_idx').on(t.last_activity_at),
    index('sales_leads_platform_idx').on(t.primary_source_platform),
  ],
);

// ─── Lead Sources ─────────────────────────────────────────────────────────────
// Multiple platform identifiers per lead — enables deduplication.
// A prospect found on both Instagram and YouTube is ONE lead_source per platform.
// The unique constraint on (platform, identifier) prevents duplicate source rows.
// Before creating a new sales_lead, agents check whether a source row already
// exists for the discovered handle/url; if it does, they update the existing lead.

export const leadSources = salesSchema.table(
  'lead_sources',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    lead_id: uuid('lead_id').notNull(),
    platform: text('platform').notNull(),
    url: text('url'),
    handle: text('handle'),
    // identifier is the canonical dedupe value: the handle (preferred) or url
    identifier: text('identifier').notNull(),
    discovered_at: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.lead_id],
      foreignColumns: [salesLeads.id],
      name: 'lead_sources_lead_id_fk',
    }),
    unique('lead_sources_platform_identifier_unique').on(t.platform, t.identifier),
    index('lead_sources_lead_idx').on(t.lead_id),
    index('lead_sources_platform_idx').on(t.platform),
    index('lead_sources_identifier_idx').on(t.identifier),
  ],
);

// ─── Outreach Messages ────────────────────────────────────────────────────────
// One row per message drafted or sent, across any channel.
// Human approval is required before status can advance from PENDING_APPROVAL.

export const outreachMessages = salesSchema.table(
  'outreach_messages',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    lead_id: uuid('lead_id').notNull(),
    channel: text('channel').notNull(),
    message_text: text('message_text').notNull(),
    message_type: text('message_type').notNull().default('cold_outreach'),
    status: text('status').notNull().default('DRAFT'),
    approval_status: text('approval_status').notNull().default('PENDING'),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    reply_received_at: timestamp('reply_received_at', { withTimezone: true }),
    // Gmail thread/message IDs for email outreach — nullable for other channels
    external_thread_id: text('external_thread_id'),
    external_message_id: text('external_message_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'outreach_messages_channel_check',
      sql`${t.channel} IN ('email','instagram','whatsapp','linkedin','manual')`,
    ),
    check(
      'outreach_messages_message_type_check',
      sql`${t.message_type} IN ('cold_outreach','follow_up','reply','proposal')`,
    ),
    check(
      'outreach_messages_status_check',
      sql`${t.status} IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','SENT','FAILED','BOUNCED')`,
    ),
    check(
      'outreach_messages_approval_status_check',
      sql`${t.approval_status} IN ('PENDING','APPROVED','REJECTED','NOT_REQUIRED')`,
    ),
    foreignKey({
      columns: [t.lead_id],
      foreignColumns: [salesLeads.id],
      name: 'outreach_messages_lead_id_fk',
    }),
    index('outreach_messages_lead_idx').on(t.lead_id),
    index('outreach_messages_status_idx').on(t.status),
    index('outreach_messages_channel_idx').on(t.channel),
    index('outreach_messages_approval_status_idx').on(t.approval_status),
  ],
);

// ─── Follow-ups ───────────────────────────────────────────────────────────────
// Scheduled follow-up actions after initial outreach or a previous follow-up.

export const followUps = salesSchema.table(
  'follow_ups',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    lead_id: uuid('lead_id').notNull(),
    outreach_id: uuid('outreach_id'),
    scheduled_at: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    channel: text('channel').notNull(),
    message_text: text('message_text'),
    status: text('status').notNull().default('PENDING'),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    result: text('result'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'follow_ups_channel_check',
      sql`${t.channel} IN ('email','instagram','whatsapp','manual')`,
    ),
    check(
      'follow_ups_status_check',
      sql`${t.status} IN ('PENDING','SENT','SKIPPED','FAILED')`,
    ),
    check(
      'follow_ups_result_check',
      sql`${t.result} IS NULL OR ${t.result} IN ('REPLIED','NO_RESPONSE','BOUNCED','CONVERTED')`,
    ),
    foreignKey({
      columns: [t.lead_id],
      foreignColumns: [salesLeads.id],
      name: 'follow_ups_lead_id_fk',
    }),
    foreignKey({
      columns: [t.outreach_id],
      foreignColumns: [outreachMessages.id],
      name: 'follow_ups_outreach_id_fk',
    }),
    index('follow_ups_lead_idx').on(t.lead_id),
    index('follow_ups_scheduled_at_idx').on(t.scheduled_at),
    index('follow_ups_status_idx').on(t.status),
  ],
);

// ─── Outreach Approvals ───────────────────────────────────────────────────────
// Human approval gate for any outreach or follow-up action.
// Created by the agent; must be approved by a human before the linked
// outreach_message can advance to SENT status.
// Central reporting email for approvals: Irenfold@gmail.com

export const outreachApprovals = salesSchema.table(
  'outreach_approvals',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    lead_id: uuid('lead_id').notNull(),
    outreach_id: uuid('outreach_id'),
    approval_type: text('approval_type').notNull(),
    reason: text('reason'),
    requested_at: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    rejected_at: timestamp('rejected_at', { withTimezone: true }),
    approved_by: text('approved_by'),
    status: text('status').notNull().default('PENDING'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'outreach_approvals_approval_type_check',
      sql`${t.approval_type} IN ('OUTREACH','FOLLOW_UP','PROPOSAL','SENSITIVE_CONTENT','CHANNEL_USE')`,
    ),
    check(
      'outreach_approvals_status_check',
      sql`${t.status} IN ('PENDING','APPROVED','REJECTED','EXPIRED')`,
    ),
    foreignKey({
      columns: [t.lead_id],
      foreignColumns: [salesLeads.id],
      name: 'outreach_approvals_lead_id_fk',
    }),
    foreignKey({
      columns: [t.outreach_id],
      foreignColumns: [outreachMessages.id],
      name: 'outreach_approvals_outreach_id_fk',
    }),
    index('outreach_approvals_lead_idx').on(t.lead_id),
    index('outreach_approvals_status_idx').on(t.status),
    index('outreach_approvals_type_idx').on(t.approval_type),
    index('outreach_approvals_requested_at_idx').on(t.requested_at),
  ],
);

// ─── Email Opt-Outs ───────────────────────────────────────────────────────────
// CAN-SPAM / CASL compliance: tracks unsubscribe requests.
// One record per email address; opted_out_at is NULL until the recipient
// clicks the unsubscribe link. Token is generated on first outreach and
// stored here so the same link works across all future sends.

export const emailOptOuts = salesSchema.table(
  'email_optouts',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    email: text('email').notNull(),
    token: text('token').notNull(),
    opted_out_at: timestamp('opted_out_at', { withTimezone: true }),
    source_message_id: text('source_message_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('email_optouts_email_unique').on(t.email),
    unique('email_optouts_token_unique').on(t.token),
    index('email_optouts_opted_out_at_idx').on(t.opted_out_at),
  ],
);
