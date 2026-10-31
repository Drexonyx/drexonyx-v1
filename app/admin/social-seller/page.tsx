// DR-0130: Admin — SSB leads management view (Arabic RTL redesign)
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db, ssbSchema } from '@/db';
import { desc, sql, ilike, eq, and } from 'drizzle-orm';
import { ConvertLeadButton } from './ConvertLeadButton';
import s from '../mda.module.css';

export const metadata = { title: 'العملاء المحتملون — MDA' };

const STATUS_META: Record<string, { arabic: string; badgeClass: string }> = {
  NEW:       { arabic: 'جديد',       badgeClass: s.mdaBadgeNew },
  CONTACTED: { arabic: 'تم التواصل', badgeClass: s.mdaBadgeContacted },
  QUALIFIED: { arabic: 'مؤهل',       badgeClass: s.mdaBadgeQualified },
  WON:       { arabic: 'فائز',       badgeClass: s.mdaBadgeWon },
  REJECTED:  { arabic: 'مرفوض',      badgeClass: s.mdaBadgeRejected },
};

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('ar-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function SocialSellerLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { q, status } = await searchParams;

  const filters = [];
  if (q?.trim()) {
    filters.push(ilike(ssbSchema.ssbLeads.business_name, `%${q.trim()}%`));
  }
  if (status && status !== 'ALL') {
    filters.push(eq(ssbSchema.ssbLeads.status, status));
  }

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
        SELECT 1 FROM ssb.ssb_subscriptions sub WHERE sub.lead_id = ${ssbSchema.ssbLeads.id}
      )`,
    })
    .from(ssbSchema.ssbLeads)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(ssbSchema.ssbLeads.created_at))
    .limit(200);

  return (
    <div className={s.mdaPage}>
      {/* Page header */}
      <div className={s.mdaPageHeader}>
        <div>
          <h1 className={s.mdaPageTitle}>العملاء المحتملون</h1>
          <p className={s.mdaPageSubtitle}>
            العملاء الواردون من صفحة /social-seller — قم بتحديث الحالة بعد التواصل
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <form method="GET" className={s.mdaFilterBar}>
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="البحث باسم المشروع…"
          className={s.mdaFilterInput}
        />
        <select name="status" defaultValue={status ?? 'ALL'} className={s.mdaFilterSelect}>
          <option value="ALL">كل الحالات</option>
          <option value="NEW">جديد</option>
          <option value="CONTACTED">تم التواصل</option>
          <option value="QUALIFIED">مؤهل</option>
          <option value="WON">فائز</option>
          <option value="REJECTED">مرفوض</option>
        </select>
        <button type="submit" className={s.mdaBtnPrimary}>تصفية</button>
        {(q || (status && status !== 'ALL')) && (
          <Link href="/admin/social-seller" className={s.mdaBtnGhost}>مسح</Link>
        )}
      </form>

      {leads.length === 0 ? (
        <div className={s.mdaEmpty}>
          <div className={s.mdaEmptyIcon}>📭</div>
          <div className={s.mdaEmptyTitle}>لا توجد عملاء محتملون</div>
          <div>
            {q || status ? 'لا توجد نتائج تطابق البحث — جرّب تعديل الفلتر.' : 'ستظهر هنا بعد اكتمال جلسات المحادثة.'}
          </div>
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
                  <th>المنصة</th>
                  <th>واتساب</th>
                  <th>الخدمات</th>
                  <th>تاريخ الإضافة</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const meta = STATUS_META[lead.status] ?? STATUS_META.NEW;
                  return (
                    <tr key={lead.id}>
                      <td className={s.mdaCellPrimary}>
                        <Link href={`/admin/social-seller/${lead.id}`}>{lead.business_name}</Link>
                      </td>
                      <td>{lead.business_type ?? '—'}</td>
                      <td>{lead.platform ?? '—'}</td>
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
                      <td>
                        {lead.services
                          ? lead.services.slice(0, 60) + (lead.services.length > 60 ? '…' : '')
                          : '—'}
                      </td>
                      <td>{fmt(lead.created_at)}</td>
                      <td>
                        <span className={`${s.mdaBadge} ${meta.badgeClass}`}>
                          {meta.arabic}
                        </span>
                      </td>
                      <td>
                        {lead.has_subscription ? (
                          <span className={`${s.mdaBadge} ${s.mdaBadgeActive}`}>مشترك</span>
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

          {/* Mobile cards */}
          <div className={s.mdaLeadCards}>
            {leads.map((lead) => {
              const meta = STATUS_META[lead.status] ?? STATUS_META.NEW;
              return (
                <div key={lead.id} className={s.mdaLeadCard}>
                  <div className={s.mdaLeadCardHeader}>
                    <span className={s.mdaLeadCardName}>{lead.business_name}</span>
                    <span className={`${s.mdaBadge} ${meta.badgeClass}`}>{meta.arabic}</span>
                  </div>
                  <div className={s.mdaLeadCardMeta}>
                    {lead.business_type && <span>{lead.business_type}</span>}
                    {lead.platform && <span>{lead.platform}</span>}
                    <span style={{ direction: 'ltr', color: '#22c55e' }}>
                      {lead.contact_whatsapp}
                    </span>
                    <span>{fmt(lead.created_at)}</span>
                  </div>
                  <div className={s.mdaLeadCardActions}>
                    <Link href={`/admin/social-seller/${lead.id}`} className={s.mdaBtnSmall}>
                      عرض
                    </Link>
                    {!lead.has_subscription && (
                      <ConvertLeadButton
                        leadId={lead.id}
                        defaultSlug={lead.business_name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '')}
                      />
                    )}
                    {lead.has_subscription && (
                      <span className={`${s.mdaBadge} ${s.mdaBadgeActive}`}>مشترك</span>
                    )}
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
