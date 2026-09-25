'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { submitBrief } from './actions';
import { PRODUCTION_PACKAGES } from '@/lib/pricing';
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
  'Static Ad Creative',
  'Creative Strategy',
  'Campaign QC',
] as const;

export default function ProjectFlowForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [creativeTypes, setCreativeTypes] = useState<string[]>([]);
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const recommendedPkg = (() => {
    const wantsVideo = creativeTypes.some((t) => t.toLowerCase().includes('video'));
    const wantsStrategy = creativeTypes.some((t) => t.toLowerCase().includes('strategy'));
    if (!wantsVideo && wantsStrategy) {
      return PRODUCTION_PACKAGES.find((p) => p.id === 'starter') ?? PRODUCTION_PACKAGES[0];
    }
    return PRODUCTION_PACKAGES.find((p) => p.highlight) ?? PRODUCTION_PACKAGES[0];
  })();

  function toggle(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function handleSubmit() {
    const formData = new FormData();
    formData.set('brand-name', brandName);
    formData.set('contact-email', email);
    if (website) formData.set('website', website);
    formData.set('campaign-objective', objective);
    if (audience) formData.set('target-audience', audience);
    creativeTypes.forEach((t) => formData.append('creative-types', t));
    platforms.forEach((p) => formData.append('platforms', p));
    if (additionalInfo) formData.set('additional-info', additionalInfo);

    startTransition(async () => {
      const result = await submitBrief({ status: 'idle' }, formData);
      if (result.status === 'success') {
        setSuccessId(result.inquiryId);
      } else if (result.status === 'error') {
        setErrorMsg(result.error);
      }
    });
  }

  if (successId) {
    return (
      <div className={styles.successBanner} role="status" aria-live="polite">
        <p className={styles.successHeading}>Brief received.</p>
        <p className={styles.successText}>
          We&apos;ll review your campaign brief and follow up within one business day.
        </p>
        <p className={styles.successText} style={{ fontSize: '0.8125rem', opacity: 0.6 }}>
          Reference: {successId.slice(0, 8)}
        </p>
      </div>
    );
  }

  return (
    <div role="form" aria-label="Campaign brief intake form" className={styles.flowForm}>
      <div className={styles.stepIndicator} aria-label={`Step ${step} of 3`}>
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`${styles.stepDot} ${step >= s ? styles.stepDotActive : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      {step === 1 && (
        <>
          <h3 className={styles.stepHeading}>What do you need?</h3>

          <div className={styles.field}>
            <span className={styles.label}>Creative Type</span>
            <div className={styles.checkboxGroup} role="group" aria-label="Select creative types">
              {CREATIVE_TYPE_OPTIONS.map((opt) => (
                <label key={opt} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    value={opt}
                    checked={creativeTypes.includes(opt)}
                    onChange={() => toggle(creativeTypes, opt, setCreativeTypes)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Target Platforms</span>
            <div className={styles.checkboxGroup} role="group" aria-label="Select target platforms">
              {PLATFORM_OPTIONS.map((opt) => (
                <label key={opt} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    value={opt}
                    checked={platforms.includes(opt)}
                    onChange={() => toggle(platforms, opt, setPlatforms)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="button" className={styles.submitBtn} onClick={() => setStep(2)}>
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className={styles.stepHeading}>About your brand</h3>

          {errorMsg && (
            <div className={styles.errorBanner} role="alert">
              {errorMsg}
            </div>
          )}

          <div className={styles.fieldset}>
            <div className={styles.field}>
              <label htmlFor="brand-name" className={styles.label}>
                Brand Name <span aria-hidden="true">*</span>
              </label>
              <input
                id="brand-name"
                type="text"
                className={styles.input}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Your brand name"
                required
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
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
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbrand.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="campaign-objective" className={styles.label}>
                Campaign Objective <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="campaign-objective"
                className={styles.textarea}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Describe your campaign goal — e.g., drive product trials, increase ROAS, scale UGC volume..."
                rows={4}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="target-audience" className={styles.label}>
                Target Audience
              </label>
              <textarea
                id="target-audience"
                className={styles.textarea}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Describe your target audience..."
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="additional-info" className={styles.label}>
                Additional Information
              </label>
              <textarea
                id="additional-info"
                className={styles.textarea}
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Budget range, timeline requirements, creative references..."
                rows={4}
              />
            </div>
          </div>

          <div className={styles.stepActions}>
            <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => setStep(3)}
              disabled={!brandName || !email || !objective}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h3 className={styles.stepHeading}>Confirm your package</h3>

          {recommendedPkg && (
            <div className={styles.recommendCard}>
              <p className={styles.recommendLabel}>Recommended based on your scope</p>
              <p className={styles.recommendName}>{recommendedPkg.name}</p>
              <p className={styles.recommendPrice}>{recommendedPkg.creditCost.toLocaleString('en-US')} Credits</p>
              <p className={styles.recommendDesc}>{recommendedPkg.description}</p>
            </div>
          )}

          {errorMsg && (
            <div className={styles.errorBanner} role="alert">
              {errorMsg}
            </div>
          )}

          <div className={styles.stepActions}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setStep(2)}
              disabled={isPending}
            >
              Back
            </button>
            <Link
              href={recommendedPkg ? `/checkout?service=${recommendedPkg.id}` : '/pricing'}
              className={styles.submitBtn}
            >
              Proceed to Checkout
            </Link>
          </div>
          <button
            type="button"
            className={styles.submitBriefOnly}
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? 'Submitting…' : 'Submit Brief Only'}
          </button>
        </>
      )}
    </div>
  );
}
