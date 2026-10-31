// DR 0122: Social Seller Bot — per-merchant configuration type

export interface ProductItem {
  name: string;
  price: string;        // e.g. "AED 50"
  description?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface SocialSellerConfig {
  slug: string;         // URL slug — must be unique, e.g. "salon-maya"
  name: string;         // Business display name
  headerName?: string;
  businessType?: string; // e.g. "صالون تجميل", "بقالة", "محل هواتف"
  location?: string;
  workingHours?: string;
  language: 'ar' | 'en' | 'both';
  waNumber: string;     // WhatsApp number without "+", e.g. "971501234567"
  logoUrl?: string;
  theme?: 'dark' | 'light';
  welcomeMessage?: string;
  heroBg?: string;
  heroTagline?: string;
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  inputPlaceholder?: string;
  products?: ProductItem[];
  services?: ProductItem[];
  faqs?: FaqItem[];
  delivery?: string;
  // Subscription — AED 299/month Basic plan
  active?: boolean;     // false = blocked; omitted = active
  expiresAt?: Date;
  activatedAt?: Date;
  planName?: string;    // e.g. "Basic AED 299/month"
  ownerContact?: string;
}
