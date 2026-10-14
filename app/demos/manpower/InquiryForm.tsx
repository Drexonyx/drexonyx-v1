'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function InquiryForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className={styles.formSuccess}>
        <span className={styles.formSuccessIcon}>✓</span>
        <h3 className={styles.formSuccessTitle}>Inquiry Received</h3>
        <p className={styles.formSuccessText}>
          A workforce specialist will contact you within 48 hours to discuss your staffing requirements.
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
            placeholder="Your company name"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="contact">Contact Name</label>
          <input
            id="contact"
            type="text"
            className={styles.formInput}
            placeholder="HR Manager / Director"
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
          <label className={styles.formLabel} htmlFor="industry">Industry</label>
          <select id="industry" className={styles.formSelect} required>
            <option value="">Select industry</option>
            <option>Hospitality</option>
            <option>Retail</option>
            <option>Construction & MEP</option>
            <option>F&B</option>
            <option>Healthcare</option>
            <option>Facilities Management</option>
          </select>
        </div>
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="headcount">Estimated Headcount</label>
          <select id="headcount" className={styles.formSelect} required>
            <option value="">Select range</option>
            <option>1 – 10</option>
            <option>11 – 50</option>
            <option>51 – 200</option>
            <option>201 – 500</option>
            <option>500+</option>
          </select>
        </div>
        <div className={styles.formGroup} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="message">Requirements</label>
        <textarea
          id="message"
          className={styles.formTextarea}
          placeholder="Describe the roles, skills, timeline, and any specific visa or nationality requirements…"
          rows={4}
        />
      </div>
      <button type="submit" className={styles.formSubmit}>
        Submit Inquiry →
      </button>
    </form>
  );
}
