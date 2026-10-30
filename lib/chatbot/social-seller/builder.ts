// DR 0122: Builds a ChatbotClient from a SocialSellerConfig

import type { ChatbotClient } from '../clients';
import type { SocialSellerConfig, ProductItem } from './types';

function formatItems(items: ProductItem[]): string {
  return items
    .map(item => {
      const desc = item.description ? ` — ${item.description}` : '';
      return `• ${item.name}: ${item.price}${desc}`;
    })
    .join('\n');
}

export function buildSellerClient(config: SocialSellerConfig): ChatbotClient {
  const { name, businessType, location, workingHours, waNumber, products, services, faqs, delivery } = config;

  const businessTypeLine = businessType ? ` (${businessType})` : '';
  const locationLine = location ? `\n- الموقع / Location: ${location}` : '';
  const hoursLine = workingHours ? `\n- أوقات العمل / Working Hours: ${workingHours}` : '';
  const deliveryLine = delivery ? `\n- التوصيل / Delivery: ${delivery}` : '';

  const productsSection =
    products && products.length > 0
      ? `\n═══ المنتجات / Products ═══\n\n${formatItems(products)}`
      : '';

  const servicesSection =
    services && services.length > 0
      ? `\n═══ الخدمات / Services ═══\n\n${formatItems(services)}`
      : '';

  const faqsSection =
    faqs && faqs.length > 0
      ? `\n═══ الأسئلة الشائعة / FAQs ═══\n\n${faqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}`
      : '';

  const systemPrompt = `أنت مساعد ذكي لـ ${name}${businessTypeLine}.
مهمتك: مساعدة العملاء في معرفة المنتجات والخدمات والأسعار، والتواصل مع الفريق.

LANGUAGE RULE (CRITICAL): Always respond in the EXACT same language the user writes in.
- User writes in Arabic → respond in Arabic only.
- User writes in English → respond in English only.
- Never mix languages in a single response.

═══ معلومات النشاط / Business Info ═══

- الاسم: ${name}${locationLine}${hoursLine}${deliveryLine}
${productsSection}
${servicesSection}
${faqsSection}

═══ قواعد المحادثة ═══

1. كن مختصراً وودوداً ومهنياً.
2. أجب بدقة على الأسئلة المتعلقة بالمنتجات والأسعار والخدمات.
3. إذا سأل العميل عن شيء غير متوفر، أخبره بذلك بلطف.
4. لا تتحدث عن أي نشاط تجاري آخر — أنت مساعد ${name} فقط.

═══ عندما يريد العميل الطلب أو التواصل ═══

اجمع هذه المعلومات خطوة بخطوة (سؤال واحد في كل مرة):
١. الاسم
٢. الطلب أو الخدمة المطلوبة
٣. رقم الواتساب للتواصل

بعد جمع المعلومات، اعرض ملخصاً ثم اكتب بالضبط:
"شكراً! اضغط الزر أدناه للتواصل معنا مباشرةً عبر واتساب 👇"

{{WA_LINK_TEXT:مرحباً ${name} 👋
أريد الاستفسار

✅ تفاصيلي:
• الاسم: [الاسم]
• الطلب: [الطلب]
• رقم التواصل: [الرقم]}}`;

  return {
    name: config.name,
    headerName: config.headerName,
    language: config.language,
    systemPrompt,
    logoUrl: config.logoUrl,
    theme: config.theme,
    welcomeMessage: config.welcomeMessage,
    heroBg: config.heroBg,
    heroTagline: config.heroTagline,
    heroTitle: config.heroTitle,
    heroHighlight: config.heroHighlight,
    heroSubtitle: config.heroSubtitle,
    inputPlaceholder: config.inputPlaceholder,
    waNumber,
    active: config.active,
    expiresAt: config.expiresAt,
    activatedAt: config.activatedAt,
    planName: config.planName,
    ownerContact: config.ownerContact,
  };
}
