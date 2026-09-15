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
 * Portfolio items are added here as client-approved work is cleared for public display.
 * Do not add placeholder or fictional content.
 */
export const PORTFOLIO_ITEMS: PortfolioItem[] = [];

export function getFeaturedItems(): PortfolioItem[] {
  return PORTFOLIO_ITEMS.filter((item) => item.featured);
}

export function getItemsByCategory(category: PortfolioCategory | 'All'): PortfolioItem[] {
  if (category === 'All') return PORTFOLIO_ITEMS;
  return PORTFOLIO_ITEMS.filter((item) => item.category === category);
}
