import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { getCampaign, getOrders } from '@/lib/portal/queries';
import s from '../../portal.module.css';

export const metadata = { title: 'Campaign — Client Portal' };

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: s.badgeAccent,
  DRAFT: s.badgeNeutral,
  PAUSED: s.badgeWarning,
  COMPLETED: s.badgeSuccess,
  CANCELLED: s.badgeDanger,
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const { campaignId } = await params;
  const [campaign, allOrders] = await Promise.all([
    getCampaign(session.user.organizationId, campaignId),
    getOrders(session.user.organizationId),
  ]);

  if (!campaign) notFound();

  const orders = allOrders.filter((o) => o.campaign_id === campaignId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>{campaign.name}</h1>
        <p className={s.pageSubtitle}>
          <span className={`${s.badge} ${STATUS_BADGE[campaign.status] ?? s.badgeNeutral}`}>
            {campaign.status}
          </span>
        </p>
      </div>

      <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--drex-text-secondary)', marginBottom: '0.75rem' }}>
        Orders
      </h2>

      {orders.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No orders</div>
          <div className={s.emptyBody}>Orders for this campaign will appear here.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={`${s.cellPrimary} ${s.cellMono}`}>{o.id.slice(0, 8)}…</td>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{o.status}</span>
                  </td>
                  <td className={s.cellMono}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
