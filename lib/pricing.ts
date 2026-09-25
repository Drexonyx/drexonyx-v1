export type Package = {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  creditCost: number;
  description: string;
  includes: string[];
  scopeNote?: string;
  highlight?: boolean;
  badge?: string;
  category?: 'standard-ugc' | 'cinematic-ugc';
};

export type CustomTier = {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
  attributes: string[];
  cta: string;
  ctaHref: string;
};

// Creative direction products — no video production
export const MICRO_PACKAGES: Package[] = [
  {
    id: 'micro-creative',
    name: 'Micro Creative',
    price: 199,
    priceLabel: 'AED 199',
    creditCost: 1000,
    description:
      'Professional creative direction for brands with focused budgets. One concept, one hook, one clear direction — delivered as a concise digital document.',
    includes: [
      'Creative concept & hook direction',
      'CTA direction',
      'Creative recommendation & guidance',
      'Digital creative brief document',
      '1 revision / clarification round',
    ],
    scopeNote: 'Creative direction only — does not include video production or editing.',
  },
  {
    id: 'creative-brief',
    name: 'Creative Brief',
    price: 299,
    priceLabel: 'AED 299',
    creditCost: 1500,
    description:
      'A complete campaign creative brief — everything you need to confidently brief a creator, an agency, or an in-house production team.',
    includes: [
      'Campaign objective & creative strategy',
      'Core creative concept',
      'Hook framework',
      'CTA direction',
      'Platform & creative direction',
      'Full campaign brief document',
      '1 revision / clarification round',
    ],
    scopeNote: 'Strategy and brief only — does not include video production or media buying.',
  },
];

// Core production ladder — Spark through Production
export const PRODUCTION_PACKAGES: Package[] = [
  {
    id: 'spark',
    name: 'Spark',
    price: 499,
    priceLabel: 'AED 499',
    creditCost: 2500,
    category: 'standard-ugc',
    description:
      'One Standard UGC video — concept, production, and QC delivered in 48 hours.',
    includes: [
      '1 × Standard UGC video (15–30 sec)',
      'Creative concept & script',
      'Production & QC',
      '1 minor revision round',
      '48-hour turnaround',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 1500,
    priceLabel: 'AED 1,500',
    creditCost: 7500,
    category: 'standard-ugc',
    description:
      'One full-length Standard UGC video — creative brief, script, production, and QC in 5 business days.',
    includes: [
      '1 × Standard UGC video (up to 60 sec)',
      'Creative brief + script',
      '1 revision round',
      '5 business days',
      'QC review included',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 3500,
    priceLabel: 'AED 3,500',
    creditCost: 17500,
    category: 'standard-ugc',
    description:
      'Multi-video Standard UGC production with A/B creative variants — scale your content output efficiently.',
    includes: [
      '3 × Standard UGC videos',
      'A/B creative variants',
      'Full creative strategy brief',
      '2 revision rounds',
      '7 business days',
    ],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 6500,
    priceLabel: 'AED 6,500',
    creditCost: 32500,
    category: 'standard-ugc',
    description:
      'High-volume Standard UGC production for brands scaling creative output.',
    includes: [
      '6 × Standard UGC videos',
      'Multi-format creative variants',
      'Full creative strategy',
      '3 revision rounds',
      '10 business days',
      'Priority QC',
    ],
  },
  {
    id: 'production',
    name: 'Production',
    price: 14500,
    priceLabel: 'AED 14,500',
    creditCost: 72500,
    category: 'cinematic-ugc',
    description:
      'Cinematic UGC production for hero content, product launches, and brand storytelling.',
    includes: [
      'Cinematic video commercial (30–60 sec) — or mixed deliverable scope, agreed at brief',
      'Full creative direction',
      '3 revision rounds',
      '15 business days',
      'Dedicated account coordination',
    ],
  },
];

// Custom / bespoke tiers — no fixed price
export const CUSTOM_TIERS: CustomTier[] = [
  {
    id: 'brand-film',
    name: 'Brand Film',
    priceLabel: 'From AED 35,000',
    description:
      'Full brand film production for campaigns that demand cinematic quality, multi-platform deliverables, and a bespoke creative approach.',
    attributes: [
      'Custom creative brief',
      'Full brand film production',
      'Multi-platform deliverables',
      'Bespoke scope & timeline',
      'Custom revision rounds',
    ],
    cta: 'Brief Us on Your Project',
    ctaHref: '/start-project',
  },
  {
    id: 'enterprise',
    name: 'Enterprise & Custom',
    priceLabel: 'Custom Quote',
    description:
      'For luxury brands, large campaigns, multi-campaign programs, and institutional projects. Scoped and priced to your production requirements.',
    attributes: [
      'Multi-campaign production',
      'Enterprise creative programs',
      'Luxury & high-end brand work',
      'Bespoke scope & pricing',
      'Dedicated project management',
    ],
    cta: 'Start a Custom Project',
    ctaHref: '/start-project',
  },
];
