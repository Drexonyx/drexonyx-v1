import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAdminOrganization } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import { AdminNav } from './AdminNav';
import { AdminSignOut } from './AdminSignOut';
import s from './admin.module.css';

export const metadata = { title: 'Admin — Drexonyx' };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Login page — render without shell
  if (!session) {
    return <>{children}</>;
  }

  // Only staff roles may access the admin surface
  if (!isAdminRole(session.user.role)) {
    redirect('/admin/login');
  }

  const org = await getAdminOrganization(session.user.organizationId);

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div className={s.adminLabel}>Admin</div>
          <div className={s.orgName}>{org?.name ?? '—'}</div>
          <div className={s.roleLabel}>{session.user.role}</div>
        </div>

        <AdminNav />

        <div className={s.sidebarFooter}>
          <AdminSignOut />
        </div>
      </aside>

      <main className={s.content}>{children}</main>
    </div>
  );
}
