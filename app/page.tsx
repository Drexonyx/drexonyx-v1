import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

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

const SERVICES = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M15 12L6 20l9 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 12l9 8-9 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 8l-4 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Digital Presence",
    desc: "Website design and professional landing pages built to perform and convert at scale.",
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="4" y="10" width="22" height="20" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M26 16.5l9-5v17l-9-5V16.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx="12" cy="20" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    title: "Creative Production",
    desc: "Video and commercial content production — visual storytelling for your brand identity.",
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="8" y="14" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="15" cy="23" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="25" cy="23" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 10v4M17 10h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M4 23h4M36 23h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Sales Automation",
    desc: "AI-powered sales agents and CRM management for scalable, automated revenue growth.",
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M20 5L4 13l16 8 16-8-16-8Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M4 21l16 8 16-8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 29l16 8 16-8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Integrated Solutions",
    desc: "Digital transformation and tailored solutions for ambitious brands ready to scale.",
  },
] as const;

const BENEFITS = [
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="18" cy="18" r="8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="3" fill="currentColor" />
        <path d="M18 4v3M18 29v3M4 18h3M29 18h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    title: "Digital Market Expertise",
    desc: "A team combining creativity and technology — rooted in Dubai's global business market.",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="24" cy="12" r="5" stroke="currentColor" strokeWidth="1.75" />
        <path d="M2 32c0-5.523 4.477-10 10-10h12c5.523 0 10 4.477 10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    title: "Your Growth Partner",
    desc: "From concept to full execution — we build strategies that deliver real business results.",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 4L4 10v6c0 8.627 5.985 16.681 14 18.956C26.015 32.681 32 24.627 32 16v-6L18 4Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M12 18l4 4 8-8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Results-Focused",
    desc: "Scalable, operational solutions designed to deliver measurable outcomes for your brand.",
  },
] as const;

export default function HomePage() {
  return (
    <div className={styles.page}>

      {/* ── Hero: Dubai nightscape ────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div
          className={styles.heroBg}
          style={{ backgroundImage: `url('/images/dubai-night.jpg')` }}
          aria-hidden="true"
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowLine} aria-hidden="true" />
            DREXONYX GROUP
          </p>
          <h1 id="hero-heading" className={styles.heroHeading}>
            Digital &amp; Creative Solutions<br />for Brand Growth
          </h1>
          <p className={styles.heroSub}>
            Design&ensp;·&ensp;Content Production&ensp;·&ensp;Sales Automation&ensp;·&ensp;Integrated Digital Solutions
          </p>
          <div className={styles.heroCtas}>
            <Link href="/start-project" className={styles.heroBtnPrimary}>
              Request a Quote →
            </Link>
            <Link href="/portfolio" className={styles.heroBtnOutline}>
              ▶&ensp;View Our Work
            </Link>
          </div>
        </div>
      </section>

      {/* ── Brand Ecosystem: 2 clickable brand cards ─────────────────── */}
      <section className={styles.brands} aria-label="DREXONYX Group — Brand Ecosystem">
        <div className={styles.brandsGrid}>
          <Link href="/services" className={styles.brandCardLink} aria-label="DX STUDIO — Video, Production, Creative Media">
            <Image
              src="/images/brands-dx-card.png"
              alt="DX STUDIO — Video, Production, Creative Media"
              width={836}
              height={831}
              className={styles.brandsCardImg}
              sizes="(max-width: 860px) 100vw, 50vw"
              priority
            />
          </Link>
          <Link href="/mda" className={styles.brandCardLink} aria-label="MDA — Master Digital Agency">
            <Image
              src="/images/brands-mda-card.png"
              alt="MDA — Master Digital Agency"
              width={836}
              height={831}
              className={styles.brandsCardImg}
              sizes="(max-width: 860px) 100vw, 50vw"
              priority
            />
          </Link>
        </div>
      </section>

      {/* ── Services: light section, 4-col with dividers ─────────────── */}
      <section className={styles.services} aria-labelledby="services-heading">
        <div className={styles.svcInner}>
          <div className={styles.svcHeader}>
            <div className={styles.sectionTitleWrapDark}>
              <span className={styles.titleDecLineDark} aria-hidden="true" />
              <h2 id="services-heading" className={styles.svcHeading}>Our Featured Services</h2>
              <span className={styles.titleDecLineDark} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.svcGrid}>
            {SERVICES.map((s, i) => (
              <article key={s.title} className={styles.svcCard}>
                {i > 0 && <span className={styles.svcDivider} aria-hidden="true" />}
                <div className={styles.svcCardInner}>
                  <div className={styles.svcIcon}>{s.icon}</div>
                  <h3 className={styles.svcTitle}>{s.title}</h3>
                  <p className={styles.svcDesc}>{s.desc}</p>
                  <Link href="/services" className={styles.svcLink}>
                    Learn More →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits Strip: dark band, 3 items ──────────────────────── */}
      <section className={styles.benefits} aria-label="Why choose DREXONYX Group">
        <div className={styles.benefitsInner}>
          {BENEFITS.map((b, i) => (
            <div key={b.title} className={styles.benefitItem}>
              {i > 0 && <span className={styles.benefitDivider} aria-hidden="true" />}
              <div className={styles.benefitContent}>
                <div className={styles.benefitIcon}>{b.icon}</div>
                <div className={styles.benefitText}>
                  <p className={styles.benefitTitle}>{b.title}</p>
                  <p className={styles.benefitDesc}>{b.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact: desk scene + copy ───────────────────────────────── */}
      <section className={styles.contact} aria-labelledby="contact-heading">
        {/* Left: desk workspace with DREXONYX GROUP branded mug */}
        <div className={styles.contactLeft} aria-hidden="true">
          <div
            className={styles.contactBg}
            style={{ backgroundImage: `url('/images/desk-dubai.jpg')` }}
          />
          <div className={styles.contactBgOverlay} />
        </div>

        {/* Right: contact CTA */}
        <div className={styles.contactRight}>
          <h2 id="contact-heading" className={styles.contactHeading}>
            Let&apos;s Talk About<br />Your Project
          </h2>
          <p className={styles.contactBody}>
            Tell us your idea and we&apos;ll propose the best solution —
            from strategy to delivery, we build creative systems that perform.
          </p>
          <Link href="/start-project" className={styles.contactCta}>
            Contact Us →
          </Link>
        </div>
      </section>

      {/* ── Homepage Footer ──────────────────────────────────────────── */}
      <footer className={styles.hpFooter} aria-label="Site footer">
        <div className={styles.hpFooterInner}>
          <Image
            src="/brand/logos/drexonyx-header-logo.png"
            alt="DREXONYX GROUP"
            width={430}
            height={95}
            className={styles.hpFooterLogo}
          />
          <p className={styles.hpFooterTagline}>
            Digital &amp; Creative Solutions for Growing Brands
          </p>
          <nav className={styles.hpFooterNav} aria-label="Footer navigation">
            <Link href="/about" className={styles.hpFooterLink}>About</Link>
            <Link href="/services" className={styles.hpFooterLink}>Services</Link>
            <Link href="/portfolio" className={styles.hpFooterLink}>Portfolio</Link>
            <Link href="/start-project" className={styles.hpFooterLink}>Contact</Link>
          </nav>
          <p className={styles.hpFooterCopy}>
            © {new Date().getFullYear()} DREXONYX GROUP. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
