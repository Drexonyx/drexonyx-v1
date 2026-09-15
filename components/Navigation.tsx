"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import styles from "./Navigation.module.css";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <header className={styles.header} role="banner">
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} onClick={closeMenu} aria-label="DREXONYX home">
            <Image src="/brand/drexonyx-horizontal-lockup.png" alt="DREXONYX" width={3198} height={540} className={styles.logoImg} priority />
          </Link>

          {/* Desktop links */}
          <ul className={styles.links} role="list">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`${styles.link} ${pathname === href ? styles.linkActive : ""}`}
                  aria-current={pathname === href ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/start-project" className={styles.cta}>
            Start Project
          </Link>

          {/* Mobile menu button */}
          <button
            className={styles.menuBtn}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={toggleMenu}
          >
            <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarTop : ""}`} />
            <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarMid : ""}`} />
            <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarBot : ""}`} />
          </button>
        </div>

        {/* Mobile drawer */}
        <div
          id="mobile-menu"
          className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`}
          aria-hidden={!menuOpen}
        >
          <ul className={styles.drawerLinks} role="list">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`${styles.drawerLink} ${pathname === href ? styles.drawerLinkActive : ""}`}
                  aria-current={pathname === href ? "page" : undefined}
                  onClick={closeMenu}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/start-project"
                className={styles.drawerCta}
                onClick={closeMenu}
                tabIndex={menuOpen ? 0 : -1}
              >
                Start Project
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
