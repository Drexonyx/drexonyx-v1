import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { PACKAGES, formatPriceAED } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "DREXONYX pricing and packages — performance UGC creative production. Campaign-based packages tailored to your brand's production needs.",
};

export default function PricingPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="pricing-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>Pricing</div>
          <h1 id="pricing-hero-heading" className={styles.heroHeading}>
            Packages & Pricing
          </h1>
          <p className={styles.heroSub}>
            Campaign-based creative packages built around your production needs. Pricing is
            finalized at project scope.
          </p>
        </div>
      </section>

      <section className={styles.packagesSection} aria-label="Pricing packages">
        <div className="container">
          <div className={styles.packagesGrid}>
            {PACKAGES.map((pkg) => (
              <article
                key={pkg.id}
                className={`${styles.packageCard} ${pkg.highlight ? styles.packageCardHighlight : ""}`}
                aria-label={pkg.name}
              >
                {pkg.highlight && (
                  <div className={styles.packageBadge} aria-label="Most popular package">
                    Most Popular
                  </div>
                )}
                <div className={styles.packageHeader}>
                  <h2 className={styles.packageName}>{pkg.name}</h2>
                  <div className={styles.packagePrice}>{formatPriceAED(pkg.priceAED)}</div>
                </div>
                <p className={styles.packageDesc}>{pkg.description}</p>
                <ul
                  className={styles.packageIncludes}
                  aria-label={`${pkg.name} inclusions`}
                >
                  {pkg.includes.map((item) => (
                    <li key={item} className={styles.packageItem}>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/start-project"
                  className={pkg.highlight ? styles.ctaPrimary : styles.ctaSecondary}
                >
                  Get Started
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-heading">
        <div className="container">
          <h2 id="faq-heading" className={styles.sectionHeading}>
            Common Questions
          </h2>
          <dl className={styles.faqList}>
            {[
              {
                q: "Do you offer custom scopes outside these packages?",
                a: "Yes. If your campaign requirements don't fit a standard package, submit your brief and we'll scope a custom engagement.",
              },
              {
                q: "How are revisions handled?",
                a: "Revisions within the original brief are included in each package. Out-of-scope changes are quoted separately.",
              },
              {
                q: "What information do you need to get started?",
                a: "Your brand guidelines, campaign objectives, target audience, platform targets, and any creative references. The intake form will guide you through the full brief.",
              },
              {
                q: "How long does production take?",
                a: "Starter packages deliver in 5 business days. Growth packages deliver in 7 business days. Scale packages deliver in 10 business days. Timelines begin once your brief and payment are confirmed.",
              },
              {
                q: "Do you manage ad campaigns or media buying?",
                a: "No. DREXONYX produces UGC advertising creative only. Campaign management, media buying, and ad optimization are outside our scope.",
              },
            ].map((item) => (
              <div key={item.q} className={styles.faqItem}>
                <dt className={styles.faqQ}>{item.q}</dt>
                <dd className={styles.faqA}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="pricing-cta-heading">
        <div className="container">
          <h2 id="pricing-cta-heading" className={styles.ctaBandHeading}>
            Not sure which package fits?
          </h2>
          <p className={styles.ctaBandSub}>
            Submit your campaign brief and we&apos;ll recommend the right scope for your goals.
          </p>
          <Link href="/start-project" className={styles.ctaPrimary}>
            Start Project
          </Link>
        </div>
      </section>
    </>
  );
}
