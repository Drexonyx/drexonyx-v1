'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './ExamplesLightbox.module.css';

interface Example {
  src: string;
  alt: string;
}

interface TierProps {
  badge: string;
  label: string;
  examples: Example[];
  gridClass: string;
  cardClass?: string;
  priority?: boolean;
}

function ExampleCard({
  example,
  cardClass,
  priority,
  onOpen,
}: {
  example: Example;
  cardClass?: string;
  priority?: boolean;
  onOpen: (src: string, alt: string) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.card} ${cardClass ?? ''}`}
      onClick={() => onOpen(example.src, example.alt)}
      aria-label={`View full size: ${example.alt}`}
    >
      <Image
        src={example.src}
        alt={example.alt}
        width={1440}
        height={900}
        className={styles.cardImg}
        quality={80}
        priority={priority}
      />
      <span className={styles.zoomHint} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 1h5v5M6 10l9-9M1 6V1h5M6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  );
}

export function ExamplesTier({ badge, label, examples, gridClass, cardClass, priority }: TierProps) {
  const [open, setOpen] = useState<{ src: string; alt: string } | null>(null);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    <div className={styles.tier}>
      <div className={styles.tierHeader}>
        <span className={styles.tierBadge}>{badge}</span>
        <span className={styles.tierLabel}>{label}</span>
      </div>

      <div className={gridClass}>
        {examples.map((ex, i) => (
          <ExampleCard
            key={ex.src}
            example={ex}
            cardClass={cardClass}
            priority={priority && i === 0}
            onOpen={(src, alt) => setOpen({ src, alt })}
          />
        ))}
      </div>

      {open && (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={open.alt}
          onClick={close}
        >
          <button
            type="button"
            className={styles.closeBtn}
            onClick={close}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className={styles.lightboxImg} onClick={(e) => e.stopPropagation()}>
            <Image
              src={open.src}
              alt={open.alt}
              width={1440}
              height={900}
              className={styles.fullImg}
              quality={90}
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
