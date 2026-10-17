import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";

const QUICK_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/start-project", label: "Start Project" },
] as const;

const SERVICE_LINKS = [
  { href: "/services", label: "UGC Content" },
  { href: "/services", label: "Cinematic Commercials" },
  { href: "/services", label: "Product Films" },
  { href: "/services", label: "Social Creative" },
] as const;

export default function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        {/* Col 1: Brand */}
        <div className={styles.brand}>
          <Link href="/" className={styles.logo} aria-label="DREXONYX home">
            <Image
              src="/brand/drexonyx-circular-emblem.png"
              alt="DREXONYX"
              width={1254}
              height={1254}
              className={styles.logoImg}
            />
          </Link>
          <p className={styles.tagline}>Global Creative Production</p>
          <p className={styles.location}>Dubai, UAE · Global</p>
        </div>

        {/* Col 2: Quick Links */}
        <nav aria-label="Quick links">
          <div className={styles.colLabel}>Quick Links</div>
          <ul className={styles.colLinks} role="list">
            {QUICK_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.colLink}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Col 3: Services */}
        <nav aria-label="Services">
          <div className={styles.colLabel}>Services</div>
          <ul className={styles.colLinks} role="list">
            {SERVICE_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.colLink}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Col 4: Contact */}
        <div className={styles.contactCol}>
          <div className={styles.colLabel}>Contact</div>
          <p className={styles.contactLocation}>Dubai, UAE · Global</p>
          <a
            href="mailto:drexonyx.studio@gmail.com"
            className={styles.contactEmail}
          >
            drexonyx.studio@gmail.com
          </a>
          <Link href="/portal/login" className={styles.portalLink}>
            Client Portal →
          </Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>
          &copy; {new Date().getFullYear()} DREXONYX. All rights reserved.
        </p>
        <p className={styles.copyTagline}>Creativity Today. A Bolder Tomorrow.</p>
      </div>

      <div className={styles.mdaStrip}>
        <p className={styles.mdaEndorsement}>
          MDA — MASTER DIGITAL AGENCY · A DREXONYX Brand
        </p>
      </div>
    </footer>
  );
}
