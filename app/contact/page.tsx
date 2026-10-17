import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with DREXONYX — Dubai-based performance creative studio. AI-powered UGC advertising for global brands.",
};

export default function ContactPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="contact-hero-heading">
        <div className="container">
          <p className={styles.eyebrow}>Contact</p>
          <h1 id="contact-hero-heading" className={styles.heroHeading}>
            Let&apos;s Talk
          </h1>
          <p className={styles.heroSub}>
            Dubai-based and globally active. Reach out to start a conversation
            about your next campaign.
          </p>
        </div>
      </section>

      <section className={styles.contactSection} aria-label="Contact information">
        <div className="container">
          <div className={styles.contactGrid}>
            <div className={styles.contactBlock}>
              <div className={styles.contactLabel}>Studio Location</div>
              <div className={styles.contactValue}>Dubai, UAE · Global</div>
            </div>
            <div className={styles.contactBlock}>
              <div className={styles.contactLabel}>Email</div>
              <a
                href="mailto:info@drexonyx.com"
                className={styles.contactEmail}
              >
                info@drexonyx.com
              </a>
            </div>
            <div className={styles.contactBlock}>
              <div className={styles.contactLabel}>Response Time</div>
              <div className={styles.contactValue}>
                We respond within one business day. Submit your brief and
                we&apos;ll take it from there.
              </div>
            </div>
          </div>

          <div className={styles.ctaRow}>
            <Link href="/start-project" className={styles.ctaPrimary}>
              Start Project
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
