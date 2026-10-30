// DR 0122: Demo merchant — illustrates the Social Seller Bot config pattern.
// Replace with a real merchant file when onboarding an actual client.
// Slug: "ssb-demo" — accessible at /chat/ssb-demo

import type { SocialSellerConfig } from '../types';

const demoSalon: SocialSellerConfig = {
  slug: 'ssb-demo',
  name: 'صالون مايا',
  headerName: 'صالون مايا — مساعد ذكي',
  businessType: 'صالون تجميل نسائي',
  location: 'دبي، الإمارات',
  workingHours: '10 صباحاً – 9 مساءً (يومياً)',
  language: 'both',
  waNumber: '971500000000', // placeholder — replace with real number
  theme: 'dark',
  welcomeMessage: 'أهلاً بك في {{GOLD:صالون مايا}}.\nكيف يمكنني مساعدتك اليوم؟',
  heroTagline: 'صالون تجميل نسائي',
  heroTitle: 'أهلاً بك في',
  heroHighlight: 'صالون مايا',
  heroSubtitle: 'احجزي موعدك الآن — خدمات متكاملة للمرأة.',
  inputPlaceholder: 'اكتبي رسالتك...',
  services: [
    { name: 'قص شعر', price: 'AED 60', description: 'قص + تجفيف' },
    { name: 'صبغة شعر', price: 'تبدأ من AED 150', description: 'حسب الطول والنوع' },
    { name: 'مكياج كامل', price: 'AED 200' },
    { name: 'مكياج عرائس', price: 'تبدأ من AED 500' },
    { name: 'عناية بالأظافر (مانيكير)', price: 'AED 70' },
    { name: 'عناية بالأظافر (باديكير)', price: 'AED 80' },
    { name: 'تنظيف بشرة', price: 'AED 120' },
  ],
  faqs: [
    { q: 'هل تقبلون حجوزات مسبقة؟', a: 'نعم، يمكنك الحجز عبر واتساب.' },
    { q: 'هل توجد مواقف سيارات؟', a: 'نعم، مواقف مجانية أمام الصالون.' },
  ],
  // Subscription
  active: true,
  activatedAt: new Date('2026-01-01'),
  expiresAt: new Date('2027-12-31'),
  planName: 'Basic AED 299/month',
  ownerContact: '+971500000000',
};

export default demoSalon;
