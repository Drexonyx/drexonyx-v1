import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "About DREXONYX — a technology and digital solutions group. Custom software, AI automation, digital commerce, and enterprise integration for businesses that are ready to scale.",
};

const VALUES = [
  {
    title: "Engineering Precision",
    desc: "Correct, maintainable, and built to scale. Every codebase, pipeline, and integration we deliver is held to an engineering standard, not a delivery deadline.",
  },
  {
    title: "Outcome-First Thinking",
    desc: "Every technical decision is measured against a business outcome. We don't build technology for its own sake — we build what moves the needle.",
  },
  {
    title: "Clear Scope, Clean Delivery",
    desc: "We work within defined scope and deliver against it. No scope creep, no vague estimations, no half-finished implementations.",
  },
  {
    title: "Continuous Improvement",
    desc: "Every engagement generates insights. We feed those back into better decisions, better architecture, and better outcomes on every subsequent project.",
  },
] as const;

const DIVISIONS = [
  {
    name: "Master Digital Agency (MDA)",
    focus: "Marketing & Digital Infrastructure",
    desc: "MDA is the marketing and digital agency arm of DREXONYX GROUP. It delivers digital marketing strategy, media production, campaign execution, and brand infrastructure for clients across the GCC and beyond.",
    href: "/mda",
  },
  {
    name: "DX Studio",
    focus: "Technology & Systems Engineering",
    desc: "DX Studio is the technology and systems engineering arm. It builds custom software, deploys AI automation, engineers digital commerce platforms, and integrates enterprise systems for businesses at every stage of digital maturity.",
    href: "/services",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="about-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>About</div>
          <h1 id="about-hero-heading" className={styles.heroHeading}>
            Technology-led.
            <br />
            <span className={styles.heroAccent}>Built to Scale.</span>
          </h1>
          <p className={styles.heroSub}>
            DREXONYX is a technology and digital solutions group. We build the software,
            automation systems, and digital infrastructure that growing businesses need to
            operate at their best.
          </p>
        </div>
      </section>

      <section className={styles.missionSection} aria-labelledby="mission-heading">
        <div className="container">
          <div className={styles.missionGrid}>
            <div className={styles.missionContent}>
              <h2 id="mission-heading" className={styles.sectionHeading}>
                Why We Exist
              </h2>
              <p className={styles.missionText}>
                Modern businesses are built on digital systems — but most lack the in-house
                engineering capacity to build, integrate, and evolve those systems as they
                grow. The gap between where a business operates today and where its technology
                should be is where DREXONYX operates.
              </p>
              <p className={styles.missionText}>
                We combine product engineering, AI-led automation, and enterprise integration
                expertise under one roof — working as a long-term technical partner to companies
                at every stage of digital maturity. Not a vendor. Not an agency. A builder.
              </p>
            </div>
            <div className={styles.missionSidebar}>
              <div className={styles.missionStat}>
                <div className={styles.missionStatLabel}>Focus</div>
                <div className={styles.missionStatValue}>Technology & Digital Solutions</div>
              </div>
              <div className={styles.missionStat}>
                <div className={styles.missionStatLabel}>Delivery Model</div>
                <div className={styles.missionStatValue}>Engineering-led Studio</div>
              </div>
              <div className={styles.missionStat}>
                <div className={styles.missionStatLabel}>Scale</div>
                <div className={styles.missionStatValue}>SME to Enterprise</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.divisionsSection} aria-labelledby="divisions-heading">
        <div className="container">
          <h2 id="divisions-heading" className={styles.sectionHeading}>
            Group Divisions
          </h2>
          <p className={styles.divisionsIntro}>
            DREXONYX GROUP operates through two specialist brands — each focused on a
            distinct domain, working together on integrated client mandates.
          </p>
          <div className={styles.divisionsGrid}>
            {DIVISIONS.map((div) => (
              <div key={div.name} className={styles.divisionCard}>
                <div className={styles.divisionFocus}>{div.focus}</div>
                <h3 className={styles.divisionName}>{div.name}</h3>
                <p className={styles.divisionDesc}>{div.desc}</p>
                <Link href={div.href} className={styles.divisionLink}>
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.valuesSection} aria-labelledby="values-heading">
        <div className="container">
          <h2 id="values-heading" className={styles.sectionHeading}>
            What We Stand For
          </h2>
          <div className={styles.valuesGrid}>
            {VALUES.map((value) => (
              <div key={value.title} className={styles.valueCard}>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueDesc}>{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="about-cta-heading">
        <div className="container">
          <h2 id="about-cta-heading" className={styles.ctaBandHeading}>
            Work with us
          </h2>
          <p className={styles.ctaBandSub}>
            Tell us what you&apos;re trying to build. We&apos;ll scope the right engagement.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/contact" className={styles.ctaPrimary}>
              Get in Touch
            </Link>
            <Link href="/services" className={styles.ctaSecondary}>
              View Services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
