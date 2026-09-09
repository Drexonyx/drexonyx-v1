import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCampaigns } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Campaigns — Client Portal' };

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: s.badgeAccent,
  DRAFT: s.badgeNeutral,
  PAUSED: s.badgeWarning,
  COMPLETED: s.badgeSuccess,
  CANCELLED: s.badgeDanger,
};

export default async function CampaignsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const campaigns = await getCampaigns(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Campaigns</h1>
        <p className={s.pageSubtitle}>All active and past campaigns</p>
      </div>

      {campaigns.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No campaigns yet</div>
          <div className={s.emptyBody}>Your campaigns will appear here once created.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className={s.cellPrimary}>
                    <Link href={`/portal/campaigns/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>
                    <span className={`${s.badge} ${STATUS_BADGE[c.status] ?? s.badgeNeutral}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className={s.cellMono}>
                    {new Date(c.created_at).toLocaleDateString()}
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
