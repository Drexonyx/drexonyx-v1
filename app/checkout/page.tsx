import type { Metadata } from 'next';
import Link from 'next/link';
import { getActiveCreditPackages } from '@/lib/credits/packages';
import CreditCheckoutForm from './CreditCheckoutForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Buy Credits',
  description: 'Purchase production credits to start your DREXONYX project.',
};

type Props = {
  searchParams: Promise<{ pkg?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const { pkg } = await searchParams;
  const packages = await getActiveCreditPackages();
  const preSelected = pkg ? packages.find((p) => p.id === pkg) ?? null : null;

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
