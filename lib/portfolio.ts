export type PortfolioCategory = 'UGC Video' | 'Static Creative' | 'Creative Strategy' | 'Cinematic Video';
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
  'Cinematic Video',
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
    id: 'static-feed-ad-product-2025',
    category: 'Cinematic Video',
    title: 'Cinematic Production — Dubai',
    description:
      'Internal production sample. Daytime aerial cinematic production — sweeping Dubai skyline footage built for high-production brand campaigns.',
    mediaType: 'video',
    src: '/portfolio/cinematic-dubai.mp4',
    thumbnailSrc: '/portfolio/ugc-demo-reel-thumb.svg',
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
