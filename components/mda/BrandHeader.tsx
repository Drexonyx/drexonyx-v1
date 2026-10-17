import type { ReactNode } from 'react';
import { MDALogo } from './MDALogo';
import styles from './mda.module.css';

interface BrandHeaderProps {
  headline?: string;
  subheadline?: string;
  showLogo?: boolean;
  children?: ReactNode;
  className?: string;
}

export function BrandHeader({
  headline,
  subheadline,
  showLogo = true,
  children,
  className,
}: BrandHeaderProps) {
  return (
    <div className={[styles.brandHeader, className].filter(Boolean).join(' ')}>
      <div className={styles.brandHeaderTop}>
        {showLogo && <MDALogo size="md" showEndorsement />}
        {children && <div className={styles.brandHeaderActions}>{children}</div>}
      </div>
      {(headline || subheadline) && (
        <div className={styles.brandHeaderMeta}>
          {headline && <h1 className={styles.brandHeaderHeadline}>{headline}</h1>}
          {subheadline && <p className={styles.brandHeaderSub}>{subheadline}</p>}
        </div>
      )}
    </div>
  );
}
