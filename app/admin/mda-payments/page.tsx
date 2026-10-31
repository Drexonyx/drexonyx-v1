// DR-0130: Admin — MDA Payments page
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { db, ssbSchema } from '@/db';
import { desc, eq, sql } from 'drizzle-orm';
import s from '../mda.module.css';

export const metadata = { title: 'المدفوعات — MDA' };

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('ar-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAed(fils: number): string {
  return (fils / 100).toLocaleString('ar-AE', { maximumFractionDigits: 0 }) + ' د.إ';
}

const PAYMENT_STATUS: Record<string, { arabic: string; badgeClass: string }> = {
  COMPLETED: { arabic: 'مكتمل',    badgeClass: s.mdaBadgeWon },
  PENDING:   { arabic: 'معلق',     badgeClass: s.mdaBadgeQualified },
  FAILED:    { arabic: 'فشل',      badgeClass: s.mdaBadgeRejected },
  CANCELLED: { arabic: 'ملغى',     badgeClass: s.mdaBadgeRejected },
};

export default async function MdaPaymentsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [payments, totals] = await Promise.all([
    db
      .select({
        id: ssbSchema.ssbPayments.id,
        subscription_id: ssbSchema.ssbPayments.subscription_id,
        amount_fils: ssbSchema.ssbPayments.amount_fils,
        period_month: ssbSchema.ssbPayments.period_month,
        status: ssbSchema.ssbPayments.status,
        redirect_url: ssbSchema.ssbPayments.redirect_url,
        created_at: ssbSchema.ssbPayments.created_at,
        business_name: ssbSchema.ssbSubscriptions.business_name,
        merchant_slug: ssbSchema.ssbSubscriptions.merchant_slug,
      })
      .from(ssbSchema.ssbPayments)
      .leftJoin(
        ssbSchema.ssbSubscriptions,
        eq(ssbSchema.ssbPayments.subscription_id, ssbSchema.ssbSubscriptions.id),
      )
      .orderBy(desc(ssbSchema.ssbPayments.created_at))
      .limit(200),

    db
      .select({
        status: ssbSchema.ssbPayments.status,
        total: sql<number>`coalesce(sum(amount_fils), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(ssbSchema.ssbPayments)
      .groupBy(ssbSchema.ssbPayments.status),
  ]);

  const totalMap: Record<string, { total: number; count: number }> = {};
  for (const row of totals) {
    totalMap[row.status] = { total: row.total, count: row.count };
  }

  const completedTotal = totalMap.COMPLETED?.total ?? 0;
  const pendingTotal = totalMap.PENDING?.total ?? 0;
  const completedCount = totalMap.COMPLETED?.count ?? 0;
  const pendingCount = totalMap.PENDING?.count ?? 0;

  return (
    <div className={s.mdaPage}>
      {/* Page header */}
      <div className={s.mdaPageHeader}>
        <div>
          <h1 className={s.mdaPageTitle}>المدفوعات</h1>
          <p className={s.mdaPageSubtitle}>سجل جميع مدفوعات الاشتراكات — مكتملة ومعلقة وفاشلة</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className={s.mdaStatGrid} style={{ marginBottom: '1.75rem' }}>
        <div className={`${s.mdaStatCard} ${s.mdaStatCardGold}`}>
          <div className={`${s.mdaStatIcon} ${s.mdaStatIconGold}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v1.5M8 9.5V11M6 7.5c0-.83.895-1.5 2-1.5s2 .67 2 1.5-2 2-2 2" strokeLinecap="round" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>إجمالي المحصّل</div>
          <div className={`${s.mdaStatValue} ${s.mdaStatValueGold}`}>
            {completedTotal > 0 ? fmtAed(completedTotal) : '—'}
          </div>
          <div className={s.mdaStatDelta}>{completedCount} دفعة مكتملة</div>
        </div>

        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3l2 2" strokeLinecap="round" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>في انتظار الدفع</div>
          <div className={`${s.mdaStatValue} ${s.mdaStatValueBlue}`}>
            {pendingTotal > 0 ? fmtAed(pendingTotal) : '—'}
          </div>
          <div className={s.mdaStatDelta}>{pendingCount} دفعة معلقة</div>
        </div>

        <div className={s.mdaStatCard}>
          <div className={s.mdaStatIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="3" width="14" height="10" rx="2" />
              <path d="M1 7h14" />
            </svg>
          </div>
          <div className={s.mdaStatLabel}>إجمالي المعاملات</div>
          <div className={s.mdaStatValue}>{payments.length}</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className={s.mdaEmpty}>
          <div className={s.mdaEmptyIcon}>💳</div>
          <div className={s.mdaEmptyTitle}>لا توجد مدفوعات بعد</div>
          <div>ستظهر هنا بعد إنشاء روابط دفع من صفحة الاشتراكات</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${s.mdaTableWrap} ${s.mdaTableDesktop}`}>
            <table className={s.mdaTable}>
              <thead>
                <tr>
                  <th>المشروع</th>
                  <th>الشهر</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>تاريخ الإنشاء</th>
                  <th>رابط الدفع</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const pm = PAYMENT_STATUS[p.status] ?? PAYMENT_STATUS.PENDING;
                  return (
                    <tr key={p.id}>
                      <td className={s.mdaCellPrimary}>{p.business_name ?? '—'}</td>
                      <td className={s.mdaCellMono}>{p.period_month}</td>
                      <td style={{ color: 'var(--mda-gold)', fontWeight: 600 }}>
                        {fmtAed(p.amount_fils)}
                      </td>
                      <td>
                        <span className={`${s.mdaBadge} ${pm.badgeClass}`}>{pm.arabic}</span>
                      </td>
                      <td>{fmtDate(p.created_at)}</td>
                      <td>
                        {p.redirect_url && p.status === 'PENDING' ? (
                          <a
                            href={p.redirect_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--mda-electric)', fontSize: '0.75rem' }}
                          >
                            رابط الدفع ↗
                          </a>
                        ) : (
                          <span style={{ color: 'var(--drex-text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={s.mdaLeadCards}>
            {payments.map((p) => {
              const pm = PAYMENT_STATUS[p.status] ?? PAYMENT_STATUS.PENDING;
              return (
                <div key={p.id} className={s.mdaLeadCard}>
                  <div className={s.mdaLeadCardHeader}>
                    <span className={s.mdaLeadCardName}>{p.business_name ?? '—'}</span>
                    <span className={`${s.mdaBadge} ${pm.badgeClass}`}>{pm.arabic}</span>
                  </div>
                  <div className={s.mdaLeadCardMeta}>
                    <span style={{ color: 'var(--mda-gold)', fontWeight: 600 }}>
                      {fmtAed(p.amount_fils)}
                    </span>
                    <span className={s.mdaCellMono}>{p.period_month}</span>
                    <span>{fmtDate(p.created_at)}</span>
                  </div>
                  {p.redirect_url && p.status === 'PENDING' && (
                    <div className={s.mdaLeadCardActions}>
                      <a
                        href={p.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.mdaBtnSmall}
                      >
                        رابط الدفع ↗
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
