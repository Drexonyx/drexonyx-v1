import type { Metadata } from "next";
import Link from "next/link";
import { MICRO_PACKAGES, PRODUCTION_PACKAGES, CUSTOM_TIERS } from "@/lib/pricing";
import styles from "./page.module.css";

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
            Campaign-based creative packages built around your production needs.
            All prices in UAE Dirham.
          </p>
        </div>
      </section>

      {/* ── Production packages ────────────────────────────────────────────── */}
      <section className={styles.packagesSection} aria-labelledby="production-heading">
        <div className="container">
          <h2 id="production-heading" className={styles.sectionLabel}>
            Production Packages
          </h2>

          <div className={styles.packagesGrid}>
            {PRODUCTION_PACKAGES.map((pkg) => (
              <article
                key={pkg.id}
                className={`${styles.packageCard} ${pkg.highlight ? styles.packageCardHighlight : ""}`}
                aria-label={pkg.name}
              >
                {pkg.badge && (
                  <div className={styles.packageBadge} aria-label="Most popular package">
                    {pkg.badge}
                  </div>
                )}
                <div className={styles.packageHeader}>
                  {pkg.category && (
                    <div className={styles.packageCategory}>
                      {pkg.category === 'standard-ugc' ? 'Standard UGC' : 'Cinematic UGC'}
                    </div>
                  )}
                  <h3 className={styles.packageName}>{pkg.name}</h3>
                  <div className={styles.packagePrice}>{pkg.priceLabel}</div>
                </div>
                <p className={styles.packageDesc}>{pkg.description}</p>
                <ul className={styles.packageIncludes} aria-label={`${pkg.name} inclusions`}>
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

      {/* ── Micro / entry products ─────────────────────────────────────────── */}
      <section className={styles.microSection} aria-labelledby="micro-heading">
        <div className="container">
          <h2 id="micro-heading" className={styles.microSectionHeading}>
            Need Something Smaller?
          </h2>
          <p className={styles.microSectionDesc}>
            Professional DREXONYX creative guidance accessible to everyone — individuals,
            creators, solo entrepreneurs, and businesses of any size. The same strategic
            thinking and creative quality, without a full production commitment.
          </p>

          <div className={styles.microGrid}>
            {MICRO_PACKAGES.map((pkg) => (
              <article key={pkg.id} className={styles.microCard} aria-label={pkg.name}>
                <div className={styles.packageHeader}>
                  <h3 className={styles.packageName}>{pkg.name}</h3>
                  <div className={styles.packagePrice}>{pkg.priceLabel}</div>
                </div>
                <p className={styles.packageDesc}>{pkg.description}</p>
                <ul className={styles.packageIncludes} aria-label={`${pkg.name} inclusions`}>
                  {pkg.includes.map((item) => (
                    <li key={item} className={styles.packageItem}>
                      {item}
                    </li>
                  ))}
                </ul>
                {pkg.scopeNote && (
                  <p className={styles.scopeNote}>{pkg.scopeNote}</p>
                )}
                <Link href="/start-project" className={styles.ctaSecondary}>
                  Get Started
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Custom / Enterprise ────────────────────────────────────────────── */}
      <section className={styles.customSection} aria-labelledby="custom-heading">
        <div className="container">
          <h2 id="custom-heading" className={styles.customSectionHeading}>
            Large-Scale & Custom Production
          </h2>
          <p className={styles.customSectionDesc}>
            For brand films, enterprise programs, and projects that require a bespoke scope
            and timeline.
          </p>

          <div className={styles.customGrid}>
            {CUSTOM_TIERS.map((tier) => (
              <article key={tier.id} className={styles.customCard} aria-label={tier.name}>
                <div className={styles.packageHeader}>
                  <h3 className={styles.packageName}>{tier.name}</h3>
                  <div className={styles.customPriceLabel}>{tier.priceLabel}</div>
                </div>
                <p className={styles.packageDesc}>{tier.description}</p>
                <ul
                  className={styles.packageIncludes}
                  aria-label={`${tier.name} attributes`}
                >
                  {tier.attributes.map((attr) => (
                    <li key={attr} className={styles.packageItem}>
                      {attr}
                    </li>
                  ))}
                </ul>
                <Link href={tier.ctaHref} className={styles.ctaPrimary}>
                  {tier.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
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
                q: "What's the difference between the micro products and full production?",
                a: "Micro Creative and Creative Brief are creative direction documents — they give you a professional concept and strategy to work from. Spark and above include actual video production and delivery.",
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
                a: "Turnaround times are shown per package — from 48 hours for Spark to 15 business days for Production. Custom timelines are agreed at project scope.",
              },
              {
                q: "Do you manage ad campaigns or media buying?",
                a: "No. DREXONYX produces creative content and advertising assets. Campaign management, media buying, and ad optimization are outside our scope.",
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

      {/* ── CTA band ──────────────────────────────────────────────────────── */}
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
