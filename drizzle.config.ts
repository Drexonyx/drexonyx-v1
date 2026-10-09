import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './db/migrations',
  schema: './db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['core', 'identity', 'commercial', 'production', 'financial', 'system', 'sales'],
  verbose: true,
  strict: true,
});
