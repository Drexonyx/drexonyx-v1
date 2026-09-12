'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './admin.module.css';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard' },
      { href: '/admin/organizations', label: 'Organization' },
      { href: '/admin/members', label: 'Members' },
      { href: '/admin/clients/new', label: 'Clients' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { href: '/admin/inquiries', label: 'Inquiries' },
      { href: '/admin/campaigns', label: 'Campaigns' },
      { href: '/admin/briefs', label: 'Briefs' },
      { href: '/admin/quotes', label: 'Quotes' },
      { href: '/admin/orders', label: 'Orders' },
    ],
  },
  {
    label: 'Production',
    items: [
      { href: '/admin/production', label: 'Production Jobs' },
      { href: '/admin/assets', label: 'Assets' },
      { href: '/admin/qc', label: 'QC Reviews' },
      { href: '/admin/approvals', label: 'Approvals' },
      { href: '/admin/deliveries', label: 'Deliveries' },
    ],
  },
  {
    label: 'Financial',
    items: [
      { href: '/admin/payments', label: 'Payments' },
      { href: '/admin/financial', label: 'Ledger & Expenses' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/audit-logs', label: 'Audit Logs' },
      { href: '/admin/system', label: 'System' },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={s.nav}>
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className={s.navSection}>{section.label}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                s.navLink +
                (pathname === item.href || pathname.startsWith(item.href + '/')
                  ? ' ' + s.navLinkActive
                  : '')
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
