'use client';

import { useActionState } from 'react';
import { submitBrief } from './actions';
import styles from './page.module.css';

const PLATFORM_OPTIONS = [
  'Meta (Facebook / Instagram)',
  'TikTok',
  'YouTube / YouTube Shorts',
  'Google Display',
  'Other / Multiple',
] as const;

const CREATIVE_TYPE_OPTIONS = [
  'UGC Video Ads',
] as const;

const IDLE: { status: 'idle' } = { status: 'idle' };

export default function BriefForm() {
  const [state, action, pending] = useActionState(submitBrief, IDLE);

  if (state.status === 'success') {
    return (
      <div className={styles.successBanner} role="status" aria-live="polite">
        <p className={styles.successHeading}>Brief received.</p>
        <p className={styles.successText}>
          We&apos;ll review your campaign brief and follow up at your contact email within one
          business day.
        </p>
        <p className={styles.successText} style={{ fontSize: '0.8125rem', opacity: 0.6 }}>
          Reference: {state.inquiryId.slice(0, 8)}
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} aria-label="Campaign brief intake form" action={action} noValidate>
      {state.status === 'error' && (
        <div className={styles.errorBanner} role="alert">
          {state.error}
        </div>
      )}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Brand Information</legend>

        <div className={styles.field}>
          <label htmlFor="brand-name" className={styles.label}>
            Brand Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="brand-name"
            name="brand-name"
            type="text"
            className={styles.input}
            placeholder="Your brand name"
            required
            aria-required="true"
            disabled={pending}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="contact-email" className={styles.label}>
            Contact Email <span aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            name="contact-email"
            type="email"
            className={styles.input}
            placeholder="your@email.com"
            required
            aria-required="true"
            disabled={pending}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="website" className={styles.label}>
            Brand Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            className={styles.input}
            placeholder="https://yourbrand.com"
            disabled={pending}
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
            name="campaign-objective"
            className={styles.textarea}
            placeholder="Describe your campaign goal — e.g., drive product trials, increase ROAS, scale UGC volume..."
            rows={4}
            required
            aria-required="true"
            disabled={pending}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="target-audience" className={styles.label}>
            Target Audience
          </label>
          <textarea
            id="target-audience"
            name="target-audience"
            className={styles.textarea}
            placeholder="Describe your target audience — demographics, interests, pain points..."
            rows={3}
            disabled={pending}
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Creative Scope</legend>

        <div className={styles.field}>
          <label className={styles.label}>Creative Type</label>
          <div className={styles.checkboxGroup} role="group" aria-label="Select creative types">
            {CREATIVE_TYPE_OPTIONS.map((opt) => (
              <label key={opt} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="creative-types"
                  className={styles.checkbox}
                  value={opt}
                  disabled={pending}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Target Platforms</label>
          <div className={styles.checkboxGroup} role="group" aria-label="Select target platforms">
            {PLATFORM_OPTIONS.map((opt) => (
              <label key={opt} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="platforms"
                  className={styles.checkbox}
                  value={opt}
                  disabled={pending}
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
            name="additional-info"
            className={styles.textarea}
            placeholder="Budget range, timeline requirements, existing creative references, or anything else relevant..."
            rows={4}
            disabled={pending}
          />
        </div>
      </fieldset>

      <button type="submit" className={styles.submitBtn} disabled={pending} aria-disabled={pending}>
        {pending ? 'Submitting…' : 'Submit Brief'}
      </button>
    </form>
  );
}
