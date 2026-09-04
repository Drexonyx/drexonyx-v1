import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminQcReviews } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'QC Reviews — Admin' };

function verdictBadgeClass(verdict: string) {
  if (verdict === 'PASS') return `${s.badge} ${s.badgeSuccess}`;
  if (verdict === 'FAIL') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminQcPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const reviews = await getAdminQcReviews(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>QC Reviews</h1>
        <p className={s.pageSubtitle}>Quality control verdicts — read-only</p>
      </div>

      {reviews.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No QC reviews</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Asset</th>
                <th>Verdict</th>
                <th>Notes</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{r.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{r.asset_id.slice(0, 8)}…</td>
                  <td>
                    <span className={verdictBadgeClass(r.verdict)}>{r.verdict}</span>
                  </td>
                  <td>{r.notes ?? <span style={{ color: 'var(--drex-text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                  <td className={s.cellMono}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
