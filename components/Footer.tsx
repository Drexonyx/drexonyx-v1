import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";

const QUICK_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/mda", label: "Master Digital Agency" },
  { href: "/portal/login", label: "Client Portal" },
] as const;

const SERVICE_LINKS = [
  { href: "/services/custom-software", label: "Custom Software" },
  { href: "/services/ai-automation", label: "AI & Automation" },
  { href: "/services/digital-commerce", label: "Digital Commerce" },
  { href: "/services/enterprise-systems", label: "Enterprise Systems" },
] as const;

export default function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        {/* Col 1: Brand */}
        <div className={styles.brand}>
          <Link href="/" className={styles.logo} aria-label="DREXONYX home">
            <Image
              src="/brand/r06/drexonyx-group-mark-dark-256px.png"
              alt="DREXONYX"
              width={256}
              height={256}
              className={styles.logoImg}
            />
          </Link>
          <p className={styles.tagline}>Technology & Digital Solutions</p>
          <p className={styles.location}>Dubai, UAE · Global</p>
        </div>

        {/* Col 2: Quick Links */}
        <nav aria-label="Quick links">
          <div className={styles.colLabel}>Quick Links</div>
          <ul className={styles.colLinks} role="list">
            {QUICK_LINKS.map(({ href, label }) => (
              <li key={label}>
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
              <li key={label}>
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
            href="mailto:info@drexonyx.com"
            className={styles.contactEmail}
          >
            info@drexonyx.com
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
        <p className={styles.copyTagline}>Built to Scale. Engineered to Deliver.</p>
      </div>

    </footer>
  );
}
