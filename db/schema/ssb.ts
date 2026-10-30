// DR-0130: Social Seller Bot CRM schema — ssb schema
// Tables: ssb_leads, ssb_subscriptions, ssb_payments, ssb_bot_configs

import {
  pgSchema,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  check,
  foreignKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

export const ssbSchema = pgSchema('ssb');

// ─── SSB Leads ────────────────────────────────────────────────────────────────
// Inbound leads captured by the mda-sales agent on /social-seller.
// One record per prospect conversation that reaches the info-collection step.

export const ssbLeads = ssbSchema.table(
  'ssb_leads',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    business_name: text('business_name').notNull(),
    business_type: text('business_type'),
    platform: text('platform'),
    contact_whatsapp: text('contact_whatsapp').notNull(),
    working_hours: text('working_hours'),
    services: text('services'),
    source_bot: text('source_bot').notNull().default('mda-sales'),
    source_url: text('source_url'),
    status: text('status').notNull().default('NEW'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'ssb_leads_status_check',
      sql`${t.status} IN ('NEW','CONTACTED','QUALIFIED','WON','REJECTED')`,
    ),
    index('ssb_leads_status_idx').on(t.status),
    index('ssb_leads_created_at_idx').on(t.created_at),
    index('ssb_leads_source_bot_idx').on(t.source_bot),
  ],
);

// ─── SSB Subscriptions ────────────────────────────────────────────────────────
// One record per paying SSB customer. Merchant slug is the unique /chat/<slug>
// identifier. Admin creates this after payment is confirmed.

export const ssbSubscriptions = ssbSchema.table(
  'ssb_subscriptions',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    merchant_slug: text('merchant_slug').notNull(),
    business_name: text('business_name').notNull(),
    business_type: text('business_type'),
    contact_whatsapp: text('contact_whatsapp').notNull(),
    plan_name: text('plan_name').notNull().default('Basic AED 299/month'),
    monthly_amount_fils: integer('monthly_amount_fils').notNull().default(29900),
    active: boolean('active').notNull().default(true),
    activated_at: timestamp('activated_at', { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    lead_id: uuid('lead_id'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('ssb_subscriptions_slug_unique').on(t.merchant_slug),
    foreignKey({
      columns: [t.lead_id],
      foreignColumns: [ssbLeads.id],
      name: 'ssb_subscriptions_lead_id_fk',
    }),
    index('ssb_subscriptions_active_idx').on(t.active),
    index('ssb_subscriptions_slug_idx').on(t.merchant_slug),
    index('ssb_subscriptions_expires_at_idx').on(t.expires_at),
  ],
);

// ─── SSB Payments ─────────────────────────────────────────────────────────────
// One row per Ziina payment intent, linked to a subscription.
// Ziina payment_id is stored to enable status polling and webhook matching.

export const ssbPayments = ssbSchema.table(
  'ssb_payments',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    subscription_id: uuid('subscription_id').notNull(),
    ziina_payment_id: text('ziina_payment_id').notNull(),
    amount_fils: integer('amount_fils').notNull(),
    status: text('status').notNull().default('PENDING'),
    period_month: text('period_month').notNull(), // YYYY-MM, e.g. '2026-11'
    redirect_url: text('redirect_url'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'ssb_payments_status_check',
      sql`${t.status} IN ('PENDING','COMPLETED','FAILED','CANCELLED')`,
    ),
    unique('ssb_payments_ziina_id_unique').on(t.ziina_payment_id),
    foreignKey({
      columns: [t.subscription_id],
      foreignColumns: [ssbSubscriptions.id],
      name: 'ssb_payments_subscription_id_fk',
    }),
    index('ssb_payments_subscription_idx').on(t.subscription_id),
    index('ssb_payments_status_idx').on(t.status),
    index('ssb_payments_period_idx').on(t.period_month),
  ],
);

// ─── SSB Bot Configs ──────────────────────────────────────────────────────────
// Persisted SocialSellerConfig for each provisioned merchant. Admin fills this
// after the subscription is activated. QC pass is recorded here.

export const ssbBotConfigs = ssbSchema.table(
  'ssb_bot_configs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    subscription_id: uuid('subscription_id').notNull(),
    merchant_slug: text('merchant_slug').notNull(),
    config_json: jsonb('config_json').notNull(),
    qc_passed_at: timestamp('qc_passed_at', { withTimezone: true }),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('ssb_bot_configs_subscription_unique').on(t.subscription_id),
    unique('ssb_bot_configs_slug_unique').on(t.merchant_slug),
    foreignKey({
      columns: [t.subscription_id],
      foreignColumns: [ssbSubscriptions.id],
      name: 'ssb_bot_configs_subscription_id_fk',
    }),
    index('ssb_bot_configs_slug_idx').on(t.merchant_slug),
    index('ssb_bot_configs_qc_idx').on(t.qc_passed_at),
  ],
);
