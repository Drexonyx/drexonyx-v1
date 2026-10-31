'use client';

import { useState } from 'react';
import { AdminNav } from './AdminNav';
import { AdminSignOut } from './AdminSignOut';
import s from './mda.module.css';

type AdminSession = {
  userId: string;
  organizationId: string;
  role: string;
  name: string | null;
  email: string | null;
};

type Org = {
  id: string;
  name: string;
  slug: string;
  archived_at: Date | null;
} | null;

export function MdaShellClient({
  session,
  org,
  children,
}: {
  session: AdminSession;
  org: Org;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${s.mdaTheme} ${s.mdaShell}`}>
      {/* Mobile backdrop */}
      {open && (
        <div
          className={`${s.mdaOverlay} ${s.mdaOverlayVisible}`}
          onClick={() => setOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside className={`${s.mdaSidebar} ${open ? s.mdaSidebarOpen : ''}`}>
        <div className={s.mdaSidebarHeader}>
          <div className={s.mdaLogo}>
            <div className={s.mdaLogoMark}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#fff" opacity="0.9" />
                <rect x="9.5" y="9.5" width="7" height="7" rx="1.5" fill="#fff" opacity="0.7" />
                <rect x="9.5" y="2" width="7" height="7" rx="1.5" fill="#fff" opacity="0.5" />
              </svg>
            </div>
            <div className={s.mdaLogoText}>
              <span className={s.mdaLogoName}>MDA</span>
              <span className={s.mdaLogoSub}>MASTER DIGITAL AGENCY</span>
            </div>
          </div>
          <div className={s.mdaOrgRow}>
            <span className={s.mdaOrgName}>{org?.name ?? '—'}</span>
            <span className={s.mdaRoleBadge}>{session.role}</span>
          </div>
        </div>

        <AdminNav onNavClick={() => setOpen(false)} />

        <div className={s.mdaSidebarFooter}>
          <div className={s.mdaMascotArea}>
            <div className={s.mdaMascot}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="6" width="16" height="12" rx="3" fill="#3b82f6" opacity="0.8" />
                <circle cx="7.5" cy="12" r="1.5" fill="#fff" />
                <circle cx="14.5" cy="12" r="1.5" fill="#fff" />
                <path d="M8 16h6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M11 6V4" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="11" cy="3" r="1" fill="#60a5fa" />
                <path d="M7 18v2M15 18v2" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className={s.mdaMascotText}>
              <span className={s.mdaMascotName}>MDA Bot</span>
              <span className={s.mdaMascotStatus}>● نشط</span>
            </div>
          </div>
          <AdminSignOut />
        </div>
      </aside>

      {/* Main content */}
      <div className={s.mdaContent}>
        {/* Mobile top bar */}
        <div className={s.mdaTopBar}>
          <button
            className={s.mdaMenuBtn}
            onClick={() => setOpen((v) => !v)}
            aria-label="فتح القائمة"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              <line x1="3" y1="7" x2="19" y2="7" />
              <line x1="3" y1="11" x2="19" y2="11" />
              <line x1="3" y1="15" x2="19" y2="15" />
            </svg>
          </button>
          <span className={s.mdaTopLogo}>MDA Admin</span>
          <AdminSignOut />
        </div>

        {children}
      </div>
    </div>
  );
}
