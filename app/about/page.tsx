import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "About DREXONYX — a performance creative studio built for modern brands running paid social and performance marketing campaigns.",
};

const VALUES = [
  {
    title: "Performance Over Aesthetics",
    desc: "Beautiful creative that doesn't convert isn't doing its job. We judge every asset against performance criteria first.",
  },
  {
    title: "Authentic, Not Manufactured",
    desc: "UGC advertising works because it feels real. We protect authenticity at every production stage.",
  },
  {
    title: "Brief Discipline",
    desc: "We work within scope. A clear brief produces better creative faster than an open-ended one.",
  },
  {
    title: "Continuous Improvement",
    desc: "Every campaign generates data. We feed performance insights back into creative direction on every engagement.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="about-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>About</div>
          <h1 id="about-hero-heading" className={styles.heroHeading}>
            Performance Creative,
            <br />
            <span className={styles.heroAccent}>Built From First Principles</span>
          </h1>
          <p className={styles.heroSub}>
            DREXONYX is a performance creative studio. We exist to build UGC advertising that
            works — authentic, brand-safe, and optimized for the platforms where modern brands
            compete.
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
                The advertising landscape shifted. Audiences stopped responding to polished,
                produced brand content and started trusting peer recommendation, authentic
                experience, and human-scale storytelling. UGC advertising emerged to bridge that
                gap — and most brands are not yet equipped to produce it well or at the volume
                that modern paid media demands.
              </p>
              <p className={styles.missionText}>
                DREXONYX was built to solve that problem. We combine creative strategy,
                AI-assisted production, and rigorous QC into a studio built specifically for
                performance UGC advertising.
              </p>
            </div>
            <div className={styles.missionSidebar}>
              <div className={styles.missionStat}>
                <div className={styles.missionStatLabel}>Studio Focus</div>
                <div className={styles.missionStatValue}>Performance UGC</div>
              </div>
              <div className={styles.missionStat}>
                <div className={styles.missionStatLabel}>Production Model</div>
                <div className={styles.missionStatValue}>AI-Assisted Studio</div>
              </div>
              <div className={styles.missionStat}>
                <div className={styles.missionStatLabel}>Platform Expertise</div>
                <div className={styles.missionStatValue}>Meta · TikTok · YouTube</div>
              </div>
            </div>
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

      <section className={styles.teamSection} aria-labelledby="team-heading">
        <div className="container">
          <h2 id="team-heading" className={styles.sectionHeading}>
            The Team
          </h2>
          <p className={styles.teamNote}>
            Team profiles will be published as DREXONYX grows its public presence. For now, the
            work speaks.
          </p>
          <div className={styles.teamPlaceholder} aria-label="Team profiles — coming soon">
            <p className={styles.teamPlaceholderText}>
              PLACEHOLDER — Team member profiles pending
            </p>
          </div>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="about-cta-heading">
        <div className="container">
          <h2 id="about-cta-heading" className={styles.ctaBandHeading}>
            Work with us
          </h2>
          <p className={styles.ctaBandSub}>
            Ready to build performance creative for your brand? Start your campaign brief.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/start-campaign" className={styles.ctaPrimary}>
              Start Your Campaign
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
