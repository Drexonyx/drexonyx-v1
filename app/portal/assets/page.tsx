import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getClientAssets } from '@/lib/portal/queries';
import { mapClientAssetStatus } from '@/lib/portal/types';
import s from '../portal.module.css';

export const metadata = { title: 'Assets — Client Portal' };

export default async function AssetsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const assets = await getClientAssets(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Assets</h1>
        <p className={s.pageSubtitle}>Assets ready for your review or in revision</p>
      </div>

      {assets.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No assets to review</div>
          <div className={s.emptyBody}>Assets ready for review will appear here.</div>
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
