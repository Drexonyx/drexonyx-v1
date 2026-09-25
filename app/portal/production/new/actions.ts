'use server';

// DR 0120: Start a production by consuming credits.
// Flow: verify credit balance → create Campaign+Quote+Order → reserve credits → create production job.
// organizationId from server-side session — never from client.
// Credit cost from lib/pricing.ts (PRODUCTION_PACKAGES.creditCost) — never from client.

import { auth } from '@/auth';
import { db } from '@/db/index';
import { campaigns, quotes, orders, orderBudgets } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import { PRODUCTION_PACKAGES, MICRO_PACKAGES } from '@/lib/pricing';
import { reserveCredits } from '@/lib/credits/ledger';
import { createProductionJob } from '@/lib/admin/production-jobs';
import { runGenerationDriver } from '@/lib/agent/driver';
import { createManualUploadAsset } from '@/lib/admin/manual-upload';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

const ALL_PACKAGES = [...PRODUCTION_PACKAGES, ...MICRO_PACKAGES];

export type StartProductionResult =
  | { ok: true; orderId: string; productionJobId: string }
  | { ok: false; reason: string };

export async function actionStartProduction(
  pkgId: string,
): Promise<StartProductionResult> {
  const session = await auth();
  if (!session) return { ok: false, reason: 'Not authenticated' };
  if (session.user.role !== 'CLIENT') return { ok: false, reason: 'Unauthorized' };

  const organizationId = session.user.organizationId;
  const actorId = session.user.id;

  // Step 1: Validate package — credit cost from server-side canonical source only
  const pkg = ALL_PACKAGES.find((p) => p.id === pkgId);
  if (!pkg) return { ok: false, reason: 'Unknown production package' };

  const creditCost = pkg.creditCost;
  const now = new Date();

  // Step 2: Create Campaign + Quote + Order + OrderBudget atomically
  const campaignId = uuidv7();
  const quoteId = uuidv7();
  const orderId = uuidv7();
  const orderBudgetId = uuidv7();
  const creditAmount = creditCost.toFixed(4);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(campaigns).values({
        id: campaignId,
        organization_id: organizationId,
        name: `${pkg.name} — ${new Date().toLocaleDateString('en-US')}`,
        status: 'ORDERED',
        created_at: now,
        updated_at: now,
      });

      // Quote amount in credits (stored as numeric, currency = 'CREDITS')
      await tx.insert(quotes).values({
        id: quoteId,
        campaign_id: campaignId,
        organization_id: organizationId,
        status: 'ACCEPTED',
        total_amount: creditAmount,
        currency: 'CREDITS',
        accepted_at: now,
        created_at: now,
        updated_at: now,
      });

      await tx.insert(orders).values({
        id: orderId,
        campaign_id: campaignId,
        quote_id: quoteId,
        organization_id: organizationId,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      });

      await tx.insert(orderBudgets).values({
        id: orderBudgetId,
        order_id: orderId,
        organization_id: organizationId,
        planned_amount: creditAmount,
        created_at: now,
        updated_at: now,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'order',
        entity_id: orderId,
        actor_id: actorId,
        actor_role: 'CLIENT',
        action: 'CREDIT_PRODUCTION_ORDER_CREATED',
        payload: {
          campaign_id: campaignId,
          quote_id: quoteId,
          order_id: orderId,
          pkg_id: pkgId,
          pkg_name: pkg.name,
          credit_cost: creditCost,
          currency: 'CREDITS',
        },
      });
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Failed to create order';
    return { ok: false, reason };
  }

  // Step 3: Create production job first (to get the job ID for credit reservation)
  const aiProvider = process.env.PRODUCTION_AI_PROVIDER ?? null;
  const aiModel = process.env.PRODUCTION_AI_MODEL ?? null;
  const aiPrompt = process.env.PRODUCTION_AI_PROMPT ?? null;
  const useAiGeneration = Boolean(aiProvider && aiModel && aiPrompt);
  const jobType = useAiGeneration ? 'AI_GENERATION' : 'MANUAL_UPLOAD';

  const jobResult = await createProductionJob({
    orderId,
    organizationId,
    jobType,
    description: `${pkg.name} production — ${creditCost} credits`,
    actorId,
    actorRole: 'CLIENT',
    ...(useAiGeneration
      ? { aiGenerationParams: { provider: aiProvider!, model: aiModel!, prompt: aiPrompt! } }
      : {}),
  });

  if (!jobResult.ok) {
    return { ok: false, reason: `Production job creation failed: ${jobResult.reason}` };
  }

  const productionJobId = jobResult.jobId;

  // Step 4: Reserve credits (balance check + reservation in one idempotent operation)
  const reserveResult = await reserveCredits({
    organizationId,
    productionJobId,
    credits: creditCost,
    description: `Credits reserved for ${pkg.name} production`,
    actorId,
  });

  if (!reserveResult.ok) {
    // Credit reservation failed — job was created but credits not reserved.
    // This means insufficient balance. The job will not start.
    return {
      ok: false,
      reason:
        reserveResult.reason === 'INSUFFICIENT_CREDITS'
          ? `Insufficient credits. This production requires ${creditCost.toLocaleString('en-US')} credits. Please buy more credits.`
          : `Credit reservation failed: ${reserveResult.reason}`,
    };
  }

  // Step 5: Start production driver
  if (useAiGeneration) {
    const driverResult = await runGenerationDriver({
      productionJobId,
      organizationId,
    });
    if (!driverResult.ok) {
      // Production driver failed after credit reservation — log but do not fail the response.
      // Credits are reserved; the job is queued and can be retried by the system.
      console.error(
        `[actionStartProduction] runGenerationDriver failed for job ${productionJobId}:`,
        driverResult.reason,
      );
    }
  } else {
    const assetResult = await createManualUploadAsset({
      productionJobId,
      organizationId,
      actorId: SYSTEM_ACTOR_ID,
      actorRole: 'OWNER',
    });
    if (!assetResult.ok) {
      console.error(
        `[actionStartProduction] createManualUploadAsset failed for job ${productionJobId}:`,
        assetResult.reason,
      );
    }
  }

  return { ok: true, orderId, productionJobId };
}
