import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { PORTFOLIO_ITEMS } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "DREXONYX — Performance Creative Studio",
  description:
    "Dubai-based performance creative studio. AI-powered UGC advertising for global brands — creative at scale, built to perform.",
};

const SERVICES = [
  {
    number: "01",
    title: "UGC Video Ads",
    desc: "Authentic-feeling video creative optimised for Meta, TikTok, and YouTube — hook-first structure built for platform algorithms and conversion.",
    href: "/services#ugc-video",
  },
  {
    number: "02",
    title: "Static Ad Creative",
    desc: "High-conversion static and carousel creative across feed, story, and display formats — built around your campaign brief and platform specs.",
    href: "/services#static-creative",
  },
  {
    number: "03",
    title: "Creative Strategy",
    desc: "Data-backed creative briefs that bridge your performance data and brand positioning into actionable creative direction.",
    href: "/services#creative-strategy",
  },
  {
    number: "04",
    title: "Campaign QC",
    desc: "Rigorous quality control before every deliverable leaves our studio — brand safety, platform compliance, technical spec verification.",
    href: "/services#campaign-qc",
  },
] as const;

const WHY_ITEMS = [
  "Global Creative Mindset",
  "AI-Powered Production",
  "Scales With Your Campaign",
  "Fast & Reliable Delivery",
  "Performance-First Quality",
  "Brief-Disciplined Process",
];

const INDUSTRIES = [
  "E-commerce & DTC",
  "Beauty & Skincare",
  "Health & Wellness",
  "Food & Beverage",
  "Fashion & Apparel",
  "Consumer Tech",
];

const PROCESS_STEPS = [
  { num: "01", title: "Campaign Brief", desc: "Submit your objectives, audience, and platform targets." },
  { num: "02", title: "Creative Strategy", desc: "We develop data-backed direction aligned to your goals." },
  { num: "03", title: "Production", desc: "AI-assisted pipeline turns concepts into campaign-ready assets." },
  { num: "04", title: "Quality Control", desc: "Every deliverable reviewed against brand and platform specs." },
  { num: "05", title: "Delivery", desc: "Platform-ready files on time, revision-supported." },
];

export default function HomePage() {
  const featured = PORTFOLIO_ITEMS;

  return (
    <>
      {/* ── Hero: genuine two-panel split ─────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        {/* Left panel: dark content surface — independent from any image */}
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Performance Creative Studio</p>
          <h1 id="hero-heading" className={styles.heroWordmark}>
            DREXONYX
          </h1>
          <p className={styles.heroTagline}>
            Powerful Creative Content<br />for Modern Brands
          </p>
          <p className={styles.heroSub}>
            Dubai-based performance creative studio. AI-powered UGC advertising
            for brands worldwide — creative at scale, built to perform.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/start-project" className={styles.ctaPrimary}>
              Start Project →
            </Link>
            <Link href="/portfolio" className={styles.ctaSecondary}>
              ▶ Watch Showreel
            </Link>
          </div>
          <p className={styles.heroLocation}>Dubai, UAE · Global</p>
        </div>

        {/* Right panel: cinematic visual — CSS background, cannot bleed into left panel */}
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroVisualOverlay} />
          <div className={styles.heroVisualLabel}>
            <span>Dubai</span>
            <span className={styles.heroVisualDot}>·</span>
            <span>Global</span>
          </div>
        </div>
      </section>

      {/* ── Services: editorial full-width rows ───────────────────────── */}
      <section className={styles.services} aria-labelledby="services-heading">
        <div className="container">
          <p className={styles.sectionEyebrow}>Our Services</p>
          <h2 id="services-heading" className={styles.sectionHeading}>
            Complete Creative Solutions
          </h2>
          <p className={styles.sectionSub}>
            End-to-end UGC advertising production — from strategic brief to campaign-ready deliverables.
          </p>
          <div className={styles.servicesRows}>
            {SERVICES.map((s) => (
              <article key={s.number} className={styles.serviceRow}>
                <span className={styles.serviceRowNum} aria-hidden="true">
                  {s.number}
                </span>
                <div className={styles.serviceRowBody}>
                  <h3 className={styles.serviceRowTitle}>{s.title}</h3>
                  <p className={styles.serviceRowDesc}>{s.desc}</p>
                </div>
                <Link href={s.href} className={styles.serviceRowLink}>
                  Learn More →
                </Link>
              </article>
            ))}
          </div>
          <div className={styles.servicesCta}>
            <Link href="/services" className={styles.ctaOutline}>
              Explore All Services
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Work: cinematic card grid ────────────────────────── */}
      <section className={styles.featuredWork} aria-labelledby="featured-heading">
        <div className="container">
          <p className={styles.sectionEyebrow}>Featured Work</p>
          <h2 id="featured-heading" className={styles.sectionHeading}>
            Studio Production Samples
          </h2>
          <p className={styles.sectionSub}>
            Performance-focused creative built across UGC video, static ads, and campaign strategy.
          </p>
          {featured.length === 0 ? (
            <div className={styles.featuredEmpty}>
              <p>Studio work samples are added as production is completed. Check back soon.</p>
            </div>
          ) : (
            <div className={styles.featuredGrid}>
              {featured.map((item, idx) => (
                <article
                  key={item.id}
                  className={`${styles.featuredCard} ${idx === 0 ? styles.featuredCardLead : ""}`}
                >
                  <div className={styles.featuredCardMedia}>
                    {item.thumbnailSrc && (
                      <Image
                        src={item.thumbnailSrc}
                        alt={item.title}
                        fill
                        className={styles.featuredCardImg}
                        sizes="(max-width: 900px) 100vw, (max-width: 1200px) 65vw, 800px"
                      />
                    )}
                    <div className={styles.featuredCardOverlay} />
                    <div className={styles.featuredCardText}>
                      <p className={styles.featuredCategory}>{item.category}</p>
                      <p className={styles.featuredTitle}>{item.title}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className={styles.featuredCta}>
            <Link href="/portfolio" className={styles.ctaOutline}>
              View Full Portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className={styles.process} aria-labelledby="process-heading">
        <div className="container">
          <p className={styles.sectionEyebrow}>How It Works</p>
          <h2 id="process-heading" className={styles.sectionHeading}>
            From Brief to Delivery
          </h2>
          <p className={styles.sectionSub}>
            A structured, transparent production process designed for performance marketers who move fast.
          </p>
          <div className={styles.processSteps}>
            {PROCESS_STEPS.map((step) => (
              <div key={step.num} className={styles.processStep}>
                <span className={styles.processNum}>{step.num}</span>
                <p className={styles.processTitle}>{step.title}</p>
                <p className={styles.processDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/how-it-works" className={styles.ctaOutline}>
            See Full Process
          </Link>
        </div>
      </section>

      {/* ── Why DREXONYX ──────────────────────────────────────────────── */}
      <section className={styles.why} aria-labelledby="why-heading">
        <div className={styles.whyGrid}>
          <div className={styles.whyLeft}>
            <p className={styles.sectionEyebrow}>Why DREXONYX</p>
            <h2 id="why-heading" className={styles.whyHeading}>
              More Than Content.<br />A Global Creative Partner.
            </h2>
            <p className={styles.whyBody}>
              DREXONYX combines AI-assisted production, creative strategy, and rigorous QC
              into one studio built specifically for performance UGC advertising.
              Dubai-based and globally active.
            </p>
            <Link href="/start-project" className={styles.ctaPrimary}>
              Start Your Project →
            </Link>
          </div>
          <div className={styles.whyRight} aria-hidden="true">
            <Image
              src="/images/drexonyx-hero-final.webp"
              alt=""
              fill
              className={styles.whyImg}
              sizes="50vw"
            />
            <div className={styles.whyOverlay} />
            <ul className={styles.whyChecklist}>
              {WHY_ITEMS.map((item) => (
                <li key={item} className={styles.whyCheckItem}>
                  <span className={styles.whyCheckMark}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Industries ────────────────────────────────────────────────── */}
      <section className={styles.industries} aria-labelledby="industries-heading">
        <div className="container">
          <p className={styles.sectionEyebrow}>Industries</p>
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

      {/* ── CTA band: cinematic editorial ────────────────────────────── */}
      <section className={styles.ctaBand} aria-labelledby="cta-band-heading">
        <div className={styles.ctaBandBg} aria-hidden="true">
          <Image
            src="/images/drexonyx-hero-final.webp"
            alt=""
            fill
            className={styles.ctaBandBgImg}
            sizes="100vw"
          />
          <div className={styles.ctaBandOverlay} />
        </div>
        <div className="container">
          <div className={styles.ctaBandContent}>
            <p className={styles.ctaBandEyebrow}>Dubai · Global</p>
            <h2 id="cta-band-heading" className={styles.ctaBandHeading}>
              Ready to Launch<br />Performance Creative?
            </h2>
            <p className={styles.ctaBandSub}>
              Dubai-based. Globally active. Tell us about your brand and we&apos;ll
              take it from there.
            </p>
            <Link href="/start-project" className={styles.ctaPrimaryLarge}>
              Start Project →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
