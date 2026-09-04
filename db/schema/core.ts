import {
  pgSchema,
  uuid,
  text,
  timestamp,
  foreignKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const coreSchema = pgSchema('core');

export const organizations = coreSchema.table('organizations', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Brand DNA (DR 0038 — APPROVED) ─────────────────────────────────────────

export const brandDna = coreSchema.table(
  'brand_dna',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    brand_name: text('brand_name'),
    brand_voice: text('brand_voice'),
    visual_guidelines_summary: text('visual_guidelines_summary'),
    target_audience: text('target_audience'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'brand_dna_organization_id_fk',
    }),
    unique('brand_dna_org_unique').on(t.organization_id),
    index('brand_dna_org_idx').on(t.organization_id),
  ],
);
