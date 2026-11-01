// DR-0130: MDA Social Seller landing page — /social-seller
// Corporate Digital / Premium SaaS identity. Honest marketing only.

import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'بوت المبيعات الذكي — MDA | Master Digital Agency',
  description:
    'مساعد مبيعات ذكي لنشاطك التجاري في الإمارات. يستقبل استفسارات عملاءك، يعرض خدماتك، ويحوّل المحادثات إلى مبيعات. 299 درهم شهرياً.',
  openGraph: {
    title: 'بوت المبيعات الذكي — MDA | Master Digital Agency',
    description:
      'استقبل عملاءك وحوّل استفساراتهم إلى مبيعات مع بوت ذكي مخصص لنشاطك. 299 AED/شهر.',
    type: 'website',
  },
};

const WA_TEXT = encodeURIComponent(
  'مرحباً فريق MDA 👋\nأريد الاشتراك في بوت المبيعات الذكي\n\nالخطة: الأساسية 299 درهم/شهر',
);
const WA_HREF = `https://wa.me/971521770988?text=${WA_TEXT}`;

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const PROBLEMS = [
  {
    title: 'استفسارات تُفقد يومياً',
    desc: 'عملاؤك يرسلون على واتساب وأنت مشغول — ينتظرون ساعات ثم يذهبون لمنافسك.',
  },
  {
    title: 'ردود متأخرة تُفقد الثقة',
    desc: 'العميل الجاد يريد رداً فورياً. التأخر يُظهر عدم الاحترافية ويخسر الصفقة.',
  },
  {
    title: 'وقتك ينقضي في الردود المكررة',
    desc: 'نفس الأسئلة كل يوم عن الأسعار والأوقات والخدمات — ساعات تضيع يومياً.',
  },
];

const SOLUTIONS = [
  {
    title: 'يرد بدلاً عنك على مدار الساعة',
    desc: 'البوت يستقبل كل استفسار فوراً — ليلاً ونهاراً، في عطل نهاية الأسبوع، حتى أثناء اجتماعاتك.',
  },
  {
    title: 'يعرف نشاطك كما تعرفه أنت',
    desc: 'ندرّبه على خدماتك وأسعارك وأوقات عملك — يجيب بدقة وبأسلوب يمثّل علامتك التجارية.',
  },
  {
    title: 'يُسلّمك العملاء الجادّين جاهزين',
    desc: 'بعد جمع بيانات العميل وتأهيله، يحوّله مباشرة إلى واتساپك — أنت تُغلق الصفقة فقط.',
  },
];

const STEPS = [
  {
    num: '١',
    title: 'شارك تفاصيل نشاطك',
    desc: 'أرسل لنا خدماتك وأسعارك وأوقات عملك عبر واتساب — بسيطة ومباشرة.',
  },
  {
    num: '٢',
    title: 'نُعدّ البوت المخصص',
    desc: 'فريقنا يدرّب البوت على نشاطك التجاري ويهيّئه ليمثّل علامتك بدقة.',
  },
  {
    num: '٣',
    title: 'البوت يستقبل عملاءك',
    desc: 'بعد الإعداد، البوت جاهز لاستقبال استفسارات عملاءك. مدة الإعداد تُحدَّد عند التواصل.',
  },
];

const INDUSTRIES = [
  { icon: '🍽️', name: 'مطاعم وكافيهات', detail: 'القائمة، الطلبات، الحجوزات' },
  { icon: '💇', name: 'صالونات ومراكز تجميل', detail: 'المواعيد، الخدمات، الأسعار' },
  { icon: '🏥', name: 'عيادات وصيدليات', detail: 'المواعيد، الخدمات، الموقع' },
  { icon: '🛍️', name: 'متاجر ومنتجات', detail: 'المنتجات، الطلبات، الشحن' },
  { icon: '🏠', name: 'عقارات ومكاتب', detail: 'العروض، المشاهدات، الأسعار' },
  { icon: '📚', name: 'تعليم ودورات', detail: 'التسجيل، الجدول، المناهج' },
  { icon: '⚙️', name: 'خدمات مهنية', detail: 'الاستفسارات، التسعير، التواصل' },
];

const FEATURES = [
  { title: 'متاح 24/7', desc: 'لا ينام ولا يفوّت رسالة.' },
  { title: 'عربي وإنجليزي', desc: 'يكتشف لغة العميل ويرد بها.' },
  { title: 'مخصص لنشاطك', desc: 'مدرّب على خدماتك وأسعارك.' },
  { title: 'يُسلّم العملاء الجادّين', desc: 'يحوّلهم مباشرة لواتساپك.' },
  { title: 'واتساب وموقع إلكتروني', desc: 'يعمل على المنصّتين فعلياً.' },
  { title: 'إعداد كامل مشمول', desc: 'لا تحتاج خبرة تقنية.' },
];

const FAQS = [
  {
    q: 'كيف يعمل البوت بالضبط؟',
    a: 'العميل يفتح رابط البوت (على موقعك أو واتساپ) ويبدأ محادثة. البوت يرد على أسئلته عن خدماتك وأسعارك وأوقاتك، ثم يجمع بياناته ويحوّله إليك على واتساپ.',
  },
  {
    q: 'على أي منصات يعمل البوت؟',
    a: 'يعمل حالياً عبر رابط ويب يمكن مشاركته في Bio أو واتساپ أو موقعك الإلكتروني. لا يعمل داخل محادثات واتساپ مباشرة أو DMs إنستغرام أو تيك توك.',
  },
  {
    q: 'ماذا يحتاج الإعداد؟',
    a: 'فقط معلومات نشاطك: الخدمات، الأسعار، أوقات العمل، ورقم واتساپ للتحويل. نتولى الإعداد الكامل.',
  },
  {
    q: 'هل يمكن إلغاء الاشتراك؟',
    a: 'نعم، الاشتراك شهري بدون عقد. يمكنك الإلغاء في أي وقت عبر التواصل معنا.',
  },
  {
    q: 'ماذا لو أراد العميل التحدث مع شخص حقيقي؟',
    a: 'البوت يجمع بيانات العميل ويحوّله إليك مباشرة على واتساپ. أنت من يُغلق الصفقة.',
  },
];

export default function SocialSellerPage() {
  return (
    <div className={styles.page} dir="rtl">
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
            <a href="#how" className={styles.navLink}>كيف يعمل</a>
            <a href="#demo" className={styles.navLink}>تجربة مباشرة</a>
            <a href="#pricing" className={styles.navLink}>الأسعار</a>
            <a href="/en/social-seller" className={styles.navLink} aria-label="English version">EN</a>
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.headerCta}>
              {WA_ICON}
              ابدأ الآن
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroLayout}>
            <div className={styles.heroContent}>
              <span className={styles.heroBadge}>بوت المبيعات الذكي من MDA</span>
              <h1 className={styles.heroTitle}>
                حوّل عملك إلى<br />
                <span className={styles.heroAccent}>مبيعات حقيقية</span>
              </h1>
              <p className={styles.heroDesc}>
                مساعد مبيعات ذكي يساعد نشاطك التجاري على استقبال استفسارات العملاء، عرض منتجاتك وخدماتك، وجمع بيانات العملاء المحتملين وتوجيههم إلى فريقك عبر WhatsApp.
              </p>
              <div className={styles.heroPriceBadge}>
                <span className={styles.priceAmount}>299 AED</span>
                <span className={styles.pricePer}> / شهر</span>
              </div>
              <div className={styles.heroCtas}>
                <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
                  {WA_ICON}
                  ابدأ الآن مع MDA
                </a>
                <a href="#demo" className={styles.btnGhost}>جرّب البوت مباشرةً ↓</a>
              </div>
            </div>

            <div className={styles.heroPreview}>
              <div className={styles.previewLabel}>تجربة البوت المباشرة</div>
              <div className={styles.previewFrame}>
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

      {/* ── Problem ────────────────────────────────────────────── */}
      <section className={styles.section} id="problem">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>التحدي</span>
            <h2 className={styles.sectionTitle}>لماذا تخسر عملاءك؟</h2>
            <p className={styles.sectionSub}>
              أصحاب الأعمال في الإمارات يواجهون تحديات يومية في متابعة استفسارات العملاء.
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
            <span className={styles.sectionLabel}>الحل</span>
            <h2 className={styles.sectionTitle}>كيف يساعد MDA Sales Agent؟</h2>
            <p className={styles.sectionSub}>
              عملاؤك من كل المنصات، وتفاصيلهم تصلك مباشرة على واتساب.
            </p>
            <p className={styles.sectionSub} style={{ marginTop: '0.75rem' }}>
              بمجرد مشاركة رابط البوت عبر منصاتك أو موقعك الإلكتروني، يبدأ باستقبال استفسارات العملاء وجمع بياناتهم، ثم إرسال تفاصيل العملاء المهتمين إلى واتسابك لتتمكن من متابعتهم وإتمام البيع.
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
            <span className={styles.sectionLabel}>خطوات البدء</span>
            <h2 className={styles.sectionTitle}>كيف يعمل المنتج؟</h2>
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
            <span className={styles.sectionLabel}>من يستفيد؟</span>
            <h2 className={styles.sectionTitle}>أنواع الأنشطة التجارية المناسبة</h2>
            <p className={styles.sectionSub}>
              يعمل لأي نشاط تجاري يتلقى استفسارات من العملاء.
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
            <span className={styles.sectionLabel}>تجربة مباشرة</span>
            <h2 className={styles.sectionTitle}>جرّب البوت الآن</h2>
            <p className={styles.sectionSub}>
              هذا بالضبط ما سيختبره عملاؤك. اسأله عن أي شيء — هو النسخة الحقيقية.
            </p>
          </div>
          <div className={styles.demoWrap}>
            <div className={styles.demoFrame}>
              <iframe
                src="/chat/mda-sales"
                title="بوت المبيعات الذكي — تجربة مباشرة"
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
            <span className={styles.sectionLabel}>المزايا الأساسية</span>
            <h2 className={styles.sectionTitle}>ما الذي يقدّمه البوت؟</h2>
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
            <span className={styles.sectionLabel}>السعر والاشتراك</span>
            <h2 className={styles.sectionTitle}>سعر واضح وشامل</h2>
            <p className={styles.sectionSub}>خطة واحدة. كل شيء مشمول. بدون رسوم إعداد.</p>
          </div>
          <div className={styles.pricingCard}>
            <div className={styles.pricingPlan}>الخطة الأساسية</div>
            <div className={styles.pricingPrice}>
              <span className={styles.pricingCurrency}>د.إ</span>
              <span className={styles.pricingNum}>299</span>
              <span className={styles.pricingPer}>/شهر</span>
            </div>
            <p className={styles.pricingNote}>إلغاء في أي وقت. بدون عقد طويل الأمد.</p>
            <ul className={styles.pricingList}>
              {[
                'بوت مخصص مدرّب على نشاطك',
                'ردود بالعربية والإنجليزية',
                'يعمل عبر رابط واتساپ وموقعك الإلكتروني',
                'متاح 24/7 — ردود غير محدودة',
                'إعداد وتهيئة كاملة مشمولة',
                'دعم مستمر عبر واتساپ',
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
              اشترك الآن عبر واتساب
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className={styles.section} id="faq">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>الأسئلة الشائعة</span>
            <h2 className={styles.sectionTitle}>أسئلة يطرحها أصحاب الأعمال</h2>
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
          <h2 className={styles.ctaTitle}>جاهز لتحويل استفسارات عملاءك إلى مبيعات؟</h2>
          <p className={styles.ctaSub}>
            تواصل مع فريق MDA الآن لمعرفة كيف نُعدّ البوت المناسب لنشاطك التجاري.
          </p>
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className={styles.ctaBtn}>
            {WA_ICON}
            تواصل مع فريق MDA الآن
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
            MDA — Master Digital Agency · علامة تجارية من DREXONYX
          </p>
        </div>
      </footer>
    </div>
  );
}
