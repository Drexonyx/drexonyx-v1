import { BRAND } from '@/lib/brand';
import styles from './mda.module.css';

interface EndorsementFooterProps {
  showBrandName?: boolean;
  className?: string;
}

export function EndorsementFooter({ showBrandName = true, className }: EndorsementFooterProps) {
  return (
    <div className={[styles.endorsement, className].filter(Boolean).join(' ')}>
      {showBrandName && (
        <>
          <span className={styles.endorsementMark}>{BRAND.MDA_DESCRIPTOR}</span>
          <span className={styles.endorsementDot} aria-hidden="true" />
        </>
      )}
      <span>{BRAND.ENDORSEMENT}</span>
    </div>
  );
}
