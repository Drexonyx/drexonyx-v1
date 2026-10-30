// DR-0130: Admin — SSB subscriptions & payment management (Stages 5 & 6)
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { db, ssbSchema } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { CreatePaymentButton, CheckPaymentButton } from './PaymentButtons';
import { ProvisionBotButton } from './ProvisionBotButton';
import s from '../admin.module.css';

export const metadata = { title: 'SSB Subscriptions — Admin' };

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function SsbSubscriptionsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const subs = await db
    .select()
    .from(ssbSchema.ssbSubscriptions)
    .orderBy(desc(ssbSchema.ssbSubscriptions.created_at))
    .limit(100);

  const subIds = subs.map((s) => s.id);
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

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>SSB Subscriptions</h1>
        <p className={s.pageSubtitle}>
          Active and pending Social Seller Bot subscriptions. Create a Ziina payment link and send to the client via WhatsApp.
        </p>
      </div>

      {subs.length === 0 ? (
        <div className={s.emptyState}>
          <p className={s.emptyTitle}>No subscriptions yet</p>
          <p className={s.emptyBody}>
            Convert a lead to a subscription on the{' '}
            <a href="/admin/social-seller">Leads</a> page.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {subs.map((sub) => {
            const subPayments = paymentsBySubId.get(sub.id) ?? [];
            const latestPayment = subPayments[0] ?? null;
            const hasPendingPayment = subPayments.some((p) => p.status === 'PENDING');
            const botConfig = botConfigBySubId.get(sub.id) ?? null;
            const isProvisioned = botConfig?.delivered_at != null;

            return (
              <div
                key={sub.id}
                style={{
                  background: 'var(--drex-elevated)',
                  border: '1px solid var(--drex-border)',
                  borderRadius: 8,
                  padding: '1rem 1.25rem',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{sub.business_name}</div>
                    <div className={s.cellMono} style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--drex-text-secondary)' }}>
                      /{sub.merchant_slug}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`${s.badge} ${sub.active ? s.badgeSuccess : s.badgeNeutral}`}>
                      {sub.active ? 'Active' : 'Pending'}
                    </span>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{sub.plan_name}</span>
                  </div>
                </div>

                {/* Details row */}
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--drex-text-secondary)', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span>
                    WA:{' '}
                    <a
                      href={`https://wa.me/${sub.contact_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.cellMono}
                    >
                      {sub.contact_whatsapp}
                    </a>
                  </span>
                  {sub.business_type && <span>Type: {sub.business_type}</span>}
                  <span>Created: {fmtDate(sub.created_at)}</span>
                  {sub.activated_at && sub.active && <span>Activated: {fmtDate(sub.activated_at)}</span>}
                </div>

                {/* Payment + provisioning actions */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
                      <span className={`${s.badge} ${s.badgeSuccess}`}>Bot delivered ✓</span>
                      <a
                        href={`/chat/${sub.merchant_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--drex-accent)' }}
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--drex-text-secondary)' }}>
                      <div>Latest payment: {latestPayment.period_month}</div>
                      <div>
                        Status:{' '}
                        <span
                          className={`${s.badge} ${
                            latestPayment.status === 'COMPLETED'
                              ? s.badgeSuccess
                              : latestPayment.status === 'PENDING'
                                ? s.badgeWarning
                                : s.badgeDanger
                          }`}
                        >
                          {latestPayment.status}
                        </span>
                      </div>
                      {latestPayment.redirect_url && latestPayment.status === 'PENDING' && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <a
                            href={latestPayment.redirect_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}
                          >
                            Payment link ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment history */}
                {subPayments.length > 1 && (
                  <details style={{ marginTop: '0.75rem' }}>
                    <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--drex-text-secondary)' }}>
                      {subPayments.length} payments
                    </summary>
                    <div className={s.tableWrap} style={{ marginTop: '0.5rem' }}>
                      <table className={s.table} style={{ fontSize: '0.75rem' }}>
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subPayments.map((p) => (
                            <tr key={p.id}>
                              <td className={s.cellMono}>{p.period_month}</td>
                              <td className={s.cellMono}>{(p.amount_fils / 100).toFixed(0)} AED</td>
                              <td>
                                <span
                                  className={`${s.badge} ${
                                    p.status === 'COMPLETED'
                                      ? s.badgeSuccess
                                      : p.status === 'PENDING'
                                        ? s.badgeWarning
                                        : s.badgeDanger
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                              <td>{fmtDate(p.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
