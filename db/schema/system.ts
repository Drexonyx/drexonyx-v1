import {
  pgSchema,
  uuid,
  text,
  timestamp,
  jsonb,
  check,
  foreignKey,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { organizations } from './core';

export const systemSchema = pgSchema('system');

// ─── Audit Events ─────────────────────────────────────────────────────────────
// DR 0002 §6: polymorphic (entity_type, entity_id, organization_id), append-only.

export const auditEvents = systemSchema.table(
  'audit_events',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: uuid('entity_id').notNull(),
    actor_id: uuid('actor_id'),
    actor_role: text('actor_role'),
    action: text('action').notNull(),
    payload: jsonb('payload'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'audit_events_organization_id_fk',
    }),
    index('audit_events_org_idx').on(t.organization_id),
    index('audit_events_entity_idx').on(t.entity_type, t.entity_id),
    index('audit_events_actor_idx').on(t.actor_id),
    index('audit_events_created_at_idx').on(t.created_at),
  ],
);

// ─── Service Tokens ───────────────────────────────────────────────────────────
// DR 0065: Scoped Service Token — opaque, hash-only storage.
// Raw token is NEVER stored. token_hash is SHA-256 of the raw token.
// Scope: (organization_id, production_job_id).

export const serviceTokens = systemSchema.table(
  'service_tokens',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    token_hash: text('token_hash').notNull(),
    organization_id: uuid('organization_id').notNull(),
    production_job_id: uuid('production_job_id').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'service_tokens_organization_id_fk',
    }),
    unique('service_tokens_token_hash_unique').on(t.token_hash),
    index('service_tokens_token_hash_idx').on(t.token_hash),
    index('service_tokens_org_job_idx').on(t.organization_id, t.production_job_id),
    index('service_tokens_expires_at_idx').on(t.expires_at),
  ],
);

// ─── Idempotency Keys ─────────────────────────────────────────────────────────
// DR 0002 D4: centralized for payments, AI callbacks, delivery confirmations,
// financial events.

export const idempotencyKeys = systemSchema.table(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    key: text('key').notNull(),
    organization_id: uuid('organization_id').notNull(),
    operation_type: text('operation_type').notNull(),
    status: text('status').notNull().default('PENDING'),
    request_hash: text('request_hash'),
    response_payload: jsonb('response_payload'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'idempotency_keys_status_check',
      sql`${t.status} IN ('PENDING','PROCESSING','COMPLETED','FAILED')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'idempotency_keys_organization_id_fk',
    }),
    unique('idempotency_keys_key_org_unique').on(t.key, t.organization_id),
    index('idempotency_keys_org_idx').on(t.organization_id),
    index('idempotency_keys_status_idx').on(t.status),
    index('idempotency_keys_expires_at_idx').on(t.expires_at),
  ],
);
