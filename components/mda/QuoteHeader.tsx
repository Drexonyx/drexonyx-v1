import { MDALogo } from './MDALogo';
import styles from './mda.module.css';

interface QuoteHeaderProps {
  type?: string;
  refNumber?: string;
  date?: string;
  className?: string;
}

export function QuoteHeader({
  type = 'Quote',
  refNumber,
  date,
  className,
}: QuoteHeaderProps) {
  return (
    <div className={[styles.quoteHeader, className].filter(Boolean).join(' ')}>
      <div className={styles.quoteHeaderBrand}>
        <div className={styles.quoteHeaderType}>{type}</div>
        <MDALogo size="md" showEndorsement />
      </div>
      {(refNumber || date) && (
        <div className={styles.quoteHeaderMeta}>
          {refNumber && <div className={styles.quoteHeaderRef}>{refNumber}</div>}
          {date && <div className={styles.quoteHeaderDate}>{date}</div>}
        </div>
      )}
    </div>
  );
}
