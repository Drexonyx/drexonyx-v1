import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";

const FOOTER_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/start-campaign", label: "Start Campaign" },
] as const;

export default function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo} aria-label="DREXONYX home">
            <Image src="/brand/drexonyx-logo.png" alt="DREXONYX" width={1866} height={736} className={styles.logoImg} />
          </Link>
          <p className={styles.tagline}>Performance Creative Studio</p>
        </div>

        <nav aria-label="Footer navigation">
          <ul className={styles.links} role="list">
            {FOOTER_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>
          &copy; {new Date().getFullYear()} DREXONYX. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
