// Portal credit purchase success — server-side verification for logged-in clients.
// organizationId from server-side session — never from URL params.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyCreditPurchase } from '@/lib/credits/verify-credit-purchase';
import s from '../../../portal.module.css';

export const metadata = { title: 'Credits Added — Client Portal' };

interface Props {
  searchParams: Promise<{ drex_credit_purchase_id?: string }>;
}

export default async function PortalCreditSuccessPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const params = await searchParams;
  const creditPurchaseId = params.drex_credit_purchase_id;

  if (!creditPurchaseId) {
    return (
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Purchase reference missing</h1>
        <p className={s.pageSubtitle}>
          We couldn&apos;t locate your purchase.{' '}
          <Link href="/portal/credits">View your credit balance</Link> or{' '}
          <a href="mailto:hello@drexonyx.com">contact us</a>.
        </p>
      </div>
    );
  }

  const result = await verifyCreditPurchase(creditPurchaseId, session.user.organizationId);

  if (result.status === 'COMPLETED' || result.status === 'ALREADY_COMPLETED') {
    return (
      <>
        <div className={s.pageHeader}>
          <h1 className={s.pageTitle}>Credits added</h1>
          <p className={s.pageSubtitle}>
            <strong>{result.credits.toLocaleString('en-US')} credits</strong> are now in your account.
          </p>
        </div>
        <div className={s.actionRow}>
          <Link href="/portal/production/new" className={s.primaryBtn}>
            Start a Production
          </Link>
          <Link href="/portal/credits" className={s.secondaryBtn}>
            View Credit Balance
          </Link>
        </div>
      </>
    );
  }

  if (result.status === 'PENDING') {
    return (
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Payment processing</h1>
        <p className={s.pageSubtitle}>
          Your payment is being processed. Refresh this page in a moment.
        </p>
      </div>
    );
  }

  if (result.status === 'FAILED') {
    return (
      <>
        <div className={s.pageHeader}>
          <h1 className={s.pageTitle}>Payment not completed</h1>
          <p className={s.pageSubtitle}>
            Your payment could not be confirmed. No credits were charged.
          </p>
        </div>
        <div className={s.actionRow}>
          <Link href="/portal/credits/buy" className={s.primaryBtn}>
            Try Again
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className={s.pageHeader}>
      <h1 className={s.pageTitle}>Purchase not found</h1>
      <p className={s.pageSubtitle}>
        <Link href="/portal/credits">View your credit balance</Link> or{' '}
        <a href="mailto:hello@drexonyx.com">contact us</a> for assistance.
      </p>
    </div>
  );
}
