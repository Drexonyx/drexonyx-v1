import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { MERCHANTS } from '@/lib/chatbot/social-seller';
import s from '../admin.module.css';

export const metadata = { title: 'Social Seller Bots — Admin' };

function subscriptionStatus(config: (typeof MERCHANTS)[number]): {
  label: string;
  cssClass: string;
} {
  if (config.active === false) return { label: 'Suspended', cssClass: s.badgeDanger };
  if (config.expiresAt != null && config.expiresAt < new Date()) {
    return { label: 'Expired', cssClass: s.badgeDanger };
  }
  if (!config.expiresAt) return { label: 'Active', cssClass: s.badgeSuccess };
  const daysLeft = Math.ceil((config.expiresAt.getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 14) return { label: `Expires in ${daysLeft}d`, cssClass: s.badgeWarning };
  return { label: 'Active', cssClass: s.badgeSuccess };
}

export default async function ChatbotsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Social Seller Bots</h1>
        <p className={s.pageSubtitle}>
          Active chatbot clients on the AED 299/month Basic plan. To add or edit a merchant,
          update the merchant file in <code>lib/chatbot/social-seller/merchants/</code> and redeploy.
        </p>
      </div>

      {MERCHANTS.length === 0 ? (
        <div className={s.emptyState}>
          <p>No Social Seller Bot merchants registered yet.</p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>Slug / URL</th>
                <th>WhatsApp</th>
                <th>Plan</th>
                <th>Activated</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MERCHANTS.map((m) => {
                const status = subscriptionStatus(m);
                return (
                  <tr key={m.slug}>
                    <td className={s.cellPrimary}>{m.name}</td>
                    <td className={s.cellMono}>
                      <a
                        href={`/chat/${m.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--drex-accent)', textDecoration: 'none' }}
                      >
                        /chat/{m.slug}
                      </a>
                    </td>
                    <td className={s.cellMono}>{m.waNumber}</td>
                    <td>{m.planName ?? 'Basic AED 299/month'}</td>
                    <td className={s.cellMono}>
                      {m.activatedAt ? m.activatedAt.toISOString().slice(0, 10) : '—'}
                    </td>
                    <td className={s.cellMono}>
                      {m.expiresAt ? m.expiresAt.toISOString().slice(0, 10) : '—'}
                    </td>
                    <td>
                      <span className={`${s.badge} ${status.cssClass}`}>{status.label}</span>
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
