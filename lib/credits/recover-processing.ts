// DR 0120: Recovery for PROCESSING credit_purchases whose success page was never visited.
// Triggered by the cron job at /api/internal/poll-generations to prevent credits being lost
// when a user pays on Ziina but closes the browser before reaching the success page.

import { db } from '@/db/index';
import { creditPurchases } from '@/db/schema/financial';
import { and, eq, lt } from 'drizzle-orm';
import { verifyCreditPurchase } from './verify-credit-purchase';

const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_LIMIT = 20;

export async function recoverProcessingCreditPurchases(organizationId: string): Promise<{
  checked: number;
  completed: number;
  failed: number;
  errors: number;
}> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

  const stuck = await db
    .select({
      id: creditPurchases.id,
      organization_id: creditPurchases.organization_id,
    })
    .from(creditPurchases)
    .where(
      and(
        eq(creditPurchases.status, 'PROCESSING'),
        eq(creditPurchases.organization_id, organizationId),
        lt(creditPurchases.updated_at, cutoff),
      ),
    )
    .limit(BATCH_LIMIT);

  if (stuck.length === 0) return { checked: 0, completed: 0, failed: 0, errors: 0 };

  let completed = 0;
  let failed = 0;
  let errors = 0;

  for (const purchase of stuck) {
    try {
      const result = await verifyCreditPurchase(purchase.id, purchase.organization_id);
      if (result.status === 'COMPLETED' || result.status === 'ALREADY_COMPLETED') {
        completed++;
      } else if (result.status === 'FAILED') {
        failed++;
      }
    } catch (err) {
      errors++;
      console.error('[recoverProcessingCreditPurchases] error for purchase', purchase.id, err);
    }
  }

  return { checked: stuck.length, completed, failed, errors };
}
