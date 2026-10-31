// DR-0130: MDA Sales Agent dashboard — real SSB KPIs from DB
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db, ssbSchema } from '@/db';
import { sql, eq, and } from 'drizzle-orm';
import s from '../admin.module.css';

export const metadata = { title: 'MDA Dashboard — Admin' };

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function MdaDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  // Lead status counts
  const statusCounts = await db
    .select({
      status: ssbSchema.ssbLeads.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ssbSchema.ssbLeads)
    .groupBy(ssbSchema.ssbLeads.status);

  const byStatus: Record<string, number> = {};
  let totalLeads = 0;
  for (const row of statusCounts) {
    byStatus[row.status] = row.count;
    totalLeads += row.count;
  }

  // Active subscriptions
  const [subRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ssbSchema.ssbSubscriptions)
    .where(eq(ssbSchema.ssbSubscriptions.active, true));
  const activeSubscriptions = subRow?.count ?? 0;

  // Confirmed revenue: sum monthly_amount_fils where active
  const [revRow] = await db
    .select({ total: sql<number>`coalesce(sum(monthly_amount_fils),0)::int` })
    .from(ssbSchema.ssbSubscriptions)
    .where(eq(ssbSchema.ssbSubscriptions.active, true));
  const revenueAed = Math.round((revRow?.total ?? 0) / 100);

  // 5 most recent leads
  const recentLeads = await db
    .select({
      id: ssbSchema.ssbLeads.id,
      business_name: ssbSchema.ssbLeads.business_name,
      contact_whatsapp: ssbSchema.ssbLeads.contact_whatsapp,
      status: ssbSchema.ssbLeads.status,
      source_bot: ssbSchema.ssbLeads.source_bot,
      created_at: ssbSchema.ssbLeads.created_at,
    })
    .from(ssbSchema.ssbLeads)
    .orderBy(sql`${ssbSchema.ssbLeads.created_at} DESC`)
    .limit(5);

  const STATUS_BADGE: Record<string, { label: string; cssClass: string }> = {
    NEW: { label: 'New', cssClass: s.badgeNeutral },
    CONTACTED: { label: 'Contacted', cssClass: s.badgeAccent },
    QUALIFIED: { label: 'Qualified', cssClass: s.badgeWarning },
    WON: { label: 'Won', cssClass: s.badgeSuccess },
    REJECTED: { label: 'Rejected', cssClass: s.badgeDanger },
  };

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>MDA Sales Agent — Dashboard</h1>
        <p className={s.pageSubtitle}>
          SSB pipeline overview. Real data from the CRM.
        </p>
      </div>

      {/* KPI stats */}
      <div className={s.statGrid}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Total Leads</div>
          <div className={s.statValue}>{totalLeads}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>New</div>
          <div className={s.statValue}>{byStatus.NEW ?? 0}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Contacted</div>
          <div className={s.statValue}>{byStatus.CONTACTED ?? 0}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Qualified</div>
          <div className={s.statValue}>{byStatus.QUALIFIED ?? 0}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Won</div>
          <div className={`${s.statValue} ${s.statValueAccent}`}>{byStatus.WON ?? 0}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Rejected</div>
          <div className={s.statValue}>{byStatus.REJECTED ?? 0}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Active Subscriptions</div>
          <div className={`${s.statValue} ${s.statValueAccent}`}>{activeSubscriptions}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Confirmed Revenue / mo</div>
          <div className={`${s.statValue} ${s.statValueAccent}`}>
            {revenueAed > 0 ? `${revenueAed} AED` : '—'}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className={s.pageHeader} style={{ marginTop: '0.5rem' }}>
        <p className={s.pageSubtitle}>
          Quick links:{' '}
          <Link href="/admin/social-seller" className={s.navLink}>All Leads</Link>
          {' · '}
          <Link href="/admin/ssb-subscriptions" className={s.navLink}>Subscriptions</Link>
          {' · '}
          <Link href="/admin/chatbots" className={s.navLink}>Chatbots</Link>
          {' · '}
          <a
            href="/social-seller"
            target="_blank"
            rel="noopener noreferrer"
            className={s.navLink}
          >
            Landing Page ↗
          </a>
        </p>
      </div>

      {/* Recent leads */}
      <div className={s.pageHeader} style={{ marginTop: '1.5rem' }}>
        <h2 className={s.pageTitle} style={{ fontSize: '1rem' }}>Recent Leads</h2>
      </div>

      {recentLeads.length === 0 ? (
        <div className={s.emptyState}>
          <p className={s.emptyTitle}>No leads yet</p>
          <p className={s.emptyBody}>Leads appear here after prospects complete the mda-sales chat.</p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>WhatsApp</th>
                <th>Source</th>
                <th>Date</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead) => {
                const badge = STATUS_BADGE[lead.status] ?? STATUS_BADGE.NEW;
                return (
                  <tr key={lead.id}>
                    <td className={s.cellPrimary}>{lead.business_name}</td>
                    <td className={s.cellMono}>
                      <a
                        href={`https://wa.me/${lead.contact_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {lead.contact_whatsapp}
                      </a>
                    </td>
                    <td className={s.cellMono}>{lead.source_bot}</td>
                    <td>{fmt(lead.created_at)}</td>
                    <td>
                      <span className={`${s.badge} ${badge.cssClass}`}>{badge.label}</span>
                    </td>
                    <td>
                      <Link href={`/admin/social-seller/${lead.id}`} className={s.navLink}>
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
