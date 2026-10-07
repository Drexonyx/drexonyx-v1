import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminDashboardCounts } from '@/lib/admin/queries';
import { getSalesEngineStatus, nextUtcHour } from '@/lib/sales/queries';
import s from '../admin.module.css';

export const metadata = { title: 'Dashboard — Admin' };

function fmtUtc(d: Date | null): string {
  if (!d) return '—';
  // e.g. "2026-10-08 09:00 UTC"
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [counts, engine] = await Promise.all([
    getAdminDashboardCounts(session.organizationId),
    getSalesEngineStatus(),
  ]);

  const nextDiscovery = nextUtcHour(6);
  const nextOutreach = nextUtcHour(9);

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

  const engineBadgeClass =
    engine.status === 'ACTIVE'
      ? s.badgeSuccess
      : engine.status === 'ERROR'
        ? s.badgeDanger
        : s.badgeNeutral;

  const { byStatus } = engine.stats;
  const qualifiedLeads =
    (byStatus['QUALIFIED'] ?? 0) +
    (byStatus['OUTREACH_SENT'] ?? 0) +
    (byStatus['REPLIED'] ?? 0) +
    (byStatus['FOLLOW_UP'] ?? 0) +
    (byStatus['WON'] ?? 0);

  const engineStats = [
    { label: 'Leads Discovered', value: engine.stats.totalLeads },
    { label: 'Qualified Leads', value: qualifiedLeads, accent: qualifiedLeads > 0 },
    { label: 'Emails Sent', value: engine.stats.emailsSent, accent: engine.stats.emailsSent > 0 },
    { label: 'Replies', value: engine.repliesReceived, accent: engine.repliesReceived > 0 },
    { label: 'Follow-ups', value: engine.pendingFollowUps },
    { label: 'Errors (24 h)', value: engine.failedLast24h, warn: engine.failedLast24h > 0 },
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

      {/* ── Live Sales Engine ── */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--drex-text)', letterSpacing: '-0.01em', margin: 0 }}>
          Sales Engine
        </h2>
        <span className={`${s.badge} ${engineBadgeClass}`}>{engine.status}</span>
      </div>

      <div className={s.statGrid} style={{ marginBottom: '1rem' }}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Last Discovery Run</div>
          <div className={s.statValue} style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--drex-text-secondary)' }}>
            {fmtUtc(engine.lastActivityAt)}
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Next Discovery Run</div>
          <div className={s.statValue} style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--drex-text-secondary)' }}>
            {fmtUtc(nextDiscovery)}
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Last Outreach Run</div>
          <div className={s.statValue} style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--drex-text-secondary)' }}>
            {fmtUtc(engine.lastOutreachAt)}
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Next Outreach Run</div>
          <div className={s.statValue} style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--drex-text-secondary)' }}>
            {fmtUtc(nextOutreach)}
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Last Agent Activity</div>
          <div className={s.statValue} style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--drex-text-secondary)' }}>
            {fmtUtc(engine.lastActivityAt)}
          </div>
        </div>
      </div>

      <div className={s.statGrid}>
        {engineStats.map((stat) => (
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
