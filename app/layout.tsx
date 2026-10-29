import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.drexonyx.com"),
  title: {
    default: "DREXONYX — Performance Creative Studio",
    template: "%s | DREXONYX",
  },
  description:
    "Dubai-based performance creative studio. AI-powered UGC advertising for global brands — creative at scale, built to perform.",
  keywords: ["UGC advertising", "performance creative", "AI advertising", "brand campaigns", "Dubai", "UAE", "UGC studio"],
  icons: {
    icon: [
      { url: "/brand/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/brand/icon-32.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "DREXONYX",
    title: "DREXONYX — Performance Creative Studio",
    description:
      "Dubai-based performance creative studio. AI-powered UGC advertising for global brands — creative at scale, built to perform.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DREXONYX — Performance Creative Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DREXONYX — Performance Creative Studio",
    description:
      "Dubai-based performance creative studio. AI-powered UGC advertising for global brands — creative at scale, built to perform.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';
  const isChat = pathname.startsWith('/chat/');

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable}`}>
      <body>
        {!isChat && (
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
        )}
        {!isChat && <Navigation />}
        {isChat ? (
          children
        ) : (
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        )}
        {!isChat && <Footer />}
        <Analytics />
      </body>
    </html>
  );
}
