import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Start Campaign",
  description:
    "Start your DREXONYX campaign — submit your brand brief and campaign objectives to begin performance UGC creative production.",
};

const PLATFORM_OPTIONS = [
  "Meta (Facebook / Instagram)",
  "TikTok",
  "YouTube / YouTube Shorts",
  "Google Display",
  "Other / Multiple",
] as const;

const CREATIVE_TYPE_OPTIONS = [
  "UGC Video Ads",
  "Static Ad Creative",
  "Creative Strategy Only",
  "Full Service (Strategy + Production)",
] as const;

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

              {/* Note: Form submission backend is not yet implemented.
                  This is the campaign intake entry point only.
                  Backend integration will be scoped in a future phase. */}
              <div className={styles.devNotice} role="note">
                <strong>Intake form in development.</strong> Backend submission is not yet
                active. To inquire now, contact us directly at the address below.
              </div>

              <form
                className={styles.form}
                aria-label="Campaign brief intake form"
                noValidate
              >
                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>Brand Information</legend>

                  <div className={styles.field}>
                    <label htmlFor="brand-name" className={styles.label}>
                      Brand Name <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="brand-name"
                      type="text"
                      className={styles.input}
                      placeholder="Your brand name"
                      required
                      aria-required="true"
                      disabled
                      aria-disabled="true"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="contact-email" className={styles.label}>
                      Contact Email <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className={styles.input}
                      placeholder="your@email.com"
                      required
                      aria-required="true"
                      disabled
                      aria-disabled="true"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="website" className={styles.label}>
                      Brand Website
                    </label>
                    <input
                      id="website"
                      type="url"
                      className={styles.input}
                      placeholder="https://yourbrand.com"
                      disabled
                      aria-disabled="true"
                    />
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>Campaign Goals</legend>

                  <div className={styles.field}>
                    <label htmlFor="campaign-objective" className={styles.label}>
                      Campaign Objective <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="campaign-objective"
                      className={styles.textarea}
                      placeholder="Describe your campaign goal — e.g., drive product trials, increase ROAS, scale UGC volume..."
                      rows={4}
                      required
                      aria-required="true"
                      disabled
                      aria-disabled="true"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="target-audience" className={styles.label}>
                      Target Audience
                    </label>
                    <textarea
                      id="target-audience"
                      className={styles.textarea}
                      placeholder="Describe your target audience — demographics, interests, pain points..."
                      rows={3}
                      disabled
                      aria-disabled="true"
                    />
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>Creative Scope</legend>

                  <div className={styles.field}>
                    <label className={styles.label}>
                      Creative Type <span aria-hidden="true">*</span>
                    </label>
                    <div
                      className={styles.checkboxGroup}
                      role="group"
                      aria-label="Select creative types"
                    >
                      {CREATIVE_TYPE_OPTIONS.map((opt) => (
                        <label key={opt} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            value={opt}
                            disabled
                            aria-disabled="true"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>
                      Target Platforms <span aria-hidden="true">*</span>
                    </label>
                    <div
                      className={styles.checkboxGroup}
                      role="group"
                      aria-label="Select target platforms"
                    >
                      {PLATFORM_OPTIONS.map((opt) => (
                        <label key={opt} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            value={opt}
                            disabled
                            aria-disabled="true"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="additional-info" className={styles.label}>
                      Additional Information
                    </label>
                    <textarea
                      id="additional-info"
                      className={styles.textarea}
                      placeholder="Budget range, timeline requirements, existing creative references, or anything else relevant..."
                      rows={4}
                      disabled
                      aria-disabled="true"
                    />
                  </div>
                </fieldset>

                <button type="submit" className={styles.submitBtn} disabled aria-disabled="true">
                  Submit Brief
                  <span className={styles.submitNote}>(Form not yet active)</span>
                </button>
              </form>
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
                  Prefer to reach out directly while the form is in development?
                </p>
                <p className={styles.contactEmail}>
                  {/* PLACEHOLDER — official contact email to be confirmed */}
                  PLACEHOLDER — contact email TBD
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
