import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import QuoteForm from './QuoteForm';

export const metadata: Metadata = {
  title: 'BrightSpace Cleaning — Demo',
  robots: { index: false, follow: false },
};

const SERVICES = [
  { title: 'Daily Office Cleaning', desc: 'Consistent, discreet cleaning crews that work around your schedule — early morning or after hours.', icon: '🏢' },
  { title: 'Deep Cleaning', desc: 'Full facility deep cleans: sanitation, descaling, grout treatment, and hard-to-reach areas.', icon: '🧼' },
  { title: 'Post-Construction Clean', desc: 'Specialist dust extraction, debris removal, and surface polishing after handover.', icon: '🔧' },
  { title: 'Carpet & Upholstery', desc: 'Hot-water extraction and dry cleaning for carpets, rugs, sofas, and workstation chairs.', icon: '🛋️' },
  { title: 'Window & Facade', desc: 'Interior and exterior window cleaning for commercial buildings up to 12 storeys.', icon: '🪟' },
  { title: 'Move-In / Move-Out', desc: 'Thorough end-of-tenancy and new-property cleans accepted and signed off by building management.', icon: '📦' },
] as const;

const STATS = [
  { num: '480+', label: 'Clients Served' },
  { num: '15+', label: 'Years in Dubai' },
  { num: '98%', label: 'Renewal Rate' },
] as const;

export default function CleaningDemoPage() {
  return (
    <div className={styles.site}>
      {/* Demo banner */}
      <div className={styles.demoBanner}>
        <span>DEMO SITE — BrightSpace Cleaning</span>
        <Link href="/mda" className={styles.demoBannerLink}>
          View MDA Packages →
        </Link>
      </div>

      {/* Company header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoBadge}>BS</span>
            <span className={styles.logoName}>BrightSpace Cleaning</span>
          </div>
          <nav className={styles.headerNav} aria-label="Company navigation">
            <a href="#services" className={styles.navLink}>Services</a>
            <a href="#about" className={styles.navLink}>About</a>
            <a href="#quote" className={styles.navLink}>Get a Quote</a>
            <a href="#contact" className={styles.navCta}>Contact Us</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Commercial Cleaning — Dubai & UAE</p>
          <h1 className={styles.heroTitle}>
            Spotless. Professional.<br />Every Single Visit.
          </h1>
          <p className={styles.heroSubtitle}>
            BrightSpace delivers reliable commercial cleaning for offices, retail spaces,
            and hospitality properties across Dubai. Fully trained, insured, and trusted
            by 480+ businesses.
          </p>
          <div className={styles.heroActions}>
            <a href="#quote" className={styles.heroBtn}>Get a Free Quote</a>
            <a href="#services" className={styles.heroSecondary}>Our Services ↓</a>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true" />
      </section>

      {/* Trust stats */}
      <section className={styles.trustBar}>
        <div className={styles.trustInner}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.trustStat}>
              <span className={styles.trustNum}>{s.num}</span>
              <span className={styles.trustLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className={styles.servicesSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>What We Offer</p>
          <h2 className={styles.sectionTitle}>Commercial Cleaning Services</h2>
          <div className={styles.servicesGrid}>
            {SERVICES.map((s) => (
              <div key={s.title} className={styles.serviceCard}>
                <span className={styles.serviceIcon}>{s.icon}</span>
                <h3 className={styles.serviceTitle}>{s.title}</h3>
                <p className={styles.serviceDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutInner}>
          <div className={styles.aboutVisual} aria-hidden="true" />
          <div className={styles.aboutText}>
            <p className={styles.sectionEyebrow}>Why BrightSpace</p>
            <h2 className={styles.sectionTitle}>Trusted by Dubai Businesses Since 2009</h2>
            <p className={styles.aboutDesc}>
              We were founded in 2009 with a simple belief: commercial cleaning should be
              consistent, professional, and never disruptive to your operations. Today, we
              serve everything from boutique co-working spaces to multi-floor corporate towers.
            </p>
            <p className={styles.aboutDesc}>
              All BrightSpace operatives are HABC-certified, uniformed, and background-checked.
              We carry full public liability insurance and operate fully within the Dubai Municipality
              and Abu Dhabi Environment Agency cleaning sector guidelines.
            </p>
            <ul className={styles.trustPoints}>
              {[
                'ISO 9001 Quality Certified',
                'Dubai Municipality Licensed',
                'Full Public Liability Insurance',
                '24 / 7 client support line',
              ].map((p) => (
                <li key={p} className={styles.trustPoint}>
                  <span className={styles.trustCheck}>✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quote form */}
      <section id="quote" className={styles.quoteSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Get Started</p>
          <h2 className={styles.sectionTitle}>Request a Free Quote</h2>
          <p className={styles.quoteSubtitle}>
            Fill in the form and our team will come back within 24 hours with a tailored proposal.
          </p>
          <QuoteForm />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.sectionInner}>
          <div className={styles.contactGrid}>
            <div>
              <p className={styles.contactLead}>Prefer to talk? We&apos;re easy to reach.</p>
              <div className={styles.contactMethods}>
                <div className={styles.contactItem}>
                  <span>📱</span>
                  <span>+971 50 234 5678 (WhatsApp)</span>
                </div>
                <div className={styles.contactItem}>
                  <span>📞</span>
                  <span>+971 4 234 5678 (Office)</span>
                </div>
                <div className={styles.contactItem}>
                  <span>📍</span>
                  <span>Business Bay, Dubai, UAE</span>
                </div>
              </div>
            </div>
            <div className={styles.socialBlock}>
              <p className={styles.socialLabel}>Follow Us</p>
              <div className={styles.socialLinks}>
                {['LinkedIn', 'Instagram', 'Facebook'].map((s) => (
                  <span key={s} className={styles.socialChip}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company footer */}
      <footer className={styles.companyFooter}>
        <div className={styles.companyFooterInner}>
          <p className={styles.companyFooterName}>BrightSpace Cleaning LLC</p>
          <p className={styles.companyFooterSub}>
            This is a demo website created by{' '}
            <Link href="/mda" className={styles.mdaLink}>MDA by DREXONYX</Link>.
          </p>
        </div>
      </footer>
    </div>
  );
}
