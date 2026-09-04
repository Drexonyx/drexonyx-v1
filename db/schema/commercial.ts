import {
  pgSchema,
  uuid,
  text,
  timestamp,
  numeric,
  check,
  foreignKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { organizations } from './core';

export const commercialSchema = pgSchema('commercial');

// ─── Campaigns ─────────────────────────────────────────────────────────────

export const campaigns = commercialSchema.table(
  'campaigns',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('DRAFT'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'campaigns_status_check',
      sql`${t.status} IN ('DRAFT','BRIEFING','PRE_FLIGHT','STRATEGY','QUOTE_PENDING','APPROVAL_PENDING','ORDERED','IN_PRODUCTION','QC','CLIENT_PREVIEW','REVISION','FINAL_APPROVAL','DELIVERY','CLOSED','CANCELLED')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'campaigns_organization_id_fk',
    }),
    unique('campaigns_id_org_unique').on(t.id, t.organization_id),
    index('campaigns_org_idx').on(t.organization_id),
    index('campaigns_status_idx').on(t.status),
  ],
);

// ─── Briefs ─────────────────────────────────────────────────────────────────

export const briefs = commercialSchema.table(
  'briefs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    campaign_id: uuid('campaign_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    status: text('status').notNull().default('DRAFT'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'briefs_status_check',
      sql`${t.status} IN ('DRAFT','SUBMITTED','REVISION_REQUIRED','APPROVED')`,
    ),
    foreignKey({
      columns: [t.campaign_id, t.organization_id],
      foreignColumns: [campaigns.id, campaigns.organization_id],
      name: 'briefs_campaign_id_fk',
    }),
    index('briefs_campaign_idx').on(t.campaign_id),
    index('briefs_org_idx').on(t.organization_id),
  ],
);

// ─── Quotes ─────────────────────────────────────────────────────────────────

export const quotes = commercialSchema.table(
  'quotes',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    campaign_id: uuid('campaign_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    status: text('status').notNull().default('DRAFT'),
    total_amount: numeric('total_amount', { precision: 19, scale: 4 }).notNull(),
    // DR 0043: estimated_cost entered by OWNER or ADMIN_OPERATIONS while DRAFT.
    // Nullable until set. Required for Cost Check and Margin Check to pass.
    estimated_cost: numeric('estimated_cost', { precision: 19, scale: 4 }),
    currency: text('currency').notNull().default('USD'),
    // DR 0046 §5: set to now() on SENT→ACCEPTED transition by CLIENT.
    accepted_at: timestamp('accepted_at', { withTimezone: true }),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'quotes_status_check',
      sql`${t.status} IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CANCELLED')`,
    ),
    foreignKey({
      columns: [t.campaign_id, t.organization_id],
      foreignColumns: [campaigns.id, campaigns.organization_id],
      name: 'quotes_campaign_id_fk',
    }),
    unique('quotes_id_org_unique').on(t.id, t.organization_id),
    index('quotes_campaign_idx').on(t.campaign_id),
    index('quotes_org_idx').on(t.organization_id),
    index('quotes_status_idx').on(t.status),
  ],
);

// ─── Pricing Configs ─────────────────────────────────────────────────────────
// DR 0043 §6.5: One config per organization. minimum_acceptable_margin_rate is
// the binding PASS/FAIL threshold. target_margin_rate is informational only.

export const pricingConfigs = commercialSchema.table(
  'pricing_configs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    minimum_acceptable_margin_rate: numeric('minimum_acceptable_margin_rate', { precision: 5, scale: 4 }).notNull(),
    target_margin_rate: numeric('target_margin_rate', { precision: 5, scale: 4 }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'pricing_configs_minimum_margin_check',
      sql`${t.minimum_acceptable_margin_rate} > 0 AND ${t.minimum_acceptable_margin_rate} < 1`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'pricing_configs_organization_id_fk',
    }),
    unique('pricing_configs_org_unique').on(t.organization_id),
    index('pricing_configs_org_idx').on(t.organization_id),
  ],
);

// ─── Orders ─────────────────────────────────────────────────────────────────

export const orders = commercialSchema.table(
  'orders',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    campaign_id: uuid('campaign_id').notNull(),
    quote_id: uuid('quote_id').notNull().unique(),
    organization_id: uuid('organization_id').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'orders_status_check',
      sql`${t.status} IN ('ACTIVE','COMPLETED','CANCELLED')`,
    ),
    foreignKey({
      columns: [t.campaign_id, t.organization_id],
      foreignColumns: [campaigns.id, campaigns.organization_id],
      name: 'orders_campaign_id_fk',
    }),
    foreignKey({
      columns: [t.quote_id, t.organization_id],
      foreignColumns: [quotes.id, quotes.organization_id],
      name: 'orders_quote_id_fk',
    }),
    unique('orders_id_org_unique').on(t.id, t.organization_id),
    index('orders_campaign_idx').on(t.campaign_id),
    index('orders_org_idx').on(t.organization_id),
    index('orders_status_idx').on(t.status),
  ],
);

// ─── Order Budgets ───────────────────────────────────────────────────────────

export const orderBudgets = commercialSchema.table(
  'order_budgets',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_id: uuid('order_id').notNull().unique(),
    organization_id: uuid('organization_id').notNull(),
    planned_amount: numeric('planned_amount', { precision: 19, scale: 4 }).notNull(),
    estimated_amount: numeric('estimated_amount', { precision: 19, scale: 4 }),
    actual_amount: numeric('actual_amount', { precision: 19, scale: 4 }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.order_id, t.organization_id],
      foreignColumns: [orders.id, orders.organization_id],
      name: 'order_budgets_order_id_fk',
    }),
    index('order_budgets_org_idx').on(t.organization_id),
  ],
);
