import {
  pgSchema,
  uuid,
  text,
  timestamp,
  check,
  foreignKey,
  unique,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { organizations } from './core';
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
// DR 0029: CLIENT and OWNER/ADMIN_OPERATIONS hold decision authority.
// Target type model (DR 0002 D6, DR 0028) and satisfaction reference
// (DR 0017) physical schema are DEFERRED — not implemented.

export const approvals = productionSchema.table(
  'approvals',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_id: uuid('order_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
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
    foreignKey({
      columns: [t.order_id, t.organization_id],
      foreignColumns: [orders.id, orders.organization_id],
      name: 'approvals_order_id_fk',
    }),
    index('approvals_order_idx').on(t.order_id),
    index('approvals_org_idx').on(t.organization_id),
    index('approvals_status_idx').on(t.status),
  ],
);

// ─── Deliveries ───────────────────────────────────────────────────────────────
// DR 0011: states PREPARING, SENDING, COMPLETED, FAILED, CANCELLED.
// DR 0035: OWNER and ADMIN_OPERATIONS approved for creation and PREPARING→SENDING.
// DR 0037: Delivery.COMPLETED criterion = mechanism success (APPROVED).
// Satisfaction reference (Delivery → RequiredDelivery) physical schema
// is DEFERRED (DR 0017) — not implemented.

export const deliveries = productionSchema.table(
  'deliveries',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_id: uuid('order_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    status: text('status').notNull().default('PREPARING'),
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
    index('deliveries_order_idx').on(t.order_id),
    index('deliveries_org_idx').on(t.organization_id),
    index('deliveries_status_idx').on(t.status),
  ],
);
