import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../success/page.module.css';

export const metadata: Metadata = { title: 'Payment Cancelled' };

export default function CheckoutCancelPage() {
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
