import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Services",
  description:
    "DREXONYX performance creative services — UGC video ads, static creative, creative strategy, and campaign QC. End-to-end advertising production for modern brands.",
};

const SERVICES = [
  {
    id: "ugc-video",
    number: "01",
    title: "UGC Video Ads",
    summary:
      "Authentic user-generated video creative optimized for paid social platforms including Meta, TikTok, and YouTube.",
    details: [
      "Hook-first video structure built for platform algorithms",
      "AI-assisted concept development and script direction",
      "Creator-style filming and editing that converts",
      "Multiple format variants: Reels, Stories, TikTok, YouTube Shorts",
      "Platform-specific compliance review before delivery",
    ],
  },
  {
    id: "static-creative",
    number: "02",
    title: "Static Ad Creative",
    summary:
      "High-conversion static and carousel ad creative. Scroll-stopping design built around your performance objectives.",
    details: [
      "Thumb-stopping visual hierarchy for feed and story placements",
      "A/B variant sets for testing creative hypotheses",
      "Copy integration aligned to your messaging framework",
      "Delivered in all required platform specifications",
      "Iterative design based on performance feedback",
    ],
  },
  {
    id: "creative-strategy",
    number: "03",
    title: "Creative Strategy",
    summary:
      "Data-backed creative briefs that bridge your performance data and brand positioning into actionable creative direction.",
    details: [
      "Audience and competitive creative analysis",
      "Hook angle development and concept mapping",
      "Messaging hierarchy and CTA framework",
      "Creative testing roadmap",
      "Ongoing strategy refinement based on results",
    ],
  },
  {
    id: "campaign-qc",
    number: "04",
    title: "Campaign QC",
    summary:
      "Rigorous quality control review before every deliverable leaves our studio. Brand safety and platform compliance guaranteed.",
    details: [
      "Brand guideline compliance check",
      "Platform policy and ad spec verification",
      "Technical quality review (resolution, aspect ratios, audio)",
      "Copy and messaging accuracy review",
      "Final delivery checklist sign-off",
    ],
  },
] as const;

export default function ServicesPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="services-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>Services</div>
          <h1 id="services-hero-heading" className={styles.heroHeading}>
            End-to-End Performance Creative
          </h1>
          <p className={styles.heroSub}>
            From strategic brief to campaign-ready deliverable — every service is built around
            one goal: creative that performs.
          </p>
        </div>
      </section>

      <section className={styles.servicesSection} aria-label="Service offerings">
        <div className="container">
          <div className={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <article key={service.id} className={styles.serviceCard} id={service.id}>
                <div className={styles.serviceNumber} aria-hidden="true">
                  {service.number}
                </div>
                <div className={styles.serviceContent}>
                  <h2 className={styles.serviceTitle}>{service.title}</h2>
                  <p className={styles.serviceSummary}>{service.summary}</p>
                  <ul className={styles.serviceDetails} aria-label={`${service.title} details`}>
                    {service.details.map((detail) => (
                      <li key={detail} className={styles.serviceDetail}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="services-cta-heading">
        <div className="container">
          <h2 id="services-cta-heading" className={styles.ctaBandHeading}>
            Let&apos;s build your next campaign
          </h2>
          <p className={styles.ctaBandSub}>
            Tell us about your brand and objectives. We&apos;ll propose the right creative mix.
          </p>
          <Link href="/start-campaign" className={styles.ctaPrimary}>
            Start Your Campaign
          </Link>
        </div>
      </section>
    </>
  );
}
