import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { db } from '@/db/index';
import { salesLeads, outreachMessages, followUps } from '@/db/schema/sales';
import { eq, and, isNotNull } from 'drizzle-orm';
import { SendOutreachButton } from './SendOutreachButton';
import s from '../admin.module.css';

export const metadata = { title: 'Sales Outreach — Admin' };

export default async function AdminSalesPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const canSend = session.role === 'OWNER' || session.role === 'ADMIN_OPERATIONS';

  // Email leads with their cold_outreach message status
  const rows = await db
    .select({
      leadId: salesLeads.id,
      businessName: salesLeads.business_name,
      publicEmail: salesLeads.public_email,
      priority: salesLeads.priority,
      leadStatus: salesLeads.status,
      messageId: outreachMessages.id,
      messageStatus: outreachMessages.status,
      approvalStatus: outreachMessages.approval_status,
      externalMessageId: outreachMessages.external_message_id,
      sentAt: outreachMessages.sent_at,
      replyReceivedAt: outreachMessages.reply_received_at,
    })
    .from(salesLeads)
    .innerJoin(
      outreachMessages,
      and(
        eq(outreachMessages.lead_id, salesLeads.id),
        eq(outreachMessages.channel, 'email'),
        eq(outreachMessages.message_type, 'cold_outreach'),
      ),
    )
    .where(isNotNull(salesLeads.public_email))
    .orderBy(salesLeads.lead_score);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Sales Outreach</h1>
        <p className={s.pageSubtitle}>Email leads — MDA prospects. Al-Falah excluded pending DB fix.</p>
      </div>

      {rows.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No email leads found</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>Email</th>
                <th>Priority</th>
                <th>Lead Status</th>
                <th>Outreach</th>
                <th>Sent</th>
                <th>Reply</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const alreadySent = !!r.externalMessageId || r.messageStatus === 'SENT';
                const hasReply = !!r.replyReceivedAt;

                return (
                  <tr key={r.leadId}>
                    <td className={s.cellPrimary}>{r.businessName}</td>
                    <td className={s.cellMono}>{r.publicEmail}</td>
                    <td>
                      <span
                        className={`${s.badge} ${
                          r.priority === 'HOT'
                            ? s.badgeDanger
                            : r.priority === 'WARM'
                            ? s.badgeAccent
                            : s.badgeNeutral
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.badge} ${s.badgeNeutral}`}>{r.leadStatus}</span>
                    </td>
                    <td>
                      <span
                        className={`${s.badge} ${
                          r.approvalStatus === 'APPROVED' || alreadySent
                            ? s.badgeSuccess
                            : s.badgeNeutral
                        }`}
                      >
                        {alreadySent ? 'SENT' : r.approvalStatus}
                      </span>
                    </td>
                    <td className={s.cellMono}>
                      {r.sentAt ? new Date(r.sentAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {hasReply ? (
                        <span className={`${s.badge} ${s.badgeSuccess}`}>REPLIED</span>
                      ) : alreadySent ? (
                        <span className={`${s.badge} ${s.badgeNeutral}`}>Waiting</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {canSend && !alreadySent ? (
                        <SendOutreachButton leadId={r.leadId} />
                      ) : alreadySent ? (
                        '—'
                      ) : (
                        <span className={`${s.badge} ${s.badgeNeutral}`}>No access</span>
                      )}
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
