import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { SERVICES } from "./data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "DREXONYX technology services — custom software development, AI automation, digital commerce, and enterprise systems integration. Engineering-led solutions for growing businesses.",
};

export default function ServicesPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="services-hero-heading">
        <div className="container">
          <p className={styles.heroEyebrow}>Our Services</p>
          <h1 id="services-hero-heading" className={styles.heroHeading}>
            Technology Services,
            <br />
            <span className={styles.heroAccent}>Built for Growth</span>
          </h1>
          <p className={styles.heroSub}>
            From custom software to enterprise integration — every service is engineered around
            your business outcomes, not generic deliverables.
          </p>
        </div>
      </section>

      <section className={styles.servicesSection} aria-label="Service offerings">
        <div className="container">
          <div className={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <article key={service.slug} className={styles.serviceCard}>
                <div className={styles.serviceNumber} aria-hidden="true">
                  {service.number}
                </div>
                <div className={styles.serviceContent}>
                  <h2 className={styles.serviceTitle}>{service.title}</h2>
                  <p className={styles.serviceSummary}>{service.summary}</p>
                  <ul className={styles.serviceDetails} aria-label={`${service.title} capabilities`}>
                    {service.features.slice(0, 5).map((feat) => (
                      <li key={feat} className={styles.serviceDetail}>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/services/${service.slug}`}
                    className={styles.serviceDetailLink}
                    aria-label={`Learn more about ${service.title}`}
                  >
                    View full scope →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="services-cta-heading">
        <div className="container">
          <h2 id="services-cta-heading" className={styles.ctaBandHeading}>
            Ready to scope your project?
          </h2>
          <p className={styles.ctaBandSub}>
            Tell us what you&apos;re building and what you need. We&apos;ll propose the right engagement.
          </p>
          <Link href="/contact" className={styles.ctaPrimary}>
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}
