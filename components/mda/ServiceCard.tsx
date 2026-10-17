import type { ServiceCategory } from '@/lib/brand';
import { ServiceBadge } from './ServiceBadge';
import { CTAButton } from './CTAButton';
import styles from './mda.module.css';

interface ServiceCardProps {
  category: ServiceCategory;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  className?: string;
}

const CATEGORY_CARD_CLASS: Record<ServiceCategory, string> = {
  Digital: styles.serviceCardDigital,
  Creative: styles.serviceCardCreative,
  Media: styles.serviceCardMedia,
  'Business Solutions': styles.serviceCardSolutions,
};

export function ServiceCard({
  category,
  title,
  description,
  href,
  ctaLabel = 'Learn More →',
  className,
}: ServiceCardProps) {
  return (
    <article
      className={[styles.serviceCard, CATEGORY_CARD_CLASS[category], className]
        .filter(Boolean)
        .join(' ')}
    >
      <ServiceBadge category={category} />
      <h3 className={styles.serviceCardTitle}>{title}</h3>
      <p className={styles.serviceCardDesc}>{description}</p>
      {href && (
        <div className={styles.serviceCardFooter}>
          <CTAButton href={href} variant="outline" size="sm">
            {ctaLabel}
          </CTAButton>
        </div>
      )}
    </article>
  );
}
