// DR 0120: Portal credit purchase page — buy credit packages while logged in.
// organizationId comes from the server-side session.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getActiveCreditPackages } from '@/lib/credits/packages';
import { getCreditBalance } from '@/lib/credits/balance';
import PortalCreditBuyForm from './PortalCreditBuyForm';
import s from '../../portal.module.css';

export const metadata = { title: 'Buy Credits — Client Portal' };

export default async function PortalBuyCreditsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const [packages, balance] = await Promise.all([
    getActiveCreditPackages(),
    getCreditBalance(session.user.organizationId),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Buy Credits</h1>
        <p className={s.pageSubtitle}>
          Current balance: <strong>{balance.toLocaleString('en-US')} credits</strong>
        </p>
      </div>

      {packages.length === 0 ? (
        <div className={s.emptyState}>
          <p>No credit packages are currently available. Please contact us.</p>
        </div>
      ) : (
        <PortalCreditBuyForm packages={packages} organizationId={session.user.organizationId} />
      )}
    </>
  );
}
