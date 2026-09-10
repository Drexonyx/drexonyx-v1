import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminOrganization } from '@/lib/admin/queries';
import s from '../admin.module.css';

export const metadata = { title: 'Organization — Admin' };

export default async function AdminOrganizationPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const org = await getAdminOrganization(session.organizationId);

  if (!org) {
    return (
      <>
        <div className={s.pageHeader}>
          <h1 className={s.pageTitle}>Organization</h1>
        </div>
        <div className={s.errorState}>Organization not found.</div>
      </>
    );
  }

  const fields = [
    { label: 'ID', value: org.id },
    { label: 'Name', value: org.name },
    { label: 'Slug', value: org.slug },
    { label: 'Status', value: org.archived_at ? `Archived ${new Date(org.archived_at).toLocaleDateString()}` : 'Active' },
  ];

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Organization</h1>
        <p className={s.pageSubtitle}>Tenant details — read-only</p>
      </div>

      <div className={s.infoGrid}>
        {fields.map((f) => (
          <div key={f.label} className={s.infoCard}>
            <div className={s.infoCardLabel}>{f.label}</div>
            <div className={s.infoCardValue}>{f.value ?? <span className={s.infoCardEmpty}>—</span>}</div>
          </div>
        ))}
      </div>
    </>
  );
}
