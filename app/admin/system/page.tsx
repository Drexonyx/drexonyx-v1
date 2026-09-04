import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'System — Admin' };

export default async function AdminSystemPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const fields = [
    { label: 'Platform', value: 'Drexonyx V1' },
    { label: 'Auth Surface', value: 'Admin + Portal (dual-provider NextAuth v5)' },
    { label: 'Session Strategy', value: 'JWT' },
    { label: 'Admin Roles', value: 'OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION, QC' },
    { label: 'Database', value: 'PostgreSQL — Drizzle ORM' },
    { label: 'Schema Namespaces', value: 'core, identity, commercial, production, financial, system' },
    { label: 'Current Role', value: session.user.role },
    { label: 'User ID', value: session.user.userId },
    { label: 'Organization ID', value: session.user.organizationId },
  ];

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>System</h1>
        <p className={s.pageSubtitle}>Platform configuration — read-only</p>
      </div>

      <div className={s.infoGrid}>
        {fields.map((f) => (
          <div key={f.label} className={s.infoCard}>
            <div className={s.infoCardLabel}>{f.label}</div>
            <div className={s.infoCardValue}>{f.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
