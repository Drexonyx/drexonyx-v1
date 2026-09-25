// DR 0120: Production started confirmation page.
// orderId comes from URL param — used for display only, not for auth or data lookup.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import s from '../../../portal.module.css';

export const metadata = { title: 'Production Started — Client Portal' };

interface Props {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function ProductionSuccessPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const params = await searchParams;
  const orderId = params.orderId;

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Production started</h1>
        <p className={s.pageSubtitle}>
          Your production is now queued. Credits have been reserved.
          {orderId && (
            <>
              {' '}
              Order reference: <strong>{orderId.slice(0, 8)}…</strong>
            </>
          )}
        </p>
      </div>

      <div className={s.actionRow}>
        <Link href="/portal/production" className={s.primaryBtn}>
          View Productions
        </Link>
        <Link href="/portal/credits" className={s.secondaryBtn}>
          View Credit Balance
        </Link>
      </div>
    </>
  );
}
