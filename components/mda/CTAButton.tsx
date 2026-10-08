import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './mda.module.css';

type CTAVariant = 'primary' | 'secondary' | 'outline' | 'digital';
type CTASize = 'sm' | 'md' | 'lg';

interface CTAButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: CTAVariant;
  size?: CTASize;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  'aria-label'?: string;
}

const VARIANT_CLASS: Record<CTAVariant, string> = {
  primary:   styles.ctaBtnPrimary,
  secondary: styles.ctaBtnSecondary,
  outline:   styles.ctaBtnOutline,
  digital:   styles.ctaBtnDigital,
};

const SIZE_CLASS: Record<CTASize, string> = {
  sm: styles.ctaBtnSm,
  md: styles.ctaBtnMd,
  lg: styles.ctaBtnLg,
};

export function CTAButton({
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  children,
  className,
  type = 'button',
  disabled,
  'aria-label': ariaLabel,
}: CTAButtonProps) {
  const cls = [styles.ctaBtn, VARIANT_CLASS[variant], SIZE_CLASS[size], className]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={cls}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
