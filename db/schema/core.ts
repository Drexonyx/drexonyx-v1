import { pgSchema, uuid, text, timestamp } from 'drizzle-orm/pg-core';
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
