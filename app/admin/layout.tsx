import { getAdminSession } from '@/lib/admin/session';
import { getAdminOrganization } from '@/lib/admin/queries';
import { AdminNav } from './AdminNav';
import { AdminSignOut } from './AdminSignOut';
import s from './admin.module.css';

export const metadata = { title: 'Admin — Drexonyx' };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  // Login page — render without shell
  if (!session) {
    return <>{children}</>;
  }

  const org = await getAdminOrganization(session.organizationId);

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div className={s.mdaBrand}>
            <span className={s.mdaBrandMono}>MDA</span>
            <span className={s.mdaBrandDesc}>MASTER DIGITAL AGENCY</span>
          </div>
          <div className={s.adminLabel}>Admin</div>
          <div className={s.orgName}>{org?.name ?? '—'}</div>
          <div className={s.roleLabel}>{session.role}</div>
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
