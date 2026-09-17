// DR 0110: Ziina payment success return URL — performs server-side verification.
// Client redirect does NOT set payment status. This page calls GET /payment_intent/{id}
// server-side to confirm status before applying any state transition.
// organizationId is always from the server-side session, never from URL params.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyZiinaPayment } from '@/lib/portal/verify-ziina-payment';
import s from '../../../portal.module.css';

export const metadata = { title: 'Payment — Client Portal' };

interface Props {
  searchParams: Promise<{ drex_payment_id?: string }>;
}

export default async function ZiinaPaymentSuccessPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const params = await searchParams;
  const drexPaymentId = params.drex_payment_id;

  if (!drexPaymentId) {
    return (
      <div className={s.emptyState}>
        <div className={s.emptyTitle}>Payment reference missing</div>
        <div className={s.emptyBody}>
          <Link href="/portal/payments" style={{ color: 'var(--drex-accent)' }}>
            View payment history →
          </Link>
        </div>
      </div>
    );
  }

  // Server-side verification — never trusts the redirect alone
  const result = await verifyZiinaPayment(drexPaymentId, session.user.organizationId);

  if (result.status === 'PAID' || result.status === 'ALREADY_PAID') {
    return (
      <div className={s.emptyState}>
        <div className={s.emptyTitle}>Payment confirmed</div>
        <div className={s.emptyBody}>
          Your payment has been verified and recorded. Production will begin shortly.
          <br />
          <Link href="/portal/payments" style={{ color: 'var(--drex-accent)', marginTop: '1rem', display: 'inline-block' }}>
            View payment history →
          </Link>
        </div>
      </div>
    );
  }

  if (result.status === 'PENDING') {
    return (
      <div className={s.emptyState}>
        <div className={s.emptyTitle}>Payment processing</div>
        <div className={s.emptyBody}>
          Your payment is still being processed. Status will update automatically once confirmed.
          <br />
          <Link href="/portal/payments" style={{ color: 'var(--drex-accent)', marginTop: '1rem', display: 'inline-block' }}>
            View payment history →
          </Link>
        </div>
      </div>
    );
  }

  if (result.status === 'FAILED') {
    return (
      <div className={s.emptyState}>
        <div className={s.emptyTitle}>Payment not completed</div>
        <div className={s.emptyBody}>
          Your payment could not be confirmed. You can retry from your Orders page.
          <br />
          <Link href="/portal/orders" style={{ color: 'var(--drex-accent)', marginTop: '1rem', display: 'inline-block' }}>
            Back to Orders →
          </Link>
        </div>
      </div>
    );
  }

  // NOT_FOUND or ERROR
  return (
    <div className={s.emptyState}>
      <div className={s.emptyTitle}>Payment not found</div>
      <div className={s.emptyBody}>
        <Link href="/portal/payments" style={{ color: 'var(--drex-accent)' }}>
          View payment history →
        </Link>
      </div>
    </div>
  );
}
