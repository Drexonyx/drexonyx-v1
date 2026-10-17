'use client';

import { useState, useTransition } from 'react';
import { submitBrief } from './actions';
import styles from './page.module.css';

type ServiceCategory = 'Digital' | 'Creative' | 'Media' | 'Business Solutions' | 'Not Sure Yet';

const CATEGORIES: { id: ServiceCategory; label: string; tagline: string }[] = [
  { id: 'Digital', label: 'Digital Services', tagline: 'Websites · Web Apps · AI · Automation' },
  { id: 'Creative', label: 'Creative Services', tagline: 'Branding · Logos · Design · Print' },
  { id: 'Media', label: 'Media & Video Production', tagline: 'Video · UGC · Ads · Content' },
  { id: 'Business Solutions', label: 'Business Solutions', tagline: 'Workflows · Forms · Automation' },
  { id: 'Not Sure Yet', label: 'Not Sure Yet', tagline: "We'll help you figure it out" },
];

const SUB_OPTIONS: Partial<Record<ServiceCategory, string[]>> = {
  Digital: ['Website', 'Landing Page', 'Web App', 'E-Commerce', 'UI/UX Design', 'AI & Automation'],
  Creative: ['Branding', 'Logo Design', 'Social Media Design', 'Brochure', 'Presentation', 'Other'],
  Media: ['UGC Video Ads', 'Product Ads', 'Video Production', 'Campaign Strategy', 'Campaign QC'],
  'Business Solutions': ['Business Systems', 'Electronic Forms', 'Workflows', 'Other'],
};

interface Props {
  initialService?: 'Digital' | 'Creative' | 'Media' | 'Business Solutions';
}

export default function ServiceFlowForm({ initialService }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(initialService ? 1 : 0);
  const [category, setCategory] = useState<ServiceCategory | null>(initialService ?? null);
  const [subSelections, setSubSelections] = useState<string[]>([]);
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasSubOptions = category && category !== 'Not Sure Yet';
  const totalDots = category === 'Not Sure Yet' ? 2 : 3;
  const currentDot = step === 0 ? 1 : step === 1 ? 2 : totalDots;

  function toggleSub(val: string) {
    setSubSelections((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
    );
  }

  function handleCategorySelect(cat: ServiceCategory) {
    if (cat !== category) setSubSelections([]);
    setCategory(cat);
    if (cat === 'Not Sure Yet') {
      setStep(2);
    } else {
      setStep(1);
    }
  }

  function goBack() {
    if (step === 2) {
      setStep(category === 'Not Sure Yet' ? 0 : 1);
    } else if (step === 1) {
      setStep(0);
    }
  }

  function handleSubmit() {
    const formData = new FormData();
    formData.set('brand-name', brandName);
    formData.set('contact-email', email);
    if (website) formData.set('website', website);
    formData.set('campaign-objective', description);

    const serviceContext = [
      category ? `Service: ${category}` : '',
      subSelections.length > 0 ? `Scope: ${subSelections.join(', ')}` : '',
      notes ? `Notes: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    if (serviceContext) formData.set('additional-info', serviceContext);

    if (category === 'Media' || category === 'Creative') {
      subSelections.forEach((s) => formData.append('creative-types', s));
    }

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
          We&apos;ll review your project brief and follow up within one business day.
        </p>
        <p className={styles.successText} style={{ fontSize: '0.8125rem', opacity: 0.6 }}>
          Reference: {successId.slice(0, 8)}
        </p>
      </div>
    );
  }

  return (
    <div role="form" aria-label="Project brief form" className={styles.flowForm}>
      <div className={styles.stepIndicator} aria-label={`Step ${currentDot} of ${totalDots}`}>
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            className={[styles.stepDot, currentDot > i ? styles.stepDotActive : ''].join(' ')}
            aria-hidden="true"
          />
        ))}
      </div>

      {step === 0 && (
        <>
          <h3 className={styles.stepHeading}>What can we help you with?</h3>
          <div className={styles.serviceGrid}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={[
                  styles.serviceCard,
                  category === cat.id ? styles.serviceCardSelected : '',
                  cat.id === 'Not Sure Yet' ? styles.serviceCardFull : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleCategorySelect(cat.id)}
              >
                <span className={styles.serviceCardLabel}>{cat.label}</span>
                <span className={styles.serviceCardTagline}>{cat.tagline}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && hasSubOptions && (
        <>
          <h3 className={styles.stepHeading}>
            What specifically do you need?
          </h3>
          <p className={styles.stepSubtext}>Select all that apply — or skip ahead.</p>
          <div className={styles.subOptionGrid}>
            {(SUB_OPTIONS[category as ServiceCategory] ?? []).map((opt) => (
              <button
                key={opt}
                type="button"
                className={[
                  styles.subOptionChip,
                  subSelections.includes(opt) ? styles.subOptionChipSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => toggleSub(opt)}
                aria-pressed={subSelections.includes(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className={styles.stepActions}>
            <button type="button" className={styles.backBtn} onClick={goBack}>
              ← Back
            </button>
            <button type="button" className={styles.submitBtn} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className={styles.stepHeading}>Tell us about your project</h3>

          {errorMsg && (
            <div className={styles.errorBanner} role="alert">
              {errorMsg}
            </div>
          )}

          <div className={styles.fieldset}>
            <div className={styles.field}>
              <label htmlFor="sf-brand-name" className={styles.label}>
                Brand Name <span aria-hidden="true">*</span>
              </label>
              <input
                id="sf-brand-name"
                type="text"
                className={styles.input}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Your brand or company name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="sf-email" className={styles.label}>
                Contact Email <span aria-hidden="true">*</span>
              </label>
              <input
                id="sf-email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="sf-website" className={styles.label}>
                Website
              </label>
              <input
                id="sf-website"
                type="url"
                className={styles.input}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbrand.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="sf-description" className={styles.label}>
                Project Description <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="sf-description"
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need — goals, timeline, scope, any specific requirements..."
                rows={4}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="sf-notes" className={styles.label}>
                Additional Notes
              </label>
              <textarea
                id="sf-notes"
                className={styles.textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Budget range, examples, or anything else we should know..."
                rows={3}
              />
            </div>
          </div>

          <div className={styles.stepActions}>
            <button type="button" className={styles.backBtn} onClick={goBack}>
              ← Back
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!brandName || !email || !description || isPending}
            >
              {isPending ? 'Submitting…' : 'Submit Brief'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
