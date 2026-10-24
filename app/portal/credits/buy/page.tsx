// DR 0120: Portal credit purchase page — buy credit packages while logged in.
// organizationId comes from the server-side session.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getActiveCreditPackages } from '@/lib/credits/packages';
import { getCreditBalance } from '@/lib/credits/balance';
import { createCreditPurchaseCheckout } from '@/lib/credits/create-credit-purchase';
import PortalCreditBuyForm from './PortalCreditBuyForm';
import PayRedirectClient from './PayRedirectClient';
import s from '../../portal.module.css';

export const metadata = { title: 'Buy Credits — Client Portal' };

export default async function PortalBuyCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ pkg?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const params = await searchParams;
  const pkgId = params.pkg;

  const [packages, balance] = await Promise.all([
    getActiveCreditPackages(),
    getCreditBalance(session.user.organizationId),
  ]);

  // Direct checkout — skip the package list when coming from pricing
  if (pkgId) {
    const pkg = packages.find((p) => p.id === pkgId);
    if (pkg) {
      const headersList = await headers();
      const host = headersList.get('host') ?? 'localhost:3000';
      const proto = headersList.get('x-forwarded-proto') ?? 'http';
      const baseUrl = `${proto}://${host}`;

      const result = await createCreditPurchaseCheckout({
        creditPackageId: pkgId,
        organizationId: session.user.organizationId,
        actorId: session.user.id ?? null,
        baseUrl,
        successPath: '/portal/credits/buy/success',
        cancelPath: '/portal/credits/buy',
      });

      if (result.ok) {
        const priceFormatted =
          'AED ' +
          parseFloat(pkg.price_aed).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
        return (
          <>
            <div className={s.pageHeader}>
              <h1 className={s.pageTitle}>Complete Payment</h1>
              <p className={s.pageSubtitle}>
                Current balance: <strong>{balance.toLocaleString('en-US')} credits</strong>
              </p>
            </div>
            <PayRedirectClient
              url={result.redirectUrl}
              packageName={pkg.name}
              priceAed={priceFormatted}
            />
          </>
        );
      }
    }
  }

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
