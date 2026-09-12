import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminBriefs, getAdminCampaigns } from '@/lib/admin/queries';
import { CreateBriefForm } from './CreateBriefForm';
import { BriefStatusActions } from './BriefStatusActions';
import s from '../admin.module.css';

export const metadata = { title: 'Briefs — Admin' };

function statusBadgeClass(status: string): string {
  if (status === 'DRAFT') return `${s.badge} ${s.badgeNeutral}`;
  if (status === 'SUBMITTED') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'APPROVED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'REVISION_REQUIRED') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminBriefsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const canAct = session.role === 'OWNER' || session.role === 'ADMIN_OPERATIONS';

  const [allBriefs, campaigns] = await Promise.all([
    getAdminBriefs(session.organizationId),
    getAdminCampaigns(session.organizationId),
  ]);

  const activeCampaigns = campaigns
    .filter((c) => !c.archived_at)
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Briefs</h1>
        <p className={s.pageSubtitle}>Campaign briefs authored by admin — DR 0004 state machine</p>
      </div>

      {canAct && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--drex-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            New Brief
          </h2>
          {activeCampaigns.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--drex-text-muted)' }}>
              No active campaigns. Create a campaign first.
            </div>
          ) : (
            <CreateBriefForm campaigns={activeCampaigns} />
          )}
        </div>
      )}

      {allBriefs.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No briefs</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Brief</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Content</th>
                <th>Updated</th>
                {canAct && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {allBriefs.map((brief) => (
                <tr key={brief.id}>
                  <td className={s.cellPrimary}>
                    <div className={s.cellMono} style={{ opacity: 0.55 }}>{brief.id.slice(0, 8)}…</div>
                    {brief.archived_at && (
                      <span className={`${s.badge} ${s.badgeDanger}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>Archived</span>
                    )}
                  </td>
                  <td className={s.cellPrimary}>{brief.campaign_name}</td>
                  <td>
                    <span className={statusBadgeClass(brief.status)}>{brief.status}</span>
                  </td>
                  <td
                    style={{
                      maxWidth: '260px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8125rem',
                      color: 'var(--drex-text-secondary)',
                    }}
                    title={brief.brief_text ?? undefined}
                  >
                    {brief.brief_text ?? <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td className={s.cellMono}>
                    {brief.updated_at
                      ? new Date(brief.updated_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  {canAct && (
                    <td>
                      <BriefStatusActions
                        briefId={brief.id}
                        status={brief.status as 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUIRED' | 'APPROVED'}
                        canAct={canAct}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
