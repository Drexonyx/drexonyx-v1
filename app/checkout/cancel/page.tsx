import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../success/page.module.css';
import { db } from '@/db/index';
import { idempotencyKeys } from '@/db/schema/system';
import { and, eq, sql } from 'drizzle-orm';
import { verifyCreditPurchase } from '@/lib/credits/verify-credit-purchase';

export const metadata: Metadata = { title: 'Payment Cancelled' };

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ drex_credit_purchase_id?: string }>;
}) {
  const { drex_credit_purchase_id } = await searchParams;
  const creditPurchaseId = drex_credit_purchase_id?.trim();
  const organizationId = process.env.DREXONYX_ORG_ID?.trim();

  if (creditPurchaseId && organizationId) {
    // Server-side Ziina status check — transitions PROCESSING → FAILED if Ziina confirms
    // cancelled/failed. Errors are swallowed so the page always renders.
    await verifyCreditPurchase(creditPurchaseId, organizationId).catch(() => {});

    // Reset the checkout idempotency slot so the user can retry immediately
    // without waiting for the 2-hour TTL to expire.
    await db
      .update(idempotencyKeys)
      .set({ status: 'FAILED', updated_at: new Date() })
      .where(
        and(
          eq(idempotencyKeys.organization_id, organizationId),
          eq(idempotencyKeys.operation_type, 'CREDIT_CHECKOUT_INITIATE'),
          eq(idempotencyKeys.status, 'PROCESSING'),
          sql`${idempotencyKeys.response_payload}->>'creditPurchaseId' = ${creditPurchaseId}`,
        ),
      );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.icon}>←</p>
        <h1 className={styles.heading}>Payment cancelled</h1>
        <p className={styles.body}>
          No charge has been applied. You can go back and select a credit package whenever
          you&apos;re ready.
        </p>
        <Link href="/checkout" className={styles.cta}>Buy Credits</Link>
      </div>
    </main>
  );
}
