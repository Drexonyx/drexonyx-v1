import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "DREXONYX portfolio — performance UGC creative work across categories. See our approach to brand-safe, conversion-focused advertising.",
};

const CATEGORIES = ["All", "UGC Video", "Static Creative", "Creative Strategy"] as const;


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
          {/* Category filter — static, no JS required for initial render */}
          <div className={styles.filterRow} role="group" aria-label="Filter by category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${cat === "All" ? styles.filterBtnActive : ""}`}
                aria-pressed={cat === "All"}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.portfolioNotice}>
            <p>
              Portfolio is actively updated as client-approved work is cleared for public display.
            </p>
          </div>
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
