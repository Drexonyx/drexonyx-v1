import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { getFeaturedItems } from "@/lib/portfolio";

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
  const featured = getFeaturedItems();

  return (
    <>
      {/* ── Hero: cinematic split ──────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        {/* Full-bleed background — strong left-side gradient exposes right 45% */}
        <div className={styles.heroBg} aria-hidden="true">
          <Image
            src="/images/drexonyx-hero-final.webp"
            alt=""
            fill
            className={styles.heroBgImg}
            priority
            sizes="100vw"
          />
          <div className={styles.heroBgGradient} />
        </div>

        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>Global Creative Production</p>
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
          </div>
        </div>
      </section>

      {/* ── Services: 2×2 grid ────────────────────────────────────────── */}
      <section className={styles.services} aria-labelledby="services-heading">
        <div className="container">
          <p className={styles.sectionEyebrow}>Our Services</p>
          <h2 id="services-heading" className={styles.sectionHeading}>
            Complete Creative Solutions
          </h2>
          <p className={styles.sectionSub}>
            End-to-end UGC advertising production — from strategic brief to campaign-ready deliverables.
          </p>
          <div className={styles.servicesGrid}>
            {SERVICES.map((s) => (
              <article key={s.number} className={styles.serviceCard}>
                <div className={styles.serviceCardPanel} aria-hidden="true">
                  <span className={styles.serviceCardNum}>{s.number}</span>
                </div>
                <div className={styles.serviceCardBody}>
                  <h3 className={styles.serviceCardTitle}>{s.title}</h3>
                  <p className={styles.serviceCardDesc}>{s.desc}</p>
                  <Link href={s.href} className={styles.serviceCardLink}>
                    Learn More →
                  </Link>
                </div>
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

      {/* ── Featured Work ─────────────────────────────────────────────── */}
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
              {featured.map((item) => (
                <article key={item.id} className={styles.featuredCard}>
                  {item.thumbnailSrc && (
                    <div className={styles.featuredCardMedia}>
                      <Image
                        src={item.thumbnailSrc}
                        alt={item.title}
                        fill
                        className={styles.featuredCardImg}
                        sizes="(max-width: 900px) 100vw, 33vw"
                      />
                    </div>
                  )}
                  <div className={styles.featuredCardText}>
                    <p className={styles.featuredCategory}>{item.category}</p>
                    <p className={styles.featuredTitle}>{item.title}</p>
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

      {/* ── CTA band: cinematic ───────────────────────────────────────── */}
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
              Ready to Launch Performance Creative?
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
