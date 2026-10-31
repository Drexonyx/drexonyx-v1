// DR-0130: Admin — MDA Settings
import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminOrganization } from '@/lib/admin/queries';
import s from '../mda.module.css';

export const metadata = { title: 'الإعدادات — MDA' };

export default async function MdaSettingsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const org = await getAdminOrganization(session.organizationId);

  return (
    <div className={s.mdaPage}>
      {/* Page header */}
      <div className={s.mdaPageHeader}>
        <div>
          <h1 className={s.mdaPageTitle}>الإعدادات</h1>
          <p className={s.mdaPageSubtitle}>معلومات الحساب والمنظمة</p>
        </div>
      </div>

      <div className={s.mdaSettingsGrid}>
        {/* Account info */}
        <div className={s.mdaSettingsCard}>
          <div className={s.mdaSettingsCardTitle}>معلومات الحساب</div>
          <div className={s.mdaSettingsCardDesc}>بياناتك الشخصية كمسؤول في النظام</div>

          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>الاسم</span>
            <span className={s.mdaInfoValue}>{session.name ?? '—'}</span>
          </div>
          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>البريد الإلكتروني</span>
            <span className={s.mdaInfoValue} style={{ direction: 'ltr' }}>
              {session.email ?? '—'}
            </span>
          </div>
          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>الصلاحية</span>
            <span className={`${s.mdaBadge} ${s.mdaBadgeContacted}`} style={{ fontSize: '0.65rem' }}>
              {session.role}
            </span>
          </div>
        </div>

        {/* Organization info */}
        <div className={s.mdaSettingsCard}>
          <div className={s.mdaSettingsCardTitle}>معلومات المنظمة</div>
          <div className={s.mdaSettingsCardDesc}>بيانات الشركة المسجلة في النظام</div>

          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>اسم المنظمة</span>
            <span className={s.mdaInfoValue}>{org?.name ?? '—'}</span>
          </div>
          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>المعرّف (Slug)</span>
            <span className={s.mdaInfoValue} style={{ direction: 'ltr', fontFamily: 'monospace' }}>
              {org?.slug ?? '—'}
            </span>
          </div>
          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>الحالة</span>
            <span className={`${s.mdaBadge} ${org?.archived_at ? s.mdaBadgeRejected : s.mdaBadgeActive}`}>
              {org?.archived_at ? 'مؤرشف' : 'نشط'}
            </span>
          </div>
        </div>

        {/* System info */}
        <div className={s.mdaSettingsCard}>
          <div className={s.mdaSettingsCardTitle}>معلومات النظام</div>
          <div className={s.mdaSettingsCardDesc}>روابط ومعلومات تقنية عن لوحة التحكم</div>

          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>لوحة العملاء المحتملين</span>
            <span className={s.mdaInfoValue} style={{ direction: 'ltr', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              /admin/social-seller
            </span>
          </div>
          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>لوحة الاشتراكات</span>
            <span className={s.mdaInfoValue} style={{ direction: 'ltr', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              /admin/ssb-subscriptions
            </span>
          </div>
          <div className={s.mdaInfoRow}>
            <span className={s.mdaInfoLabel}>صفحة البيع</span>
            <span className={s.mdaInfoValue} style={{ direction: 'ltr', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              /social-seller
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
