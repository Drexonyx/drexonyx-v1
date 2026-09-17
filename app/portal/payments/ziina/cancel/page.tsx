// DR 0110: Ziina payment cancel return URL — informational only.
// No payment state is modified on cancel. PROCESSING payment remains until
// server-side verification confirms failure or the payment expires.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import s from '../../../portal.module.css';

export const metadata = { title: 'Payment Cancelled — Client Portal' };

export default async function ZiinaPaymentCancelPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  return (
    <div className={s.emptyState}>
      <div className={s.emptyTitle}>Payment cancelled</div>
      <div className={s.emptyBody}>
        Your payment was not completed. You can retry from your Orders page.
        <br />
        <Link href="/portal/orders" style={{ color: 'var(--drex-accent)', marginTop: '1rem', display: 'inline-block' }}>
          Back to Orders →
        </Link>
      </div>
    </div>
  );
}
