import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminCampaigns } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Campaigns — Admin' };

export default async function AdminCampaignsPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const campaigns = await getAdminCampaigns(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Campaigns</h1>
        <p className={s.pageSubtitle}>All campaigns — read-only</p>
      </div>

      {campaigns.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No campaigns</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className={s.cellPrimary}>
                    {c.name}
                    {c.archived_at && (
                      <span className={`${s.badge} ${s.badgeDanger}`} style={{ marginLeft: '0.5rem' }}>
                        Archived
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{c.status}</span>
                  </td>
                  <td className={s.cellMono}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
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
