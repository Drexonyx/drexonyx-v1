// DR 0078: Materializes an AI generation result into an internal Asset record.
// DR 0079: Emits AI_GENERATION_ASSET_CREATED audit event after insert.
// DR 0054: file_key uses convention {provider}/{org}/{assetId}/generation; content_url is temporary.
// DR 0064: actor_id = production_job_id, actor_role = 'AGENT'.

import { db } from '@/db/index';
import { assets, assetAiGenerations, aiGenerations, productionJobs } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { transitionAssetToReadyForQc } from './terminal';

export type MaterializationResult =
  | { ok: true; assetId: string }
  | { ok: false; error: string };

export async function materializeGenerationAsset(params: {
  aiGenerationId: string;
  productionJobId: string;
  organizationId: string;
  provider: string;
  resultUrl?: string;
}): Promise<MaterializationResult> {
  const { aiGenerationId, productionJobId, organizationId, provider, resultUrl } = params;

  // DR 0078 §2.4: Primary idempotency — check for existing link
  const existingLink = await db
    .select({ asset_id: assetAiGenerations.asset_id })
    .from(assetAiGenerations)
    .where(eq(assetAiGenerations.ai_generation_id, aiGenerationId))
    .limit(1);

  if (existingLink.length > 0) {
    return { ok: true, assetId: existingLink[0].asset_id };
  }

  // Secondary idempotency via idempotency_keys
  const idempKey = `ASSET_MATERIALIZED:${aiGenerationId}`;
  const existingIdemp = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existingIdemp.length > 0 && existingIdemp[0].status === 'COMPLETED') {
    // Idempotency key present but link not found — inconsistent state; treat as already done
    const retryLink = await db
      .select({ asset_id: assetAiGenerations.asset_id })
      .from(assetAiGenerations)
      .where(eq(assetAiGenerations.ai_generation_id, aiGenerationId))
      .limit(1);
    if (retryLink.length > 0) return { ok: true, assetId: retryLink[0].asset_id };
  }

  // Load order_id from ProductionJob — required for Asset FK
  const jobRows = await db
    .select({ order_id: productionJobs.order_id })
    .from(productionJobs)
    .where(and(eq(productionJobs.id, productionJobId), eq(productionJobs.organization_id, organizationId)))
    .limit(1);

  if (jobRows.length === 0) {
    return { ok: false, error: `ProductionJob not found: ${productionJobId}` };
  }

  const orderId = jobRows[0].order_id;

  try {
    const assetId = uuidv7();
    // DR 0054 §2.2: file_key convention — no actual storage backend yet (DEFERRED)
    const fileKey = `${provider}/${organizationId}/${assetId}/generation`;

    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ASSET_MATERIALIZED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      await tx.insert(assets).values({
        id: assetId,
        organization_id: organizationId,
        order_id: orderId,
        status: 'PROCESSING',
        file_key: fileKey,
        // DR 0054 §2.4: content_url is a temporary placeholder only — never the canonical reference
        content_url: resultUrl ?? null,
      });

      await tx.insert(assetAiGenerations).values({
        asset_id: assetId,
        ai_generation_id: aiGenerationId,
        organization_id: organizationId,
      });

      // DR 0079: emit AI_GENERATION_ASSET_CREATED before transitioning to READY_FOR_QC
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'asset',
        entity_id: assetId,
        actor_id: productionJobId, // DR 0064
        actor_role: 'AGENT',
        action: 'AI_GENERATION_ASSET_CREATED',
        payload: {
          ai_generation_id: aiGenerationId,
          asset_id: assetId,
          production_job_id: productionJobId,
          organization_id: organizationId,
          file_key: fileKey,
          content_url: resultUrl ?? null,
        },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));
    });

    // Transition PROCESSING→READY_FOR_QC outside the creation transaction (DR 0056 transition #6)
    const qcResult = await transitionAssetToReadyForQc({
      assetId,
      organizationId,
      productionJobId,
    });

    if (!qcResult.ok) {
      return { ok: false, error: `Asset created but READY_FOR_QC transition failed: ${qcResult.reason}` };
    }

    return { ok: true, assetId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Materialization failed: ${msg}` };
  }
}
