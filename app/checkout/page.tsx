import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCTION_PACKAGES } from '@/lib/pricing';
import CheckoutForm from './CheckoutForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your DREXONYX project order.',
};

type Props = {
  searchParams: Promise<{ pkg?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const { pkg } = await searchParams;
  const selectedPackage = pkg
    ? (PRODUCTION_PACKAGES.find((p) => p.id === pkg) ?? null)
    : null;

  return (
    <>
      <section className={styles.hero} aria-labelledby="checkout-heading">
        <div className="container">
          <div className={styles.heroBadge}>Checkout</div>
          <h1 id="checkout-heading" className={styles.heroHeading}>
            Order Summary
          </h1>
          <p className={styles.heroSub}>
            Review your selected package and proceed to confirm your order.
          </p>
        </div>
      </section>

      <section className={styles.checkoutSection} aria-label="Order details">
        <div className="container">
          {selectedPackage === null ? (
            <div className={styles.noPackage} role="status">
              <p className={styles.noPackageHeading}>No package selected</p>
              <p className={styles.noPackageText}>
                Please select a package from the pricing page to continue.
              </p>
              <Link href="/pricing" className={styles.noPackageCta}>
                View Pricing
              </Link>
            </div>
          ) : (
            <div className={styles.checkoutLayout}>
              <div className={styles.orderCard}>
                <h2 className={styles.orderHeading}>Selected Package</h2>
                <div className={styles.pkgHeader}>
                  <p className={styles.pkgName}>{selectedPackage.name}</p>
                  <p className={styles.pkgPrice}>{selectedPackage.priceLabel}</p>
                </div>
                <p className={styles.pkgDesc}>{selectedPackage.description}</p>
                <ul className={styles.pkgIncludes} aria-label="Package inclusions">
                  {selectedPackage.includes.map((item) => (
                    <li key={item} className={styles.pkgItem}>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalPrice}>{selectedPackage.priceLabel}</span>
                </div>
              </div>

              <CheckoutForm selectedPackage={selectedPackage} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
