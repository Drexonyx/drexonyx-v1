import { Inter, Tajawal } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-inter' });
const tajawal = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700', '800'], variable: '--font-tajawal' });

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${tajawal.variable}`}>
      {children}
    </div>
  );
}
