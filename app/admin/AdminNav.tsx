'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './mda.module.css';

const NAV_ITEMS = [
  {
    href: '/admin/mda',
    label: 'نظرة عامة',
    icon: (
      <svg className={s.mdaNavIcon} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="6" height="6" rx="1.5" />
        <rect x="10" y="2" width="6" height="6" rx="1.5" />
        <rect x="2" y="10" width="6" height="6" rx="1.5" />
        <rect x="10" y="10" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/social-seller',
    label: 'العملاء المحتملون',
    icon: (
      <svg className={s.mdaNavIcon} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6.5" cy="5.5" r="2.5" />
        <circle cx="13" cy="5.5" r="2" />
        <path d="M1 15c0-2.21 2.462-4 5.5-4S12 12.79 12 15" strokeLinecap="round" />
        <path d="M13 10c1.658.5 2.8 1.93 2.8 3.5" strokeLinecap="round" strokeDasharray="1.5 1" />
      </svg>
    ),
  },
  {
    href: '/admin/ssb-subscriptions',
    label: 'الاشتراكات',
    icon: (
      <svg className={s.mdaNavIcon} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="14" height="12" rx="2" />
        <path d="M5 8h8M5 11.5h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/mda-payments',
    label: 'المدفوعات',
    icon: (
      <svg className={s.mdaNavIcon} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="14" height="10" rx="2" />
        <path d="M2 8h14" />
        <rect x="4" y="11" width="3" height="1.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.6" />
      </svg>
    ),
  },
  {
    href: '/admin/mda-revenue',
    label: 'الإيرادات',
    icon: (
      <svg className={s.mdaNavIcon} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 14l3.5-4.5L9 12l3.5-5.5 3 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 15h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/chatbots',
    label: 'إدارة البوت',
    icon: (
      <svg className={s.mdaNavIcon} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="12" height="9" rx="2" />
        <circle cx="6.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="11.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
        <path d="M7 14v1.5M11 14v1.5M9 5V3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/mda-settings',
    label: 'الإعدادات',
    icon: (
      <svg className={s.mdaNavIcon} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="2.5" />
        <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.52 3.52l1.41 1.41M13.07 13.07l1.41 1.41M3.52 14.48l1.41-1.41M13.07 4.93l1.41-1.41" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AdminNav({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className={s.mdaNav}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/admin/mda' && pathname.startsWith(item.href + '/'));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={`${s.mdaNavItem} ${isActive ? s.mdaNavItemActive : ''}`}
          >
            {item.icon}
            <span className={s.mdaNavLabel}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
