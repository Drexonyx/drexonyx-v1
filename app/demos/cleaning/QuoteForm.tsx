'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function QuoteForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className={styles.formSuccess}>
        <span className={styles.formSuccessIcon}>✓</span>
        <h3 className={styles.formSuccessTitle}>Quote Request Received</h3>
        <p className={styles.formSuccessText}>
          Thank you! Our team will review your request and get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="company">Company Name</label>
          <input
            id="company"
            type="text"
            className={styles.formInput}
            placeholder="e.g. Al Futtaim Group"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="contact">Contact Name</label>
          <input
            id="contact"
            type="text"
            className={styles.formInput}
            placeholder="Your full name"
            required
          />
        </div>
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="phone">Phone / WhatsApp</label>
          <input
            id="phone"
            type="tel"
            className={styles.formInput}
            placeholder="+971 5X XXX XXXX"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="serviceType">Service Type</label>
          <select id="serviceType" className={styles.formSelect} required>
            <option value="">Select a service</option>
            <option>Daily Office Cleaning</option>
            <option>Deep Cleaning</option>
            <option>Post-Construction Clean</option>
            <option>Carpet & Upholstery</option>
            <option>Window Cleaning</option>
            <option>Move-In / Move-Out</option>
          </select>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="message">Additional Notes</label>
        <textarea
          id="message"
          className={styles.formTextarea}
          placeholder="Describe your premises, frequency, any special requirements…"
          rows={4}
        />
      </div>
      <button type="submit" className={styles.formSubmit}>
        Request My Quote →
      </button>
    </form>
  );
}
