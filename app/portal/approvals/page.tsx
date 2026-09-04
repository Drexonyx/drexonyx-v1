import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getApprovals } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Approvals — Client Portal' };

const APPROVAL_BADGE: Record<string, string> = {
  PENDING: s.badgeWarning,
  APPROVED: s.badgeSuccess,
  REJECTED: s.badgeDanger,
  EXPIRED: s.badgeNeutral,
};

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const approvals = await getApprovals(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Approvals</h1>
        <p className={s.pageSubtitle}>Approval requests for your deliverables</p>
      </div>

      {approvals.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No approvals yet</div>
          <div className={s.emptyBody}>Approval requests will appear here.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Approval ID</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td className={`${s.cellPrimary} ${s.cellMono}`}>{a.id.slice(0, 8)}…</td>
                  <td>
                    <span className={`${s.badge} ${APPROVAL_BADGE[a.status] ?? s.badgeNeutral}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className={s.cellMono}>
                    {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
