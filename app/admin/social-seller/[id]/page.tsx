// DR-0130: SSB lead detail page — view + edit status + notes
import { getAdminSession } from '@/lib/admin/session';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db, ssbSchema } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { LeadStatusForm } from './LeadStatusForm';
import { LeadNotesForm } from './LeadNotesForm';
import s from '../../admin.module.css';

export const metadata = { title: 'Lead Detail — Admin' };

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_BADGE: Record<string, { label: string; cssClass: string }> = {
  NEW: { label: 'New', cssClass: s.badgeNeutral },
  CONTACTED: { label: 'Contacted', cssClass: s.badgeAccent },
  QUALIFIED: { label: 'Qualified', cssClass: s.badgeWarning },
  WON: { label: 'Won', cssClass: s.badgeSuccess },
  REJECTED: { label: 'Rejected', cssClass: s.badgeDanger },
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { id } = await params;

  const [lead] = await db
    .select()
    .from(ssbSchema.ssbLeads)
    .where(eq(ssbSchema.ssbLeads.id, id))
    .limit(1);

  if (!lead) notFound();

  // Check if a subscription exists for this lead
  const [subRow] = await db
    .select({
      id: ssbSchema.ssbSubscriptions.id,
      merchant_slug: ssbSchema.ssbSubscriptions.merchant_slug,
      active: ssbSchema.ssbSubscriptions.active,
    })
    .from(ssbSchema.ssbSubscriptions)
    .where(eq(ssbSchema.ssbSubscriptions.lead_id, id))
    .limit(1);

  const badge = STATUS_BADGE[lead.status] ?? STATUS_BADGE.NEW;

  return (
    <>
      <div className={s.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <Link href="/admin/social-seller" className={s.navLink}>
            ← All Leads
          </Link>
          <span className={`${s.badge} ${badge.cssClass}`}>{badge.label}</span>
        </div>
        <h1 className={s.pageTitle}>{lead.business_name}</h1>
        <p className={s.pageSubtitle}>Lead ID: {lead.id} · Added {fmt(lead.created_at)}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Lead details */}
        <div>
          <div className={s.statCard} style={{ marginBottom: '1rem' }}>
            <div className={s.statLabel}>Contact</div>
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <strong>WhatsApp:</strong>{' '}
                <a
                  href={`https://wa.me/${lead.contact_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--drex-accent)' }}
                >
                  {lead.contact_whatsapp}
                </a>
              </div>
              {lead.business_type && (
                <div style={{ marginBottom: '0.4rem' }}>
                  <strong>Type:</strong> {lead.business_type}
                </div>
              )}
              {lead.platform && (
                <div style={{ marginBottom: '0.4rem' }}>
                  <strong>Platform:</strong> {lead.platform}
                </div>
              )}
              {lead.working_hours && (
                <div style={{ marginBottom: '0.4rem' }}>
                  <strong>Hours:</strong> {lead.working_hours}
                </div>
              )}
              {lead.services && (
                <div style={{ marginBottom: '0.4rem' }}>
                  <strong>Services:</strong> {lead.services}
                </div>
              )}
              <div style={{ marginBottom: '0.4rem' }}>
                <strong>Source:</strong>{' '}
                <code style={{ fontSize: '0.8rem' }}>{lead.source_bot}</code>
              </div>
              {lead.source_url && (
                <div>
                  <strong>Source URL:</strong>{' '}
                  <code style={{ fontSize: '0.8rem' }}>{lead.source_url}</code>
                </div>
              )}
            </div>
          </div>

          {subRow ? (
            <div className={s.statCard}>
              <div className={s.statLabel}>Subscription</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                <div><strong>Slug:</strong> <code style={{ fontSize: '0.8rem' }}>{subRow.merchant_slug}</code></div>
                <div style={{ marginTop: '0.4rem' }}>
                  <strong>Active:</strong>{' '}
                  <span className={`${s.badge} ${subRow.active ? s.badgeSuccess : s.badgeNeutral}`}>
                    {subRow.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <Link href={`/admin/ssb-subscriptions`} className={s.navLink}>
                    View Subscription →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className={s.statCard}>
              <div className={s.statLabel}>Subscription</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--drex-text-muted)' }}>
                No subscription yet.{' '}
                <Link href="/admin/social-seller" className={s.navLink}>
                  Convert from leads list →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <LeadStatusForm leadId={lead.id} currentStatus={lead.status} />
          <LeadNotesForm leadId={lead.id} initialNotes={lead.notes} />
        </div>
      </div>
    </>
  );
}
