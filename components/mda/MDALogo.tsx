import { BRAND } from '@/lib/brand';
import styles from './mda.module.css';

type LogoSize = 'sm' | 'md' | 'lg';

interface MDALogoProps {
  size?: LogoSize;
  showEndorsement?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<LogoSize, string> = {
  sm: styles.mdaLogoSm,
  md: styles.mdaLogoMd,
  lg: styles.mdaLogoLg,
};

export function MDALogo({ size = 'md', showEndorsement = false, className }: MDALogoProps) {
  const label = showEndorsement
    ? `${BRAND.MDA_DESCRIPTOR} — ${BRAND.ENDORSEMENT}`
    : BRAND.MDA_DESCRIPTOR;

  return (
    <div
      className={[styles.mdaLogo, SIZE_CLASS[size], className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <div className={styles.mdaLogoMark} aria-hidden="true">
        <span className={styles.mdaLogoMonogram}>{BRAND.MDA_NAME}</span>
        <span className={styles.mdaLogoDescriptor}>{BRAND.MDA_DESCRIPTOR}</span>
      </div>
      {showEndorsement && (
        <span className={styles.mdaLogoEndorsement} aria-hidden="true">
          {BRAND.ENDORSEMENT}
        </span>
      )}
    </div>
  );
}
