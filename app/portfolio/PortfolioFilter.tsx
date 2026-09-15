'use client';

import { useState } from 'react';
import { PORTFOLIO_CATEGORIES, type PortfolioCategory, type PortfolioItem } from '@/lib/portfolio';
import styles from './page.module.css';

const ALL_CATEGORIES = ['All', ...PORTFOLIO_CATEGORIES] as const;
type FilterCategory = PortfolioCategory | 'All';

interface PortfolioFilterProps {
  items: PortfolioItem[];
}

export default function PortfolioFilter({ items }: PortfolioFilterProps) {
  const [active, setActive] = useState<FilterCategory>('All');

  const filtered =
    active === 'All' ? items : items.filter((item) => item.category === active);

  return (
    <>
      <div className={styles.filterRow} role="group" aria-label="Filter by category">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.filterBtn} ${cat === active ? styles.filterBtnActive : ''}`}
            aria-pressed={cat === active}
            onClick={() => setActive(cat as FilterCategory)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.portfolioNotice}>
          <p>
            Portfolio is actively updated as client-approved work is cleared for public display.
          </p>
        </div>
      ) : (
        <div className={styles.portfolioGrid}>
          {filtered.map((item) => (
            <article key={item.id} className={styles.portfolioCard}>
              <div className={styles.cardPlaceholder} aria-hidden="true">
                <span className={styles.cardPlaceholderIcon}>
                  {item.mediaType === 'video' ? '▶' : '◻'}
                </span>
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.cardCategory}>{item.category}</span>
                <p className={styles.cardLabel}>{item.title}</p>
                {item.description && (
                  <p className={styles.cardNote}>{item.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
