import type { Metadata } from "next";
import styles from "./page.module.css";
import BriefForm from "./BriefForm";

export const metadata: Metadata = {
  title: "Start Campaign",
  description:
    "Start your DREXONYX campaign — submit your brand brief and campaign objectives to begin performance UGC creative production.",
};

export default function StartCampaignPage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="start-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>Get Started</div>
          <h1 id="start-hero-heading" className={styles.heroHeading}>
            Start Your Campaign
          </h1>
          <p className={styles.heroSub}>
            Tell us about your brand and campaign goals. We&apos;ll review your brief and
            follow up within one business day.
          </p>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="form-heading">
        <div className="container">
          <div className={styles.formLayout}>
            <div className={styles.formMain}>
              <h2 id="form-heading" className={styles.formHeading}>
                Campaign Brief
              </h2>
              <BriefForm />
            </div>

            <aside className={styles.sidebar} aria-label="Contact and process information">
              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarHeading}>What Happens Next</h3>
                <ol className={styles.nextSteps} aria-label="Post-submission process">
                  <li className={styles.nextStep}>We review your brief within 1 business day</li>
                  <li className={styles.nextStep}>
                    We follow up with questions or a proposed scope
                  </li>
                  <li className={styles.nextStep}>
                    Once aligned, production begins per agreed timeline
                  </li>
                </ol>
              </div>

              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarHeading}>Contact Directly</h3>
                <p className={styles.sidebarText}>
                  Prefer to reach out directly?
                </p>
                <p className={styles.contactEmail}>
                  drexonyx.studio@gmail.com
                </p>
              </div>

              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarHeading}>Not Sure Where to Start?</h3>
                <p className={styles.sidebarText}>
                  Review our services and pricing pages to understand the scope before submitting
                  your brief.
                </p>
                <div className={styles.sidebarLinks}>
                  <a href="/services" className={styles.sidebarLink}>
                    View Services
                  </a>
                  <a href="/pricing" className={styles.sidebarLink}>
                    View Pricing
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
