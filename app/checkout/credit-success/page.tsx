// Credit purchase success page — called after Ziina redirects back.
// Server-side Ziina verification + credit allocation.
// organizationId is from DREXONYX_ORG_ID env var — never from URL params.
// DR 0120: confirms payment, allocates credits, shows balance-ready message.

import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyCreditPurchase } from '@/lib/credits/verify-credit-purchase';
import styles from '../success/page.module.css';

export const metadata: Metadata = { title: 'Credits Added' };

interface Props {
  searchParams: Promise<{ drex_credit_purchase_id?: string }>;
}

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

export default async function CreditSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const creditPurchaseId = params.drex_credit_purchase_id;
  const organizationId = process.env.DREXONYX_ORG_ID?.trim();

  if (!creditPurchaseId || !organizationId) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.icon}>⚠</p>
          <h1 className={styles.heading}>Reference missing</h1>
          <p className={styles.body}>
            We couldn&apos;t locate your purchase. Please{' '}
            <a href="mailto:hello@drexonyx.com" className={styles.link}>contact us</a> with your
            order details.
          </p>
          <Link href="/checkout" className={styles.cta}>Try Again</Link>
        </div>
      </main>
    );
  }

  const result = await verifyCreditPurchase(creditPurchaseId, organizationId);

  if (result.status === 'COMPLETED' || result.status === 'ALREADY_COMPLETED') {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.icon}>✓</p>
          <h1 className={styles.heading}>Credits added</h1>
          <p className={styles.body}>
            <strong>{formatCredits(result.credits)} credits</strong> have been added to your account.
            Log in to the client portal to start a production.
          </p>
          <Link href="/portal/dashboard" className={styles.cta}>Go to Portal</Link>
        </div>
      </main>
    );
  }

  if (result.status === 'PENDING') {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.icon}>⏳</p>
          <h1 className={styles.heading}>Payment processing</h1>
          <p className={styles.body}>
            Your payment is still being processed. This usually takes only a moment.
            Please refresh this page or{' '}
            <a href="mailto:hello@drexonyx.com" className={styles.link}>contact us</a> if this persists.
          </p>
        </div>
      </main>
    );
  }

  if (result.status === 'FAILED') {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.icon}>✕</p>
          <h1 className={styles.heading}>Payment not completed</h1>
          <p className={styles.body}>
            Your payment could not be confirmed. No charge has been applied.
            Please try again or{' '}
            <a href="mailto:hello@drexonyx.com" className={styles.link}>contact us</a> for help.
          </p>
          <Link href="/checkout" className={styles.cta}>Try Again</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.icon}>⚠</p>
        <h1 className={styles.heading}>Purchase not found</h1>
        <p className={styles.body}>
          We couldn&apos;t locate this purchase record. Please{' '}
          <a href="mailto:hello@drexonyx.com" className={styles.link}>contact us</a> with your
          purchase details.
        </p>
        <Link href="/checkout" className={styles.cta}>Buy Credits</Link>
      </div>
    </main>
  );
}
