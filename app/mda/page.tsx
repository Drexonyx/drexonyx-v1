import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  MDALogo,
  ServiceCard,
  CTAButton,
  SectionHeading,
  EndorsementFooter,
} from '@/components/mda';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'MDA — Master Digital Agency',
  description:
    'MDA — Master Digital Agency. We build, design, automate and elevate businesses across Digital, Creative, Media, and Business Solutions. A DREXONYX Brand.',
  keywords: [
    'digital agency', 'creative agency', 'media agency', 'business solutions',
    'Dubai', 'UAE', 'web design', 'branding', 'digital marketing', 'video production',
  ],
  openGraph: {
    title: 'MDA — Master Digital Agency',
    description:
      'We build, design, automate and elevate businesses. Digital · Creative · Media · Business Solutions. A DREXONYX Brand.',
    images: [
      {
        url: '/mda/MDA_MASTER_POSTER_01_RESTAURANT_WEBSITE_AED599.jpg',
        width: 1024,
        height: 1536,
        alt: 'MDA — Master Digital Agency',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MDA — Master Digital Agency',
    description: 'We build, design, automate and elevate businesses. A DREXONYX Brand.',
  },
};

const SERVICES = [
  {
    category: 'Digital' as const,
    title: 'Digital Solutions',
    description:
      'Websites, web applications, automation systems, and digital infrastructure — built to perform and scale with your business.',
    href: '/start-project',
    ctaLabel: 'Start Digital →',
  },
  {
    category: 'Creative' as const,
    title: 'Creative Services',
    description:
      'Brand identity, visual design, UI/UX, and content creation — crafted to command attention and build lasting recognition.',
    href: '/start-project',
    ctaLabel: 'Start Creative →',
  },
  {
    category: 'Media' as const,
    title: 'Media Production',
    description:
      'Video production, photography, social content, and digital advertising — media built to move your audience and drive action.',
    href: '/start-project',
    ctaLabel: 'Start Media →',
  },
  {
    category: 'Business Solutions' as const,
    title: 'Business Solutions',
    description:
      'Strategy, operations, growth systems, and business intelligence — the infrastructure that turns vision into measurable results.',
    href: '/start-project',
    ctaLabel: 'Get Started →',
  },
] as const;

const PROCESS_STEPS = [
  {
    step: '01',
    label: 'DISCOVER',
    desc: 'We map your goals, market, and opportunity — then define a clear scope and strategy before anything is built.',
  },
  {
    step: '02',
    label: 'DESIGN',
    desc: 'Every touchpoint is crafted for your brand — visual identity, UX, and messaging aligned to your audience.',
  },
  {
    step: '03',
    label: 'BUILD',
    desc: 'We execute with precision — code, content, and production delivered on brief, on schedule, and to spec.',
  },
  {
    step: '04',
    label: 'LAUNCH',
    desc: 'Go live with confidence. We deploy, test, and optimise for performance and results from day one.',
  },
];

const WHY_ITEMS = [
  {
    label: 'Full-Stack Agency',
    desc: 'Digital, creative, media, and strategy under one roof. No fragmented hand-offs, no gaps.',
  },
  {
    label: 'Built for the UAE',
    desc: 'Local expertise, global execution standards. We understand Dubai and the GCC market inside out.',
  },
  {
    label: 'One Team, One Vision',
    desc: 'Your account team stays consistent from brief to delivery — the people you speak to are the people building.',
  },
  {
    label: 'Results-First Thinking',
    desc: 'Every decision — design, copy, technology — is made in service of business outcomes, not aesthetics alone.',
  },
];

const MDA_NAV_CATS = ['Digital', 'Creative', 'Media', 'Business Solutions'] as const;

export default function MDAPage() {
  return (
    <>
      {/* ── 1: MDA Brand Header ─────────────────────────────────────────────── */}
      <section className={styles.mdaHeader} aria-label="MDA brand identity">
        <div className={styles.container}>
          <div className={styles.mdaHeaderInner}>
            <MDALogo size="lg" showEndorsement />
            <nav className={styles.mdaCatNav} aria-label="MDA service categories">
              <ul className={styles.mdaCatList} role="list">
                {MDA_NAV_CATS.map((cat) => (
                  <li key={cat}>
                    <Link href="/start-project" className={styles.mdaCatLink}>
                      {cat}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/about" className={styles.mdaCatLink}>
                    About
                  </Link>
                </li>
              </ul>
              <CTAButton href="/start-project" variant="primary" size="sm">
                Start a Project
              </CTAButton>
            </nav>
          </div>
        </div>
      </section>

      {/* ── 2: Hero ─────────────────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="mda-hero-heading">
        <div className={styles.container}>
          <p className={styles.heroEyebrow}>Digital · Creative · Media · Business Solutions</p>
          <h1 id="mda-hero-heading" className={styles.heroHeading}>
            DIGITAL.{' '}
            <span className={styles.heroAccentGold}>CREATIVE.</span>
            <br className={styles.heroBreak} />
            MEDIA.{' '}
            <span className={styles.heroAccentBlue}>SOLUTIONS.</span>
          </h1>
          <p className={styles.heroSub}>
            We build, design, automate and elevate businesses.
            <br />
            Full-service. Strategy to execution. One team.
          </p>
          <div className={styles.heroCtas}>
            <CTAButton href="/start-project" variant="primary" size="lg">
              START YOUR PROJECT →
            </CTAButton>
            <CTAButton href="#services" variant="secondary" size="lg">
              EXPLORE SERVICES
            </CTAButton>
          </div>
          <div className={styles.heroEndorsement}>
            <EndorsementFooter />
          </div>
        </div>
      </section>

      {/* ── 3: Services ─────────────────────────────────────────────────────── */}
      <section id="services" className={styles.services} aria-labelledby="services-heading">
        <div className={styles.container}>
          <SectionHeading
            eyebrow="What We Do"
            title="Four pillars. One agency."
            description="MDA delivers across every dimension of the modern business — digital infrastructure, creative output, media production, and strategic growth. Pick one or bring us the full brief."
          />
          <div className={styles.servicesGrid}>
            {SERVICES.map((svc) => (
              <ServiceCard
                key={svc.category}
                category={svc.category}
                title={svc.title}
                description={svc.description}
                href={svc.href}
                ctaLabel={svc.ctaLabel}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 4: Featured Commercial Offer ────────────────────────────────────── */}
      <section className={styles.offer} aria-labelledby="offer-heading">
        <div className={styles.container}>
          <div className={styles.offerInner}>
            <div className={styles.offerContent}>
              <p className={styles.offerEyebrow}>Featured Offer</p>
              <h2 id="offer-heading" className={styles.offerHeading}>
                Your Restaurant Website.
                <br />
                <span className={styles.offerAccent}>AED 599.</span>
              </h2>
              <p className={styles.offerDesc}>
                A complete, professional restaurant website — fully designed, built, and launched.
                Menu, gallery, reservations, location. Everything your guests need to find you and
                come back.
              </p>
              <div className={styles.offerCtas}>
                <CTAButton href="/start-project" variant="primary" size="md">
                  GET STARTED →
                </CTAButton>
                <CTAButton href="/start-project" variant="outline" size="md">
                  See What&apos;s Included
                </CTAButton>
              </div>
            </div>
            <div className={styles.offerPoster}>
              <Image
                src="/mda/MDA_MASTER_POSTER_01_RESTAURANT_WEBSITE_AED599.jpg"
                alt="MDA Restaurant Website package — AED 599 — professional website design for restaurants"
                width={1024}
                height={1536}
                className={styles.offerPosterImg}
                quality={85}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 5: Why MDA ──────────────────────────────────────────────────────── */}
      <section className={styles.why} aria-labelledby="why-heading">
        <div className={styles.container}>
          <SectionHeading
            eyebrow="Why MDA"
            title="The agency built for what you actually need."
          />
          <div className={styles.whyGrid}>
            {WHY_ITEMS.map((item) => (
              <div key={item.label} className={styles.whyCard}>
                <div className={styles.whyDot} aria-hidden="true" />
                <h3 className={styles.whyLabel}>{item.label}</h3>
                <p className={styles.whyDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6: Process ──────────────────────────────────────────────────────── */}
      <section className={styles.process} aria-labelledby="process-heading">
        <div className={styles.container}>
          <SectionHeading
            eyebrow="How We Work"
            title="From brief to launch — a process you can trust."
          />
          <ol className={styles.processSteps} role="list">
            {PROCESS_STEPS.map((s) => (
              <li key={s.step} className={styles.processStep}>
                <span className={styles.processNum} aria-hidden="true">
                  {s.step}
                </span>
                <div className={styles.processBody}>
                  <h3 className={styles.processLabel}>{s.label}</h3>
                  <p className={styles.processDesc}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 7: CTA ──────────────────────────────────────────────────────────── */}
      <section className={styles.cta} aria-labelledby="cta-heading">
        <div className={styles.container}>
          <div className={styles.ctaInner}>
            <h2 id="cta-heading" className={styles.ctaHeading}>
              READY TO BUILD
              <br />
              <span className={styles.ctaAccent}>WHAT&apos;S NEXT?</span>
            </h2>
            <p className={styles.ctaSub}>
              Tell us what you need. We&apos;ll tell you how we can help — and how fast.
            </p>
            <CTAButton href="/start-project" variant="primary" size="lg">
              START YOUR PROJECT →
            </CTAButton>
            <div className={styles.ctaEndorsement}>
              <EndorsementFooter showBrandName />
            </div>
          </div>
        </div>
      </section>

      {/* ── 8: MDA Brand Footer ─────────────────────────────────────────────── */}
      <footer className={styles.mdaFooter} aria-label="MDA brand footer">
        <div className={styles.container}>
          <div className={styles.mdaFooterInner}>
            <MDALogo size="sm" showEndorsement />
            <nav className={styles.mdaFooterNav} aria-label="MDA footer navigation">
              <ul className={styles.mdaFooterLinks} role="list">
                <li>
                  <Link href="/start-project" className={styles.mdaFooterLink}>
                    Start a Project
                  </Link>
                </li>
                <li>
                  <Link href="/services" className={styles.mdaFooterLink}>
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio" className={styles.mdaFooterLink}>
                    Portfolio
                  </Link>
                </li>
                <li>
                  <Link href="/about" className={styles.mdaFooterLink}>
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className={styles.mdaFooterLink}>
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <p className={styles.mdaFooterLegal}>
            © {new Date().getFullYear()} MDA — Master Digital Agency. A DREXONYX Brand.
          </p>
        </div>
      </footer>
    </>
  );
}
