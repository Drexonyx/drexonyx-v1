import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "DREXONYX — Performance Creative Studio",
  description:
    "AI-powered UGC advertising built for modern brands. DREXONYX delivers performance creative at scale — fast, measurable, brand-safe.",
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>Performance Creative Studio</div>
            <h1 id="hero-heading" className={styles.heroHeading}>
              UGC Advertising
              <br />
              <span className={styles.heroAccent}>Built to Perform</span>
            </h1>
            <p className={styles.heroSub}>
              DREXONYX delivers AI-powered user-generated content advertising for modern brands.
              Creative at scale. Performance at the core.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/start-campaign" className={styles.ctaPrimary}>
                Start Your Campaign
              </Link>
              <Link href="/how-it-works" className={styles.ctaSecondary}>
                See How It Works
              </Link>
            </div>
          </div>

          {/* Cinematic right-side visual */}
          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.studioPanel}>
              <div className={styles.studioBar}>
                <span className={styles.studioRec}>
                  <span className={styles.recDot} />
                  REC
                </span>
                <span className={styles.studioName}>DREXONYX STUDIO</span>
                <span className={styles.studioBadge}>4K</span>
              </div>
              <div className={styles.studioScreen}>
                <div className={styles.screenBg} />
                <div className={styles.screenGlow} />
                <div className={styles.shaft1} />
                <div className={styles.shaft2} />
                <div className={styles.vignette} />
                <div className={styles.scanLines} />
                <div className={styles.letterboxTop} />
                <div className={styles.letterboxBot} />
              </div>
              <div className={`${styles.studioBar} ${styles.studioBarBottom}`}>
                <span className={styles.timecode}>00:00:00:00</span>
                <span className={styles.frameTag}>UGC · PERF CREATIVE</span>
                <span className={styles.aspect}>16:9</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value pillars */}
      <section className={styles.pillars} aria-labelledby="pillars-heading">
        <div className="container">
          <h2 id="pillars-heading" className={styles.sectionLabel}>
            Why DREXONYX
          </h2>
          <div className={styles.pillarsGrid}>
            <article className={styles.pillar}>
              <div className={styles.pillarIcon} aria-hidden="true">
                01
              </div>
              <h3 className={styles.pillarHeading}>Performance-First Creative</h3>
              <p className={styles.pillarBody}>
                Every asset is built with conversion in mind. We marry authentic UGC with
                data-informed creative direction so your ads drive real results.
              </p>
            </article>
            <article className={styles.pillar}>
              <div className={styles.pillarIcon} aria-hidden="true">
                02
              </div>
              <h3 className={styles.pillarHeading}>AI-Accelerated Production</h3>
              <p className={styles.pillarBody}>
                Our AI-assisted production pipeline compresses timelines without compromising
                brand integrity. From brief to deliverable, through a single coordinated studio pipeline.
              </p>
            </article>
            <article className={styles.pillar}>
              <div className={styles.pillarIcon} aria-hidden="true">
                03
              </div>
              <h3 className={styles.pillarHeading}>Scale Without Sacrifice</h3>
              <p className={styles.pillarBody}>
                Volume and quality are not trade-offs at DREXONYX. We produce creative at scale
                while maintaining consistency, brand safety, and platform compliance.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Services teaser */}
      <section className={styles.serviceTeaser} aria-labelledby="services-heading">
        <div className="container">
          <h2 id="services-heading" className={styles.sectionHeading}>
            What We Deliver
          </h2>
          <p className={styles.sectionSub}>
            From concept to campaign-ready assets — end-to-end UGC creative production.
          </p>
          <div className={styles.serviceTeaserGrid}>
            {[
              {
                title: "UGC Video Ads",
                desc: "Authentic-feeling video creative optimized for paid social platforms.",
              },
              {
                title: "Static Ad Creative",
                desc: "Static ad creative built around your campaign brief and platform specifications.",
              },
              {
                title: "Creative Strategy",
                desc: "Data-backed creative briefs that align with your performance goals.",
              },
              {
                title: "Campaign QC",
                desc: "Rigorous quality control before every deliverable leaves our studio.",
              },
            ].map((item) => (
              <div key={item.title} className={styles.serviceTeaserCard}>
                <h3 className={styles.serviceTeaserTitle}>{item.title}</h3>
                <p className={styles.serviceTeaserDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className={styles.serviceTeaserCta}>
            <Link href="/services" className={styles.ctaSecondary}>
              Explore All Services
            </Link>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className={styles.ctaBand} aria-labelledby="cta-band-heading">
        <div className="container">
          <h2 id="cta-band-heading" className={styles.ctaBandHeading}>
            Ready to launch performance creative?
          </h2>
          <p className={styles.ctaBandSub}>
            Tell us about your brand and campaign goals. We&apos;ll take it from there.
          </p>
          <Link href="/start-campaign" className={styles.ctaPrimary}>
            Start Your Campaign
          </Link>
        </div>
      </section>
    </>
  );
}
