import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import InquiryForm from './InquiryForm';

export const metadata: Metadata = {
  title: 'Emirates Workforce Solutions — Demo',
  robots: { index: false, follow: false },
};

const INDUSTRIES = [
  { title: 'Hospitality', desc: 'Front desk agents, waitstaff, housekeeping, F&B supervisors, and hotel management.', num: '01' },
  { title: 'Retail', desc: 'Store associates, visual merchandisers, floor supervisors, and warehouse operatives.', num: '02' },
  { title: 'Construction & MEP', desc: 'Foremen, electricians, plumbers, HVAC technicians, and civil engineers.', num: '03' },
  { title: 'F&B', desc: 'Chefs, sous chefs, kitchen operatives, and restaurant managers for all cuisine types.', num: '04' },
  { title: 'Healthcare', desc: 'Nursing assistants, patient coordinators, technicians, and administrative staff.', num: '05' },
  { title: 'Facilities Management', desc: 'Building supervisors, security guards, cleaners, and maintenance technicians.', num: '06' },
] as const;

const STEPS = [
  { step: '01', title: 'Brief Us', desc: 'Submit your staffing requirements — roles, headcount, timeline, and any specific visa or nationality needs.' },
  { step: '02', title: 'We Source', desc: 'Our recruiters tap an active database of 40,000+ verified candidates across the GCC and source markets.' },
  { step: '03', title: 'You Select', desc: 'Review shortlisted profiles and conduct interviews. We coordinate scheduling and logistics.' },
  { step: '04', title: 'Onboard', desc: 'We handle visa processing, medical, Emirates ID, and onboarding documentation end to end.' },
] as const;

const TESTIMONIALS = [
  {
    quote: "EWS sourced and onboarded 40 front-of-house staff for our hotel launch in six weeks. Every candidate was pre-screened, visa-ready, and professionally presented. Flawless execution.",
    name: "David R.",
    title: "General Manager — 5-Star Hotel, Downtown Dubai",
  },
  {
    quote: "We've used five recruitment agencies over the years. EWS is the only one that treats manpower as a strategic function, not a transactional one. Our 12-month retention is the highest it's ever been.",
    name: "Priya S.",
    title: "Head of HR — Regional Retail Group, Dubai",
  },
  {
    quote: "Site mobilisation for a 200-worker MEP contract, handled end to end — MOHRE documentation, medical, Emirates ID. Everything completed before day one. Exceptional team.",
    name: "Khalid A.",
    title: "Project Director — Infrastructure & MEP, Abu Dhabi",
  },
] as const;

const STATS = [
  { num: '500+', label: 'Successful Placements' },
  { num: '50+', label: 'Sectors Covered' },
  { num: '48h', label: 'Average Response Time' },
  { num: '95%', label: '12-Month Retention Rate' },
] as const;

export default function ManpowerDemoPage() {
  return (
    <div className={styles.site}>
      {/* Demo banner */}
      <div className={styles.demoBanner}>
        <span>DEMO SITE — Emirates Workforce Solutions · Figures, licences &amp; certifications are illustrative</span>
        <Link href="/mda" className={styles.demoBannerLink}>
          View MDA Packages →
        </Link>
      </div>

      {/* Company header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoBadge}>EWS</span>
            <span className={styles.logoName}>Emirates Workforce Solutions</span>
          </div>
          <nav className={styles.headerNav} aria-label="Company navigation">
            <a href="#industries" className={styles.navLink}>Industries</a>
            <a href="#process" className={styles.navLink}>Our Process</a>
            <a href="#inquiry" className={styles.navLink}>Submit Inquiry</a>
            <a href="#inquiry" className={styles.navCta}>Hire Now</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Manpower & Staffing — UAE & GCC</p>
          <h1 className={styles.heroTitle}>
            The Right People.<br />The Right Roles.<br />On Time.
          </h1>
          <p className={styles.heroSubtitle}>
            Emirates Workforce Solutions places skilled professionals across hospitality,
            retail, construction, and more. Permanent, contract, and mass-hire solutions
            for UAE businesses of every size.
          </p>
          <div className={styles.heroActions}>
            <a href="#inquiry" className={styles.heroBtn}>Submit a Staffing Inquiry</a>
            <a href="#industries" className={styles.heroSecondary}>Industries We Serve ↓</a>
          </div>
        </div>
        <div className={styles.heroImageWrap}>
          <Image
            src="/demos/images/manpower-hero.png"
            alt="Diverse team of UAE workforce professionals in navy uniforms standing in front of a logistics facility with the Dubai skyline at sunset"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center 25%' }}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <div className={styles.heroImageOverlay} aria-hidden="true" />
        </div>
      </section>

      {/* Stats bar */}
      <section className={styles.statsBar}>
        <div className={styles.statsInner}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.statItem}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className={styles.industriesSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Sectors We Serve</p>
          <h2 className={styles.sectionTitle}>Industry Expertise</h2>
          <div className={styles.industriesGrid}>
            {INDUSTRIES.map((ind) => (
              <div key={ind.title} className={styles.industryCard}>
                <span className={styles.industryNum}>{ind.num}</span>
                <h3 className={styles.industryTitle}>{ind.title}</h3>
                <p className={styles.industryDesc}>{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className={styles.processSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>How It Works</p>
          <h2 className={styles.sectionTitle}>From Brief to Onboard in 4 Steps</h2>
          <div className={styles.processGrid}>
            {STEPS.map((step) => (
              <div key={step.step} className={styles.stepCard}>
                <span className={styles.stepNum}>{step.step}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why EWS */}
      <section className={styles.whySection}>
        <div className={styles.whyInner}>
          <div className={styles.whyText}>
            <p className={styles.sectionEyebrow}>Why Choose Us</p>
            <h2 className={styles.sectionTitle}>Your UAE Workforce Partner</h2>
            <p className={styles.whyDesc}>
              Emirates Workforce Solutions is an illustrative example of how a UAE workforce
              specialist operates. Established agencies match UAE employers with qualified talent
              sourced from across the GCC, South Asia, and Southeast Asia — handling sourcing,
              screening, visa processing, medical tests, and onboarding end to end.
            </p>
            <p className={styles.whyDesc}>
              In practice, compliant private employment agencies in the UAE are registered with
              MOHRE (Ministry of Human Resources &amp; Emiratisation), hold a valid agency licence,
              and operate within current UAE employment legislation.
            </p>
            <div className={styles.licenceBadges}>
              {['MOHRE Licensed', 'Federal Employment Law Compliant', 'ISO 9001 Certified', 'Tasheel Partner'].map((b) => (
                <span key={b} className={styles.licenceBadge}>{b}</span>
              ))}
            </div>
            <p className={styles.certNote}>All credentials, figures, and statistics are illustrative of a typical compliant UAE manpower agency.</p>
          </div>
          <div className={styles.whyImageWrap}>
            <Image
              src="/demos/images/manpower-bottom.png"
              alt="Warehouse logistics operations at night with a worker processing parcels in a modern distribution centre"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center center' }}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Inquiry form */}
      <section id="inquiry" className={styles.inquirySection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Get Started</p>
          <h2 className={styles.sectionTitle}>Submit a Staffing Inquiry</h2>
          <p className={styles.inquirySubtitle}>
            Our team will review your requirements and assign a dedicated workforce specialist within 48 hours.
          </p>
          <InquiryForm />
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Client Testimonials — Illustrative</p>
          <h2 className={styles.sectionTitle}>Trusted by UAE Employers</h2>
          <div className={styles.testimonialsGrid}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className={styles.testimonialCard}>
                <p className={styles.testimonialQuote}>{t.quote}</p>
                <div className={styles.testimonialAuthor}>
                  <p className={styles.testimonialName}>{t.name}</p>
                  <p className={styles.testimonialRole}>{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company footer */}
      <footer className={styles.companyFooter}>
        <div className={styles.companyFooterInner}>
          <p className={styles.companyFooterName}>Emirates Workforce Solutions LLC — Dubai, UAE</p>
          <p className={styles.companyFooterSub}>
            This is a demo website created by{' '}
            <Link href="/mda" className={styles.mdaLink}>MDA by DREXONYX</Link>.
          </p>
        </div>
      </footer>
    </div>
  );
}
