import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDashboardCounts } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Dashboard — Client Portal' };

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

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

      {/* Credit balance — primary action card */}
      <div className={s.creditBalanceCard}>
        <div className={s.creditBalanceMain}>
          <div className={s.creditBalanceLabel}>Credit Balance</div>
          <div className={s.creditBalanceValue}>{formatCredits(counts.creditBalance)}</div>
          <div className={s.creditBalanceUnit}>credits available</div>
        </div>
        <div className={s.creditBalanceActions}>
          <Link href="/portal/credits/buy" className={s.creditBuyBtn}>
            Buy Credits
          </Link>
          <Link href="/portal/credits" className={s.creditHistoryLink}>
            View history
          </Link>
        </div>
      </div>

      {counts.creditBalance > 0 && (
        <div className={s.startProductionBanner}>
          <p className={s.startProductionText}>
            You have <strong>{formatCredits(counts.creditBalance)} credits</strong> ready to use.
          </p>
          <Link href="/portal/production/new" className={s.startProductionBtn}>
            Start a Production
          </Link>
        </div>
      )}

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
