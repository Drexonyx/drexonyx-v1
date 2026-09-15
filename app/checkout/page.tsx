import type { Metadata } from 'next';
import Link from 'next/link';
import { PACKAGES, formatPriceAED } from '@/lib/pricing';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your DREXONYX project order.',
};

const defaultPackage = PACKAGES.find((p) => p.highlight) ?? PACKAGES[0];

export default function CheckoutPage() {
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
          <div className={styles.checkoutLayout}>
            <div className={styles.orderCard}>
              <h2 className={styles.orderHeading}>Selected Package</h2>
              <div className={styles.pkgHeader}>
                <p className={styles.pkgName}>{defaultPackage.name}</p>
                <p className={styles.pkgPrice}>{formatPriceAED(defaultPackage.priceAED)}</p>
              </div>
              <p className={styles.pkgDesc}>{defaultPackage.description}</p>
              <ul className={styles.pkgIncludes} aria-label="Package inclusions">
                {defaultPackage.includes.map((item) => (
                  <li key={item} className={styles.pkgItem}>
                    {item}
                  </li>
                ))}
              </ul>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalPrice}>{formatPriceAED(defaultPackage.priceAED)}</span>
              </div>
            </div>

            <div className={styles.paymentCard}>
              <h2 className={styles.paymentHeading}>Payment</h2>
              <p className={styles.paymentNote}>
                Online payment is coming soon. To move forward now, submit your project brief and
                our team will follow up with a payment link within one business day.
              </p>
              <button type="button" className={styles.proceedBtn} disabled>
                Proceed to Payment
              </button>
              <Link href="/start-project" className={styles.altLink}>
                Submit Project Brief Instead
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
