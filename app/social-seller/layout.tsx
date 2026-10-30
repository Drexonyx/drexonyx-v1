// Phase 3-4: Isolated MDA Social Commerce layout — Cairo font, RTL, no DREXONYX nav/footer.
// Nav/footer are suppressed in root layout via isChat flag extended to /social-seller.

import { Cairo } from 'next/font/google';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
});

export default function SocialSellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="mda-main" lang="ar" dir="rtl" className={cairo.variable}>
      {children}
    </main>
  );
}
