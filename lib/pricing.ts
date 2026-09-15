export type PackageId = 'starter' | 'growth' | 'scale';

export interface Package {
  id: PackageId;
  name: string;
  priceAED: number;
  description: string;
  includes: readonly string[];
  highlight: boolean;
  deliverableCount: number;
  turnaroundDays: number;
  revisionRounds: number;
}

/** Selling prices shown to clients. Internal cost and margin are never stored here. */
export const PACKAGES: readonly Package[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceAED: 1500,
    description:
      'Entry-level performance creative package. Ideal for brands launching their first UGC advertising program.',
    includes: [
      '1 UGC advertising video',
      '1 revision round',
      '5 business days turnaround',
      'Creative strategy brief',
      'QC review included',
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
    highlight: true,
    deliverableCount: 3,
    turnaroundDays: 7,
    revisionRounds: 2,
  },
  {
    id: 'scale',
    name: 'Scale',
    priceAED: 6500,
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
    highlight: false,
    deliverableCount: 6,
    turnaroundDays: 10,
    revisionRounds: 3,
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
 * Recommends a package based on creative scope and platform breadth.
 * Recommendation logic reflects scope complexity only — never internal cost or margin.
 */
export function recommendPackage(input: RecommendationInput): PackageId {
  const { creativeTypes, platforms } = input;
  const broadPlatforms = platforms.length >= 3;
  const multiCreative = creativeTypes.length >= 2;
  if (broadPlatforms || multiCreative) return 'scale';
  if (platforms.length >= 2 || creativeTypes.length >= 1) return 'growth';
  return 'starter';
}
