// DR-0130: MDA Social Seller landing page — English version /en/social-seller
// LTR layout. DO NOT modify the Arabic version at /social-seller.

import type { Metadata } from 'next';
import Image from 'next/image';
import styles from '@/app/social-seller/page.module.css';

export const metadata: Metadata = {
  title: 'Smart Sales Bot — MDA | Master Digital Agency',
  description:
    'AI sales assistant for your business in the UAE. Answers customer inquiries, showcases your services, and converts conversations into sales. AED 299/month.',
  openGraph: {
    title: 'Smart Sales Bot — MDA | Master Digital Agency',
    description:
      'Receive customers and convert their inquiries into sales with a custom AI bot for your business. AED 299/month.',
    type: 'website',
  },
};

const WA_TEXT = encodeURIComponent(
  'Hello MDA team 👋\nI\'d like to subscribe to the Smart Sales Bot\n\nPlan: Basic AED 299/month',
);
const WA_HREF = `https://wa.me/971521770988?text=${WA_TEXT}`;

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const PROBLEMS = [
  {
    title: 'Inquiries Lost Every Day',
    desc: 'Your customers message on WhatsApp while you\'re busy — they wait for hours then go to your competitor.',
  },
  {
    title: 'Slow Replies Destroy Trust',
    desc: 'A serious buyer wants an instant response. Delays signal unprofessionalism and cost you the deal.',
  },
  {
    title: 'Your Time Drains on Repetitive Answers',
    desc: 'The same questions every day about prices, hours and services — hours wasted daily.',
  },
];

const SOLUTIONS = [
  {
    title: 'Responds on Your Behalf Around the Clock',
    desc: 'The bot receives every inquiry instantly — night and day, weekends, even during your meetings.',
  },
  {
    title: 'Knows Your Business as Well as You Do',
    desc: 'We train it on your services, pricing and working hours — it answers accurately in your brand\'s voice.',
  },
  {
    title: 'Delivers Ready-to-Close Leads Directly to You',
    desc: 'After gathering and qualifying the customer\'s details, it routes them straight to your WhatsApp — you just close the deal.',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Share Your Business Details',
    desc: 'Send us your services, pricing and working hours via WhatsApp — simple and straightforward.',
  },
  {
    num: '2',
    title: 'We Build Your Custom Bot',
    desc: 'Our team trains the bot on your business and configures it to represent your brand accurately.',
  },
  {
    num: '3',
    title: 'The Bot Welcomes Your Customers',
    desc: 'Once set up, the bot is ready to receive customer inquiries. Setup time is confirmed upon contact.',
  },
];

const INDUSTRIES = [
  { icon: '🍽️', name: 'Restaurants & Cafés', detail: 'Menu, orders, reservations' },
  { icon: '💇', name: 'Salons & Beauty Centers', detail: 'Appointments, services, pricing' },
  { icon: '🏥', name: 'Clinics & Pharmacies', detail: 'Appointments, services, location' },
  { icon: '🛍️', name: 'Shops & Products', detail: 'Products, orders, shipping' },
  { icon: '🏠', name: 'Real Estate & Offices', detail: 'Listings, viewings, pricing' },
  { icon: '📚', name: 'Education & Courses', detail: 'Enrollment, schedule, curriculum' },
  { icon: '⚙️', name: 'Professional Services', detail: 'Inquiries, pricing, contact' },
];

const FEATURES = [
  { title: 'Available 24/7', desc: 'Never sleeps. Never misses a message.' },
  { title: 'Arabic & English', desc: 'Detects the customer\'s language and responds accordingly.' },
  { title: 'Custom to Your Business', desc: 'Trained on your services and pricing.' },
  { title: 'Delivers Qualified Leads', desc: 'Routes them directly to your WhatsApp.' },
  { title: 'WhatsApp & Website', desc: 'Works on both platforms.' },
  { title: 'Full Setup Included', desc: 'No technical expertise required.' },
];

const FAQS = [
  {
    q: 'How exactly does the bot work?',
    a: 'The customer opens the bot link (on your website or WhatsApp) and starts a conversation. The bot answers questions about your services, pricing and hours, then collects their details and routes them to you on WhatsApp.',
  },
  {
    q: 'Which platforms does the bot work on?',
    a: 'It currently works via a web link that can be shared in your bio, WhatsApp, or on your website. It does not work directly inside WhatsApp conversations, Instagram DMs, or TikTok.',
  },
  {
    q: 'What does setup require?',
    a: 'Just your business information: services, pricing, working hours, and a WhatsApp number for routing. We handle the complete setup.',
  },
  {
    q: 'Can I cancel the subscription?',
    a: 'Yes, the subscription is month-to-month with no contract. You can cancel at any time by contacting us.',
  },
  {
    q: 'What if the customer wants to speak with a real person?',
    a: 'The bot collects the customer\'s details and routes them directly to you on WhatsApp. You close the deal.',
  },
];

export default function EnSocialSellerPage() {
  return (
    <div className={styles.page} dir="ltr">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Image
            src="/brand/mda-full-logo.png"
            alt="MDA — Master Digital Agency"
            width={130}
            height={40}
            className={styles.logo}
            priority
          />
          <nav className={styles.headerNav}>
            <a href="#how" className={styles.navLink}>How It Works</a>
            <a href="#demo" className={styles.navLink}>Live Demo</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
            <a href="/social-seller" className={styles.navLink} style={{ display: 'inline' }} aria-label="Switch to Arabic">عربي</a>
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.headerCta}>
              {WA_ICON}
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroLayout}>
            <div className={styles.heroContent}>
              <span className={styles.heroBadge}>Smart Sales Bot by MDA</span>
              <h1 className={styles.heroTitle}>
                Turn your business into<br />
                <span className={styles.heroAccent}>real sales</span>
              </h1>
              <p className={styles.heroDesc}>
                An AI sales assistant that helps your business receive customer inquiries, showcase your products and services, collect potential customer details, and route them to your team via WhatsApp.
              </p>
              <div className={styles.heroPriceBadge}>
                <span className={styles.priceAmount}>299 AED</span>
                <span className={styles.pricePer}> / month</span>
              </div>
              <div className={styles.heroCtas}>
                <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
                  {WA_ICON}
                  Get Started with MDA
                </a>
                <a href="#demo" className={styles.btnGhost}>Try the bot live ↓</a>
              </div>
            </div>

            <div className={styles.heroPreview}>
              <div className={styles.previewLabel}>Live Bot Preview</div>
              <div className={styles.previewFrame}>
                <iframe
                  src="/en/chat/mda-sales"
                  title="Smart Sales Bot — Live Preview"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────── */}
      <section className={styles.section} id="problem">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>The Challenge</span>
            <h2 className={styles.sectionTitle}>Why Are You Losing Customers?</h2>
            <p className={styles.sectionSub}>
              Business owners in the UAE face daily challenges keeping up with customer inquiries.
            </p>
          </div>
          <div className={styles.cardsGrid}>
            {PROBLEMS.map((p) => (
              <div key={p.title} className={styles.problemCard}>
                <div className={styles.problemTitle}>{p.title}</div>
                <div className={styles.problemDesc}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ───────────────────────────────────────────── */}
      <section className={styles.sectionAlt} id="solution">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>The Solution</span>
            <h2 className={styles.sectionTitle}>How Does MDA Sales Agent Help?</h2>
            <p className={styles.sectionSub}>
              Your customers from every platform, with their details delivered directly to your WhatsApp.
            </p>
            <p className={styles.sectionSub} style={{ marginTop: '0.75rem' }}>
              Simply share the bot link across your platforms or website and it begins receiving customer inquiries, collecting their details, and sending interested leads to your WhatsApp so you can follow up and close the sale.
            </p>
          </div>
          <div className={styles.cardsGrid}>
            {SOLUTIONS.map((s) => (
              <div key={s.title} className={styles.solutionCard}>
                <div className={styles.solutionCheck}>✓</div>
                <div>
                  <div className={styles.solutionTitle}>{s.title}</div>
                  <div className={styles.solutionDesc}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className={styles.section} id="how">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Getting Started</span>
            <h2 className={styles.sectionTitle}>How Does It Work?</h2>
          </div>
          <div className={styles.stepsRow}>
            {STEPS.map((step, i) => (
              <div key={step.num} className={styles.step}>
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepDesc}>{step.desc}</div>
                {i < STEPS.length - 1 && <div className={styles.stepArrow} aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ─────────────────────────────────────────── */}
      <section className={styles.sectionAlt} id="industries">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Who Benefits?</span>
            <h2 className={styles.sectionTitle}>Suitable Business Types</h2>
            <p className={styles.sectionSub}>
              Works for any business that receives inquiries from customers.
            </p>
          </div>
          <div className={styles.industriesGrid}>
            {INDUSTRIES.map((ind) => (
              <div key={ind.name} className={styles.industryCard}>
                <span className={styles.industryIcon} aria-hidden="true">{ind.icon}</span>
                <div className={styles.industryName}>{ind.name}</div>
                <div className={styles.industryDetail}>{ind.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo ───────────────────────────────────────────────── */}
      <section className={styles.demoSection} id="demo">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Live Demo</span>
            <h2 className={styles.sectionTitle}>Try the Bot Now</h2>
            <p className={styles.sectionSub}>
              This is exactly what your customers will experience. Ask it anything — this is the real version.
            </p>
          </div>
          <div className={styles.demoWrap}>
            <div className={styles.demoFrame}>
              <iframe
                src="/en/chat/mda-sales"
                title="Smart Sales Bot — Live Demo"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className={styles.section} id="features">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Core Features</span>
            <h2 className={styles.sectionTitle}>What Does the Bot Offer?</h2>
          </div>
          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureTitle}>{f.title}</div>
                <div className={styles.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section className={styles.pricingSection} id="pricing">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Price & Subscription</span>
            <h2 className={styles.sectionTitle}>Clear, All-Inclusive Pricing</h2>
            <p className={styles.sectionSub}>One plan. Everything included. No setup fees.</p>
          </div>
          <div className={styles.pricingCard}>
            <div className={styles.pricingPlan}>Basic Plan</div>
            <div className={styles.pricingPrice}>
              <span className={styles.pricingCurrency}>AED</span>
              <span className={styles.pricingNum}>299</span>
              <span className={styles.pricingPer}>/month</span>
            </div>
            <p className={styles.pricingNote}>Cancel anytime. No long-term contract.</p>
            <ul className={styles.pricingList}>
              {[
                'Custom bot trained on your business',
                'Responds in Arabic and English',
                'Works via WhatsApp link and your website',
                'Available 24/7 — unlimited responses',
                'Full setup and configuration included',
                'Ongoing support via WhatsApp',
              ].map((item) => (
                <li key={item}>
                  <span className={styles.checkMark} aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimaryFull}
            >
              {WA_ICON}
              Subscribe Now via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className={styles.section} id="faq">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>FAQ</span>
            <h2 className={styles.sectionTitle}>Questions Business Owners Ask</h2>
          </div>
          <div className={styles.faqList}>
            {FAQS.map((item) => (
              <div key={item.q} className={styles.faqItem}>
                <div className={styles.faqQ}>{item.q}</div>
                <div className={styles.faqA}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Ready to Convert Customer Inquiries into Sales?</h2>
          <p className={styles.ctaSub}>
            Contact the MDA team now to see how we build the right bot for your business.
          </p>
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.ctaBtn}>
            {WA_ICON}
            Contact MDA Team Now
          </a>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Image
            src="/brand/mda-full-logo.png"
            alt="MDA — Master Digital Agency"
            width={100}
            height={32}
            className={styles.footerLogo}
          />
          <p className={styles.footerText}>
            MDA — Master Digital Agency · A brand by DREXONYX
          </p>
        </div>
      </footer>
    </div>
  );
}
