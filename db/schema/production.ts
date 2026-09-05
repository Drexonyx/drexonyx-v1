import {
  pgSchema,
  uuid,
  text,
  timestamp,
  check,
  foreignKey,
  unique,
  uniqueIndex,
  index,
  primaryKey,
  bigint,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { organizations } from './core';
import { users } from './identity';
import { orders } from './commercial';

export const productionSchema = pgSchema('production');

// ─── Assets ─────────────────────────────────────────────────────────────────

export const assets = productionSchema.table(
  'assets',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    order_id: uuid('order_id').notNull(),
    status: text('status').notNull().default('UPLOADED'),
    // DR 0054 §2.2: file reference columns
    name: text('name'),
    file_key: text('file_key'),
    file_type: text('file_type'),
    file_size: bigint('file_size', { mode: 'number' }),
    // DR 0054 §2.4: content_url is a temporary placeholder only — never the canonical reference
    content_url: text('content_url'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'assets_status_check',
      sql`${t.status} IN ('UPLOADED','PROCESSING','READY_FOR_QC','CLIENT_PREVIEW','REVISION_REQUIRED','REJECTED')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'assets_organization_id_fk',
    }),
    foreignKey({
      columns: [t.order_id, t.organization_id],
      foreignColumns: [orders.id, orders.organization_id],
      name: 'assets_order_id_fk',
    }),
    unique('assets_id_org_unique').on(t.id, t.organization_id),
    index('assets_org_idx').on(t.organization_id),
    index('assets_order_idx').on(t.order_id),
    index('assets_status_idx').on(t.status),
  ],
);

// ─── QC Reviews ─────────────────────────────────────────────────────────────
// Owns QC verdicts (PASS/FAIL). Separate entity from Asset, Approval, Delivery
// (DR 0006 QC Boundary, DR 0008, DR 0009, DR 0010, DR 0011).

export const qcReviews = productionSchema.table(
  'qc_reviews',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    asset_id: uuid('asset_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    reviewer_id: uuid('reviewer_id'),
    verdict: text('verdict').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('qc_reviews_verdict_check', sql`${t.verdict} IN ('PASS','FAIL')`),
    foreignKey({
      columns: [t.asset_id, t.organization_id],
      foreignColumns: [assets.id, assets.organization_id],
      name: 'qc_reviews_asset_id_fk',
    }),
    foreignKey({
      columns: [t.reviewer_id],
      foreignColumns: [users.id],
      name: 'qc_reviews_reviewer_id_fk',
    }),
    index('qc_reviews_asset_idx').on(t.asset_id),
    index('qc_reviews_org_idx').on(t.organization_id),
  ],
);

// ─── Production Jobs ─────────────────────────────────────────────────────────

export const productionJobs = productionSchema.table(
  'production_jobs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_id: uuid('order_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    // DR 0053 §2.1: job_type immutable, set at creation
    job_type: text('job_type').notNull().default('MANUAL_UPLOAD'),
    description: text('description'),
    metadata: jsonb('metadata'),
    status: text('status').notNull().default('QUEUED'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'production_jobs_status_check',
      sql`${t.status} IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')`,
    ),
    check(
      'production_jobs_job_type_check',
      sql`${t.job_type} IN ('AI_GENERATION','MANUAL_UPLOAD')`,
    ),
    foreignKey({
      columns: [t.order_id, t.organization_id],
      foreignColumns: [orders.id, orders.organization_id],
      name: 'production_jobs_order_id_fk',
    }),
    unique('production_jobs_id_org_unique').on(t.id, t.organization_id),
    index('production_jobs_order_idx').on(t.order_id),
    index('production_jobs_org_idx').on(t.organization_id),
    index('production_jobs_status_idx').on(t.status),
  ],
);

// ─── AI Generations ──────────────────────────────────────────────────────────

export const aiGenerations = productionSchema.table(
  'ai_generations',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    production_job_id: uuid('production_job_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    // DR 0053 §2.6: provider-agnostic fields; provider integration DEFERRED
    provider: text('provider'),
    model: text('model'),
    prompt: text('prompt'),
    params: jsonb('params'),
    result_url: text('result_url'),
    // DR 0068: external job identifier assigned by the provider at dispatch
    provider_job_id: text('provider_job_id'),
    // DR 0069: retry attempt count; 0=first attempt, max=2; NOT NULL, DEFAULT 0
    retry_count: integer('retry_count').notNull().default(0),
    status: text('status').notNull().default('REQUESTED'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'ai_generations_status_check',
      sql`${t.status} IN ('REQUESTED','RUNNING','SUCCEEDED','FAILED','CANCELLED')`,
    ),
    foreignKey({
      columns: [t.production_job_id, t.organization_id],
      foreignColumns: [productionJobs.id, productionJobs.organization_id],
      name: 'ai_generations_production_job_id_fk',
    }),
    unique('ai_generations_id_org_unique').on(t.id, t.organization_id),
    // DR 0068 §2.4: partial unique constraint — same (org, provider, provider_job_id) may not appear twice
    uniqueIndex('ai_generations_provider_job_id_unique_idx')
      .on(t.organization_id, t.provider, t.provider_job_id)
      .where(sql`${t.provider_job_id} IS NOT NULL`),
    // DR 0068 §2.5: webhook lookup index — provider + provider_job_id only (org validated after)
    index('ai_generations_provider_job_id_idx')
      .on(t.provider, t.provider_job_id)
      .where(sql`${t.provider_job_id} IS NOT NULL`),
    index('ai_generations_job_idx').on(t.production_job_id),
    index('ai_generations_org_idx').on(t.organization_id),
    index('ai_generations_status_idx').on(t.status),
  ],
);

// ─── Asset ↔ AI Generation (many-to-many) ────────────────────────────────────
// DR 0002 D7: AI Generation ↔ Asset many-to-many join table.

export const assetAiGenerations = productionSchema.table(
  'asset_ai_generations',
  {
    asset_id: uuid('asset_id').notNull(),
    ai_generation_id: uuid('ai_generation_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.asset_id, t.ai_generation_id] }),
    foreignKey({
      columns: [t.asset_id, t.organization_id],
      foreignColumns: [assets.id, assets.organization_id],
      name: 'asset_ai_gen_asset_id_fk',
    }),
    foreignKey({
      columns: [t.ai_generation_id, t.organization_id],
      foreignColumns: [aiGenerations.id, aiGenerations.organization_id],
      name: 'asset_ai_gen_generation_id_fk',
    }),
    index('asset_ai_gen_asset_idx').on(t.asset_id),
    index('asset_ai_gen_generation_idx').on(t.ai_generation_id),
    index('asset_ai_gen_org_idx').on(t.organization_id),
  ],
);

// ─── Approvals ───────────────────────────────────────────────────────────────
// DR 0010: states PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED.
// DR 0028 §2: target_type IN ('ASSET','QUOTE'); target_id references the target entity.
// DR 0029: CLIENT holds decision authority for ASSET approvals.

export const approvals = productionSchema.table(
  'approvals',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_id: uuid('order_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    target_type: text('target_type').notNull().default('ASSET'),
    target_id: uuid('target_id').notNull(),
    status: text('status').notNull().default('PENDING'),
    created_by_user_id: uuid('created_by_user_id'),
    decided_by_user_id: uuid('decided_by_user_id'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'approvals_status_check',
      sql`${t.status} IN ('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED')`,
    ),
    check(
      'approvals_target_type_check',
      sql`${t.target_type} IN ('ASSET','QUOTE')`,
    ),
    foreignKey({
      columns: [t.order_id, t.organization_id],
      foreignColumns: [orders.id, orders.organization_id],
      name: 'approvals_order_id_fk',
    }),
    unique('approvals_id_org_unique').on(t.id, t.organization_id),
    index('approvals_order_idx').on(t.order_id),
    index('approvals_org_idx').on(t.organization_id),
    index('approvals_status_idx').on(t.status),
  ],
);

// ─── Deliveries ───────────────────────────────────────────────────────────────
// DR 0011: states PREPARING, SENDING, COMPLETED, FAILED, CANCELLED.
// DR 0035: OWNER and ADMIN_OPERATIONS approved for creation and PREPARING→SENDING.
// DR 0036 §2.2: failure_reason captured at FAILED transition; immutable once set.

export const deliveries = productionSchema.table(
  'deliveries',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_id: uuid('order_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    status: text('status').notNull().default('PREPARING'),
    failure_reason: text('failure_reason'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'deliveries_status_check',
      sql`${t.status} IN ('PREPARING','SENDING','COMPLETED','FAILED','CANCELLED')`,
    ),
    foreignKey({
      columns: [t.order_id, t.organization_id],
      foreignColumns: [orders.id, orders.organization_id],
      name: 'deliveries_order_id_fk',
    }),
    unique('deliveries_id_org_unique').on(t.id, t.organization_id),
    index('deliveries_order_idx').on(t.order_id),
    index('deliveries_org_idx').on(t.organization_id),
    index('deliveries_status_idx').on(t.status),
  ],
);

// ─── Delivery ↔ Asset (many-to-many) ─────────────────────────────────────────
// DR 0037 §2: A Delivery references one or more Assets via this join table.

export const deliveryAssets = productionSchema.table(
  'delivery_assets',
  {
    delivery_id: uuid('delivery_id').notNull(),
    asset_id: uuid('asset_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.delivery_id, t.asset_id] }),
    foreignKey({
      columns: [t.delivery_id, t.organization_id],
      foreignColumns: [deliveries.id, deliveries.organization_id],
      name: 'delivery_assets_delivery_id_fk',
    }),
    foreignKey({
      columns: [t.asset_id, t.organization_id],
      foreignColumns: [assets.id, assets.organization_id],
      name: 'delivery_assets_asset_id_fk',
    }),
    index('delivery_assets_delivery_idx').on(t.delivery_id),
    index('delivery_assets_asset_idx').on(t.asset_id),
    index('delivery_assets_org_idx').on(t.organization_id),
  ],
);
