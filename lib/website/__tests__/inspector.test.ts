import { describe, it, expect } from 'vitest';
import {
  inspectPortfolioItems,
  inspectPricingPackages,
  inspectCustomTiers,
  buildWebsiteContentReport,
} from '../inspector';
import type { PortfolioItem } from '@/lib/portfolio';
import type { Package, CustomTier } from '@/lib/pricing';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const cleanVideoItem: PortfolioItem = {
  id: 'clean-video',
  category: 'UGC Video',
  title: 'Clean Video',
  description: 'A proper description.',
  mediaType: 'video',
  src: '/videos/clean.mp4',
  thumbnailSrc: '/videos/clean-thumb.svg',
  featured: false,
};

const cleanImageItem: PortfolioItem = {
  id: 'clean-image',
  category: 'Static Creative',
  title: 'Clean Image',
  description: 'A proper description.',
  mediaType: 'image',
  src: '/images/clean.svg',
  featured: false,
};

const cleanPackage: Package = {
  id: 'clean-pkg',
  name: 'Clean Package',
  price: 499,
  priceLabel: 'AED 499',
  description: 'A proper description.',
  includes: ['Item one', 'Item two'],
  creditCost: 499,
};

const cleanCustomTier: CustomTier = {
  id: 'clean-tier',
  name: 'Clean Tier',
  priceLabel: 'From AED 35,000',
  description: 'Bespoke production.',
  attributes: ['Custom scope'],
  cta: 'Get Started',
  ctaHref: '/start-project',
};

// ── inspectPortfolioItems ─────────────────────────────────────────────────────

describe('inspectPortfolioItems', () => {
  it('returns no issues for a complete video item', () => {
    expect(inspectPortfolioItems([cleanVideoItem])).toHaveLength(0);
  });

  it('returns no issues for a complete image item', () => {
    expect(inspectPortfolioItems([cleanImageItem])).toHaveLength(0);
  });

  it('returns MEDIUM PORTFOLIO_MISSING_SRC for non-featured item with no src', () => {
    const item: PortfolioItem = { ...cleanImageItem, id: 'no-src', src: undefined, featured: false };
    const issues = inspectPortfolioItems([item]);
    const found = issues.find((i) => i.type === 'PORTFOLIO_MISSING_SRC');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('MEDIUM');
    expect(found?.entityId).toBe('no-src');
  });

  it('returns HIGH PORTFOLIO_MISSING_SRC for featured item with no src', () => {
    const item: PortfolioItem = { ...cleanImageItem, id: 'featured-no-src', src: undefined, featured: true };
    const issues = inspectPortfolioItems([item]);
    const found = issues.find((i) => i.type === 'PORTFOLIO_MISSING_SRC');
    expect(found?.severity).toBe('HIGH');
  });

  it('returns HIGH PORTFOLIO_FEATURED_NO_MEDIA for featured item with no src', () => {
    const item: PortfolioItem = { ...cleanImageItem, id: 'featured-no-media', src: undefined, featured: true };
    const issues = inspectPortfolioItems([item]);
    const found = issues.find((i) => i.type === 'PORTFOLIO_FEATURED_NO_MEDIA');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('HIGH');
    expect(found?.entityId).toBe('featured-no-media');
  });

  it('does not raise PORTFOLIO_FEATURED_NO_MEDIA for featured item that has src', () => {
    const issues = inspectPortfolioItems([{ ...cleanVideoItem, featured: true }]);
    expect(issues.find((i) => i.type === 'PORTFOLIO_FEATURED_NO_MEDIA')).toBeUndefined();
  });

  it('does not raise PORTFOLIO_FEATURED_NO_MEDIA for non-featured item with no src', () => {
    const item: PortfolioItem = { ...cleanImageItem, src: undefined, featured: false };
    const issues = inspectPortfolioItems([item]);
    expect(issues.find((i) => i.type === 'PORTFOLIO_FEATURED_NO_MEDIA')).toBeUndefined();
  });

  it('returns MEDIUM PORTFOLIO_MISSING_THUMBNAIL for video with no thumbnailSrc', () => {
    const item: PortfolioItem = { ...cleanVideoItem, id: 'no-thumb', thumbnailSrc: undefined };
    const issues = inspectPortfolioItems([item]);
    const found = issues.find((i) => i.type === 'PORTFOLIO_MISSING_THUMBNAIL');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('MEDIUM');
    expect(found?.entityId).toBe('no-thumb');
  });

  it('does not raise PORTFOLIO_MISSING_THUMBNAIL for image items', () => {
    const item: PortfolioItem = { ...cleanImageItem, id: 'image-no-thumb', thumbnailSrc: undefined };
    const issues = inspectPortfolioItems([item]);
    expect(issues.find((i) => i.type === 'PORTFOLIO_MISSING_THUMBNAIL')).toBeUndefined();
  });

  it('returns LOW PORTFOLIO_EMPTY_DESCRIPTION for empty description', () => {
    const item: PortfolioItem = { ...cleanVideoItem, id: 'empty-desc', description: '' };
    const issues = inspectPortfolioItems([item]);
    const found = issues.find((i) => i.type === 'PORTFOLIO_EMPTY_DESCRIPTION');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('LOW');
    expect(found?.entityId).toBe('empty-desc');
  });

  it('returns LOW PORTFOLIO_EMPTY_DESCRIPTION for whitespace-only description', () => {
    const item: PortfolioItem = { ...cleanVideoItem, id: 'ws-desc', description: '   ' };
    const issues = inspectPortfolioItems([item]);
    expect(issues.find((i) => i.type === 'PORTFOLIO_EMPTY_DESCRIPTION')).toBeDefined();
  });

  it('accumulates multiple issues for the same item', () => {
    const item: PortfolioItem = {
      id: 'multi-issue',
      category: 'UGC Video',
      title: 'Multi Issue',
      description: '',
      mediaType: 'video',
      featured: false,
      // src missing, thumbnailSrc missing, description empty
    };
    const issues = inspectPortfolioItems([item]);
    expect(issues.some((i) => i.type === 'PORTFOLIO_MISSING_SRC')).toBe(true);
    expect(issues.some((i) => i.type === 'PORTFOLIO_MISSING_THUMBNAIL')).toBe(true);
    expect(issues.some((i) => i.type === 'PORTFOLIO_EMPTY_DESCRIPTION')).toBe(true);
  });

  it('includes entityId in every issue', () => {
    const item: PortfolioItem = { ...cleanVideoItem, id: 'id-check', src: undefined };
    const issues = inspectPortfolioItems([item]);
    for (const issue of issues) {
      expect(issue.entityId).toBe('id-check');
    }
  });

  it('returns no issues for empty item list', () => {
    expect(inspectPortfolioItems([])).toHaveLength(0);
  });
});

// ── inspectPricingPackages ────────────────────────────────────────────────────

describe('inspectPricingPackages', () => {
  it('returns no issues for a complete package', () => {
    expect(inspectPricingPackages([cleanPackage])).toHaveLength(0);
  });

  it('returns HIGH PRICING_INVALID_PRICE for price <= 0', () => {
    const pkg: Package = { ...cleanPackage, id: 'zero-price', price: 0 };
    const issues = inspectPricingPackages([pkg]);
    const found = issues.find((i) => i.type === 'PRICING_INVALID_PRICE');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('HIGH');
    expect(found?.entityId).toBe('zero-price');
  });

  it('returns HIGH PRICING_INVALID_PRICE for negative price', () => {
    const pkg: Package = { ...cleanPackage, id: 'neg-price', price: -100 };
    const issues = inspectPricingPackages([pkg]);
    expect(issues.find((i) => i.type === 'PRICING_INVALID_PRICE')).toBeDefined();
  });

  it('does not raise PRICING_INVALID_PRICE for price > 0', () => {
    const issues = inspectPricingPackages([{ ...cleanPackage, price: 1 }]);
    expect(issues.find((i) => i.type === 'PRICING_INVALID_PRICE')).toBeUndefined();
  });

  it('returns HIGH PRICING_EMPTY_INCLUDES for empty includes array', () => {
    const pkg: Package = { ...cleanPackage, id: 'no-includes', includes: [] };
    const issues = inspectPricingPackages([pkg]);
    const found = issues.find((i) => i.type === 'PRICING_EMPTY_INCLUDES');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('HIGH');
    expect(found?.entityId).toBe('no-includes');
  });

  it('returns MEDIUM PRICING_EMPTY_DESCRIPTION for empty description', () => {
    const pkg: Package = { ...cleanPackage, id: 'no-desc', description: '' };
    const issues = inspectPricingPackages([pkg]);
    const found = issues.find((i) => i.type === 'PRICING_EMPTY_DESCRIPTION');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('MEDIUM');
    expect(found?.entityId).toBe('no-desc');
  });

  it('returns MEDIUM PRICING_EMPTY_DESCRIPTION for whitespace-only description', () => {
    const pkg: Package = { ...cleanPackage, id: 'ws-desc', description: '   ' };
    const issues = inspectPricingPackages([pkg]);
    expect(issues.find((i) => i.type === 'PRICING_EMPTY_DESCRIPTION')).toBeDefined();
  });

  it('accumulates multiple issues for the same package', () => {
    const pkg: Package = { ...cleanPackage, id: 'multi-bad', price: 0, includes: [], description: '' };
    const issues = inspectPricingPackages([pkg]);
    expect(issues.some((i) => i.type === 'PRICING_INVALID_PRICE')).toBe(true);
    expect(issues.some((i) => i.type === 'PRICING_EMPTY_INCLUDES')).toBe(true);
    expect(issues.some((i) => i.type === 'PRICING_EMPTY_DESCRIPTION')).toBe(true);
  });

  it('returns no issues for empty package list', () => {
    expect(inspectPricingPackages([])).toHaveLength(0);
  });
});

// ── inspectCustomTiers ────────────────────────────────────────────────────────

describe('inspectCustomTiers', () => {
  it('returns no issues for a tier with a root-relative ctaHref', () => {
    expect(inspectCustomTiers([cleanCustomTier])).toHaveLength(0);
  });

  it('returns no issues for an https absolute ctaHref', () => {
    const tier: CustomTier = { ...cleanCustomTier, ctaHref: 'https://drexonyx.com/start' };
    expect(inspectCustomTiers([tier])).toHaveLength(0);
  });

  it('returns no issues for an http absolute ctaHref', () => {
    const tier: CustomTier = { ...cleanCustomTier, ctaHref: 'http://drexonyx.com/start' };
    expect(inspectCustomTiers([tier])).toHaveLength(0);
  });

  it('returns no issues for a relative path ctaHref starting with ./', () => {
    const tier: CustomTier = { ...cleanCustomTier, ctaHref: './start' };
    expect(inspectCustomTiers([tier])).toHaveLength(0);
  });

  it('returns MEDIUM CUSTOM_TIER_INVALID_CTA_HREF for empty ctaHref', () => {
    const tier: CustomTier = { ...cleanCustomTier, id: 'empty-href', ctaHref: '' };
    const issues = inspectCustomTiers([tier]);
    const found = issues.find((i) => i.type === 'CUSTOM_TIER_INVALID_CTA_HREF');
    expect(found).toBeDefined();
    expect(found?.severity).toBe('MEDIUM');
    expect(found?.entityId).toBe('empty-href');
  });

  it('returns MEDIUM CUSTOM_TIER_INVALID_CTA_HREF for an invalid href (no leading / or scheme)', () => {
    const tier: CustomTier = { ...cleanCustomTier, id: 'bad-href', ctaHref: 'start-project' };
    const issues = inspectCustomTiers([tier]);
    expect(issues.find((i) => i.type === 'CUSTOM_TIER_INVALID_CTA_HREF')).toBeDefined();
  });

  it('includes entityId in every issue', () => {
    const tier: CustomTier = { ...cleanCustomTier, id: 'tier-id-check', ctaHref: '' };
    const issues = inspectCustomTiers([tier]);
    for (const issue of issues) {
      expect(issue.entityId).toBe('tier-id-check');
    }
  });

  it('returns no issues for empty tier list', () => {
    expect(inspectCustomTiers([])).toHaveLength(0);
  });
});

// ── buildWebsiteContentReport ─────────────────────────────────────────────────

describe('buildWebsiteContentReport', () => {
  it('returns a report with a generatedAt ISO timestamp', () => {
    const report = buildWebsiteContentReport();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('portfolioItemCount is a positive integer', () => {
    const report = buildWebsiteContentReport();
    expect(report.portfolioItemCount).toBeGreaterThan(0);
    expect(Number.isInteger(report.portfolioItemCount)).toBe(true);
  });

  it('pricingPackageCount is a positive integer', () => {
    const report = buildWebsiteContentReport();
    expect(report.pricingPackageCount).toBeGreaterThan(0);
    expect(Number.isInteger(report.pricingPackageCount)).toBe(true);
  });

  it('issues is an array', () => {
    const report = buildWebsiteContentReport();
    expect(Array.isArray(report.issues)).toBe(true);
  });

  it('summary counts match issues array', () => {
    const report = buildWebsiteContentReport();
    const { issues, summary } = report;
    expect(summary.high).toBe(issues.filter((i) => i.severity === 'HIGH').length);
    expect(summary.medium).toBe(issues.filter((i) => i.severity === 'MEDIUM').length);
    expect(summary.low).toBe(issues.filter((i) => i.severity === 'LOW').length);
    expect(summary.high + summary.medium + summary.low).toBe(issues.length);
  });

  it('hasActionableIssues is true iff high or medium issues exist', () => {
    const report = buildWebsiteContentReport();
    const expected = report.summary.high > 0 || report.summary.medium > 0;
    expect(report.hasActionableIssues).toBe(expected);
  });

  it('every issue has severity, type, entityId, and detail', () => {
    const report = buildWebsiteContentReport();
    for (const issue of report.issues) {
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(issue.severity);
      expect(typeof issue.type).toBe('string');
      expect(issue.type.length).toBeGreaterThan(0);
      expect(typeof issue.entityId).toBe('string');
      expect(issue.entityId.length).toBeGreaterThan(0);
      expect(typeof issue.detail).toBe('string');
      expect(issue.detail.length).toBeGreaterThan(0);
    }
  });
});
