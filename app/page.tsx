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
    title: "UGC Content",
    desc: "Authentic UGC video creative built for TikTok, Reels, and Meta — hook-first structure designed to convert at scale.",
    href: "/services",
  },
  {
    number: "02",
    title: "Cinematic Commercials",
    desc: "High-production cinematic brand films and commercials — visually elevated storytelling for global campaign launches.",
    href: "/services",
  },
  {
    number: "03",
    title: "Product Films",
    desc: "Studio-quality product showcase films and hero visuals — precision-crafted to elevate your brand's product presence.",
    href: "/services",
  },
  {
    number: "04",
    title: "Social Creative",
    desc: "Performance-led static and motion creative for feed, story, and display — built to stop the scroll and drive action.",
    href: "/services",
  },
] as const;


const INDUSTRIES = [
  "Startups",
  "SMEs",
  "E-commerce",
  "Hospitality",
  "Retail",
  "Enterprise",
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
      {/* ── Hero: two-panel cinematic composition ─────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        {/* Left: dark editorial copy panel */}
        <div className={styles.heroLeft}>
          <p className={styles.heroEyebrow}>Global Creative Production</p>
          <h1 id="hero-heading" className={styles.heroWordmark}>
            <Image
              src="/brand/drexonyx-hero-wordmark.png"
              alt="DREXONYX"
              width={2018}
              height={206}
              className={styles.heroWordmarkImg}
              priority
            />
          </h1>
          <div className={styles.heroBody}>
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
          <p className={styles.heroLocation}>Dubai, UAE · Global</p>
        </div>

        {/* Right: static background panel */}
        <div className={styles.heroRight} aria-hidden="true">
          <Image
            src="/images/drexonyx-creative-crew-hero.png"
            alt=""
            fill
            className={styles.heroImg}
            priority
            sizes="55vw"
          />
          <div className={styles.heroRightEdge} />
          <div className={styles.heroCred}>
            <span className={styles.heroCredCity}>Dubai</span>
            <span className={styles.heroCredSub}>A Global Stage<br />for Bolder Ideas</span>
          </div>
        </div>
      </section>

      {/* ── Services: editorial 4-col card grid ───────────────────────── */}
      <section className={styles.services} aria-labelledby="services-heading">
        <div className="container">
          <p className={styles.sectionEyebrow}>Our Services</p>
          <h2 id="services-heading" className={styles.sectionHeading}>
            Complete Creative Solutions
          </h2>
          <p className={styles.sectionSub}>
            End-to-end creative production — from cinematic commercials to performance UGC, built to perform globally.
          </p>
          <div className={styles.serviceCards}>
            {SERVICES.map((s) => (
              <article key={s.number} className={styles.serviceCard}>
                <span className={styles.serviceCardNum} aria-hidden="true">
                  {s.number}
                </span>
                <div className={styles.serviceCardBody}>
                  <h3 className={styles.serviceCardTitle}>{s.title}</h3>
                  <p className={styles.serviceCardDesc}>{s.desc}</p>
                </div>
                <Link href={s.href} className={styles.serviceCardLink}>
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
              {featured.map((item) => (
                <article
                  key={item.id}
                  className={styles.featuredCard}
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
                    {item.mediaType === 'video' && item.src && (
                      <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="none"
                        className={styles.featuredCardVideo}
                      >
                        <source src={item.src} type="video/mp4" />
                      </video>
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
            <div className={styles.whyEyebrowRow}>
              <p className={styles.sectionEyebrow}>Why DREXONYX</p>
              <div className={styles.whyEyebrowLine} aria-hidden="true" />
            </div>
            <h2 id="why-heading" className={styles.whyHeading}>
              AI Speed.<br />
              <span className={styles.whyHeadingAccent}>Human Creative<br />Direction.</span>
            </h2>
            <p className={styles.whyBody}>
              AI-assisted production built for UGC that looks intentional — not generated.
            </p>
            <ul className={styles.whyFeatures}>
              <li className={styles.whyFeature}>
                <div className={styles.whyFeatureIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="10" width="3.5" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="8.25" y="6" width="3.5" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="14.5" y="2" width="3.5" height="16" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className={styles.whyFeatureContent}>
                  <span className={styles.whyFeatureNum}>01</span>
                  <p className={styles.whyFeatureTitle}>UGC That Sells</p>
                  <p className={styles.whyFeatureDesc}>Creator-led creative designed around hooks, benefits and conversion.</p>
                </div>
              </li>
              <li className={styles.whyFeature}>
                <div className={styles.whyFeatureIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="5.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12.5 8.5L18 6v8l-5.5-2.5V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.whyFeatureContent}>
                  <span className={styles.whyFeatureNum}>02</span>
                  <p className={styles.whyFeatureTitle}>Cinematic When It Matters</p>
                  <p className={styles.whyFeatureDesc}>Premium visual storytelling when the product needs more than standard UGC.</p>
                </div>
              </li>
              <li className={styles.whyFeature}>
                <div className={styles.whyFeatureIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="7" cy="7" r="2.75" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="13" cy="7" r="2.75" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M1 17c0-3.314 2.686-5.5 6-5.5h.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M19 17c0-3.314-2.686-5.5-6-5.5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className={styles.whyFeatureContent}>
                  <span className={styles.whyFeatureNum}>03</span>
                  <p className={styles.whyFeatureTitle}>Built for Brands</p>
                  <p className={styles.whyFeatureDesc}>Fast production, consistent quality, and creative built around the brief.</p>
                </div>
              </li>
            </ul>
            <Link href="/start-project" className={styles.whyCta}>
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
            src="/images/drexonyx-creative-crew-hero.png"
            alt=""
            fill
            className={styles.ctaBandBgImg}
            sizes="100vw"
          />
          <div className={styles.ctaBandOverlay} />
        </div>
        <div className="container">
          <div className={styles.ctaBandContent}>
            <p className={styles.ctaBandEyebrow}>Ready to Create Something Extraordinary?</p>
            <h2 id="cta-band-heading" className={styles.ctaBandHeading}>
              Let&apos;s Bring Your<br />Vision to Life.
            </h2>
            <p className={styles.ctaBandSub}>
              Dubai-based. Globally active. Tell us about your brand and we&apos;ll
              bring your vision to the world.
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
