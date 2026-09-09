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
            <div className={styles.heroMarkWrap}>
              <svg
                className={styles.heroSvg}
                viewBox="0 0 400 330"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <radialGradient id="hglow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#C8980A" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#C8980A" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="hgold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7A5800" stopOpacity="0.85" />
                    <stop offset="40%" stopColor="#F5C842" stopOpacity="1" />
                    <stop offset="100%" stopColor="#7A5800" stopOpacity="0.85" />
                  </linearGradient>
                  <linearGradient id="hsilver" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F4F4F5" stopOpacity="0.06" />
                    <stop offset="50%" stopColor="#F4F4F5" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#F4F4F5" stopOpacity="0.06" />
                  </linearGradient>
                </defs>

                {/* Ambient glow */}
                <ellipse cx="197" cy="165" rx="175" ry="140" fill="url(#hglow)" />

                {/* Outer angular frame — D-inspired geometry */}
                <path
                  d="M 44,28 L 44,302 L 250,302 L 318,266 L 318,64 L 250,28 Z"
                  stroke="rgba(244,244,245,0.10)"
                  strokeWidth="1.5"
                />

                {/* Inner frame — hollow depth */}
                <path
                  d="M 86,70 L 86,260 L 210,260 L 268,232 L 268,98 L 210,70 Z"
                  stroke="rgba(244,244,245,0.06)"
                  strokeWidth="1"
                />

                {/* Gold diagonal bar — upper-right to lower-left (X primary accent) */}
                <path d="M 218,28 L 318,64 L 176,302 L 76,266 Z" fill="url(#hgold)" opacity="0.82" />

                {/* Silver counter-diagonal — upper-left to lower-right */}
                <path d="M 76,64 L 176,28 L 318,266 L 218,302 Z" fill="url(#hsilver)" />

                {/* Viewfinder corner brackets */}
                <path d="M 16,50 L 16,16 L 50,16" stroke="#C8980A" strokeWidth="1.75" opacity="0.85" />
                <path d="M 384,50 L 384,16 L 350,16" stroke="#C8980A" strokeWidth="1.75" opacity="0.85" />
                <path d="M 16,280 L 16,314 L 50,314" stroke="#C8980A" strokeWidth="1.75" opacity="0.85" />
                <path d="M 384,280 L 384,314 L 350,314" stroke="#C8980A" strokeWidth="1.75" opacity="0.85" />

                {/* Center crosshair at X intersection */}
                <circle cx="197" cy="165" r="5" fill="#C8980A" opacity="0.9" />
                <circle cx="197" cy="165" r="18" stroke="#C8980A" strokeWidth="0.75" opacity="0.45" />
                <line x1="179" y1="165" x2="148" y2="165" stroke="#C8980A" strokeWidth="0.75" opacity="0.4" />
                <line x1="215" y1="165" x2="246" y2="165" stroke="#C8980A" strokeWidth="0.75" opacity="0.4" />
                <line x1="197" y1="147" x2="197" y2="120" stroke="#C8980A" strokeWidth="0.75" opacity="0.4" />
                <line x1="197" y1="183" x2="197" y2="210" stroke="#C8980A" strokeWidth="0.75" opacity="0.4" />

                {/* Subtle horizontal axis rules */}
                <line x1="44" y1="165" x2="140" y2="165" stroke="rgba(244,244,245,0.04)" strokeWidth="1" />
                <line x1="260" y1="165" x2="318" y2="165" stroke="rgba(244,244,245,0.04)" strokeWidth="1" />

                {/* Angular corner accent squares */}
                <rect x="246" y="24" width="8" height="8" fill="#C8980A" opacity="0.65" />
                <rect x="314" y="60" width="8" height="8" fill="#C8980A" opacity="0.65" />
                <rect x="44" y="24" width="8" height="8" fill="rgba(244,244,245,0.18)" />
                <rect x="44" y="298" width="8" height="8" fill="rgba(244,244,245,0.18)" />
              </svg>
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
