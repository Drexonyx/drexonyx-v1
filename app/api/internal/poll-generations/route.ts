// Vercel Cron Job: polls all RUNNING AiGenerations that have a provider_job_id set.
// Runs every 2 minutes (vercel.json) as the durable fallback for webhook-less completions.
// Each invocation performs one status poll per generation — the cron schedule IS the retry loop.
// Authentication: Vercel sets Authorization: Bearer {CRON_SECRET} on every cron invocation.
// Idempotency, tenant isolation, and CAS transitions are delegated to pollGenerationStatus.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { aiGenerations } from '@/db/schema/production';
import { and, eq, isNotNull } from 'drizzle-orm';
import { pollGenerationStatus } from '@/lib/agent/polling';

// Cap per invocation to stay within the serverless execution budget.
const POLL_BATCH_LIMIT = 50;

export const maxDuration = 60; // seconds

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify Vercel Cron secret — Vercel injects Authorization: Bearer {CRON_SECRET}.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find RUNNING AiGenerations that have a provider_job_id (dispatched, awaiting completion).
  const runningGens = await db
    .select({
      id: aiGenerations.id,
      production_job_id: aiGenerations.production_job_id,
      organization_id: aiGenerations.organization_id,
    })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.status, 'RUNNING'),
        isNotNull(aiGenerations.provider_job_id),
      ),
    )
    .limit(POLL_BATCH_LIMIT);

  if (runningGens.length === 0) {
    return NextResponse.json({ polled: 0, done: 0, still_running: 0, errors: 0 });
  }

  const outcomes = await Promise.allSettled(
    runningGens.map((gen) =>
      pollGenerationStatus({
        aiGenerationId: gen.id,
        productionJobId: gen.production_job_id,
        organizationId: gen.organization_id,
      }),
    ),
  );

  let done = 0;
  let still_running = 0;
  let errors = 0;

  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') {
      errors++;
      console.error('[cron/poll-generations] pollGenerationStatus threw:', outcome.reason);
    } else if (!outcome.value.ok) {
      errors++;
      console.error('[cron/poll-generations] pollGenerationStatus error:', outcome.value.error);
    } else if (outcome.value.done) {
      done++;
    } else {
      still_running++;
    }
  }

  return NextResponse.json({ polled: runningGens.length, done, still_running, errors });
}
