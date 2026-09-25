// DR 0120: Production service picker — customer selects a package and confirms.
// Credit balance from server-side session org; packages from lib/pricing.ts (server-canonical).

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCreditBalance } from '@/lib/credits/balance';
import { PRODUCTION_PACKAGES, MICRO_PACKAGES } from '@/lib/pricing';
import ProductionPkgForm from './ProductionPkgForm';
import s from '../../portal.module.css';

export const metadata = { title: 'Start a Production — Client Portal' };

const ALL_PACKAGES = [...PRODUCTION_PACKAGES, ...MICRO_PACKAGES];

export default async function NewProductionPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const creditBalance = await getCreditBalance(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Start a Production</h1>
        <p className={s.pageSubtitle}>
          Select a package below. Credits are reserved at confirmation.
          Your current balance:{' '}
          <strong>{creditBalance.toLocaleString('en-US')} credits</strong>.
        </p>
      </div>

      <ProductionPkgForm packages={ALL_PACKAGES} creditBalance={creditBalance} />
    </>
  );
}
