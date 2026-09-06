// DR 0080: ProductionJob + AiGeneration creation boundary.
// POST /api/agent/jobs — OWNER or ADMIN_OPERATIONS only.
// Creates records atomically. Does NOT dispatch to provider.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/index';
import { productionJobs, aiGenerations } from '@/db/schema/production';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, organizationId, role } = session.user;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return NextResponse.json({ error: 'Forbidden: only OWNER or ADMIN_OPERATIONS may create jobs' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.orderId !== 'string' || !b.orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }
  if (typeof b.provider !== 'string' || !b.provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }
  if (typeof b.model !== 'string' || !b.model) {
    return NextResponse.json({ error: 'model is required' }, { status: 400 });
  }
  if (typeof b.prompt !== 'string' || !b.prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const params = (typeof b.params === 'object' && b.params !== null) ? b.params as Record<string, unknown> : {};

  const productionJobId = uuidv7();
  const aiGenerationId = uuidv7();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(productionJobs).values({
        id: productionJobId,
        order_id: b.orderId as string,
        organization_id: organizationId,
        job_type: 'AI_GENERATION',
        status: 'QUEUED',
      });

      await tx.insert(aiGenerations).values({
        id: aiGenerationId,
        production_job_id: productionJobId,
        organization_id: organizationId,
        provider: b.provider as string,
        model: b.model as string,
        prompt: b.prompt as string,
        params,
        status: 'REQUESTED',
      });

      // DR 0080 §2.7: emit PRODUCTION_JOB_CREATED audit event
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_job',
        entity_id: productionJobId,
        actor_id: userId,
        actor_role: role,
        action: 'PRODUCTION_JOB_CREATED',
        payload: {
          production_job_id: productionJobId,
          ai_generation_id: aiGenerationId,
          order_id: b.orderId,
          provider: b.provider,
          model: b.model,
        },
      });
    });

    return NextResponse.json({ productionJobId, aiGenerationId }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Job creation failed: ${msg}` }, { status: 500 });
  }
}
