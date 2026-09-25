import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminCampaigns } from '@/lib/admin/queries';
import { CreateCampaignForm } from './CreateCampaignForm';
import { LaunchFacebookPostForm } from './LaunchFacebookPostForm';
import s from '../admin.module.css';

export const metadata = { title: 'Campaigns — Admin' };

export default async function AdminCampaignsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const canCreate =
    session.role === 'OWNER' || session.role === 'ADMIN_OPERATIONS';

  const campaigns = await getAdminCampaigns(session.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Campaigns</h1>
        <p className={s.pageSubtitle}>All campaigns in the production organization</p>
      </div>

      {canCreate && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--drex-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            New Campaign
          </h2>
          <CreateCampaignForm />
        </div>
      )}

      {canCreate && campaigns.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--drex-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Publish to Facebook
          </h2>
          <LaunchFacebookPostForm campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      )}

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
