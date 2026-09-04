import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getClientAssets } from '@/lib/portal/queries';
import { mapClientAssetStatus } from '@/lib/portal/types';
import s from '../portal.module.css';

export const metadata = { title: 'Production Status — Client Portal' };

export default async function ProductionPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const assets = await getClientAssets(session.user.organizationId);

  const readyCount = assets.filter((a) => a.status === 'CLIENT_PREVIEW').length;
  const revisionCount = assets.filter((a) => a.status === 'REVISION_REQUIRED').length;

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Production Status</h1>
        <p className={s.pageSubtitle}>Current status of your deliverables in production</p>
      </div>

      <div className={s.statGrid} style={{ marginBottom: '2rem' }}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Ready for Review</div>
          <div className={`${s.statValue} ${s.statValueAccent}`}>{readyCount}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>In Revision</div>
          <div className={s.statValue}>{revisionCount}</div>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>Nothing in production yet</div>
          <div className={s.emptyBody}>Your deliverables will appear here as they move through production.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className={`${s.cellPrimary} ${s.cellMono}`}>{a.id.slice(0, 8)}…</td>
                  <td>
                    <span
                      className={`${s.badge} ${a.status === 'CLIENT_PREVIEW' ? s.badgeAccent : s.badgeWarning}`}
                    >
                      {mapClientAssetStatus(a.status)}
                    </span>
                  </td>
                  <td className={s.cellMono}>{new Date(a.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
