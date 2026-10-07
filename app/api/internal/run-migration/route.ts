// One-time internal migration runner: applies 0026_email_optouts.sql.
// Only available while SALES_OUTREACH_TEST_MODE=true (test phase gate).
// All statements are CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS —
// safe to call multiple times.

import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { sql } from 'drizzle-orm';

export const maxDuration = 30;

export async function GET(): Promise<NextResponse> {
  if (process.env.SALES_OUTREACH_TEST_MODE !== 'true') {
    return NextResponse.json({ error: 'Not available outside test mode' }, { status: 403 });
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sales"."email_optouts" (
        "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
        "email" text NOT NULL,
        "token" text NOT NULL,
        "opted_out_at" timestamp with time zone,
        "source_message_id" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "email_optouts_email_unique"
      ON "sales"."email_optouts" USING btree ("email")
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "email_optouts_token_unique"
      ON "sales"."email_optouts" USING btree ("token")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "email_optouts_opted_out_at_idx"
      ON "sales"."email_optouts" USING btree ("opted_out_at")
    `);

    return NextResponse.json({ ok: true, migration: '0026_email_optouts', applied: true });
  } catch (err) {
    console.error('[run-migration/0026] failed:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
