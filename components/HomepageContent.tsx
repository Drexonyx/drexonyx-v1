"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/lib/translations/en";
import { ar } from "@/lib/translations/ar";
import styles from "@/app/page.module.css";

const SVC_IMAGES = [
  { src: "/images/r07/service-enterprise.png", alt: "Enterprise Systems" },
  { src: "/images/r07/service-ecommerce.png",  alt: "Digital Commerce"   },
  { src: "/images/r07/service-ai.png",          alt: "AI & Automation"    },
  { src: "/images/r07/service-software.png",    alt: "Custom Software"    },
];

export default function HomepageContent() {
  const { isAr } = useLanguage();
  const t = isAr ? ar : en;

  return (
    <div className={styles.page}>

      {/* ═══ HERO ═════════════════════════════════════════════════════ */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroBg} aria-hidden="true" />

        <div className={styles.heroInner}>
          {/* Left column — DX globe image (fill mode) */}
          <div className={styles.heroVisual} aria-hidden="true">
            <Image
              src="/images/r07/hero-dx-globe.png"
              alt=""
              fill
              className={styles.heroDxImg}
              priority
              sizes="(max-width: 860px) 100vw, 58vw"
            />
          </div>

          {/* Right column — heading + CTA */}
          <div className={styles.heroText}>
            <p className={styles.heroEyebrow}>
              <span className={styles.heroEyebrowLine} aria-hidden="true" />
              {t.hero.eyebrow}
            </p>

            <h1 id="hero-heading" className={styles.heroHeading}>
              {t.hero.headingLine1}
              <br />
              <span className={styles.heroAccent}>{t.hero.headingLine2}</span>
            </h1>

            <p className={styles.heroSub}>{t.hero.sub}</p>

            {isAr && (
              <p className={styles.heroSubEn}>{en.hero.sub}</p>
            )}

            <div className={styles.heroCtas}>
              <Link href="/contact" className={styles.heroBtnPrimary}>
                {t.hero.ctaPrimary}
              </Link>
              <Link href="/services" className={styles.heroBtnOutline}>
                {t.hero.ctaOutline}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SERVICES ════════════════════════════════════════════════ */}
      <section className={styles.services} aria-labelledby="services-heading">
        <div className={styles.svcInner}>
          <h2 id="services-heading" className={styles.svcHeading}>
            {t.services.heading}
          </h2>

          <div className={styles.svcGrid}>
            {t.services.cards.map((card, i) => (
              <article key={i} className={styles.svcCard}>
                {/* Image wrapper — aspect-ratio box + fill image */}
                <div className={styles.svcImgWrap}>
                  <Image
                    src={SVC_IMAGES[i].src}
                    alt={SVC_IMAGES[i].alt}
                    fill
                    className={styles.svcImg}
                    sizes="(max-width: 480px) 100vw, (max-width: 1100px) 50vw, 25vw"
                  />
                  <div className={styles.svcImgOverlay} aria-hidden="true" />
                </div>

                <div className={styles.svcCardBody}>
                  {isAr && (
                    <p className={styles.svcEnTitle}>{card.enTitle}</p>
                  )}
                  <h3 className={styles.svcTitle}>{card.title}</h3>
                  <p className={styles.svcDesc}>{card.desc}</p>
                  <Link
                    href="/services"
                    className={styles.svcLink}
                    aria-label={card.title}
                  >
                    {card.link}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GROUP DIVISIONS ═════════════════════════════════════════ */}
      <section className={styles.brandStrip} aria-labelledby="brands-heading">
        <div className={styles.brandStripInner}>
          <p
            id="brands-heading"
            className={styles.brandStripLabel}
            aria-label={t.brands.heading}
          >
            {t.brands.heading}
          </p>

          <div className={styles.brandCards}>
            {/* MDA */}
            <Link href="/mda" className={styles.brandCard}>
              <div className={styles.brandLogoWrap}>
                <Image
                  src="/brand/r06/mda-horizontal-dark-800px.png"
                  alt={t.brands.mdaName}
                  width={800}
                  height={184}
                  className={styles.brandLogo}
                  sizes="(max-width: 860px) 220px, 260px"
                />
              </div>
              <div className={styles.brandCardBody}>
                <p className={styles.brandCardName}>{t.brands.mdaName}</p>
                <p className={styles.brandCardDesc}>{t.brands.mdaDesc}</p>
              </div>
              <span className={styles.brandCardArrow} aria-hidden="true">→</span>
            </Link>

            {/* DX STUDIO */}
            <Link href="/services" className={styles.brandCard}>
              <div className={styles.brandLogoWrap}>
                <Image
                  src="/brand/r06/dx-studio-horizontal-dark-800px.png"
                  alt={t.brands.dxName}
                  width={800}
                  height={184}
                  className={styles.brandLogo}
                  sizes="(max-width: 860px) 220px, 260px"
                />
              </div>
              <div className={styles.brandCardBody}>
                <p className={styles.brandCardName}>{t.brands.dxName}</p>
                <p className={styles.brandCardDesc}>{t.brands.dxDesc}</p>
              </div>
              <span className={styles.brandCardArrow} aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/*
      ── WHY DREXONYX / BENEFITS — preserved per CLAUDE.md ──────────
      <section className={styles.benefits} aria-label="...">
        {t.benefits.map((b, i) => (
          <div key={b.title} className={styles.benefitItem}>...</div>
        ))}
      </section>
      */}

      {/*
      ── INDUSTRIES / CONTACT — preserved per CLAUDE.md ─────────────
      <section className={styles.contact} aria-labelledby="contact-heading">
        ...
      </section>
      */}

      {/* ═══ FOOTER ══════════════════════════════════════════════════ */}
      <footer
        className={styles.hpFooter}
        aria-label={isAr ? "تذييل الموقع" : "Site footer"}
      >
        <div className={styles.hpFooterInner}>
          <p className={styles.hpFooterLoc}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0, opacity: 0.5 }}
            >
              <path
                d="M6.5 1C4.567 1 3 2.567 3 4.5c0 2.828 3.5 7.5 3.5 7.5S10 7.328 10 4.5C10 2.567 8.433 1 6.5 1Z"
                stroke="currentColor"
                strokeWidth="1.1"
              />
              <circle cx="6.5" cy="4.5" r="1.3" stroke="currentColor" strokeWidth="1" />
            </svg>
            {t.footer.location}
          </p>
          <p className={styles.hpFooterTagline}>{t.footer.techTagline}</p>
        </div>
      </footer>

    </div>
  );
}
