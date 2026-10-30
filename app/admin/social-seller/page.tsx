// DR-0130: Admin — SSB leads management view
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { db, ssbSchema } from '@/db';
import { desc, sql } from 'drizzle-orm';
import { ConvertLeadButton } from './ConvertLeadButton';
import s from '../admin.module.css';

export const metadata = { title: 'SSB Leads — Admin' };

const STATUS_BADGE: Record<string, { label: string; cssClass: string }> = {
  NEW: { label: 'New', cssClass: s.badgeNeutral },
  CONTACTED: { label: 'Contacted', cssClass: s.badgeAccent },
  QUALIFIED: { label: 'Qualified', cssClass: s.badgeWarning },
  WON: { label: 'Won', cssClass: s.badgeSuccess },
  REJECTED: { label: 'Rejected', cssClass: s.badgeDanger },
};

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function SocialSellerLeadsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const leads = await db
    .select({
      id: ssbSchema.ssbLeads.id,
      business_name: ssbSchema.ssbLeads.business_name,
      business_type: ssbSchema.ssbLeads.business_type,
      platform: ssbSchema.ssbLeads.platform,
      contact_whatsapp: ssbSchema.ssbLeads.contact_whatsapp,
      services: ssbSchema.ssbLeads.services,
      source_bot: ssbSchema.ssbLeads.source_bot,
      status: ssbSchema.ssbLeads.status,
      created_at: ssbSchema.ssbLeads.created_at,
      has_subscription: sql<boolean>`EXISTS (
        SELECT 1 FROM ssb.ssb_subscriptions s WHERE s.lead_id = ${ssbSchema.ssbLeads.id}
      )`,
    })
    .from(ssbSchema.ssbLeads)
    .orderBy(desc(ssbSchema.ssbLeads.created_at))
    .limit(200);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>SSB Leads</h1>
        <p className={s.pageSubtitle}>
          Inbound prospects from the /social-seller page mda-sales agent. Update status after contacting.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className={s.emptyState}>
          <p className={s.emptyTitle}>No leads yet</p>
          <p className={s.emptyBody}>
            Leads appear here when prospects complete the mda-sales chat on /social-seller.
          </p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>Type</th>
                <th>Platform</th>
                <th>WhatsApp</th>
                <th>Services</th>
                <th>Source</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const badge = STATUS_BADGE[lead.status] ?? STATUS_BADGE.NEW;
                return (
                  <tr key={lead.id}>
                    <td className={s.cellPrimary}>{lead.business_name}</td>
                    <td>{lead.business_type ?? '—'}</td>
                    <td>{lead.platform ?? '—'}</td>
                    <td className={s.cellMono}>
                      <a
                        href={`https://wa.me/${lead.contact_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {lead.contact_whatsapp}
                      </a>
                    </td>
                    <td>{lead.services ? lead.services.slice(0, 60) + (lead.services.length > 60 ? '…' : '') : '—'}</td>
                    <td className={s.cellMono}>{lead.source_bot}</td>
                    <td>{fmt(lead.created_at)}</td>
                    <td>
                      <span className={`${s.badge} ${badge.cssClass}`}>{badge.label}</span>
                    </td>
                    <td>
                      {lead.has_subscription ? (
                        <span className={`${s.badge} ${s.badgeNeutral}`}>Subscribed</span>
                      ) : (
                        <ConvertLeadButton
                          leadId={lead.id}
                          defaultSlug={lead.business_name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '')}
                        />
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
