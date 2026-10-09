import type { Metadata } from "next";
import Image from "next/image";
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
        <div className={styles.heroGoldLine} aria-hidden="true" />
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroImgWrap} aria-hidden="true">
          <Image
            src="/images/drexonyx-creative-crew-hero.png"
            alt=""
            fill
            className={styles.heroImg}
            priority
            sizes="55vw"
          />
          <div className={styles.heroImgFade} />
        </div>
        <div className="container">
          <div className={styles.heroContent}>
            <Image
              src="/brand/drexonyx-logo.png"
              alt="DREXONYX"
              width={1866}
              height={736}
              className={styles.heroLogo}
              priority
            />
            <div className={styles.heroBadge}>Dubai · Portfolio</div>
            <h1 id="portfolio-hero-heading" className={styles.heroHeading}>
              Performance <span className={styles.heroAccent}>Creative Work</span>
            </h1>
            <p className={styles.heroSub}>
              UGC advertising creative built for conversion — across video, static, and strategy.
              Work samples are internal production samples added as they are completed.
            </p>
            <div className={styles.heroCta}>
              <Link href="/start-project" className={styles.ctaPrimary}>
                Start a Project
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.portfolioSection} aria-label="Portfolio pieces">
        <div className="container">
          <PortfolioFilter items={PORTFOLIO_ITEMS} />
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="portfolio-cta-heading">
        <div className="container">
          <div className={styles.ctaBandInner}>
            <div className={styles.ctaBandLeft}>
              <span className={styles.ctaBandEyebrow}>Ready to produce?</span>
              <h2 id="portfolio-cta-heading" className={styles.ctaBandHeading}>
                Want category-specific examples?
              </h2>
              <p className={styles.ctaBandSub}>
                Submit your campaign brief and we&apos;ll share relevant work from our production
                history directly.
              </p>
            </div>
            <div className={styles.ctaBandRight}>
              <Link href="/start-project" className={styles.ctaPrimary}>
                Start Project
              </Link>
              <Link href="/services" className={styles.ctaContactLink}>
                View services →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
