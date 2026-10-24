import type { Metadata } from "next";
import Link from "next/link";
import { MICRO_PACKAGES, PRODUCTION_PACKAGES, CUSTOM_TIERS } from "@/lib/pricing";
import { getActiveCreditPackages } from "@/lib/credits/packages";
import styles from "./page.module.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "DREXONYX pricing and packages — performance UGC creative production. Campaign-based packages tailored to your brand's production needs.",
};

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

function formatAed(priceStr: string): string {
  const n = parseFloat(priceStr);
  return 'AED ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default async function PricingPage() {
  const creditPackages = await getActiveCreditPackages();

  return (
    <>
      <section className={styles.hero} aria-labelledby="pricing-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>Pricing</div>
          <h1 id="pricing-hero-heading" className={styles.heroHeading}>
            Packages & Pricing
          </h1>
          <p className={styles.heroSub}>
            Purchase credits to produce performance UGC at scale.
            All prices in UAE Dirham.
          </p>
        </div>
      </section>

      {/* ── Credit packages ───────────────────────────────────────────────── */}
      <section className={styles.packagesSection} aria-labelledby="credits-heading">
        <div className="container">
          <h2 id="credits-heading" className={styles.sectionLabel}>
            Credit Packages
          </h2>
          <p className={styles.sectionDesc}>
            Buy credits to spend across DREXONYX production services. Credits never expire.
            Volume discounts apply at higher tiers.
          </p>

          {creditPackages.length > 0 ? (
            <div className={styles.creditGrid}>
              {creditPackages.map((pkg) => (
                <article key={pkg.id} className={styles.creditCard} aria-label={pkg.name}>
                  <div className={styles.packageHeader}>
                    <h3 className={styles.packageName}>{pkg.name}</h3>
                  </div>
                  <div>
                    <div className={styles.creditCredits}>{formatCredits(pkg.credits)}</div>
                    <div className={styles.creditCreditsLabel}>Credits</div>
                  </div>
                  <div className={styles.packagePrice}>{formatAed(pkg.price_aed)}</div>
                  <Link href={`/portal/credits/buy?pkg=${pkg.id}`} className={styles.ctaSecondary}>
                    Buy Credits
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Production services ───────────────────────────────────────────── */}
      <section className={styles.servicesSection} aria-labelledby="services-heading">
        <div className="container">
          <h2 id="services-heading" className={styles.sectionLabel}>
            Production Services
          </h2>
          <p className={styles.sectionDesc}>
            Spend Credits on video production services. Each service costs a fixed number of Credits —
            buy the Credit Package that matches your production volume.
          </p>

          <div className={styles.servicesGrid}>
            {PRODUCTION_PACKAGES.map((pkg) => (
              <article key={pkg.id} className={styles.serviceCard} aria-label={pkg.name}>
                <div className={styles.packageHeader}>
                  <h3 className={styles.packageName}>{pkg.name}</h3>
                  <div className={styles.serviceCreditCost}>
                    {formatCredits(pkg.creditCost)} Credits
                  </div>
                </div>
                <p className={styles.packageDesc}>{pkg.description}</p>
                <ul className={styles.packageIncludes} aria-label={`${pkg.name} inclusions`}>
                  {pkg.includes.map((item) => (
                    <li key={item} className={styles.packageItem}>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/portal/credits/buy" className={styles.ctaSecondary}>
                  Buy Credits
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
            Creative Direction Services
          </h2>
          <p className={styles.microSectionDesc}>
            Professional creative strategy and direction — accessible to individuals, solo
            entrepreneurs, and businesses of any size. Pay with Credits; no full production
            commitment required.
          </p>

          <div className={styles.microGrid}>
            {MICRO_PACKAGES.map((pkg) => (
              <article key={pkg.id} className={styles.microCard} aria-label={pkg.name}>
                <div className={styles.packageHeader}>
                  <h3 className={styles.packageName}>{pkg.name}</h3>
                  <div className={styles.serviceCreditCost}>{pkg.priceLabel}</div>
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
                q: "What's the difference between the micro products and credit-based production?",
                a: "Micro Creative and Creative Brief are creative direction documents — they give you a professional concept and strategy to work from. Credit packages give you access to actual video production and delivery.",
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
                a: "Turnaround times vary by production type. Timeline and credit cost are confirmed at project start. Custom timelines are agreed at project scope.",
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
            Ready to get started?
          </h2>
          <p className={styles.ctaBandSub}>
            Create your account and buy your first credit package to start producing.
          </p>
          <Link href="/portal/signup" className={styles.ctaPrimary}>
            Create Account
          </Link>
        </div>
      </section>
    </>
  );
}
