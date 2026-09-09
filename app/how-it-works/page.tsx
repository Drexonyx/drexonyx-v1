import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how DREXONYX delivers performance UGC advertising — from campaign brief through creative production and final delivery.",
};

const STEPS = [
  {
    number: "01",
    title: "Campaign Brief",
    description:
      "You submit your campaign brief through our intake form. We collect your brand objectives, target audience, performance KPIs, and creative references. No lengthy onboarding calls required to get started.",
  },
  {
    number: "02",
    title: "Creative Strategy",
    description:
      "Our creative strategists analyze your brief, review your competitive landscape, and develop a creative direction document. You receive hook angles, messaging hierarchy, and a proposed concept set before production begins.",
  },
  {
    number: "03",
    title: "Production",
    description:
      "Our AI-assisted production pipeline turns approved concepts into campaign-ready assets. UGC video, static creative, and copy are produced against your brand guidelines and platform specifications.",
  },
  {
    number: "04",
    title: "Quality Control",
    description:
      "Every deliverable goes through our multi-point QC process: brand guideline compliance, platform policy review, technical spec verification, and messaging accuracy. Nothing ships without a sign-off.",
  },
  {
    number: "05",
    title: "Delivery",
    description:
      "Approved assets are organized and delivered through your designated channel. Files are formatted, labeled, and platform-ready. Revisions within brief scope are handled promptly.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hiw-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>Process</div>
          <h1 id="hiw-hero-heading" className={styles.heroHeading}>
            How DREXONYX Works
          </h1>
          <p className={styles.heroSub}>
            A structured, transparent production process — from brief to deliverable — designed
            for performance marketers who move fast.
          </p>
        </div>
      </section>

      <section className={styles.stepsSection} aria-label="Production process steps">
        <div className="container">
          <ol className={styles.stepsList} aria-label="Steps">
            {STEPS.map((step, idx) => (
              <li key={step.number} className={styles.step}>
                <div className={styles.stepMeta}>
                  <div className={styles.stepNumber} aria-hidden="true">
                    {step.number}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={styles.stepConnector} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.stepContent}>
                  <h2 className={styles.stepTitle}>{step.title}</h2>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.principlesSection} aria-labelledby="principles-heading">
        <div className="container">
          <h2 id="principles-heading" className={styles.sectionHeading}>
            Our Production Principles
          </h2>
          <div className={styles.principlesGrid}>
            {[
              {
                title: "Brief Discipline",
                desc: "We work within scope. Every deliverable maps back to the brief so you never receive creative that missed the point.",
              },
              {
                title: "Speed Without Shortcuts",
                desc: "Our AI-assisted pipeline reduces timelines. It never reduces quality. QC is non-negotiable at every stage.",
              },
              {
                title: "Transparent Communication",
                desc: "You know where your project is at every step. No surprises, no black boxes.",
              },
            ].map((item) => (
              <div key={item.title} className={styles.principle}>
                <h3 className={styles.principleTitle}>{item.title}</h3>
                <p className={styles.principleDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="hiw-cta-heading">
        <div className="container">
          <h2 id="hiw-cta-heading" className={styles.ctaBandHeading}>
            Ready to start?
          </h2>
          <p className={styles.ctaBandSub}>
            Submit your campaign brief and we&apos;ll take it from step one.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/start-campaign" className={styles.ctaPrimary}>
              Start Your Campaign
            </Link>
            <Link href="/pricing" className={styles.ctaSecondary}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
