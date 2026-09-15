import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { PACKAGES, formatPriceAED, type Package } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "DREXONYX pricing and packages — performance UGC creative production. Campaign-based packages tailored to your brand's production needs.",
};

function PackageCard({ pkg }: { pkg: Package }) {
  const priceDisplay = pkg.priceFrom
    ? `From ${formatPriceAED(pkg.priceAED)}`
    : formatPriceAED(pkg.priceAED);

  const isCustom = pkg.category === "custom";
  const ctaLabel = isCustom ? "Brief Your Project" : "Get Started";
  const ctaClass = pkg.highlight ? styles.ctaPrimary : styles.ctaSecondary;

  return (
    <article
      className={`${styles.packageCard} ${pkg.highlight ? styles.packageCardHighlight : ""}`}
      aria-label={pkg.name}
    >
      {pkg.highlight && (
        <div className={styles.packageBadge} aria-label="Most popular package">
          Most Popular
        </div>
      )}
      <div className={styles.packageHeader}>
        <h3 className={styles.packageName}>{pkg.name}</h3>
        <div className={styles.packagePrice}>{priceDisplay}</div>
      </div>
      <p className={styles.packageDesc}>{pkg.description}</p>
      <ul className={styles.packageIncludes} aria-label={`${pkg.name} inclusions`}>
        {pkg.includes.map((item) => (
          <li key={item} className={styles.packageItem}>
            {item}
          </li>
        ))}
      </ul>
      {pkg.excludes.length > 0 && (
        <div className={styles.packageExcludes}>
          <span className={styles.packageExcludesLabel}>Not included</span>
          <ul
            className={styles.packageExcludesList}
            aria-label={`${pkg.name} exclusions`}
          >
            {pkg.excludes.map((item) => (
              <li key={item} className={styles.packageExcludesItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link href="/start-project" className={ctaClass}>
        {ctaLabel}
      </Link>
    </article>
  );
}

const entryPackages = PACKAGES.filter((p) => p.category === "entry");
const corePackages = PACKAGES.filter((p) => p.category === "core");
const premiumPackages = PACKAGES.filter((p) => p.category === "premium");
const customPackages = PACKAGES.filter((p) => p.category === "custom");

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

          {/* Entry Products */}
          <div className={styles.packagesGroup}>
            <div className={styles.packagesGroupHeader}>
              <h2 className={styles.packagesGroupTitle}>Entry Products</h2>
              <p className={styles.packagesGroupDesc}>
                Minimum viable creative for brands testing the water or working with limited budgets.
              </p>
            </div>
            <div className={styles.packagesGrid}>
              {entryPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </div>

          {/* Core Production */}
          <div className={styles.packagesGroup}>
            <div className={styles.packagesGroupHeader}>
              <h2 className={styles.packagesGroupTitle}>Production Packages</h2>
              <p className={styles.packagesGroupDesc}>
                Full-production UGC advertising programs for brands running consistent campaigns.
              </p>
            </div>
            <div className={styles.packagesGrid}>
              {corePackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </div>

          {/* Premium Production */}
          <div className={styles.packagesGroup}>
            <div className={styles.packagesGroupHeader}>
              <h2 className={styles.packagesGroupTitle}>Premium Production</h2>
              <p className={styles.packagesGroupDesc}>
                Cinematic-grade creative for premium brands where quality is the brief.
              </p>
            </div>
            <div className={styles.packagesGridWide}>
              {premiumPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </div>

          {/* Custom Engagements */}
          <div className={styles.packagesGroup}>
            <div className={styles.packagesGroupHeader}>
              <h2 className={styles.packagesGroupTitle}>Custom Engagements</h2>
              <p className={styles.packagesGroupDesc}>
                Fully scoped production partnerships built around your brief.
              </p>
            </div>
            <div className={styles.packagesGridWide}>
              {customPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
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
                a: "Entry products (Micro Creative, Creative Brief, Spark) deliver in 48 hours. Starter delivers in 5 business days. Growth in 7 business days. Scale in 10 business days. Production packages in 15 business days. Brand Film timelines are scoped at briefing. All timelines begin once your brief and payment are confirmed.",
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
