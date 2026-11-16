"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./HomepageHeader.module.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/lib/translations/en";
import { ar } from "@/lib/translations/ar";

function GlobeIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      className={styles.globeIcon}
    >
      <circle cx="6.5" cy="6.5" r="5.75" stroke="currentColor" strokeWidth="1.1" />
      <ellipse cx="6.5" cy="6.5" rx="2.8" ry="5.75" stroke="currentColor" strokeWidth="1.1" />
      <line x1="0.75" y1="6.5" x2="12.25" y2="6.5" stroke="currentColor" strokeWidth="1.1" />
      <line x1="0.75" y1="4" x2="12.25" y2="4" stroke="currentColor" strokeWidth="1.1" />
      <line x1="0.75" y1="9" x2="12.25" y2="9" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export default function HomepageHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isAr, toggleLang } = useLanguage();
  const t = isAr ? ar : en;

  const NAV_LINKS = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/services", label: t.nav.services },
    { href: "/mda", label: t.nav.mda },
    { href: "/services", label: t.nav.dxStudio },
    { href: "/start-project", label: t.nav.contact },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink} aria-label="DREXONYX GROUP — Home">
          <Image
            src="/brand/r06/drexonyx-group-horizontal-dark-800px.png"
            alt="DREXONYX GROUP"
            width={800}
            height={184}
            className={styles.logo}
            priority
          />
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_LINKS.map((l, i) => (
            <Link
              key={i}
              href={l.href}
              className={`${styles.navLink} ${pathname === l.href && i === 0 ? styles.navActive : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <button
            onClick={toggleLang}
            className={styles.langToggle}
            aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
          >
            <GlobeIcon />
            <span className={styles.langToggleEn}>EN</span>
            <span className={styles.langToggleSep} aria-hidden="true">|</span>
            <span className={styles.langToggleAr}>AR</span>
          </button>
          <button
            className={styles.burger}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          >
            <span className={open ? styles.burgerTopOpen : ""} />
            <span className={open ? styles.burgerMidOpen : ""} />
            <span className={open ? styles.burgerBotOpen : ""} />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.drawer}>
          <nav aria-label="Mobile navigation">
            {NAV_LINKS.map((l, i) => (
              <Link
                key={i}
                href={l.href}
                className={styles.drawerLink}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => {
                toggleLang();
                setOpen(false);
              }}
              className={styles.drawerLangToggle}
              aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
            >
              <GlobeIcon />
              <span>{isAr ? "EN | AR" : "AR | EN"}</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
