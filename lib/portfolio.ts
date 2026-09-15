export type PortfolioCategory = 'UGC Video' | 'Static Creative' | 'Creative Strategy';
export type PortfolioMediaType = 'video' | 'image';

export interface PortfolioItem {
  id: string;
  category: PortfolioCategory;
  title: string;
  description: string;
  mediaType: PortfolioMediaType;
  /** Absolute URL populated once the asset is cleared for public display. */
  src?: string;
  /** Thumbnail for video items. */
  thumbnailSrc?: string;
  featured: boolean;
  industry?: string;
}

export const PORTFOLIO_CATEGORIES: readonly PortfolioCategory[] = [
  'UGC Video',
  'Static Creative',
  'Creative Strategy',
];

/**
 * Portfolio items for the public showcase.
 * Items marked with "Internal production sample" in their description are agency-produced
 * demonstration pieces, not client work. Never represent internal samples as client work.
 * Client-approved work is added here once cleared for public display.
 */
export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: 'ugc-demo-reel-2025',
    category: 'UGC Video',
    title: 'Performance Creative — Demo Reel',
    description:
      'Internal production sample. Hook-led AI UGC concept built for TikTok and Reels. 15-second direct-response format demonstrating the DREXONYX production workflow.',
    mediaType: 'video',
    src: '/portfolio/ugc-demo-reel.mp4',
    thumbnailSrc: '/portfolio/ugc-demo-reel-thumb.svg',
    featured: true,
    industry: 'Consumer Goods',
  },
  {
    id: 'ugc-ecommerce-launch-2025',
    category: 'UGC Video',
    title: 'E-Commerce Launch Ad',
    description:
      'Internal production sample. Product-launch UGC format with testimonial-style hook and benefit-first structure, optimised for Meta and TikTok conversion campaigns.',
    mediaType: 'video',
    thumbnailSrc: '/portfolio/ugc-ecommerce-launch-thumb.svg',
    featured: false,
    industry: 'E-Commerce',
  },
  {
    id: 'static-feed-ad-product-2025',
    category: 'Static Creative',
    title: 'Feed Ad — Product Feature',
    description:
      'Internal production sample. High-contrast static feed ad in 1:1 format for Instagram and Facebook feed placements, built for scroll-stop performance.',
    mediaType: 'image',
    src: '/portfolio/static-feed-ad-product-feature.svg',
    thumbnailSrc: '/portfolio/static-feed-ad-product-feature.svg',
    featured: false,
    industry: 'Consumer Goods',
  },
  {
    id: 'campaign-brief-sample-2025',
    category: 'Creative Strategy',
    title: 'Campaign Brief Sample',
    description:
      'Internal production sample. Full creative strategy brief covering campaign objective, core creative concept, hook framework, CTA direction, and platform guidance.',
    mediaType: 'image',
    src: '/portfolio/campaign-brief-sample.svg',
    thumbnailSrc: '/portfolio/campaign-brief-sample.svg',
    featured: false,
    industry: 'Retail',
  },
];

export function getFeaturedItems(): PortfolioItem[] {
  return PORTFOLIO_ITEMS.filter((item) => item.featured);
}

export function getItemsByCategory(category: PortfolioCategory | 'All'): PortfolioItem[] {
  if (category === 'All') return PORTFOLIO_ITEMS;
  return PORTFOLIO_ITEMS.filter((item) => item.category === category);
}
