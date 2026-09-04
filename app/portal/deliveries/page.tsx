import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDeliveries } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Deliveries — Client Portal' };

const DELIVERY_BADGE: Record<string, string> = {
  PENDING: s.badgeNeutral,
  IN_PROGRESS: s.badgeAccent,
  COMPLETED: s.badgeSuccess,
  FAILED: s.badgeDanger,
};

export default async function DeliveriesPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const deliveries = await getDeliveries(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Deliveries</h1>
        <p className={s.pageSubtitle}>Delivery status for your completed work</p>
      </div>

      {deliveries.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No deliveries yet</div>
          <div className={s.emptyBody}>Deliveries will appear here once initiated.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Delivery ID</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className={`${s.cellPrimary} ${s.cellMono}`}>{d.id.slice(0, 8)}…</td>
                  <td>
                    <span className={`${s.badge} ${DELIVERY_BADGE[d.status] ?? s.badgeNeutral}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className={s.cellMono}>{new Date(d.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
