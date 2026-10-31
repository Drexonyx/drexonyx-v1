// DR-0130: Admin — MDA Revenue summary
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { db, ssbSchema } from '@/db';
import { eq, sql } from 'drizzle-orm';
import s from '../mda.module.css';

export const metadata = { title: 'الإيرادات — MDA' };

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('ar-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAed(fils: number): string {
  return (fils / 100).toLocaleString('ar-AE', { maximumFractionDigits: 0 }) + ' د.إ';
}

export default async function MdaRevenuePage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [revenueData, monthlyBreakdown, activeSubs] = await Promise.all([
    // Lifetime collected
    db
      .select({
        collected: sql<number>`coalesce(sum(amount_fils) filter (where status = 'COMPLETED'), 0)::int`,
        pending:   sql<number>`coalesce(sum(amount_fils) filter (where status = 'PENDING'), 0)::int`,
        total_txn: sql<number>`count(*)::int`,
        completed_txn: sql<number>`count(*) filter (where status = 'COMPLETED')::int`,
      })
      .from(ssbSchema.ssbPayments),

    // Monthly breakdown (last 12 months)
    db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        total: sql<number>`coalesce(sum(amount_fils) filter (where status = 'COMPLETED'), 0)::int`,
        count: sql<number>`count(*) filter (where status = 'COMPLETED')::int`,
      })
      .from(ssbSchema.ssbPayments)
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM') DESC`)
      .limit(12),

    // Active subscriptions MRR
    db
      .select({
        count: sql<number>`count(*)::int`,
        mrr: sql<number>`coalesce(sum(monthly_amount_fils), 0)::int`,
      })
      .from(ssbSchema.ssbSubscriptions)
      .where(eq(ssbSchema.ssbSubscriptions.active, true)),
  ]);

  const revenue = revenueData[0];
  const mrr = activeSubs[0]?.mrr ?? 0;
  const mrrCount = activeSubs[0]?.count ?? 0;
  const arr = mrr * 12;

  return (
    <div className={s.mdaPage}>
      {/* Page header */}
      <div className={s.mdaPageHeader}>
        <div>
          <h1 className={s.mdaPageTitle}>الإيرادات</h1>
          <p className={s.mdaPageSubtitle}>ملخص الإيرادات المحصّلة والإيراد الشهري المتكرر</p>
        </div>
      </div>

      {/* Revenue KPI cards */}
      <div className={s.mdaRevGrid}>
        <div className={s.mdaRevCard}>
          <div className={s.mdaRevCardLabel}>الإيراد الشهري المتكرر (MRR)</div>
          <div className={s.mdaRevCardValue}>{mrr > 0 ? fmtAed(mrr) : '—'}</div>
          <div className={s.mdaRevCardSub}>{mrrCount} اشتراك نشط</div>
        </div>

        <div className={s.mdaRevCard}>
          <div className={s.mdaRevCardLabel}>الإيراد السنوي المتوقع (ARR)</div>
          <div className={s.mdaRevCardValue}>{arr > 0 ? fmtAed(arr) : '—'}</div>
          <div className={s.mdaRevCardSub}>MRR × 12</div>
        </div>

        <div className={s.mdaRevCard}>
          <div className={s.mdaRevCardLabel}>إجمالي المحصّل</div>
          <div className={s.mdaRevCardValue}>
            {(revenue?.collected ?? 0) > 0 ? fmtAed(revenue.collected) : '—'}
          </div>
          <div className={s.mdaRevCardSub}>{revenue?.completed_txn ?? 0} معاملة مكتملة</div>
        </div>

        <div className={s.mdaRevCard}>
          <div className={s.mdaRevCardLabel}>في انتظار التحصيل</div>
          <div className={s.mdaRevCardValue} style={{ color: 'var(--mda-warning)' }}>
            {(revenue?.pending ?? 0) > 0 ? fmtAed(revenue.pending) : '—'}
          </div>
          <div className={s.mdaRevCardSub}>مدفوعات معلقة</div>
        </div>
      </div>

      {/* Monthly breakdown table */}
      {monthlyBreakdown.length > 0 && (
        <>
          <div className={s.mdaSectionHeading}>
            <span>التفصيل الشهري</span>
            <span className={s.mdaSectionHeadingLine} />
          </div>

          <div className={s.mdaTableWrap}>
            <table className={s.mdaTable}>
              <thead>
                <tr>
                  <th>الشهر</th>
                  <th>الإيراد المحصّل</th>
                  <th>عدد المعاملات</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((row) => (
                  <tr key={row.month}>
                    <td className={s.mdaCellMono}>{row.month}</td>
                    <td style={{ color: 'var(--mda-gold)', fontWeight: 600 }}>
                      {row.total > 0 ? fmtAed(row.total) : '—'}
                    </td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {monthlyBreakdown.length === 0 && (
        <div className={s.mdaEmpty}>
          <div className={s.mdaEmptyIcon}>📊</div>
          <div className={s.mdaEmptyTitle}>لا توجد إيرادات محصّلة بعد</div>
          <div>ستظهر هنا بعد اكتمال أول دفعة</div>
        </div>
      )}
    </div>
  );
}
