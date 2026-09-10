import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import s from '../../admin.module.css';
import { ProvisionClientForm } from './ProvisionClientForm';

export const metadata = { title: 'New Client — Admin' };

export default async function NewClientPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { role } = session;
  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    redirect('/admin/dashboard');
  }

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>New Client</h1>
        <p className={s.pageSubtitle}>
          Provision a new client organization and initial CLIENT user
        </p>
      </div>
      <ProvisionClientForm />
    </>
  );
}
