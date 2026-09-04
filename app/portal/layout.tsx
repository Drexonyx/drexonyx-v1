import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOrganization } from '@/lib/portal/queries';
import { PortalNav } from './PortalNav';
import { PortalSignOut } from './PortalSignOut';
import s from './portal.module.css';

export const metadata = { title: 'Client Portal — Drexonyx' };

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Login page — render without shell
  if (!session) {
    return <>{children}</>;
  }

  // Only CLIENT role may access the portal
  if (session.user.role !== 'CLIENT') {
    redirect('/portal/login');
  }

  const org = await getOrganization(session.user.organizationId);

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div className={s.portalLabel}>Client Portal</div>
          <div className={s.orgName}>{org?.name ?? '—'}</div>
          <div className={s.userName}>{session.user.email}</div>
        </div>

        <PortalNav />

        <div className={s.sidebarFooter}>
          <PortalSignOut />
        </div>
      </aside>

      <main className={s.content}>{children}</main>
    </div>
  );
}
