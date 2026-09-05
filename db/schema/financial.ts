import {
  pgSchema,
  uuid,
  text,
  timestamp,
  numeric,
  jsonb,
  check,
  foreignKey,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { organizations } from './core';
import { orders, orderBudgets } from './commercial';

export const financialSchema = pgSchema('financial');

// ─── Financial Ledger ─────────────────────────────────────────────────────────
// Append-only. Records all financial entries.
// DR 0002 §7: immutable financial records.

export const financialLedger = financialSchema.table(
  'financial_ledger',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    entry_type: text('entry_type').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    reference_entity_type: text('reference_entity_type'),
    reference_entity_id: uuid('reference_entity_id'),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'financial_ledger_organization_id_fk',
    }),
    index('financial_ledger_org_idx').on(t.organization_id),
    index('financial_ledger_entry_type_idx').on(t.entry_type),
    index('financial_ledger_reference_idx').on(t.reference_entity_type, t.reference_entity_id),
  ],
);

// ─── Payments ─────────────────────────────────────────────────────────────────
// Records client payment events. Append-only history.
// DR 0001 §6: CLIENT PAYMENT → PAYMENT LEDGER.
// DR 0047: status PENDING|PROCESSING|PAID|FAILED|REFUNDED|CHARGEBACK.
// DR 0048: partial unique index (order_id) WHERE status='PAID' enforced in migration.

export const payments = financialSchema.table(
  'payments',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_id: uuid('order_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull(),
    idempotency_key: text('idempotency_key').unique(),
    // DR 0044 §3.2: provider-agnostic field names.
    provider_name: text('provider_name'),
    provider_payment_id: text('provider_payment_id'),
    payment_method_type: text('payment_method_type'),
    failure_reason: text('failure_reason'),
    paid_at: timestamp('paid_at', { withTimezone: true }),
    refunded_at: timestamp('refunded_at', { withTimezone: true }),
    provider_event_id: text('provider_event_id'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'payments_status_check',
      sql`${t.status} IN ('PENDING','PROCESSING','PAID','FAILED','REFUNDED','CHARGEBACK')`,
    ),
    foreignKey({
      columns: [t.order_id, t.organization_id],
      foreignColumns: [orders.id, orders.organization_id],
      name: 'payments_order_id_fk',
    }),
    index('payments_order_idx').on(t.order_id),
    index('payments_org_idx').on(t.organization_id),
    index('payments_status_idx').on(t.status),
    index('payments_provider_payment_id_idx').on(t.provider_payment_id),
  ],
);

// ─── Expenses ─────────────────────────────────────────────────────────────────
// Records spend events from Order Budget. Append-only.
// DR 0001 §6: ORDER BUDGET → EXPENSE LEDGER.

export const expenses = financialSchema.table(
  'expenses',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    order_budget_id: uuid('order_budget_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    expense_type: text('expense_type').notNull(),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.order_budget_id],
      foreignColumns: [orderBudgets.id],
      name: 'expenses_order_budget_id_fk',
    }),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'expenses_organization_id_fk',
    }),
    index('expenses_order_budget_idx').on(t.order_budget_id),
    index('expenses_org_idx').on(t.organization_id),
    index('expenses_type_idx').on(t.expense_type),
  ],
);

// ─── Provider Credits ──────────────────────────────────────────────────────────
// DR 0001 §6: EXPENSE LEDGER → PROVIDER CREDITS.
// Separate from company cash, profit, and owner settlement.

export const providerCredits = financialSchema.table(
  'provider_credits',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    provider: text('provider').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('ACTIVE'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'provider_credits_status_check',
      sql`${t.status} IN ('ACTIVE','CONSUMED','EXPIRED','CANCELLED')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'provider_credits_organization_id_fk',
    }),
    index('provider_credits_org_idx').on(t.organization_id),
    index('provider_credits_provider_idx').on(t.provider),
    index('provider_credits_status_idx').on(t.status),
  ],
);

// ─── Reserves ─────────────────────────────────────────────────────────────────
// DR 0001 §6: PROFIT CALCULATION → RESERVES.
// Company-level cash reserves.

export const reserves = financialSchema.table(
  'reserves',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    reserve_type: text('reserve_type').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'reserves_status_check',
      sql`${t.status} IN ('ACTIVE','ALLOCATED','RELEASED')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'reserves_organization_id_fk',
    }),
    index('reserves_org_idx').on(t.organization_id),
    index('reserves_status_idx').on(t.status),
  ],
);

// ─── Owner Settlements ────────────────────────────────────────────────────────
// DR 0001 §6: DISTRIBUTABLE PROFIT → OWNER SETTLEMENT.
// Append-only records of owner payments.

export const ownerSettlements = financialSchema.table(
  'owner_settlements',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('PENDING'),
    idempotency_key: text('idempotency_key').unique(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'owner_settlements_status_check',
      sql`${t.status} IN ('PENDING','PAID','FAILED')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'owner_settlements_organization_id_fk',
    }),
    index('owner_settlements_org_idx').on(t.organization_id),
    index('owner_settlements_status_idx').on(t.status),
  ],
);

// ─── Reserve Allocations (many-to-many) ───────────────────────────────────────
// DR 0002 §5: Reserve + Owner Settlement many-to-many allocation.

export const reserveAllocations = financialSchema.table(
  'reserve_allocations',
  {
    reserve_id: uuid('reserve_id').notNull(),
    owner_settlement_id: uuid('owner_settlement_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    allocated_amount: numeric('allocated_amount', { precision: 19, scale: 4 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.reserve_id, t.owner_settlement_id] }),
    foreignKey({
      columns: [t.reserve_id],
      foreignColumns: [reserves.id],
      name: 'reserve_allocations_reserve_id_fk',
    }),
    foreignKey({
      columns: [t.owner_settlement_id],
      foreignColumns: [ownerSettlements.id],
      name: 'reserve_allocations_owner_settlement_id_fk',
    }),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'reserve_allocations_organization_id_fk',
    }),
    index('reserve_allocations_reserve_idx').on(t.reserve_id),
    index('reserve_allocations_settlement_idx').on(t.owner_settlement_id),
    index('reserve_allocations_org_idx').on(t.organization_id),
  ],
);
