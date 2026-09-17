// DREXONYX Website Content Inspector — DR 0122
// Pure, synchronous, no I/O. Deterministic content health checks only.
// READ ONLY — never mutates any data, never invents or fabricates content.

import { PORTFOLIO_ITEMS } from '@/lib/portfolio';
import type { PortfolioItem } from '@/lib/portfolio';
import { MICRO_PACKAGES, PRODUCTION_PACKAGES, CUSTOM_TIERS } from '@/lib/pricing';
import type { Package, CustomTier } from '@/lib/pricing';

export type IssueSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SiteContentIssue {
  severity: IssueSeverity;
  type: string;
  entityId: string;
  detail: string;
}

export interface WebsiteContentReport {
  generatedAt: string;
  portfolioItemCount: number;
  pricingPackageCount: number;
  issues: SiteContentIssue[];
  hasActionableIssues: boolean;
  summary: { high: number; medium: number; low: number };
}

function isValidHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) return true;
  if (href.startsWith('http://') || href.startsWith('https://')) return true;
  return false;
}

// DR 0122 §2.3 — Portfolio inspection rules
export function inspectPortfolioItems(items: PortfolioItem[]): SiteContentIssue[] {
  const issues: SiteContentIssue[] = [];

  for (const item of items) {
    if (!item.src) {
      issues.push({
        severity: item.featured ? 'HIGH' : 'MEDIUM',
        type: 'PORTFOLIO_MISSING_SRC',
        entityId: item.id,
        detail: `Portfolio item "${item.title}" is missing src.${item.featured ? ' Featured item will render without media.' : ''}`,
      });
    }

    // Separate explicit check so featured-slot degradation is unambiguously surfaced
    if (item.featured && !item.src) {
      issues.push({
        severity: 'HIGH',
        type: 'PORTFOLIO_FEATURED_NO_MEDIA',
        entityId: item.id,
        detail: `Featured portfolio item "${item.title}" has no src — featured slot will render without media.`,
      });
    }

    if (item.mediaType === 'video' && !item.thumbnailSrc) {
      issues.push({
        severity: 'MEDIUM',
        type: 'PORTFOLIO_MISSING_THUMBNAIL',
        entityId: item.id,
        detail: `Video portfolio item "${item.title}" is missing thumbnailSrc.`,
      });
    }

    if (!item.description || item.description.trim() === '') {
      issues.push({
        severity: 'LOW',
        type: 'PORTFOLIO_EMPTY_DESCRIPTION',
        entityId: item.id,
        detail: `Portfolio item "${item.title}" has an empty description.`,
      });
    }
  }

  return issues;
}

// DR 0122 §2.3 — Pricing package inspection rules (MICRO_PACKAGES + PRODUCTION_PACKAGES)
export function inspectPricingPackages(packages: Package[]): SiteContentIssue[] {
  const issues: SiteContentIssue[] = [];

  for (const pkg of packages) {
    if (pkg.price <= 0) {
      issues.push({
        severity: 'HIGH',
        type: 'PRICING_INVALID_PRICE',
        entityId: pkg.id,
        detail: `Package "${pkg.name}" has an invalid price: ${pkg.price}.`,
      });
    }

    if (pkg.includes.length === 0) {
      issues.push({
        severity: 'HIGH',
        type: 'PRICING_EMPTY_INCLUDES',
        entityId: pkg.id,
        detail: `Package "${pkg.name}" has an empty includes list.`,
      });
    }

    if (!pkg.description || pkg.description.trim() === '') {
      issues.push({
        severity: 'MEDIUM',
        type: 'PRICING_EMPTY_DESCRIPTION',
        entityId: pkg.id,
        detail: `Package "${pkg.name}" has an empty description.`,
      });
    }
  }

  return issues;
}

// DR 0122 §2.3 — Custom tier inspection rules
export function inspectCustomTiers(tiers: CustomTier[]): SiteContentIssue[] {
  const issues: SiteContentIssue[] = [];

  for (const tier of tiers) {
    if (!tier.ctaHref || !isValidHref(tier.ctaHref)) {
      issues.push({
        severity: 'MEDIUM',
        type: 'CUSTOM_TIER_INVALID_CTA_HREF',
        entityId: tier.id,
        detail: `Custom tier "${tier.name}" has a missing or invalid ctaHref: "${tier.ctaHref ?? ''}".`,
      });
    }
  }

  return issues;
}

// Aggregates all inspection results into a single report. No I/O, no fabrication.
export function buildWebsiteContentReport(): WebsiteContentReport {
  const allPackages = [...MICRO_PACKAGES, ...PRODUCTION_PACKAGES];

  const issues = [
    ...inspectPortfolioItems(PORTFOLIO_ITEMS),
    ...inspectPricingPackages(allPackages),
    ...inspectCustomTiers(CUSTOM_TIERS),
  ];

  const summary = {
    high: issues.filter((i) => i.severity === 'HIGH').length,
    medium: issues.filter((i) => i.severity === 'MEDIUM').length,
    low: issues.filter((i) => i.severity === 'LOW').length,
  };

  return {
    generatedAt: new Date().toISOString(),
    portfolioItemCount: PORTFOLIO_ITEMS.length,
    pricingPackageCount: allPackages.length,
    issues,
    hasActionableIssues: summary.high > 0 || summary.medium > 0,
    summary,
  };
}
