import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "DREXONYX portfolio — performance UGC creative work across categories. See our approach to brand-safe, conversion-focused advertising.",
};

const CATEGORIES = ["All", "UGC Video", "Static Creative", "Creative Strategy"] as const;

// Portfolio content is intentionally held until client-approved work can be featured.
// Cards below represent category placeholders — no real client data, logos, or stats.
const PORTFOLIO_ITEMS = [
  {
    id: "p-001",
    category: "UGC Video",
    label: "PLACEHOLDER — UGC Video Campaign",
    note: "Work sample pending client approval",
  },
  {
    id: "p-002",
    category: "Static Creative",
    label: "PLACEHOLDER — Static Ad Set",
    note: "Work sample pending client approval",
  },
  {
    id: "p-003",
    category: "UGC Video",
    label: "PLACEHOLDER — UGC Video Campaign",
    note: "Work sample pending client approval",
  },
  {
    id: "p-004",
    category: "Creative Strategy",
    label: "PLACEHOLDER — Creative Strategy Brief",
    note: "Work sample pending client approval",
  },
  {
    id: "p-005",
    category: "Static Creative",
    label: "PLACEHOLDER — Static Ad Set",
    note: "Work sample pending client approval",
  },
  {
    id: "p-006",
    category: "UGC Video",
    label: "PLACEHOLDER — UGC Video Campaign",
    note: "Work sample pending client approval",
  },
] as const;

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

          <div className={styles.portfolioGrid} role="list">
            {PORTFOLIO_ITEMS.map((item) => (
              <article
                key={item.id}
                className={styles.portfolioCard}
                role="listitem"
                aria-label={item.label}
              >
                <div className={styles.cardPlaceholder} aria-hidden="true">
                  <span className={styles.cardPlaceholderIcon}>▶</span>
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.cardCategory}>{item.category}</span>
                  <p className={styles.cardLabel}>{item.label}</p>
                  <p className={styles.cardNote}>{item.note}</p>
                </div>
              </article>
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
          <Link href="/start-campaign" className={styles.ctaPrimary}>
            Start Your Campaign
          </Link>
        </div>
      </section>
    </>
  );
}
