import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as coreSchema from './schema/core';
import * as identitySchema from './schema/identity';
import * as commercialSchema from './schema/commercial';
import * as productionSchema from './schema/production';
import * as financialSchema from './schema/financial';
import * as systemSchema from './schema/system';
import * as orchestrationSchema from './schema/orchestration';
import * as salesSchema from './schema/sales';
import * as ssbSchema from './schema/ssb';

const schema = {
  ...coreSchema,
  ...identitySchema,
  ...commercialSchema,
  ...productionSchema,
  ...financialSchema,
  ...systemSchema,
  ...orchestrationSchema,
  ...salesSchema,
  ...ssbSchema,
};

export type DbSchema = typeof schema;

let _db: ReturnType<typeof drizzle<DbSchema>> | undefined;

function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    // prepare: false — required for Neon's connection pooler (PgBouncer in transaction mode
    // does not support named prepared statements). Safe for direct connections too.
    const client = postgres(connectionString, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<DbSchema>>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<DbSchema>>];
  },
});

export {
  coreSchema,
  identitySchema,
  commercialSchema,
  productionSchema,
  financialSchema,
  systemSchema,
  orchestrationSchema,
  salesSchema,
  ssbSchema,
};
