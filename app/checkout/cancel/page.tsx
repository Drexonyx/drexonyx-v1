import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../success/page.module.css';
import { db } from '@/db/index';
import { idempotencyKeys } from '@/db/schema/system';
import { and, eq, sql } from 'drizzle-orm';
import { verifyZiinaPayment } from '@/lib/portal/verify-ziina-payment';

export const metadata: Metadata = { title: 'Payment Cancelled' };

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ drex_payment_id?: string }>;
}) {
  const { drex_payment_id } = await searchParams;
  const drexPaymentId = drex_payment_id?.trim();
  const organizationId = process.env.DREXONYX_ORG_ID?.trim();

  if (drexPaymentId && organizationId) {
    // Verify with Ziina server-side — transitions PROCESSING→FAILED if Ziina confirms
    // cancelled/failed. Errors are swallowed so the page always renders.
    await verifyZiinaPayment(drexPaymentId, organizationId).catch(() => {});

    // Reset the checkout idempotency slot so the user can retry immediately
    // without waiting for the 2-hour TTL to expire. The slot is identified by
    // the paymentId stored in its JSONB response_payload.
    await db
      .update(idempotencyKeys)
      .set({ status: 'FAILED', updated_at: new Date() })
      .where(
        and(
          eq(idempotencyKeys.organization_id, organizationId),
          eq(idempotencyKeys.operation_type, 'CHECKOUT_INITIATE'),
          eq(idempotencyKeys.status, 'PROCESSING'),
          sql`${idempotencyKeys.response_payload}->>'paymentId' = ${drexPaymentId}`,
        ),
      );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.icon}>←</p>
        <h1 className={styles.heading}>Payment cancelled</h1>
        <p className={styles.body}>
          No charge has been applied. You can go back to pricing and try again whenever you&apos;re
          ready, or submit a project brief and we&apos;ll follow up with a payment link.
        </p>
        <Link href="/pricing" className={styles.cta}>View Pricing</Link>
      </div>
    </main>
  );
}
