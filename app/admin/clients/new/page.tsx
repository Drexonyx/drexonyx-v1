import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/lib/admin/types';
import s from '../../admin.module.css';
import { ProvisionClientForm } from './ProvisionClientForm';

export const metadata = { title: 'New Client — Admin' };

export default async function NewClientPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const { role } = session.user;
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
