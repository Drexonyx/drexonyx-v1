import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminAssets } from '@/lib/admin/queries';
import s from '../admin.module.css';

export const metadata = { title: 'Assets — Admin' };

// DR 0006: valid Asset states are UPLOADED, PROCESSING, READY_FOR_QC,
// CLIENT_PREVIEW, REVISION_REQUIRED, REJECTED.
function assetBadgeClass(status: string) {
  if (status === 'UPLOADED') return `${s.badge} ${s.badgeNeutral}`;
  if (status === 'PROCESSING') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'READY_FOR_QC') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'CLIENT_PREVIEW') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'REVISION_REQUIRED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'REJECTED') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminAssetsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const assets = await getAdminAssets(session.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Assets</h1>
        <p className={s.pageSubtitle}>All statuses — UPLOADED, PROCESSING, READY_FOR_QC, CLIENT_PREVIEW, REVISION_REQUIRED, REJECTED</p>
      </div>

      {assets.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No assets</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Name</th>
                <th>File Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{a.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{a.order_id ? a.order_id.slice(0, 8) + '…' : '—'}</td>
                  <td>{a.name ?? <span style={{ color: 'var(--drex-text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                  <td className={s.cellMono}>{a.file_type ?? '—'}</td>
                  <td>
                    <span className={assetBadgeClass(a.status)}>{a.status}</span>
                    {a.archived_at && (
                      <span className={`${s.badge} ${s.badgeDanger}`} style={{ marginLeft: '0.375rem' }}>
                        Archived
                      </span>
                    )}
                  </td>
                  <td className={s.cellMono}>
                    {a.updated_at ? new Date(a.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
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
