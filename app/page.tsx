import type { Metadata } from "next";
import HomepageContent from "@/components/HomepageContent";

export const metadata: Metadata = {
  title: "DREXONYX GROUP — Digital & Creative Solutions",
  description:
    "Dubai-based creative group delivering brand, design, and digital solutions for growing businesses worldwide.",
};

/* ─── Why DREXONYX — preserved for future /about or /why-us page ─────────────
   UNCOMMENT and render when a dedicated page is created.

const WHY_FEATURES = [
  {
    num: "01",
    title: "UGC That Sells",
    desc: "Creator-led creative designed around hooks, benefits and conversion.",
    icon: "bars",
  },
  {
    num: "02",
    title: "Cinematic When It Matters",
    desc: "Premium visual storytelling when the product needs more than standard UGC.",
    icon: "video",
  },
  {
    num: "03",
    title: "Built for Brands",
    desc: "Fast production, consistent quality, and creative built around the brief.",
    icon: "team",
  },
];

<section className={styles.why} aria-labelledby="why-heading">
  <div className="container">
    <p className={styles.eyebrow}>Why DREXONYX</p>
    <h2 id="why-heading" className={styles.whyHeading}>
      AI Speed. Human Creative Direction.
    </h2>
    <ul className={styles.whyList}>
      {WHY_FEATURES.map((f) => (
        <li key={f.num} className={styles.whyItem}>
          <span className={styles.whyNum}>{f.num}</span>
          <strong className={styles.whyTitle}>{f.title}</strong>
          <p className={styles.whyDesc}>{f.desc}</p>
        </li>
      ))}
    </ul>
  </div>
</section>

─────────────────────────────────────────────────────────────────────────── */

/* ─── Industries — preserved for future /services or /about page ─────────────
   UNCOMMENT and render when a dedicated page is created.

const INDUSTRIES = ["Startups", "SMEs", "E-commerce", "Hospitality", "Retail", "Enterprise"];

<section className={styles.industries} aria-labelledby="industries-heading">
  <div className="container">
    <p className={styles.eyebrow}>Industries</p>
    <h2 id="industries-heading" className={styles.sectionHeading}>
      Trusted by Ambitious Brands
    </h2>
    <div className={styles.industriesStrip}>
      {INDUSTRIES.map((industry) => (
        <div key={industry} className={styles.industryItem}>
          <span className={styles.industryLabel}>{industry}</span>
        </div>
      ))}
    </div>
  </div>
</section>

─────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return <HomepageContent />;
}
