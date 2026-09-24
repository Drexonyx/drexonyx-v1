'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { PORTFOLIO_CATEGORIES, type PortfolioCategory, type PortfolioItem } from '@/lib/portfolio';
import styles from './page.module.css';

const ALL_CATEGORIES = ['All', ...PORTFOLIO_CATEGORIES] as const;
type FilterCategory = PortfolioCategory | 'All';

const FORMAT_DESCRIPTIONS: Record<PortfolioCategory, { cat: string; desc: string }> = {
  'UGC Video': {
    cat: 'UGC Video Ads',
    desc: 'Creator-style video advertising built for platform-native performance — TikTok, Reels, YouTube Shorts.',
  },
  'Static Creative': {
    cat: 'Static Ad Creative',
    desc: 'High-conversion static and motion graphic assets across feed, story, and display formats.',
  },
  'Creative Strategy': {
    cat: 'Creative Strategy',
    desc: 'Brief development, hook frameworks, and creative direction aligned to campaign objectives.',
  },
};

interface PortfolioFilterProps {
  items: PortfolioItem[];
}

export default function PortfolioFilter({ items }: PortfolioFilterProps) {
  const [active, setActive] = useState<FilterCategory>('All');
  const [playing, setPlaying] = useState<PortfolioItem | null>(null);

  const filtered = active === 'All' ? items : items.filter((item) => item.category === active);

  const openVideo = useCallback((item: PortfolioItem) => {
    setPlaying(item);
  }, []);

  const closeVideo = useCallback(() => {
    setPlaying(null);
  }, []);

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!playing) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVideo();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [playing, closeVideo]);

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
        <div className={styles.emptyState}>
          <div className={styles.emptyTop}>
            <span className={styles.emptyEyebrow}>Work in Curation</span>
            <p className={styles.emptyStatement}>
              Built for performance. Cleared for display when clients approve.
            </p>
          </div>

          <div className={styles.formatRow}>
            {PORTFOLIO_CATEGORIES.map((cat) => (
              <div key={cat} className={styles.formatCol}>
                <div className={styles.formatMediaZone} aria-hidden="true" />
                <span className={styles.formatCat}>{FORMAT_DESCRIPTIONS[cat].cat}</span>
                <p className={styles.formatDesc}>{FORMAT_DESCRIPTIONS[cat].desc}</p>
              </div>
            ))}
          </div>

          <p className={styles.portfolioNotice}>
            Portfolio is actively updated as client-approved work is cleared for public display.
          </p>
        </div>
      ) : (
        <div className={styles.portfolioGrid}>
          {filtered.map((item) => (
            <article key={item.id} className={styles.portfolioCard}>
              <div className={styles.cardMedia}>
                {item.mediaType === 'video' && item.src ? (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    className={styles.cardVideo}
                  >
                    <source src={item.src} type="video/mp4" />
                  </video>
                ) : item.thumbnailSrc ? (
                  <Image
                    src={item.thumbnailSrc}
                    alt={item.title}
                    fill
                    className={styles.cardImg}
                    sizes="(max-width: 540px) 100vw, (max-width: 960px) 50vw, 25vw"
                  />
                ) : null}
                <div className={styles.cardOverlay} aria-hidden="true" />
                <div className={styles.cardBadgeRow}>
                  <span className={styles.cardCategoryBadge}>{item.category}</span>
                  <span className={styles.cardTypeBadge}>{item.mediaType}</span>
                </div>
                {item.mediaType === 'video' && item.src ? (
                  <button
                    className={styles.expandButton}
                    onClick={() => openVideo(item)}
                    aria-label={`Expand ${item.title}`}
                  />
                ) : item.mediaType === 'video' ? (
                  <div className={styles.playOverlay} aria-hidden="true">
                    <div className={styles.playIcon} />
                  </div>
                ) : null}
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.cardCategory}>{item.category}</span>
                <p className={styles.cardLabel}>{item.title}</p>
                {item.description && <p className={styles.cardNote}>{item.description}</p>}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Video lightbox — only mounted when playing; never in DOM otherwise */}
      {playing?.src && (
        <div
          className={styles.videoOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={playing.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeVideo();
          }}
        >
          <div className={styles.videoDialogInner}>
            <button
              className={styles.videoClose}
              onClick={closeVideo}
              aria-label="Close video"
            >
              ✕
            </button>
            <video
              key={playing.src}
              src={playing.src}
              controls
              playsInline
              preload="metadata"
              autoPlay
              muted
              className={styles.videoPlayer}
            >
              Your browser does not support the video element.
            </video>
            <p className={styles.videoCaption}>{playing.title}</p>
          </div>
        </div>
      )}
    </>
  );
}
