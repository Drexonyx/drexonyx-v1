import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES, getServiceBySlug } from "../data";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.summary,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="svc-hero-heading">
        <div className={styles.heroBg} aria-hidden="true" />
        <div className="container">
          <div className={styles.heroMeta}>
            <span className={styles.heroNumber}>{service.number}</span>
            <span className={styles.heroDivider} aria-hidden="true" />
            <Link href="/services" className={styles.heroBack}>
              All Services
            </Link>
          </div>
          <h1 id="svc-hero-heading" className={styles.heroHeading}>
            {service.title}
          </h1>
          <p className={styles.heroTagline}>{service.tagline}</p>
          <p className={styles.heroSummary}>{service.summary}</p>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ───────────────────────────────────── */}
      <section className={styles.psSection} aria-label="Problem and solution">
        <div className="container">
          <div className={styles.psGrid}>
            <div className={styles.psBlock}>
              <div className={styles.psLabel}>The Problem</div>
              <p className={styles.psText}>{service.problem}</p>
            </div>
            <div className={styles.psBlock}>
              <div className={styles.psLabel}>Our Approach</div>
              <p className={styles.psText}>{service.solution}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className={styles.featuresSection} aria-labelledby="features-heading">
        <div className="container">
          <h2 id="features-heading" className={styles.sectionHeading}>
            What We Deliver
          </h2>
          <ul className={styles.featuresList} role="list">
            {service.features.map((f) => (
              <li key={f} className={styles.featureItem}>
                <span className={styles.featureDot} aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────────── */}
      <section className={styles.useCasesSection} aria-labelledby="usecases-heading">
        <div className="container">
          <h2 id="usecases-heading" className={styles.sectionHeading}>
            Use Cases
          </h2>
          <div className={styles.useCasesGrid}>
            {service.useCases.map((uc) => (
              <div key={uc.title} className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>{uc.title}</h3>
                <p className={styles.useCaseDesc}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ───────────────────────────────────────────── */}
      <section className={styles.industriesSection} aria-labelledby="industries-heading">
        <div className="container">
          <h2 id="industries-heading" className={styles.sectionHeading}>
            Industries We Serve
          </h2>
          <div className={styles.industriesList}>
            {service.industries.map((ind) => (
              <span key={ind} className={styles.industryTag}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS PHASES ───────────────────────────────────────── */}
      <section className={styles.processSection} aria-labelledby="process-heading">
        <div className="container">
          <h2 id="process-heading" className={styles.sectionHeading}>
            How We Work
          </h2>
          <div className={styles.phasesList}>
            {service.phases.map((phase, idx) => (
              <div key={phase.step} className={styles.phaseItem}>
                <div className={styles.phaseStep}>{phase.step}</div>
                <div className={styles.phaseContent}>
                  <h3 className={styles.phaseTitle}>{phase.title}</h3>
                  <p className={styles.phaseDesc}>{phase.desc}</p>
                </div>
                {idx < service.phases.length - 1 && (
                  <div className={styles.phaseConnector} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className={styles.ctaSection} aria-labelledby="svc-cta-heading">
        <div className="container">
          <h2 id="svc-cta-heading" className={styles.ctaHeading}>
            Ready to get started?
          </h2>
          <p className={styles.ctaSub}>
            Tell us about your project. We&apos;ll scope the engagement and outline a delivery plan.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/contact" className={styles.ctaPrimary}>
              Start a Conversation
            </Link>
            <Link href="/services" className={styles.ctaSecondary}>
              All Services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
