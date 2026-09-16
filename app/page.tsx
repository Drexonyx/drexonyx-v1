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

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        {/* Full-bleed cinematic background */}
        <div className={styles.heroBg} aria-hidden="true">
          <Image
            src="/images/drexonyx-hero-final.webp"
            alt=""
            fill
            className={styles.heroBgImg}
            priority
          />
        </div>

        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>Dubai · Performance Creative Studio</div>
            <h1 id="hero-heading" className={styles.heroHeading}>
              UGC Advertising
              <br />
              <span className={styles.heroAccent}>Built to Perform</span>
            </h1>
            <p className={styles.heroSub}>
              DREXONYX delivers AI-powered UGC advertising for brands worldwide. Based in Dubai,
              building performance creative at global scale.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/start-project" className={styles.ctaPrimary}>
                Start Project
              </Link>
              <Link href="/how-it-works" className={styles.ctaSecondary}>
                See How It Works
              </Link>
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

      {/* Featured Work */}
      {(() => {
        const featured = getFeaturedItems();
        return (
          <section className={styles.featuredWork} aria-labelledby="featured-heading">
            <div className="container">
              <h2 id="featured-heading" className={styles.sectionHeading}>
                Featured Work
              </h2>
              <p className={styles.sectionSub}>
                Client-approved performance creative from our studio.
              </p>
              {featured.length === 0 ? (
                <div className={styles.featuredEmpty}>
                  <p>Featured work will appear here as client-approved pieces are cleared for public display.</p>
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
                <Link href="/portfolio" className={styles.ctaSecondary}>
                  View Full Portfolio
                </Link>
              </div>
            </div>
          </section>
        );
      })()}

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

      {/* How It Works teaser */}
      <section className={styles.processBand} aria-labelledby="process-heading">
        <div className="container">
          <h2 id="process-heading" className={styles.sectionHeading}>
            How It Works
          </h2>
          <p className={styles.sectionSub}>
            From brief to campaign-ready — a streamlined production pipeline.
          </p>
          <div className={styles.processSteps}>
            {[
              { num: "01", title: "Campaign Brief", desc: "Submit your brand brief, objectives, and platform targets." },
              { num: "02", title: "Creative Strategy", desc: "We develop a data-backed creative direction aligned to your goals." },
              { num: "03", title: "Production & Delivery", desc: "Campaign-ready assets delivered on time, QC-reviewed." },
            ].map((step) => (
              <div key={step.num} className={styles.processStep}>
                <span className={styles.processNum}>{step.num}</span>
                <p className={styles.processTitle}>{step.title}</p>
                <p className={styles.processDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/how-it-works" className={styles.ctaSecondary}>
            See Full Process
          </Link>
        </div>
      </section>

      {/* Industries */}
      <section className={styles.industries} aria-labelledby="industries-heading">
        <div className="container">
          <h2 id="industries-heading" className={styles.sectionHeading}>
            Industries We Serve
          </h2>
          <p className={styles.sectionSub}>
            Performance creative for brands across high-growth verticals.
          </p>
          <div className={styles.industriesGrid}>
            {[
              "E-commerce & DTC",
              "Beauty & Skincare",
              "Health & Wellness",
              "Food & Beverage",
              "Fashion & Apparel",
              "Consumer Tech",
            ].map((industry) => (
              <div key={industry} className={styles.industryTile}>
                <p className={styles.industryLabel}>{industry}</p>
              </div>
            ))}
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
            Dubai-based, globally active. Tell us about your brand and we&apos;ll take it from
            there.
          </p>
          <Link href="/start-project" className={styles.ctaPrimary}>
            Start Project
          </Link>
        </div>
      </section>
    </>
  );
}
