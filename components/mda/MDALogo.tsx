import { BRAND } from '@/lib/brand';
import styles from './mda.module.css';

type LogoSize = 'sm' | 'md' | 'lg';

interface MDALogoProps {
  size?: LogoSize;
  showEndorsement?: boolean;
  /** Path to official MDA SVG/PNG asset. When set, renders the image instead of the
   *  text fallback — drop-in replacement; no other prop changes needed. */
  assetSrc?: string;
  className?: string;
}

const SIZE_CLASS: Record<LogoSize, string> = {
  sm: styles.mdaLogoSm,
  md: styles.mdaLogoMd,
  lg: styles.mdaLogoLg,
};

export function MDALogo({
  size = 'md',
  showEndorsement = false,
  assetSrc,
  className,
}: MDALogoProps) {
  const label = showEndorsement
    ? `${BRAND.MDA_DESCRIPTOR} — ${BRAND.ENDORSEMENT}`
    : BRAND.MDA_DESCRIPTOR;

  return (
    <div
      className={[styles.mdaLogo, SIZE_CLASS[size], className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      {assetSrc ? (
        // Official vector asset — replaces text mark; no API changes needed when added
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetSrc}
          alt={BRAND.MDA_DESCRIPTOR}
          className={styles.mdaLogoAsset}
          aria-hidden="true"
        />
      ) : (
        // Text mark — temporary fallback until official asset is supplied via assetSrc
        <div className={styles.mdaLogoMark} aria-hidden="true">
          <span className={styles.mdaLogoMonogram}>{BRAND.MDA_NAME}</span>
          <span className={styles.mdaLogoDescriptor}>{BRAND.MDA_DESCRIPTOR}</span>
        </div>
      )}
      {showEndorsement && (
        <span className={styles.mdaLogoEndorsement} aria-hidden="true">
          {BRAND.ENDORSEMENT}
        </span>
      )}
    </div>
  );
}
