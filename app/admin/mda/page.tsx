// DR-0130: MDA Sales Agent dashboard — Arabic RTL redesign Phase 24
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db, ssbSchema } from '@/db';
import { sql, eq, and, gte } from 'drizzle-orm';
import s from './../../admin/mda.module.css';
import type { DonutSegment, LinePoint } from './MdaCharts';
import { DonutChart, LineChart } from './MdaCharts';

export const metadata = { title: 'لوحة التحكم — MDA' };

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('ar-AE', { day: '2-digit', month: 'short' });
}

function fmtDateFull(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('ar-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<
  string,
  { arabic: string; color: string; badgeClass: string }
> = {
  NEW:       { arabic: 'جديد',       color: '#4b5a6e', badgeClass: s.mdaBadgeNew },
  CONTACTED: { arabic: 'تم التواصل', color: '#3b82f6', badgeClass: s.mdaBadgeContacted },
  QUALIFIED: { arabic: 'مؤهل',       color: '#f59e0b', badgeClass: s.mdaBadgeQualified },
  WON:       { arabic: 'فائز',       color: '#22c55e', badgeClass: s.mdaBadgeWon },
  REJECTED:  { arabic: 'مرفوض',      color: '#ef4444', badgeClass: s.mdaBadgeRejected },
};

export default async function MdaDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // All queries in parallel
  const [
    statusCounts,
    subRows,
    revenueRow,
    recentLeads,
    dailyCounts,
  ] = await Promise.all([
    // Status distribution
    db
      .select({
        status: ssbSchema.ssbLeads.status,
        count: sql<number>`count(*)::int`,
      })
      .from(ssbSchema.ssbLeads)
      .groupBy(ssbSchema.ssbLeads.status),

    // Active subscriptions
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(ssbSchema.ssbSubscriptions)
      .where(eq(ssbSchema.ssbSubscriptions.active, true)),

    // Confirmed revenue
    db
      .select({ total: sql<number>`coalesce(sum(monthly_amount_fils),0)::int` })
      .from(ssbSchema.ssbSubscriptions)
      .where(eq(ssbSchema.ssbSubscriptions.active, true)),

    // 10 most recent leads for the table
    db
      .select({
        id: ssbSchema.ssbLeads.id,
        business_name: ssbSchema.ssbLeads.business_name,
        business_type: ssbSchema.ssbLeads.business_type,
        contact_whatsapp: ssbSchema.ssbLeads.contact_whatsapp,
        status: ssbSchema.ssbLeads.status,
        source_bot: ssbSchema.ssbLeads.source_bot,
        created_at: ssbSchema.ssbLeads.created_at,
      })
      .from(ssbSchema.ssbLeads)
      .orderBy(sql`${ssbSchema.ssbLeads.created_at} DESC`)
      .limit(10),

    // Daily new leads for last 30 days
    db
      .select({
        day: sql<string>`DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Dubai')::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(ssbSchema.ssbLeads)
      .where(gte(ssbSchema.ssbLeads.created_at, thirtyDaysAgo))
      .groupBy(sql`DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Dubai')::date`)
      .orderBy(sql`DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Dubai')::date`),
  ]);

  // Build status map
  const byStatus: Record<string, number> = {};
  let totalLeads = 0;
  for (const row of statusCounts) {
    byStatus[row.status] = row.count;
    totalLeads += row.count;
  }

  const activeSubscriptions = subRows[0]?.count ?? 0;
  const revenueAed = Math.round((revenueRow[0]?.total ?? 0) / 100);

  // Build donut segments
  const donutSegments: DonutSegment[] = Object.entries(STATUS_META).map(([key, meta]) => ({
    label: key,
    arabicLabel: meta.arabic,
    count: byStatus[key] ?? 0,
    color: meta.color,
  }));

  // Build 30-day line data — fill zeros for missing days
  const lineMap = new Map(dailyCounts.map((r) => [r.day, r.count]));
  const linePoints: LinePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Dubai date string YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    linePoints.push({ date: key, count: lineMap.get(key) ?? 0 });
  }

  const newLeads30d = linePoints.reduce((a, b) => a + b.count, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return (
    <div className={s.mdaPage}>
      {/* Page header */}
      <div className={s.mdaPageHeader}>
        <div>
          <h1 className={s.mdaPageTitle}>لوحة التحكم</h1>
          <p className={s.mdaPageSubtitle}>نظرة شاملة على مسار المبيعات — بيانات حقيقية من قاعدة البيانات</p>
        </div>
        <div className={s.mdaPageActions}>
          <Link href="/admin/social-seller" className={s.mdaBtnPrimary}>
            + إضافة عميل
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className={s.mdaStatGrid}>
        {/* Total */}
        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="6" r="3" />
              <path d="M2 14c0-3.31 2.686-6 6-6s6 2.69 6 6" strokeLinecap="round" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>إجمالي العملاء</div>
          <div className={s.mdaStatValue}>{totalLeads}</div>
          <div className={s.mdaStatDelta}>{newLeads30d} جديد خلال 30 يوم</div>
        </div>

        {/* New */}
        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3l2 2" strokeLinecap="round" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>جدد</div>
          <div className={`${s.mdaStatValue} ${s.mdaStatValueBlue}`}>{byStatus.NEW ?? 0}</div>
        </div>

        {/* Contacted */}
        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 10.67A2 2 0 0 1 12 12H4l-3 3V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6.67z" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>تم التواصل</div>
          <div className={s.mdaStatValue}>{byStatus.CONTACTED ?? 0}</div>
        </div>

        {/* Qualified */}
        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2l1.8 3.6L14 6.3l-3 2.9.7 4.1L8 11l-3.7 2.3.7-4.1-3-2.9 4.2-.7z" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>مؤهلون</div>
          <div className={`${s.mdaStatValue} ${s.mdaStatValueBlue}`}>{byStatus.QUALIFIED ?? 0}</div>
        </div>

        {/* Won */}
        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2.5 8.5l3.5 3.5 7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>الصفقات الرابحة</div>
          <div className={`${s.mdaStatValue} ${s.mdaStatValueSuccess}`}>{byStatus.WON ?? 0}</div>
        </div>

        {/* Active Subscriptions */}
        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <path d="M5 8h6M5 11h4" strokeLinecap="round" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>الاشتراكات النشطة</div>
          <div className={`${s.mdaStatValue} ${s.mdaStatValueBlue}`}>{activeSubscriptions}</div>
        </div>

        {/* Revenue */}
        <div className={`${s.mdaStatCard} ${s.mdaStatCardGold}`}>
          <div className={`${s.mdaStatIcon} ${s.mdaStatIconGold}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v1.5M8 9.5V11M6 7.5c0-.83.895-1.5 2-1.5s2 .67 2 1.5-2 2-2 2" strokeLinecap="round" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>الإيرادات المؤكدة</div>
          <div className={`${s.mdaStatValue} ${s.mdaStatValueGold}`}>
            {revenueAed > 0 ? revenueAed.toLocaleString('ar-AE') : '—'}
          </div>
          {revenueAed > 0 && <div className={s.mdaStatDelta}>درهم إماراتي / شهر</div>}
        </div>
      </div>

      {/* Charts */}
      <div className={s.mdaChartsRow}>
        {/* Line chart: new clients over 30 days */}
        <div className={s.mdaChartCard}>
          <div className={s.mdaChartTitle}>العملاء الجدد خلال 30 يوماً</div>
          <div className={s.mdaChartSubtitle}>
            إجمالي {newLeads30d} عميل جديد منذ{' '}
            {thirtyDaysAgo.toLocaleDateString('ar-AE', {
              day: '2-digit',
              month: 'short',
            })}
          </div>
          <LineChart points={linePoints} />
        </div>

        {/* Donut chart: status distribution */}
        <div className={s.mdaChartCard}>
          <div className={s.mdaChartTitle}>توزيع العملاء حسب الحالة</div>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <DonutChart segments={donutSegments} total={totalLeads} />
            <div className={s.mdaDonutLegend}>
              {donutSegments
                .filter((seg) => seg.count > 0)
                .map((seg) => (
                  <div key={seg.label} className={s.mdaDonutLegendItem}>
                    <span
                      className={s.mdaDonutLegendDot}
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className={s.mdaDonutLegendLabel}>{seg.arabicLabel}</span>
                    <span className={s.mdaDonutLegendCount}>{seg.count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent leads section */}
      <div className={s.mdaSectionHeading}>
        <span>أحدث العملاء المحتملين</span>
        <span className={s.mdaSectionHeadingLine} />
        <Link href="/admin/social-seller" className={s.mdaBtnGhost} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
          عرض الكل ←
        </Link>
      </div>

      {/* Desktop table */}
      {recentLeads.length === 0 ? (
        <div className={s.mdaEmpty}>
          <div className={s.mdaEmptyIcon}>📭</div>
          <div className={s.mdaEmptyTitle}>لا توجد عملاء محتملون بعد</div>
          <div>ستظهر هنا بعد اكتمال جلسات المحادثة عبر صفحة /social-seller</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${s.mdaTableWrap} ${s.mdaTableDesktop}`}>
            <table className={s.mdaTable}>
              <thead>
                <tr>
                  <th>اسم المشروع</th>
                  <th>النوع</th>
                  <th>واتساب</th>
                  <th>تاريخ الإضافة</th>
                  <th>الحالة</th>
                  <th>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => {
                  const meta = STATUS_META[lead.status] ?? STATUS_META.NEW;
                  return (
                    <tr key={lead.id}>
                      <td className={s.mdaCellPrimary}>{lead.business_name}</td>
                      <td>{lead.business_type ?? '—'}</td>
                      <td>
                        <a
                          href={`https://wa.me/${lead.contact_whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={s.mdaCellMono}
                          style={{ color: '#22c55e' }}
                        >
                          {lead.contact_whatsapp}
                        </a>
                      </td>
                      <td>{fmtDateFull(lead.created_at)}</td>
                      <td>
                        <span className={`${s.mdaBadge} ${meta.badgeClass}`}>
                          {meta.arabic}
                        </span>
                      </td>
                      <td>
                        <Link href={`/admin/social-seller/${lead.id}`} className={s.mdaBtnSmall}>
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={s.mdaLeadCards}>
            {recentLeads.map((lead) => {
              const meta = STATUS_META[lead.status] ?? STATUS_META.NEW;
              return (
                <div key={lead.id} className={s.mdaLeadCard}>
                  <div className={s.mdaLeadCardHeader}>
                    <span className={s.mdaLeadCardName}>{lead.business_name}</span>
                    <span className={`${s.mdaBadge} ${meta.badgeClass}`}>
                      {meta.arabic}
                    </span>
                  </div>
                  <div className={s.mdaLeadCardMeta}>
                    {lead.business_type && <span>{lead.business_type}</span>}
                    <span style={{ direction: 'ltr', color: '#22c55e' }}>
                      {lead.contact_whatsapp}
                    </span>
                    <span>{fmtDate(lead.created_at)}</span>
                  </div>
                  <div className={s.mdaLeadCardActions}>
                    <Link href={`/admin/social-seller/${lead.id}`} className={s.mdaBtnPrimary}>
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
