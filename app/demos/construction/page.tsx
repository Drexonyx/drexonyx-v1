import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'AlNoor Contracting — Demo',
  robots: { index: false, follow: false },
};

const SERVICES = [
  {
    title: 'General Contracting',
    desc: 'Full project management from groundbreaking to handover. We coordinate all trades and ensure on-time, on-budget delivery.',
  },
  {
    title: 'Villa Construction',
    desc: 'Custom residential builds to your specification. Structural, MEP, and finishing under one contract.',
  },
  {
    title: 'Fit-Out & Renovation',
    desc: 'Commercial and residential interiors. Partitioning, flooring, ceilings, MEP, and FF&E installation.',
  },
  {
    title: 'Civil Works',
    desc: 'Site preparation, foundations, retaining walls, and infrastructure works across the UAE.',
  },
] as const;

const PROJECTS = [
  {
    name: 'Al Barsha Villa Complex',
    type: 'Residential',
    year: '2024',
    size: '12,000 sqft',
    src: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=75',
    alt: 'Modern white villa with clean architectural lines',
  },
  {
    name: 'Deira Logistics Hub',
    type: 'Commercial',
    year: '2023',
    size: '8,500 sqft',
    src: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=75',
    alt: 'Contemporary glass commercial building exterior',
  },
  {
    name: 'JVC Townhouse Development',
    type: 'Residential',
    year: '2024',
    size: '24,000 sqft',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=75',
    alt: 'Row of modern townhouses with landscaping',
  },
] as const;

export default function ConstructionDemoPage() {
  return (
    <div className={styles.site}>
      {/* Demo banner */}
      <div className={styles.demoBanner}>
        <span>DEMO SITE — AlNoor Contracting · Figures, project names &amp; certifications are illustrative</span>
        <Link href="/mda" className={styles.demoBannerLink}>
          View MDA Packages →
        </Link>
      </div>

      {/* Company header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoBadge}>AN</span>
            <span className={styles.logoName}>AlNoor Contracting</span>
          </div>
          <nav className={styles.headerNav} aria-label="Company navigation">
            <a href="#services" className={styles.navLink}>Services</a>
            <a href="#projects" className={styles.navLink}>Projects</a>
            <a href="#about" className={styles.navLink}>About</a>
            <a href="#contact" className={styles.navCta}>Get a Quote</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Building UAE Since 1998</p>
          <h1 className={styles.heroTitle}>
            We Build What<br />Dubai Demands
          </h1>
          <p className={styles.heroSubtitle}>
            Full-scope construction, villa builds, and commercial fit-outs across the UAE.
            Quality workmanship, transparent pricing, on-time delivery.
          </p>
          <div className={styles.heroActions}>
            <a href="#contact" className={styles.heroBtn}>Request a Quote</a>
            <a href="#projects" className={styles.heroSecondary}>View Our Work ↓</a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>26+</span>
              <span className={styles.statLabel}>Years in UAE</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>340+</span>
              <span className={styles.statLabel}>Projects Completed</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>AED 2B+</span>
              <span className={styles.statLabel}>Total Contract Value</span>
            </div>
          </div>
        </div>
        <div className={styles.heroImageWrap}>
          <Image
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80"
            alt="Construction workers on an active building site at golden hour"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <div className={styles.heroImageOverlay} aria-hidden="true" />
        </div>
      </section>

      {/* Services */}
      <section id="services" className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>What We Offer</p>
          <h2 className={styles.sectionTitle}>Our Services</h2>
          <div className={styles.servicesGrid}>
            {SERVICES.map((s) => (
              <div key={s.title} className={styles.serviceCard}>
                <h3 className={styles.serviceTitle}>{s.title}</h3>
                <p className={styles.serviceDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="projects" className={styles.sectionDark}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Recent Work</p>
          <h2 className={styles.sectionTitle}>Featured Projects</h2>
          <div className={styles.projectsGrid}>
            {PROJECTS.map((p) => (
              <div key={p.name} className={styles.projectCard}>
                <div className={styles.projectImageWrap}>
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className={styles.projectInfo}>
                  <span className={styles.projectType}>{p.type}</span>
                  <h3 className={styles.projectName}>{p.name}</h3>
                  <p className={styles.projectMeta}>{p.size} · {p.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutInner}>
          <div className={styles.aboutText}>
            <p className={styles.sectionEyebrow}>Who We Are</p>
            <h2 className={styles.sectionTitle}>Built on Trust,<br />Delivered with Precision</h2>
            <p className={styles.aboutDesc}>
              AlNoor Contracting was founded in Dubai in 1998. For over two decades, we have
              delivered residential and commercial construction projects across the UAE, building
              a reputation for quality materials, skilled tradespeople, and honest project management.
            </p>
            <p className={styles.aboutDesc}>
              All our works are fully compliant with Dubai Municipality and Trakhees regulations.
              We hold ISO 9001 certification and are registered with the Dubai Contractors List, Grade A.
            </p>
            <div className={styles.certs}>
              {['ISO 9001', 'Dubai Municipality Approved', 'Grade A Contractor', 'Trakhees Certified'].map((c) => (
                <span key={c} className={styles.certBadge}>{c}</span>
              ))}
            </div>
          </div>
          <div className={styles.aboutImageWrap}>
            <Image
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80"
              alt="Construction team working on a structural project"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Get in Touch</p>
          <h2 className={styles.sectionTitle}>Request a Free Quote</h2>
          <div className={styles.contactGrid}>
            <div className={styles.contactCard}>
              <p className={styles.contactLabel}>WhatsApp</p>
              <p className={styles.contactValue}>+971 50 123 4567</p>
              <p className={styles.contactNote}>Available 8am – 6pm, Sat–Thu</p>
            </div>
            <div className={styles.contactCard}>
              <p className={styles.contactLabel}>Office Line</p>
              <p className={styles.contactValue}>+971 4 123 4567</p>
              <p className={styles.contactNote}>Al Quoz Industrial Area 2</p>
            </div>
            <div className={styles.contactCard}>
              <p className={styles.contactLabel}>Showroom</p>
              <p className={styles.contactValue}>Al Quoz, Dubai, UAE</p>
              <p className={styles.contactNote}>Open Sat–Thu, 8am – 6pm</p>
            </div>
          </div>
        </div>
      </section>

      {/* Company footer */}
      <footer className={styles.companyFooter}>
        <div className={styles.companyFooterInner}>
          <p className={styles.companyFooterName}>AlNoor Contracting LLC</p>
          <p className={styles.companyFooterSub}>
            This is a demo website created by{' '}
            <Link href="/mda" className={styles.mdaLink}>MDA by DREXONYX</Link>.
          </p>
        </div>
      </footer>
    </div>
  );
}
