import styles from './mda.module.css';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={[styles.sectionHeading, className].filter(Boolean).join(' ')}>
      {eyebrow && <p className={styles.sectionEyebrow}>{eyebrow}</p>}
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && <p className={styles.sectionDesc}>{description}</p>}
    </div>
  );
}
