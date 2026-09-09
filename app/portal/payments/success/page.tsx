// DR 0045 §3.3: This page is informational only.
// Payment status is set exclusively by webhook (checkout.session.completed).
// The session_id from Stripe is NOT used to update payment state here.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import s from '../../portal.module.css';

export const metadata = { title: 'Payment Submitted — Client Portal' };

export default async function PaymentSuccessPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  return (
    <div className={s.emptyState}>
      <div className={s.emptyTitle}>Payment submitted</div>
      <div className={s.emptyBody}>
        Your payment is being processed. Status will update automatically once confirmed.
        <br />
        <Link href="/portal/payments" style={{ color: 'var(--drex-accent)', marginTop: '1rem', display: 'inline-block' }}>
          View payment history →
        </Link>
      </div>
    </div>
  );
}
