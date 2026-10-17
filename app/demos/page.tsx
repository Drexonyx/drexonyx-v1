import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Demo Sites — MDA Packages',
  description: 'Preview of MDA website packages — Starter AED 599, Business AED 899, and Premium AED 1,899.',
  robots: { index: false, follow: false },
};

const DEMOS = [
  {
    slug: 'construction',
    package: 'Starter',
    price: 'AED 599',
    sector: 'Construction',
    company: 'AlNoor Contracting',
    description:
      'Static landing page with company branding, services overview, project showcase, and WhatsApp contact.',
    accent: '#f97316',
    badge: 'A',
    features: ['Static landing page', 'Services & projects', 'WhatsApp button', 'Mobile responsive'],
  },
  {
    slug: 'cleaning',
    package: 'Business',
    price: 'AED 899',
    sector: 'Commercial Cleaning',
    company: 'BrightSpace Cleaning',
    description:
      'Structured business site with service grid, trust indicators, quote request form, and contact info.',
    accent: '#0d9488',
    badge: 'B',
    features: ['Service grid', 'Quote request form', 'Trust badges', 'Social links'],
  },
  {
    slug: 'manpower',
    package: 'Premium',
    price: 'AED 1,899',
    sector: 'Manpower & Staffing',
    company: 'Emirates Workforce Solutions',
    description:
      'Full corporate site with industry sectors, 4-step process, statistics, and an inquiry form.',
    accent: '#c9a227',
    badge: 'C',
    features: ['Industry sectors', 'Process steps', 'Stats & credibility', 'Inquiry form', '1-year maintenance'],
  },
] as const;

export default function DemosPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>MDA by DREXONYX</p>
        <h1 className={styles.title}>Demo Websites</h1>
        <p className={styles.subtitle}>
          Three real-quality demo sites showing exactly what each MDA package delivers. Use these
          to show prospective clients what their website will look and feel like.
        </p>
      </div>

      <div className={styles.grid}>
        {DEMOS.map((demo) => (
          <div
            key={demo.slug}
            className={styles.card}
            style={{ '--demo-accent': demo.accent } as React.CSSProperties}
          >
            <div className={styles.cardHeader}>
              <span className={styles.badge}>{demo.badge}</span>
              <span className={styles.packageTag}>{demo.package}</span>
              <span className={styles.price}>{demo.price}</span>
            </div>
            <h2 className={styles.cardTitle}>{demo.company}</h2>
            <p className={styles.sector}>{demo.sector}</p>
            <p className={styles.cardDesc}>{demo.description}</p>
            <ul className={styles.featureList}>
              {demo.features.map((f) => (
                <li key={f} className={styles.featureItem}>
                  <span className={styles.featureCheck}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href={`/demos/${demo.slug}`} className={styles.viewBtn}>
              View Demo →
            </Link>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <p>
          These demos are created by{' '}
          <Link href="/mda" className={styles.footerLink}>
            Master Digital Agency (MDA)
          </Link>{' '}
          — a DREXONYX brand.
        </p>
        <Link href="/mda#packages" className={styles.packagesLink}>
          See all MDA packages →
        </Link>
      </div>
    </div>
  );
}
