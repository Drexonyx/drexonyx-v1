import type { Metadata } from 'next';
import Link from 'next/link';
import { getActiveCreditPackages } from '@/lib/credits/packages';
import { PRODUCTION_PACKAGES, MICRO_PACKAGES } from '@/lib/pricing';
import CreditCheckoutForm from './CreditCheckoutForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Buy Credits',
  description: 'Purchase production credits to start your DREXONYX project.',
};

type Props = {
  searchParams: Promise<{ service?: string }>;
};

const ALL_SERVICE_PACKAGES = [...PRODUCTION_PACKAGES, ...MICRO_PACKAGES];

export default async function CheckoutPage({ searchParams }: Props) {
  const { service } = await searchParams;
  const packages = await getActiveCreditPackages();

  // Resolve a service identifier (from /start-project) to the smallest DB credit
  // package that covers the service's credit cost. Falls back to null (first package
  // selected by form default) when no match exists or the identifier is unknown.
  let preSelected: (typeof packages)[number] | null = null;
  if (service) {
    const servicePkg = ALL_SERVICE_PACKAGES.find((p) => p.id === service);
    if (servicePkg) {
      preSelected =
        packages
          .filter((p) => p.credits >= servicePkg.creditCost)
          .sort((a, b) => a.credits - b.credits)[0] ?? null;
    }
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="checkout-heading">
        <div className="container">
          <div className={styles.heroBadge}>Get Started</div>
          <h1 id="checkout-heading" className={styles.heroHeading}>
            Buy Credits
          </h1>
          <p className={styles.heroSub}>
            Purchase production credits. Use them in your client portal to start productions — at your own pace.
          </p>
        </div>
      </section>

      <section className={styles.checkoutSection} aria-label="Credit package selection">
        <div className="container">
          {packages.length === 0 ? (
            <div className={styles.noPackage} role="status">
              <p className={styles.noPackageHeading}>No packages available</p>
              <p className={styles.noPackageText}>
                Please contact us to discuss your production requirements.
              </p>
              <Link href="/start-project" className={styles.noPackageCta}>
                Contact Us
              </Link>
            </div>
          ) : (
            <CreditCheckoutForm packages={packages} preSelectedId={preSelected?.id ?? null} />
          )}
        </div>
      </section>
    </>
  );
}
