// English sub-routes layout — LTR, lang="en", no DREXONYX nav/footer (suppressed in root layout).
// Mirrors the pattern of /social-seller/layout.tsx and /chat/ isolation.

import { Cairo } from 'next/font/google';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
});

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="en-main" lang="en" dir="ltr" className={cairo.variable}>
      {children}
    </main>
  );
}
