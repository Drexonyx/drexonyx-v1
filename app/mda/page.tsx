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

const PORTFOLIO_ITEMS = [
  {
    category: 'Media' as const,
    title: 'UGC Demo Reel',
    desc: 'Short-form video content for social media — produced, directed, and delivered for launch.',
    src: '/portfolio/ugc-demo-reel-thumb.svg',
    width: 1600,
    height: 900,
  },
  {
    category: 'Digital' as const,
    title: 'E-Commerce Launch',
    desc: 'Full digital build — storefront, product pages, checkout, and performance optimisation.',
    src: '/portfolio/ugc-ecommerce-launch-thumb.svg',
    width: 1600,
    height: 900,
  },
  {
    category: 'Creative' as const,
    title: 'Product Feature Ad',
    desc: 'Static feed creative for paid social — designed for scroll-stopping visibility and conversion.',
    src: '/portfolio/static-feed-ad-product-feature.svg',
    width: 1080,
    height: 1080,
  },
  {
    category: 'Business Solutions' as const,
    title: 'Campaign Strategy',
    desc: 'End-to-end campaign brief and market positioning — from audience mapping to launch plan.',
    src: '/portfolio/campaign-brief-sample.svg',
    width: 1600,
    height: 900,
  },
] as const;

const PACKAGES = [
  {
    tier: 'STARTER',
    price: 'AED 599',
    tagline: 'Get online. Look professional.',
    featured: false,
    items: [
      'Static website, up to 5 pages',
      'Mobile-responsive design',
      'Contact form & location map',
      'Menu or services section',
      '1 maintenance round per month',
    ],
    href: '/start-project',
  },
  {
    tier: 'PROFESSIONAL',
    price: 'AED 899',
    tagline: 'Ongoing support. More capability.',
    featured: true,
    items: [
      'Monthly maintenance included',
      'CMS-powered, up to 10 pages',
      'Booking or enquiry integrations',
      'SEO setup & analytics',
      'Everything in Starter',
    ],
    href: '/start-project',
  },
  {
    tier: 'PREMIUM',
    price: 'AED 1,899',
    tagline: 'Custom build. One year of support.',
    featured: false,
    items: [
      'Custom design & brand identity essentials',
      'Unlimited pages & advanced integrations',
      'Performance & SEO optimisation',
      '1 year maintenance — multiple rounds',
      'Launch support & full handover',
    ],
    href: '/start-project',
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

const MDA_NAV_CATS = ['Digital', 'Creative', 'Media', 'Business Solutions'] as const;

export default function MDAPage() {
  return (
    <>
      {/* ── 1: MDA Brand Header ─────────────────────────────────────────────── */}
      <section className={styles.mdaHeader} aria-label="MDA brand identity">
        <div className={styles.container}>
          <div className={styles.mdaHeaderInner}>
            <MDALogo size="lg" showEndorsement assetSrc="/mda/mda-logo.svg" />
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
          <p className={styles.heroEyebrow}>Full-Service Commercial Agency · Dubai &amp; UAE</p>
          <h1 id="mda-hero-heading" className={styles.heroHeading}>
            DIGITAL.{' '}
            <span className={styles.heroAccentGold}>CREATIVE.</span>
            <br className={styles.heroBreak} />
            MEDIA.{' '}
            <span className={styles.heroAccentBlue}>SOLUTIONS.</span>
          </h1>
          <p className={styles.heroSub}>
            One agency. Every dimension of your business.
            <br />
            From strategy to execution — we build, design, produce, and deliver.
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

      {/* ── 4: Selected Work ────────────────────────────────────────────────── */}
      <section id="work" className={styles.portfolio} aria-labelledby="portfolio-heading">
        <div className={styles.container}>
          <SectionHeading
            eyebrow="Selected Work"
            title="Built by MDA."
          />
          <div className={styles.portfolioGrid}>
            {PORTFOLIO_ITEMS.map((item) => (
              <div key={item.title} className={styles.portfolioCard}>
                <div className={styles.portfolioThumb}>
                  <Image
                    src={item.src}
                    alt={item.title}
                    width={item.width}
                    height={item.height}
                    className={styles.portfolioImg}
                  />
                </div>
                <div className={styles.portfolioMeta}>
                  <span className={styles.portfolioCat}>{item.category}</span>
                  <h3 className={styles.portfolioTitle}>{item.title}</h3>
                  <p className={styles.portfolioDesc}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5: Packages ─────────────────────────────────────────────────────── */}
      <section id="packages" className={styles.packages} aria-labelledby="packages-heading">
        <div className={styles.container}>
          <SectionHeading
            eyebrow="Commercial Packages"
            title="Professional websites. Fixed price."
            description="Transparent pricing, no hidden costs, no scope creep. Every package is delivered by the same team that builds enterprise products."
          />
          <div className={styles.packagesGrid}>
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.tier}
                className={[
                  styles.packageCard,
                  pkg.featured ? styles.packageCardFeatured : '',
                ].filter(Boolean).join(' ')}
              >
                {pkg.featured && (
                  <div className={styles.packageBadge}>MOST POPULAR</div>
                )}
                <div className={styles.packageTop}>
                  <p className={styles.packageTier}>{pkg.tier}</p>
                  <p className={styles.packagePrice}>{pkg.price}</p>
                  <p className={styles.packageTagline}>{pkg.tagline}</p>
                </div>
                <ul className={styles.packageItems} role="list">
                  {pkg.items.map((item) => (
                    <li key={item} className={styles.packageItem}>
                      <span className={styles.packageCheck} aria-hidden="true">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className={styles.packageFooter}>
                  <CTAButton
                    href={pkg.href}
                    variant={pkg.featured ? 'primary' : 'outline'}
                    size="md"
                  >
                    GET STARTED →
                  </CTAButton>
                </div>
              </div>
            ))}
          </div>

          {/* Restaurant website spotlight — approved poster */}
          <div className={styles.posterSpotlight}>
            <div className={styles.posterSpotlightContent}>
              <p className={styles.posterSpotlightEyebrow}>Featured Offer</p>
              <h2 className={styles.posterSpotlightHeading}>
                Your Restaurant Website.
                <br />
                <span className={styles.posterSpotlightAccent}>AED 599.</span>
              </h2>
              <p className={styles.posterSpotlightDesc}>
                A complete, professional restaurant website — fully designed, built, and launched.
                Menu, gallery, reservations, location. Everything your guests need to find you and
                come back.
              </p>
              <div className={styles.posterSpotlightCtas}>
                <CTAButton href="/start-project" variant="primary" size="md">
                  GET STARTED →
                </CTAButton>
                <CTAButton href="/start-project" variant="outline" size="md">
                  See What&apos;s Included
                </CTAButton>
              </div>
            </div>
            <div className={styles.posterSpotlightPoster}>
              <Image
                src="/mda/MDA_MASTER_POSTER_01_RESTAURANT_WEBSITE_AED599.jpg"
                alt="MDA Restaurant Website package — AED 599 — professional website design for restaurants"
                width={1024}
                height={1536}
                className={styles.posterSpotlightImg}
                quality={85}
              />
            </div>
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
            <MDALogo size="sm" showEndorsement assetSrc="/mda/mda-logo.svg" />
            <nav className={styles.mdaFooterNav} aria-label="MDA footer navigation">
              <ul className={styles.mdaFooterLinks} role="list">
                <li>
                  <Link href="/start-project" className={styles.mdaFooterLink}>
                    Start a Project
                  </Link>
                </li>
                <li>
                  <Link href="#services" className={styles.mdaFooterLink}>
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="#work" className={styles.mdaFooterLink}>
                    Work
                  </Link>
                </li>
                <li>
                  <Link href="#packages" className={styles.mdaFooterLink}>
                    Packages
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
