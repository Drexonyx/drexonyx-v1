// Public Ziina payment success page — called after Ziina redirects back.
// Server-side verification: calls GET /payment_intent/{id} to confirm status.
// organizationId is from DREXONYX_ORG_ID env var — never from URL params.

import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyZiinaPayment } from '@/lib/portal/verify-ziina-payment';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Payment Confirmation' };

interface Props {
  searchParams: Promise<{ drex_payment_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const drexPaymentId = params.drex_payment_id;

  const organizationId = process.env.DREXONYX_ORG_ID?.trim();

  if (!drexPaymentId || !organizationId) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.icon}>⚠</p>
          <h1 className={styles.heading}>Payment reference missing</h1>
          <p className={styles.body}>
            We couldn&apos;t locate your payment. Please{' '}
            <a href="mailto:hello@drexonyx.com" className={styles.link}>contact us</a> with your
            order details.
          </p>
          <Link href="/pricing" className={styles.cta}>View Pricing</Link>
        </div>
      </main>
    );
  }

  const result = await verifyZiinaPayment(drexPaymentId, organizationId);

  if (result.status === 'PAID' || result.status === 'ALREADY_PAID') {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.icon}>✓</p>
          <h1 className={styles.heading}>Payment confirmed</h1>
          <p className={styles.body}>
            Your payment has been verified and your project is now queued for production.
            Our team will reach out within one business day to confirm next steps.
          </p>
          <Link href="/" className={styles.cta}>Back to Home</Link>
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
            <a href="mailto:hello@drexonyx.com" className={styles.link}>contact us</a> if this
            persists.
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
          <Link href="/pricing" className={styles.cta}>Try Again</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.icon}>⚠</p>
        <h1 className={styles.heading}>Payment not found</h1>
        <p className={styles.body}>
          We couldn&apos;t locate this payment record. Please{' '}
          <a href="mailto:hello@drexonyx.com" className={styles.link}>contact us</a> with your
          order details.
        </p>
        <Link href="/pricing" className={styles.cta}>View Pricing</Link>
      </div>
    </main>
  );
}
