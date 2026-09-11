import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminInquiries } from '@/lib/admin/queries';
import { InquiryActions } from './InquiryActions';
import s from '../admin.module.css';

export const metadata = { title: 'Inquiries — Admin' };

const STATUS_FILTERS = ['ALL', 'NEW', 'REVIEWED', 'CONVERTED', 'DISMISSED'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function statusBadgeClass(status: string): string {
  if (status === 'NEW') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'REVIEWED') return `${s.badge} ${s.badgeNeutral}`;
  if (status === 'CONVERTED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'DISMISSED') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { status: rawStatus } = await searchParams;
  const filter: StatusFilter =
    STATUS_FILTERS.includes(rawStatus as StatusFilter) ? (rawStatus as StatusFilter) : 'ALL';

  const canAct = session.role === 'OWNER' || session.role === 'ADMIN_OPERATIONS';

  const allInquiries = await getAdminInquiries();
  const inquiries =
    filter === 'ALL' ? allInquiries : allInquiries.filter((i) => i.status === filter);

  const counts = {
    ALL: allInquiries.length,
    NEW: allInquiries.filter((i) => i.status === 'NEW').length,
    REVIEWED: allInquiries.filter((i) => i.status === 'REVIEWED').length,
    CONVERTED: allInquiries.filter((i) => i.status === 'CONVERTED').length,
    DISMISSED: allInquiries.filter((i) => i.status === 'DISMISSED').length,
  };

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Inquiries</h1>
        <p className={s.pageSubtitle}>
          Campaign brief submissions from the public intake form
        </p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((tab) => (
          <a
            key={tab}
            href={tab === 'ALL' ? '/admin/inquiries' : `/admin/inquiries?status=${tab}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
              background: filter === tab ? 'var(--drex-accent-subtle)' : 'var(--drex-elevated)',
              color: filter === tab ? 'var(--drex-accent)' : 'var(--drex-text-secondary)',
              border: '1px solid transparent',
            }}
          >
            {tab}
            <span
              style={{
                fontSize: '0.6875rem',
                fontVariantNumeric: 'tabular-nums',
                opacity: 0.75,
              }}
            >
              {counts[tab]}
            </span>
          </a>
        ))}
      </div>

      {inquiries.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No inquiries</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Email</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Objective</th>
                {canAct && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <tr key={inq.id}>
                  <td className={s.cellPrimary}>
                    <div>{inq.brand_name}</div>
                    {inq.website && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--drex-text-muted)', marginTop: '0.125rem' }}>
                        {inq.website}
                      </div>
                    )}
                    <div className={s.cellMono} style={{ marginTop: '0.125rem', opacity: 0.45 }}>
                      {inq.id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className={s.cellMono}>{inq.contact_email}</td>
                  <td>
                    <span className={statusBadgeClass(inq.status)}>{inq.status}</span>
                  </td>
                  <td className={s.cellMono}>
                    {inq.submitted_at
                      ? new Date(inq.submitted_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td
                    style={{
                      maxWidth: '280px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8125rem',
                      color: 'var(--drex-text-secondary)',
                    }}
                    title={inq.campaign_objective ?? undefined}
                  >
                    {inq.campaign_objective ?? '—'}
                  </td>
                  {canAct && (
                    <td>
                      <InquiryActions
                        inquiryId={inq.id}
                        status={inq.status}
                        canAct={canAct}
                        brandName={inq.brand_name}
                        contactEmail={inq.contact_email}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
