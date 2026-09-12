import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminDashboardCounts } from '@/lib/admin/queries';
import s from '../admin.module.css';

export const metadata = { title: 'Dashboard — Admin' };

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const counts = await getAdminDashboardCounts(session.organizationId);

  const stats = [
    { label: 'New Inquiries', value: counts.newInquiries, accent: counts.newInquiries > 0 },
    { label: 'Campaigns', value: counts.campaigns },
    { label: 'Briefs Submitted', value: counts.briefsSubmitted, accent: counts.briefsSubmitted > 0 },
    { label: 'Quote Drafts', value: counts.quoteDrafts },
    { label: 'Quotes Sent', value: counts.quoteSent, accent: counts.quoteSent > 0 },
    { label: 'Active Orders', value: counts.ordersActive, accent: counts.ordersActive > 0 },
    { label: 'Ready for QC', value: counts.assetsReadyForQc, accent: counts.assetsReadyForQc > 0 },
    { label: 'QC Fails', value: counts.qcFails, warn: counts.qcFails > 0 },
    { label: 'Pending Approvals', value: counts.pendingApprovals, accent: counts.pendingApprovals > 0 },
    { label: 'Deliveries Active', value: counts.deliveriesInProgress },
    { label: 'Payments Pending', value: counts.paymentsPending, warn: counts.paymentsPending > 0 },
  ];

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Dashboard</h1>
        <p className={s.pageSubtitle}>Internal command center overview</p>
      </div>

      <div className={s.statGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.statCard}>
            <div className={s.statLabel}>{stat.label}</div>
            <div
              className={
                stat.warn
                  ? `${s.statValue} ${s.statValueAccent}`
                  : stat.accent
                    ? `${s.statValue} ${s.statValueAccent}`
                    : s.statValue
              }
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
