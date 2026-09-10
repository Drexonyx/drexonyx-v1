import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminQcReviews, getAdminAssets } from '@/lib/admin/queries';
import s from '../admin.module.css';
import { QcForm } from './QcForm';

export const metadata = { title: 'QC Reviews — Admin' };

function verdictBadgeClass(verdict: string) {
  if (verdict === 'PASS') return `${s.badge} ${s.badgeSuccess}`;
  if (verdict === 'FAIL') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminQcPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { organizationId, role } = session;
  const canSubmit = role === 'OWNER' || role === 'ADMIN_OPERATIONS' || role === 'QC';

  const [reviews, assets] = await Promise.all([
    getAdminQcReviews(organizationId),
    getAdminAssets(organizationId),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>QC Reviews</h1>
        <p className={s.pageSubtitle}>PASS → CLIENT_PREVIEW · FAIL → REVISION_REQUIRED</p>
      </div>

      {canSubmit && (
        <div className={s.actionBar}>
          <QcForm assets={assets.map((a) => ({ id: a.id, name: a.name ?? null, status: a.status }))} />
        </div>
      )}

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
                <th>Reviewer</th>
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
                  <td className={s.cellMono}>{r.reviewer_id ? r.reviewer_id.slice(0, 8) + '…' : '—'}</td>
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
