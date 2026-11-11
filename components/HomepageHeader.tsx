"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./HomepageHeader.module.css";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Our Work" },
  { href: "/start-project", label: "Contact" },
];

export default function HomepageHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink} aria-label="DREXONYX GROUP — Home">
          <Image
            src="/brand/logos/drexonyx-header-logo.png"
            alt="DREXONYX GROUP"
            width={430}
            height={95}
            className={styles.logo}
            priority
          />
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.navLink} ${pathname === l.href ? styles.navActive : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/start-project" className={styles.cta}>
            Request a Quote
          </Link>
          <button
            className={styles.burger}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
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
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={styles.drawerLink}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/start-project"
              className={styles.drawerCta}
              onClick={() => setOpen(false)}
            >
              Request a Quote
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
