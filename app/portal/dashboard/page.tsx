import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardCounts } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Dashboard — Client Portal' };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const counts = await getDashboardCounts(session.user.organizationId);

  const stats = [
    { label: 'Campaigns', value: counts.campaigns },
    { label: 'Ready for Review', value: counts.assetsReadyForReview, accent: true },
    { label: 'In Revision', value: counts.assetsInRevision },
    { label: 'Pending Approvals', value: counts.pendingApprovals, accent: counts.pendingApprovals > 0 },
    { label: 'Pending Quotes', value: counts.pendingQuotes },
    { label: 'Delivered', value: counts.completedDeliveries },
  ];

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Dashboard</h1>
        <p className={s.pageSubtitle}>Your project overview</p>
      </div>

      <div className={s.statGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.statCard}>
            <div className={s.statLabel}>{stat.label}</div>
            <div className={stat.accent ? `${s.statValue} ${s.statValueAccent}` : s.statValue}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
