import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import PortfolioFilter from "./PortfolioFilter";
import { PORTFOLIO_ITEMS } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "DREXONYX portfolio — performance UGC creative work across categories. See our approach to brand-safe, conversion-focused advertising.",
};

export default function PortfolioPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="portfolio-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>Portfolio</div>
          <h1 id="portfolio-hero-heading" className={styles.heroHeading}>
            Performance Creative Work
          </h1>
          <p className={styles.heroSub}>
            Performance UGC creative across categories — work samples will be featured here as
            client-approved pieces become available for public display.
          </p>
        </div>
      </section>

      <section className={styles.portfolioSection} aria-label="Portfolio pieces">
        <div className="container">
          <PortfolioFilter items={PORTFOLIO_ITEMS} />
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="portfolio-cta-heading">
        <div className="container">
          <h2 id="portfolio-cta-heading" className={styles.ctaBandHeading}>
            Want to see more relevant examples?
          </h2>
          <p className={styles.ctaBandSub}>
            Start your campaign inquiry and we&apos;ll share category-specific work directly.
          </p>
          <Link href="/start-project" className={styles.ctaPrimary}>
            Start Project
          </Link>
        </div>
      </section>
    </>
  );
}
