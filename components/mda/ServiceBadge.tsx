import type { ServiceCategory } from '@/lib/brand';
import styles from './mda.module.css';

interface ServiceBadgeProps {
  category: ServiceCategory;
  className?: string;
}

const CATEGORY_CLASS: Record<ServiceCategory, string> = {
  Digital: styles.badgeDigital,
  Creative: styles.badgeCreative,
  Media: styles.badgeMedia,
  'Business Solutions': styles.badgeSolutions,
};

export function ServiceBadge({ category, className }: ServiceBadgeProps) {
  return (
    <span className={[styles.badge, CATEGORY_CLASS[category], className].filter(Boolean).join(' ')}>
      {category}
    </span>
  );
}
