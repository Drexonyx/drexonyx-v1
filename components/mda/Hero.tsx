import { CTAButton } from './CTAButton';
import styles from './mda.module.css';

interface HeroCTA {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'digital';
}

interface HeroProps {
  eyebrow?: string;
  heading: string;
  headingAccent?: string;
  subheading?: string;
  ctas?: HeroCTA[];
  className?: string;
}

export function Hero({
  eyebrow,
  heading,
  headingAccent,
  subheading,
  ctas = [],
  className,
}: HeroProps) {
  return (
    <section
      className={[styles.hero, className].filter(Boolean).join(' ')}
      aria-labelledby="mda-hero-heading"
    >
      <div className={styles.heroInner}>
        {eyebrow && <p className={styles.heroEyebrow}>{eyebrow}</p>}
        <h1 id="mda-hero-heading" className={styles.heroHeading}>
          {heading}
          {headingAccent && (
            <>
              {' '}
              <span className={styles.heroHeadingAccent}>{headingAccent}</span>
            </>
          )}
        </h1>
        {subheading && <p className={styles.heroSub}>{subheading}</p>}
        {ctas.length > 0 && (
          <div className={styles.heroCtas}>
            {ctas.map((cta) => (
              <CTAButton key={cta.href} href={cta.href} variant={cta.variant ?? 'primary'}>
                {cta.label}
              </CTAButton>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
