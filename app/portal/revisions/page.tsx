import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getClientAssets, getRevisionInitiatedAssetIds } from '@/lib/portal/queries';
import { RevisionRequestButton } from './RevisionRequestButton';
import s from '../portal.module.css';

export const metadata = { title: 'Revisions — Client Portal' };

export default async function RevisionsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const [assets, revisionInitiatedIds] = await Promise.all([
    getClientAssets(session.user.organizationId),
    getRevisionInitiatedAssetIds(session.user.organizationId),
  ]);
  const revisions = assets.filter((a) => a.status === 'REVISION_REQUIRED');

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Revisions</h1>
        <p className={s.pageSubtitle}>Assets currently undergoing revision</p>
      </div>

      {revisions.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No revisions in progress</div>
          <div className={s.emptyBody}>Assets undergoing revision will appear here.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((a) => {
                const initiated = revisionInitiatedIds.has(a.id);
                return (
                  <tr key={a.id}>
                    <td className={`${s.cellPrimary} ${s.cellMono}`}>{a.id.slice(0, 8)}…</td>
                    <td>
                      {initiated ? (
                        <span className={`${s.badge} ${s.badgeWarning}`}>Revision in Progress</span>
                      ) : (
                        <span className={`${s.badge} ${s.badgeNeutral}`}>
                          Revision Pending — Pending Scheduling
                        </span>
                      )}
                    </td>
                    <td className={s.cellMono}>{new Date(a.updated_at).toLocaleDateString()}</td>
                    <td>
                      {/* DR 0100 §2.6: Show "Request Revision" only for assets with no REVISION_INITIATED event */}
                      {!initiated ? <RevisionRequestButton assetId={a.id} /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
