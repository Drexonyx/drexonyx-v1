// DR-0130: Social Seller Bot landing page — /social-seller
// White-label SSB product page for MDA. Embeds mda-sales chat agent inline.

import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Social Seller Bot — AI Sales Agent for Instagram, WhatsApp & More',
  description:
    'Put an AI sales agent on your Instagram, WhatsApp, TikTok, Facebook, and online store. Custom-trained on your business. Responds in Arabic & English, 24/7. AED 299/month.',
  openGraph: {
    title: 'Social Seller Bot — AI Sales Agent',
    description:
      'Put an AI sales agent on your Instagram, WhatsApp, TikTok, Facebook, and online store. Custom-trained, bilingual, 24/7. AED 299/month.',
  },
};

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    name: '24/7 Availability',
    desc: 'Your bot never sleeps, never misses a message, and never makes a customer wait.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    name: 'Multi-Platform',
    desc: 'One bot covers Instagram DMs, WhatsApp, TikTok DMs, Facebook Messenger, and your online store.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
    name: 'Arabic + English',
    desc: 'Detects the language your customer writes in and responds fluently in the same language.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    name: 'Trained on Your Business',
    desc: 'We train the bot on your services, pricing, working hours, FAQs — it knows your business inside out.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    name: 'Instant Lead Capture',
    desc: 'Qualifies leads and sends hot prospects directly to your WhatsApp — ready to close.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
    name: 'Live in 24 Hours',
    desc: 'We handle the full setup. Your bot is live on your platforms within one business day.',
  },
];

const INDUSTRIES = [
  { emoji: '🍽️', name: 'Restaurants', example: 'Menu Q&A, reservations, delivery info' },
  { emoji: '💇', name: 'Salons & Spas', example: 'Bookings, services, pricing' },
  { emoji: '🏥', name: 'Clinics', example: 'Appointments, services, location' },
  { emoji: '🛍️', name: 'Online Stores', example: 'Products, orders, shipping' },
  { emoji: '🏠', name: 'Real Estate', example: 'Listings, viewings, pricing' },
];

const STEPS = [
  {
    num: '1',
    title: 'Tell us about your business',
    desc: 'Send us your services, pricing, working hours and contact info via WhatsApp.',
  },
  {
    num: '2',
    title: 'We train your bot',
    desc: 'Our team trains a custom AI on your exact business — no templates, no guesswork.',
  },
  {
    num: '3',
    title: 'One-click install',
    desc: 'We install the bot on your Instagram, WhatsApp, TikTok, Facebook, or website.',
  },
  {
    num: '4',
    title: 'Go live in 24 hours',
    desc: 'Your AI sales agent starts responding to customers while you focus on running your business.',
  },
];

const WA_TEXT = encodeURIComponent(
  'Hi DREXONYX team 👋\nI want to get a Social Seller Bot for my business.\n\nPlan: Basic AED 299/month',
);
const WA_HREF = `https://wa.me/971585806534?text=${WA_TEXT}`;

export default function SocialSellerPage() {
  return (
    <div className={styles.page}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            AI Sales Agent
          </span>

          <h1 className={styles.heroTitle}>
            Your AI Sales Agent<br />
            <span className={styles.heroAccent}>Never Closes.</span>
          </h1>

          <p className={styles.heroSub}>
            Put a custom AI on your Instagram, WhatsApp, TikTok, Facebook, and online store.
            It responds to every customer, 24/7 — in Arabic and English.
            <strong> No website required.</strong>
          </p>

          <div className={styles.heroCta}>
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Start for AED 299/mo
            </a>
            <a href="#demo" className={styles.btnSecondary}>
              Try the bot live ↓
            </a>
          </div>

          <div className={styles.platforms}>
            {['Instagram', 'WhatsApp', 'TikTok', 'Facebook', 'Online Store'].map((p) => (
              <span key={p} className={styles.platformBadge}>
                <span aria-hidden="true">✓</span> {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="features-heading">
        <div className={styles.inner}>
          <span className={styles.sectionLabel}>Why it works</span>
          <h2 className={styles.sectionTitle} id="features-heading">
            Everything your sales team does — automated
          </h2>
          <p className={styles.sectionSub}>
            The bot handles customer questions, pricing, bookings, and lead capture around the clock.
          </p>

          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <div key={f.name} className={styles.featureCard}>
                <div className={styles.featureIcon} aria-hidden="true">{f.icon}</div>
                <div className={styles.featureName}>{f.name}</div>
                <div className={styles.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ───────────────────────────────────────────────── */}
      <section className={styles.industriesSection} aria-labelledby="industries-heading">
        <div className={styles.inner}>
          <span className={styles.sectionLabel}>Any business, any industry</span>
          <h2 className={styles.sectionTitle} id="industries-heading">
            Works for any type of business
          </h2>
          <p className={styles.sectionSub}>
            We train the bot on YOUR products and services — so it sounds like you, not a generic assistant.
          </p>

          <div className={styles.industriesGrid}>
            {INDUSTRIES.map((i) => (
              <div key={i.name} className={styles.industryCard}>
                <span className={styles.industryEmoji} aria-hidden="true">{i.emoji}</span>
                <div className={styles.industryName}>{i.name}</div>
                <div className={styles.industryExample}>{i.example}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo ────────────────────────────────────────────────── */}
      <section className={styles.demoSection} id="demo" aria-labelledby="demo-heading">
        <div className={styles.inner}>
          <div className={styles.demoLayout}>
            <div className={styles.demoText}>
              <span className={styles.sectionLabel}>Live demo</span>
              <h2 className={styles.sectionTitle} id="demo-heading">
                This is your bot.<br />Try it right now.
              </h2>
              <p className={styles.sectionSub} style={{ marginBottom: '1.4rem' }}>
                This is exactly what your customers will experience on Instagram, WhatsApp, or your website.
                Ask it anything — it&apos;s the real thing.
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--ssb-muted)' }}>
                Custom-trained for your business, it would sound like <em>your</em> brand, with your pricing and your services.
              </p>
            </div>

            <div className={styles.demoChatWrap}>
              <div className={styles.demoGlow} aria-hidden="true" />
              <div className={styles.demoChatFrame}>
                <iframe
                  src="/chat/mda-sales"
                  title="Social Seller Bot — live demo"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className={styles.howSection} aria-labelledby="how-heading">
        <div className={styles.inner}>
          <span className={styles.sectionLabel}>Setup process</span>
          <h2 className={styles.sectionTitle} id="how-heading">
            From signup to live in 24 hours
          </h2>

          <div className={styles.stepsGrid}>
            {STEPS.map((s) => (
              <div key={s.num} className={styles.step}>
                <div className={styles.stepNum} aria-label={`Step ${s.num}`}>{s.num}</div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className={styles.pricingSection} id="pricing" aria-labelledby="pricing-heading">
        <div className={styles.inner}>
          <span className={styles.sectionLabel}>Pricing</span>
          <h2 className={styles.sectionTitle} id="pricing-heading">
            Simple, transparent pricing
          </h2>
          <p className={styles.sectionSub} style={{ margin: '0 auto 0' }}>
            One plan. Everything included. No setup fees.
          </p>

          <div className={styles.pricingCard}>
            <div className={styles.pricingPlan}>Basic Plan</div>
            <div className={styles.pricingAmount}>
              <span className={styles.pricingCurrency}>AED</span>
              299
              <span className={styles.pricingPeriod}>/month</span>
            </div>
            <div className={styles.pricingTagline}>Cancel anytime. No contract.</div>

            <ul className={styles.pricingFeatures}>
              {[
                'Custom AI trained on your business',
                'Instagram, WhatsApp, TikTok, Facebook, online store',
                'Arabic + English responses',
                '24/7 availability — unlimited responses',
                'Free setup and installation',
                'Ongoing WhatsApp support',
                'Live in 24 hours',
              ].map((item) => (
                <li key={item}>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Get started on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className={styles.ctaSection} aria-labelledby="cta-heading">
        <div className={styles.ctaGlow} aria-hidden="true" />
        <div className={styles.inner}>
          <h2 className={styles.ctaTitle} id="cta-heading">
            Ready to put your sales on autopilot?
          </h2>
          <p className={styles.ctaSub}>
            Join businesses across Dubai and the UAE using DREXONYX AI to respond faster, capture more leads, and close more sales.
          </p>

          <div className={styles.ctaButtons}>
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Start on WhatsApp
            </a>
            <a href="#demo" className={styles.btnSecondary}>
              Try the demo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
