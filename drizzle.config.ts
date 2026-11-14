import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './db/migrations',
  schema: './db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // orchestration schema is excluded: it is managed by a separate migration path and must not be touched by drizzle-kit
  schemaFilter: ['core', 'identity', 'commercial', 'production', 'financial', 'system', 'sales', 'ssb'],
  verbose: true,
  strict: true,
});
