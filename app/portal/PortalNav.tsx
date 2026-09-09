'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './portal.module.css';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/portal/dashboard', label: 'Dashboard' },
      { href: '/portal/brand-dna', label: 'Brand DNA' },
    ],
  },
  {
    label: 'Projects',
    items: [
      { href: '/portal/campaigns', label: 'Campaigns' },
      { href: '/portal/quotes', label: 'Quotes' },
      { href: '/portal/orders', label: 'Orders' },
    ],
  },
  {
    label: 'Production',
    items: [
      { href: '/portal/assets', label: 'Assets' },
      { href: '/portal/production', label: 'Production Status' },
      { href: '/portal/revisions', label: 'Revisions' },
      { href: '/portal/approvals', label: 'Approvals' },
      { href: '/portal/deliveries', label: 'Deliveries' },
    ],
  },
  {
    label: 'Billing',
    items: [{ href: '/portal/payments', label: 'Payments' }],
  },
];

export function PortalNav() {
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
                (pathname === item.href ||
                pathname.startsWith(item.href + '/')
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
