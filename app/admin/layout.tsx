import { getAdminSession } from '@/lib/admin/session';
import { getAdminOrganization } from '@/lib/admin/queries';
import { MdaShellClient } from './MdaShellClient';

export const metadata = { title: 'Admin — MDA' };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  // No session → render page directly (login page handles its own layout)
  if (!session) {
    return <>{children}</>;
  }

  const org = await getAdminOrganization(session.organizationId);

  return (
    <MdaShellClient session={session} org={org}>
      {children}
    </MdaShellClient>
  );
}
