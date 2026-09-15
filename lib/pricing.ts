export type PackageId =
  | 'micro-creative'
  | 'creative-brief'
  | 'spark'
  | 'starter'
  | 'growth'
  | 'scale'
  | 'production'
  | 'brand-film';

export type PackageCategory = 'entry' | 'core' | 'premium' | 'custom';

export interface Package {
  id: PackageId;
  name: string;
  priceAED: number;
  /** true → price is a minimum floor; display as "From AED X" */
  priceFrom: boolean;
  category: PackageCategory;
  description: string;
  includes: readonly string[];
  /** Scope boundaries shown to clients to set clear expectations. Never expose internal cost data here. */
  excludes: readonly string[];
  highlight: boolean;
  deliverableCount: number;
  turnaroundDays: number;
  revisionRounds: number;
}

/** Selling prices and client-visible scope. Internal cost and margin are never stored here. */
export const PACKAGES: readonly Package[] = [
  // ── Entry products ─────────────────────────────────────────────────────────
  {
    id: 'micro-creative',
    name: 'Micro Creative',
    priceAED: 199,
    priceFrom: false,
    category: 'entry',
    description:
      'A single static ad creative built precisely to your brief. Minimum viable creative for very limited budgets.',
    includes: [
      '1 × static ad creative (1 format)',
      'Creative concept included',
      'QC review included',
      '48-hour turnaround',
    ],
    excludes: [
      'Revision rounds',
      'Multi-format resizing',
      'Creative strategy brief',
      'Video production',
    ],
    highlight: false,
    deliverableCount: 1,
    turnaroundDays: 2,
    revisionRounds: 0,
  },
  {
    id: 'creative-brief',
    name: 'Creative Brief',
    priceAED: 299,
    priceFrom: false,
    category: 'entry',
    description:
      'A complete creative direction document — campaign brief, ad hooks, and platform strategy. No visual assets included.',
    includes: [
      'Campaign brief document',
      '5 × written ad hooks',
      'Platform targeting direction',
      'Creative concept rationale',
      '48-hour turnaround',
    ],
    excludes: [
      'Visual ad creative or video',
      'Static assets or motion graphics',
      'Revision rounds',
    ],
    highlight: false,
    deliverableCount: 1,
    turnaroundDays: 2,
    revisionRounds: 0,
  },
  {
    id: 'spark',
    name: 'Spark',
    priceAED: 499,
    priceFrom: false,
    category: 'entry',
    description:
      'First production-level creative. One AI-powered video ad or three static creatives — built for performance, ready to run.',
    includes: [
      '1 × AI UGC video (15–30s) or 3 × static ad creatives',
      'Creative brief included',
      '1 revision round (minor corrections)',
      'QC review included',
      '48-hour turnaround',
    ],
    excludes: [
      'A/B variants',
      'Multi-format resizing',
      'Creative strategy',
      'Multiple scripts or concepts',
    ],
    highlight: false,
    deliverableCount: 1,
    turnaroundDays: 2,
    revisionRounds: 1,
  },
  // ── Core production packages ───────────────────────────────────────────────
  {
    id: 'starter',
    name: 'Starter',
    priceAED: 1500,
    priceFrom: false,
    category: 'core',
    description:
      'Entry-level performance creative package. Ideal for brands launching their first UGC advertising program.',
    includes: [
      '1 UGC advertising video',
      '1 revision round',
      '5 business days turnaround',
      'Creative strategy brief',
      'QC review included',
    ],
    excludes: [
      'A/B variants',
      'Multi-format production',
      'Static ad creative',
      'Dedicated account coordination',
    ],
    highlight: false,
    deliverableCount: 1,
    turnaroundDays: 5,
    revisionRounds: 1,
  },
  {
    id: 'growth',
    name: 'Growth',
    priceAED: 3500,
    priceFrom: false,
    category: 'core',
    description:
      'For brands scaling performance creative volume. Expanded deliverable set with creative testing support.',
    includes: [
      '3 UGC advertising videos',
      '2 revision rounds',
      '7 business days turnaround',
      'Creative strategy brief',
      'A/B variant production',
      'QC review included',
    ],
    excludes: [
      'Static ad creative',
      'Cinematic production',
      'Paid media management',
      'Dedicated account coordination',
    ],
    highlight: true,
    deliverableCount: 3,
    turnaroundDays: 7,
    revisionRounds: 2,
  },
  {
    id: 'scale',
    name: 'Scale',
    priceAED: 6500,
    priceFrom: false,
    category: 'core',
    description:
      'High-volume creative production for performance-led brands running multiple campaigns simultaneously.',
    includes: [
      '6 UGC advertising videos',
      '3 revision rounds',
      '10 business days turnaround',
      'Full creative strategy',
      'Multi-format variant production',
      'Priority QC and delivery',
      'Dedicated account coordination',
    ],
    excludes: [
      'Brand film production',
      'Physical shoot or on-camera talent',
      'Media buying or ad campaign management',
    ],
    highlight: false,
    deliverableCount: 6,
    turnaroundDays: 10,
    revisionRounds: 3,
  },
  // ── Premium production ─────────────────────────────────────────────────────
  {
    id: 'production',
    name: 'Production',
    priceAED: 14500,
    priceFrom: false,
    category: 'premium',
    description:
      'Cinematic product commercial or high-volume mixed production — for premium brands where creative quality is the brief.',
    includes: [
      '1 × cinematic product commercial (30–60s) or 10–12 mixed video + static deliverables',
      'Full creative direction',
      '3 revision rounds',
      '15 business days turnaround',
      'Dedicated account coordination',
      'QC review included',
    ],
    excludes: [
      'Physical multi-day shoot',
      'On-camera human talent',
      'Media buying or ad campaign management',
    ],
    highlight: false,
    deliverableCount: 1,
    turnaroundDays: 15,
    revisionRounds: 3,
  },
  // ── Custom engagements ─────────────────────────────────────────────────────
  {
    id: 'brand-film',
    name: 'Brand Film',
    priceAED: 35000,
    priceFrom: true,
    category: 'custom',
    description:
      'Full brand story production, scoped to your brief. Custom timeline, deliverables, and creative partnership from brief through final delivery.',
    includes: [
      'Custom scope development',
      'Full brand film production',
      'Multi-platform deliverable formats',
      'Creative direction and strategy',
      'Dedicated production team',
      'Custom timeline and delivery schedule',
    ],
    excludes: [
      'Fixed deliverable count — scope determined at briefing',
      'Fixed timeline — determined at scoping stage',
    ],
    highlight: false,
    deliverableCount: 0,
    turnaroundDays: 0,
    revisionRounds: 0,
  },
];

export function formatPriceAED(priceAED: number): string {
  const thousands = Math.floor(priceAED / 1000);
  const remainder = priceAED % 1000;
  if (thousands > 0) {
    const rem = remainder > 0 ? `,${String(remainder).padStart(3, '0')}` : ',000';
    return `AED ${thousands}${rem}`;
  }
  return `AED ${priceAED}`;
}

export function getPackageById(id: PackageId): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export interface RecommendationInput {
  creativeTypes: string[];
  platforms: string[];
}

/**
 * Recommends a core production package based on creative scope and platform breadth.
 * Recommendation logic reflects scope complexity only — never internal cost or margin.
 * Entry products and premium/custom tiers are discovered on the pricing page,
 * not recommended via brief intake.
 */
export function recommendPackage(input: RecommendationInput): PackageId {
  const { creativeTypes, platforms } = input;
  const broadPlatforms = platforms.length >= 3;
  const multiCreative = creativeTypes.length >= 2;
  if (broadPlatforms || multiCreative) return 'scale';
  if (platforms.length >= 2 || creativeTypes.length >= 1) return 'growth';
  return 'starter';
}
