// DR-0130: MDA Social Commerce landing page — /social-seller
// Phase 5-6: Arabic redesign, MDA branding, honest platform claims.
// Only WhatsApp and website chat are verified working integrations.

import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'بوت المبيعات الذكي — MDA | Master Digital Agency',
  description:
    'حوّل محادثاتك إلى مبيعات حقيقية مع بوت ذكي مدرّب على نشاطك التجاري. يرد على عملاءك 24/7 عبر واتساب وموقعك الإلكتروني. 299 درهم شهرياً.',
  openGraph: {
    title: 'بوت المبيعات الذكي — MDA',
    description: 'بوت ذكي مخصص لنشاطك التجاري. محادثات تتحوّل إلى مبيعات. 299 درهم/شهر.',
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
    name: 'متاح 24/7',
    desc: 'البوت لا ينام ولا يفوّت رسالة — عملاؤك يحصلون على رد فوري في أي وقت.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    name: 'عربي وإنجليزي',
    desc: 'يكتشف لغة العميل تلقائياً ويرد بنفس اللغة — عربي أو إنجليزي بطلاقة.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
    name: 'مدرّب على نشاطك',
    desc: 'ندرّب البوت على خدماتك وأسعارك وأوقات عملك — يعرف نشاطك من الداخل.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    name: 'يُسلّم العملاء الجادّين',
    desc: 'يصفّي الاستفسارات ويرسل العملاء المؤهّلين مباشرةً على واتساپك جاهزين للإغلاق.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    name: 'يبدأ في 24 ساعة',
    desc: 'نتولى الإعداد الكامل. البوت يعمل خلال يوم عمل واحد بدون أي جهد منك.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    name: 'بدون خبرة تقنية',
    desc: 'لا تحتاج موقعاً أو مطوّراً. البوت يعمل على منصّاتك وواتساپك الحالية.',
  },
];

// Honest platform display — only show verified working integrations.
const PLATFORMS = [
  { name: 'واتساب', label: 'متاح الآن', available: true },
  { name: 'موقع إلكتروني', label: 'متاح الآن', available: true },
  { name: 'إنستغرام', label: 'قريباً', available: false },
  { name: 'تيك توك', label: 'قريباً', available: false },
  { name: 'فيسبوك', label: 'قريباً', available: false },
];

const INDUSTRIES = [
  { emoji: '🍽️', name: 'مطاعم وكافيهات', example: 'قائمة الطعام، الحجوزات، التوصيل' },
  { emoji: '💇', name: 'صالونات وسبا', example: 'الحجوزات، الخدمات، الأسعار' },
  { emoji: '🏥', name: 'عيادات وصيدليات', example: 'المواعيد، الخدمات، الموقع' },
  { emoji: '🛍️', name: 'متاجر إلكترونية', example: 'المنتجات، الطلبات، الشحن' },
  { emoji: '🏠', name: 'عقارات', example: 'العروض، المواعيد، الأسعار' },
  { emoji: '📚', name: 'تعليم وكورسات', example: 'المناهج، التسجيل، الجدول' },
  { emoji: '⚙️', name: 'خدمات مهنية', example: 'الاستفسارات، التسعير، التواصل' },
];

const STEPS = [
  {
    num: '١',
    title: 'أخبرنا عن نشاطك',
    desc: 'أرسل لنا خدماتك وأسعارك وأوقات عملك عبر واتساب — بسيطة ومباشرة.',
  },
  {
    num: '٢',
    title: 'ندرّب البوت الخاص بك',
    desc: 'فريقنا يدرّب بوتاً مخصصاً على نشاطك — يعرف منتجاتك وأسلوبك.',
  },
  {
    num: '٣',
    title: 'يبدأ في 24 ساعة',
    desc: 'بوت المبيعات يرد على عملاءك بينما تركّز أنت على تطوير نشاطك.',
  },
];

const WA_TEXT = encodeURIComponent(
  'مرحباً فريق MDA 👋\nأريد الاشتراك في بوت المبيعات الذكي\n\nالخطة: الأساسية 299 درهم/شهر',
);
const WA_HREF = `https://wa.me/971585806534?text=${WA_TEXT}`;

export default function SocialSellerPage() {
  return (
    <div className={styles.page}>
      {/* ── MDA Header ──────────────────────────────────────────────── */}
      <header className={styles.mdaHeader}>
        <div className={styles.inner}>
          <Image
            src="/brand/mda-full-logo.png"
            alt="MDA — Master Digital Agency"
            width={140}
            height={44}
            className={styles.mdaLogo}
            priority
          />
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.heroLayout}>
            <div className={styles.heroText}>
              <span className={styles.heroEyebrow}>
                <span className={styles.heroEyebrowDot} />
                بوت المبيعات الذكي من MDA
              </span>

              <h1 className={styles.heroTitle}>
                حوّل محادثاتك إلى<br />
                <span className={styles.heroAccent}>عملاء ومبيعات حقيقية</span>
              </h1>

              <p className={styles.heroSub}>
                بوت ذكي مدرّب على نشاطك التجاري. يرد على عملاءك، يجيب على أسئلتهم،
                ويحوّل المحادثات إلى مبيعات — على مدار الساعة.
              </p>

              <div className={styles.heroCta}>
                <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  ابدأ بـ 299 درهم/شهر
                </a>
                <a href="#demo" className={styles.btnSecondary}>
                  جرّب البوت مباشرةً ↓
                </a>
              </div>
            </div>

            <div className={styles.heroChatWrap}>
              <div className={styles.demoGlow} aria-hidden="true" />
              <div className={styles.demoChatFrame}>
                <iframe
                  src="/chat/mda-sales"
                  title="بوت المبيعات الذكي — تجربة مباشرة"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="features-heading">
        <div className={styles.inner}>
          <span className={styles.sectionLabel}>لماذا يعمل؟</span>
          <h2 className={styles.sectionTitle} id="features-heading">
            كل ما يفعله فريق المبيعات — بشكل آلي
          </h2>
          <p className={styles.sectionSub}>
            يتولى البوت أسئلة العملاء والتسعير والحجوزات والتقاط العملاء المؤهّلين على مدار الساعة.
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

      {/* ── Platforms — honest display only ─────────────────────────── */}
      <section className={styles.platformsSection} aria-labelledby="platforms-heading">
        <div className={styles.inner}>
          <span className={styles.sectionLabel}>المنصّات المدعومة</span>
          <h2 className={styles.sectionTitle} id="platforms-heading">
            أين يعمل البوت؟
          </h2>
          <p className={styles.sectionSub}>
            يعمل البوت حالياً عبر الواتساب والموقع الإلكتروني. دعم منصات إضافية قادم قريباً.
          </p>
          <div className={styles.platformsGrid}>
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className={`${styles.platformCard} ${p.available ? styles.platformAvailable : styles.platformSoon}`}
              >
                <span className={styles.platformName}>{p.name}</span>
                <span className={styles.platformBadgeLabel}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ───────────────────────────────────────────────── */}
      <section className={styles.industriesSection} aria-labelledby="industries-heading">
        <div className={styles.inner}>
          <span className={styles.sectionLabel}>أي نشاط تجاري؟</span>
          <h2 className={styles.sectionTitle} id="industries-heading">
            يعمل لأي نشاط تجاري
          </h2>
          <p className={styles.sectionSub}>
            ندرّب البوت على منتجاتك وخدماتك — يتحدث بأسلوبك، لا كمساعد عام.
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
              <span className={styles.sectionLabel}>تجربة مباشرة</span>
              <h2 className={styles.sectionTitle} id="demo-heading">
                هذا هو البوت الخاص بك.<br />جرّبه الآن.
              </h2>
              <p className={styles.sectionSub} style={{ marginBottom: '1.4rem' }}>
                هذا بالضبط ما سيختبره عملاؤك على الواتساب أو موقعك الإلكتروني.
                اسأله أي شيء — هو النسخة الحقيقية.
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--ssb-muted)' }}>
                عندما يُدرَّب على نشاطك، سيتحدث بأسلوب <em>علامتك التجارية</em>، بخدماتك وأسعارك الخاصة.
              </p>
            </div>

            <div className={styles.demoChatWrap}>
              <div className={styles.demoGlow} aria-hidden="true" />
              <div className={styles.demoChatFrame}>
                <iframe
                  src="/chat/mda-sales"
                  title="بوت المبيعات الذكي — تجربة مباشرة"
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
          <span className={styles.sectionLabel}>كيف يبدأ</span>
          <h2 className={styles.sectionTitle} id="how-heading">
            من التسجيل إلى الإطلاق في 24 ساعة
          </h2>

          <div className={`${styles.stepsGrid} ${styles.stepsGrid3}`}>
            {STEPS.map((s) => (
              <div key={s.num} className={styles.step}>
                <div className={styles.stepNum}>{s.num}</div>
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
          <span className={styles.sectionLabel}>الأسعار</span>
          <h2 className={styles.sectionTitle} id="pricing-heading">
            سعر واضح وشامل
          </h2>
          <p className={styles.sectionSub} style={{ margin: '0 auto 0' }}>
            خطة واحدة. كل شيء مشمول. بدون رسوم إعداد.
          </p>

          <div className={styles.pricingCard}>
            <div className={styles.pricingPlan}>الخطة الأساسية</div>
            <div className={styles.pricingAmount}>
              <span className={styles.pricingCurrency}>د.إ</span>
              299
              <span className={styles.pricingPeriod}>/شهر</span>
            </div>
            <div className={styles.pricingTagline}>إلغاء في أي وقت. بدون عقد.</div>

            <ul className={styles.pricingFeatures}>
              {[
                'بوت مخصص مدرّب على نشاطك',
                'واتساب وموقع إلكتروني',
                'ردود بالعربية والإنجليزية',
                'متاح 24/7 — ردود غير محدودة',
                'إعداد وتركيب مجاني',
                'دعم مستمر عبر واتساب',
                'يبدأ خلال 24 ساعة',
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
              ابدأ عبر واتساب
            </a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className={styles.ctaSection} aria-labelledby="cta-heading">
        <div className={styles.ctaGlow} aria-hidden="true" />
        <div className={styles.inner}>
          <h2 className={styles.ctaTitle} id="cta-heading">
            جاهز لتحويل محادثاتك إلى مبيعات؟
          </h2>
          <p className={styles.ctaSub}>
            انضم إلى أصحاب الأعمال في دبي والإمارات الذين يستخدمون MDA AI للرد أسرع، والتقاط المزيد من العملاء، وإغلاق المزيد من الصفقات.
          </p>

          <div className={styles.ctaButtons}>
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              ابدأ عبر واتساب
            </a>
            <a href="#demo" className={styles.btnSecondary}>
              جرّب التجربة المباشرة
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className={styles.mdaFooter}>
        <div className={styles.inner}>
          <Image
            src="/brand/mda-full-logo.png"
            alt="MDA — Master Digital Agency"
            width={100}
            height={32}
            className={styles.footerLogo}
          />
          <p className={styles.footerText}>
            MDA — Master Digital Agency · علامة تجارية من DREXONYX
          </p>
        </div>
      </footer>
    </div>
  );
}
