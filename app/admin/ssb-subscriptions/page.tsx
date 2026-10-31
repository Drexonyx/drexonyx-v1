// DR-0130: Admin — SSB subscriptions (Arabic RTL redesign)
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db, ssbSchema } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { CreatePaymentButton, CheckPaymentButton } from './PaymentButtons';
import { ProvisionBotButton } from './ProvisionBotButton';
import s from '../mda.module.css';

export const metadata = { title: 'الاشتراكات — MDA' };

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

export default async function SsbSubscriptionsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const subs = await db
    .select()
    .from(ssbSchema.ssbSubscriptions)
    .orderBy(desc(ssbSchema.ssbSubscriptions.created_at))
    .limit(100);

  const subIds = subs.map((sub) => sub.id);
  const payments =
    subIds.length > 0
      ? await db
          .select()
          .from(ssbSchema.ssbPayments)
          .orderBy(desc(ssbSchema.ssbPayments.created_at))
      : [];

  const botConfigs =
    subIds.length > 0
      ? await db
          .select({
            subscription_id: ssbSchema.ssbBotConfigs.subscription_id,
            merchant_slug: ssbSchema.ssbBotConfigs.merchant_slug,
            qc_passed_at: ssbSchema.ssbBotConfigs.qc_passed_at,
            delivered_at: ssbSchema.ssbBotConfigs.delivered_at,
          })
          .from(ssbSchema.ssbBotConfigs)
      : [];

  const paymentsBySubId = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = paymentsBySubId.get(p.subscription_id) ?? [];
    list.push(p);
    paymentsBySubId.set(p.subscription_id, list);
  }

  const botConfigBySubId = new Map(botConfigs.map((c) => [c.subscription_id, c]));

  const activeSubs = subs.filter((s) => s.active).length;
  const pendingSubs = subs.filter((s) => !s.active).length;

  return (
    <div className={s.mdaPage}>
      {/* Page header */}
      <div className={s.mdaPageHeader}>
        <div>
          <h1 className={s.mdaPageTitle}>الاشتراكات</h1>
          <p className={s.mdaPageSubtitle}>
            إدارة اشتراكات Social Seller Bot — أنشئ رابط دفع وأرسله للعميل عبر واتساب
          </p>
        </div>
        <div className={s.mdaPageActions}>
          <span className={`${s.mdaBadge} ${s.mdaBadgeActive}`}>{activeSubs} نشط</span>
          {pendingSubs > 0 && (
            <span className={`${s.mdaBadge} ${s.mdaBadgePending}`}>{pendingSubs} معلق</span>
          )}
        </div>
      </div>

      {subs.length === 0 ? (
        <div className={s.mdaEmpty}>
          <div className={s.mdaEmptyIcon}>📋</div>
          <div className={s.mdaEmptyTitle}>لا توجد اشتراكات بعد</div>
          <div>
            حوّل عميلاً محتملاً إلى اشتراك من صفحة{' '}
            <Link href="/admin/social-seller" style={{ color: 'var(--mda-electric)' }}>
              العملاء المحتملون
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {subs.map((sub) => {
            const subPayments = paymentsBySubId.get(sub.id) ?? [];
            const latestPayment = subPayments[0] ?? null;
            const hasPendingPayment = subPayments.some((p) => p.status === 'PENDING');
            const botConfig = botConfigBySubId.get(sub.id) ?? null;
            const isProvisioned = botConfig?.delivered_at != null;

            return (
              <div key={sub.id} className={s.mdaSubCard}>
                {/* Card header */}
                <div className={s.mdaSubCardHeader}>
                  <div>
                    <div className={s.mdaSubCardName}>{sub.business_name}</div>
                    <div className={s.mdaSubCardSlug}>/{sub.merchant_slug}</div>
                  </div>
                  <div className={s.mdaSubCardBadges}>
                    <span className={`${s.mdaBadge} ${sub.active ? s.mdaBadgeActive : s.mdaBadgePending}`}>
                      {sub.active ? 'نشط' : 'معلق'}
                    </span>
                    <span className={`${s.mdaBadge} ${s.mdaBadgeNew}`}>{sub.plan_name}</span>
                    <span className={`${s.mdaBadge} ${s.mdaBadgeGold}`}>
                      {fmtAed(sub.monthly_amount_fils)} / شهر
                    </span>
                  </div>
                </div>

                {/* Meta */}
                <div className={s.mdaSubCardMeta}>
                  <span>
                    واتساب:{' '}
                    <a
                      href={`https://wa.me/${sub.contact_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.mdaCellMono}
                      style={{ color: '#22c55e' }}
                    >
                      {sub.contact_whatsapp}
                    </a>
                  </span>
                  {sub.business_type && <span>{sub.business_type}</span>}
                  <span>تاريخ الإنشاء: {fmtDate(sub.created_at)}</span>
                  {sub.activated_at && sub.active && (
                    <span>تاريخ التفعيل: {fmtDate(sub.activated_at)}</span>
                  )}
                  {sub.expires_at && (
                    <span>ينتهي: {fmtDate(sub.expires_at)}</span>
                  )}
                </div>

                {/* Actions */}
                <div className={s.mdaSubCardActions}>
                  {!hasPendingPayment && !sub.active && (
                    <CreatePaymentButton subscriptionId={sub.id} />
                  )}
                  {latestPayment && latestPayment.status === 'PENDING' && (
                    <CheckPaymentButton paymentId={latestPayment.id} />
                  )}
                  {sub.active && !isProvisioned && (
                    <ProvisionBotButton subscriptionId={sub.id} />
                  )}
                  {isProvisioned && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span className={`${s.mdaBadge} ${s.mdaBadgeWon}`}>تم تسليم البوت ✓</span>
                      <a
                        href={`/chat/${sub.merchant_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--mda-electric)' }}
                      >
                        /chat/{sub.merchant_slug} ↗
                      </a>
                      {botConfig?.qc_passed_at && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--drex-text-secondary)' }}>
                          QC: {fmtDate(botConfig.qc_passed_at)}
                        </span>
                      )}
                    </div>
                  )}
                  {latestPayment && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--drex-text-secondary)', direction: 'rtl' }}>
                      <div>آخر دفعة: {latestPayment.period_month}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.25rem' }}>
                        الحالة:
                        <span className={`${s.mdaBadge} ${(PAYMENT_STATUS[latestPayment.status] ?? PAYMENT_STATUS.PENDING).badgeClass}`}>
                          {(PAYMENT_STATUS[latestPayment.status] ?? PAYMENT_STATUS.PENDING).arabic}
                        </span>
                      </div>
                      {latestPayment.redirect_url && latestPayment.status === 'PENDING' && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <a
                            href={latestPayment.redirect_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.7rem', color: 'var(--mda-electric)', wordBreak: 'break-all' }}
                          >
                            رابط الدفع ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment history */}
                {subPayments.length > 1 && (
                  <div className={s.mdaPayHistory}>
                    <details>
                      <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--drex-text-secondary)' }}>
                        سجل المدفوعات ({subPayments.length})
                      </summary>
                      <div className={`${s.mdaTableWrap}`} style={{ marginTop: '0.75rem' }}>
                        <table className={s.mdaTable} style={{ fontSize: '0.75rem' }}>
                          <thead>
                            <tr>
                              <th>الشهر</th>
                              <th>المبلغ</th>
                              <th>الحالة</th>
                              <th>التاريخ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subPayments.map((p) => {
                              const pm = PAYMENT_STATUS[p.status] ?? PAYMENT_STATUS.PENDING;
                              return (
                                <tr key={p.id}>
                                  <td className={s.mdaCellMono}>{p.period_month}</td>
                                  <td>{fmtAed(p.amount_fils)}</td>
                                  <td>
                                    <span className={`${s.mdaBadge} ${pm.badgeClass}`}>
                                      {pm.arabic}
                                    </span>
                                  </td>
                                  <td>{fmtDate(p.created_at)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
