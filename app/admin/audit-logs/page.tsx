import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminAuditEvents } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Audit Logs — Admin' };

export default async function AdminAuditLogsPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const events = await getAdminAuditEvents(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Audit Logs</h1>
        <p className={s.pageSubtitle}>System audit trail — read-only, last 200 events</p>
      </div>

      {events.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No audit events</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className={s.cellPrimary}>{e.action}</td>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{e.entity_type}</span>
                  </td>
                  <td className={s.cellMono}>{e.entity_id ? e.entity_id.slice(0, 8) + '…' : '—'}</td>
                  <td className={s.cellMono}>{e.actor_id ? e.actor_id.slice(0, 8) + '…' : '—'}</td>
                  <td>
                    {e.actor_role ? (
                      <span className={`${s.badge} ${s.badgeNeutral}`}>{e.actor_role}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={s.cellMono}>
                    {e.created_at ? new Date(e.created_at).toLocaleString() : '—'}
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
