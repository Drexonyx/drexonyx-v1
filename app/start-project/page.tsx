import type { Metadata } from "next";
import styles from "./page.module.css";
import ProjectFlowForm from "./ProjectFlowForm";
import ServiceFlowForm from "./ServiceFlowForm";

export const metadata: Metadata = {
  title: "Start Project",
  description:
    "Start your MDA project — submit your brief and we'll follow up within one business day.",
};

const SERVICE_MAP: Record<string, 'Digital' | 'Creative' | 'Media' | 'Business Solutions'> = {
  digital: 'Digital',
  creative: 'Creative',
  media: 'Media',
  solutions: 'Business Solutions',
};

export default async function StartProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const type = typeof params.type === 'string' ? params.type : null;
  const serviceParam = typeof params.service === 'string' ? params.service.toLowerCase() : null;

  const isCampaign = type === 'campaign';
  const initialService = serviceParam ? SERVICE_MAP[serviceParam] : undefined;

  return (
    <>
      <section className={styles.hero} aria-labelledby="start-hero-heading">
        <div className="container">
          <div className={styles.heroBadge}>{isCampaign ? 'Campaign Brief' : 'Get Started'}</div>
          <h1 id="start-hero-heading" className={styles.heroHeading}>
            {isCampaign ? 'Campaign Brief' : 'Start Your Project'}
          </h1>
          <p className={styles.heroSub}>
            {isCampaign
              ? "Tell us about your brand and campaign goals. We'll review your brief and follow up within one business day."
              : "Tell us what you need. We'll follow up with a proposed scope within one business day."}
          </p>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="form-heading">
        <div className="container">
          <div className={styles.formLayout}>
            <div className={styles.formMain}>
              <h2 id="form-heading" className={styles.formHeading}>
                {isCampaign ? 'Campaign Brief' : 'Project Brief'}
              </h2>
              {isCampaign ? (
                <ProjectFlowForm />
              ) : (
                <ServiceFlowForm initialService={initialService} />
              )}
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
                <p className={styles.sidebarText}>Prefer to reach out directly?</p>
                <p className={styles.contactEmail}>drexonyx.studio@gmail.com</p>
              </div>

              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarHeading}>Not Sure Where to Start?</h3>
                <p className={styles.sidebarText}>
                  Review our services and pricing to understand scope before submitting.
                </p>
                <div className={styles.sidebarLinks}>
                  <a href="/mda#services" className={styles.sidebarLink}>View Services</a>
                  <a href="/mda#packages" className={styles.sidebarLink}>View Pricing</a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
