import {
  pgSchema,
  uuid,
  text,
  timestamp,
  check,
  foreignKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { organizations } from './core';

export const identitySchema = pgSchema('identity');

export const users = identitySchema.table('users', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  email: text('email').notNull().unique(),
  display_name: text('display_name').notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgMemberships = identitySchema.table(
  'org_memberships',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    user_id: uuid('user_id').notNull(),
    role: text('role').notNull(),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'org_memberships_role_check',
      sql`${t.role} IN ('OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC', 'CLIENT', 'AGENT')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'org_memberships_organization_id_fk',
    }),
    foreignKey({
      columns: [t.user_id],
      foreignColumns: [users.id],
      name: 'org_memberships_user_id_fk',
    }),
    unique('org_memberships_org_user_unique').on(t.organization_id, t.user_id),
    index('org_memberships_org_idx').on(t.organization_id),
    index('org_memberships_user_idx').on(t.user_id),
  ],
);
