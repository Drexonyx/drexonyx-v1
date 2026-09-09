import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminMembers } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Members — Admin' };

function roleBadgeClass(role: string) {
  if (role === 'OWNER') return `${s.badge} ${s.badgeAccent}`;
  if (role === 'CLIENT') return `${s.badge} ${s.badgeNeutral}`;
  if (role === 'AGENT') return `${s.badge} ${s.badgeNeutral}`;
  return `${s.badge} ${s.badgeWarning}`;
}

export default async function AdminMembersPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const members = await getAdminMembers(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Members</h1>
        <p className={s.pageSubtitle}>All organization memberships — read-only</p>
      </div>

      {members.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No members</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Role</th>
                <th>Membership Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.membershipId}>
                  <td className={s.cellPrimary}>{m.email}</td>
                  <td>{m.display_name ?? <span className={s.infoCardEmpty}>—</span>}</td>
                  <td>
                    <span className={roleBadgeClass(m.role)}>{m.role}</span>
                  </td>
                  <td>
                    {m.archived_at ? (
                      <span className={`${s.badge} ${s.badgeDanger}`}>Archived</span>
                    ) : m.user_archived_at ? (
                      <span className={`${s.badge} ${s.badgeDanger}`}>User Archived</span>
                    ) : (
                      <span className={`${s.badge} ${s.badgeSuccess}`}>Active</span>
                    )}
                  </td>
                  <td className={s.cellMono}>
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
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
