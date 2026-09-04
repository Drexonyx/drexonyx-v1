import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getBrandDna } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Brand DNA — Client Portal' };

const DNA_FIELDS = [
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'brand_voice', label: 'Brand Voice' },
  { key: 'visual_guidelines_summary', label: 'Visual Guidelines' },
  { key: 'target_audience', label: 'Target Audience' },
] as const;

export default async function BrandDnaPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const dna = await getBrandDna(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Brand DNA</h1>
        <p className={s.pageSubtitle}>Your brand identity on file</p>
      </div>

      {!dna ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No brand DNA on file</div>
          <div className={s.emptyBody}>
            Your brand profile will appear here once your team has set it up.
          </div>
        </div>
      ) : (
        <div className={s.dnaGrid}>
          {DNA_FIELDS.map(({ key, label }) => (
            <div key={key} className={s.dnaCard}>
              <div className={s.dnaCardLabel}>{label}</div>
              {dna[key] ? (
                <div className={s.dnaCardValue}>{dna[key]}</div>
              ) : (
                <div className={s.dnaCardEmpty}>Not set</div>
              )}
            </div>
          ))}
          {dna.updated_at && (
            <p style={{ fontSize: '0.75rem', color: 'var(--drex-text-muted)', marginTop: '0.25rem' }}>
              Last updated {new Date(dna.updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </>
  );
}
