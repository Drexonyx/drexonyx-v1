import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue, Cairo, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
import "./globals.css";
import Footer from "@/components/Footer";
import HomepageHeader from "@/components/HomepageHeader";
import { LanguageProvider } from "@/contexts/LanguageContext";

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

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.drexonyx.com"),
  title: {
    default: "DREXONYX — Technology & Digital Solutions",
    template: "%s | DREXONYX",
  },
  description:
    "Dubai-based technology and digital solutions group. Custom software, AI automation, digital commerce, and enterprise integration for businesses ready to scale.",
  keywords: [
    "custom software development",
    "AI automation",
    "digital commerce",
    "enterprise integration",
    "technology solutions",
    "Dubai",
    "UAE",
    "DREXONYX",
  ],
  icons: {
    icon: [
      { url: "/brand/r06/drexonyx-group-mark-dark-32px.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/r06/drexonyx-group-mark-dark-64px.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/r06/drexonyx-group-mark-dark-128px.png", sizes: "128x128", type: "image/png" },
      { url: "/brand/r06/drexonyx-group-mark-dark-256px.png", sizes: "256x256", type: "image/png" },
      { url: "/brand/r06/drexonyx-group-mark-dark-512px.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/r06/drexonyx-group-apple-touch-icon-180px.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/brand/r06/drexonyx-group-mark-dark-32px.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "DREXONYX",
    title: "DREXONYX — Technology & Digital Solutions",
    description:
      "Dubai-based technology and digital solutions group. Custom software, AI automation, digital commerce, and enterprise integration for businesses ready to scale.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DREXONYX — Technology & Digital Solutions" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DREXONYX — Technology & Digital Solutions",
    description:
      "Dubai-based technology and digital solutions group. Custom software, AI automation, digital commerce, and enterprise integration for businesses ready to scale.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';
  const isChat = pathname.startsWith('/chat/') || pathname.startsWith('/social-seller');
  const isPortal = pathname.startsWith('/portal');
  const isAdmin = pathname.startsWith('/admin');
  const isHomepage = pathname === '/';
  const isMda = pathname === '/mda';
  const isPublicSite = !isChat && !isPortal && !isAdmin;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${cairo.variable} ${spaceGrotesk.variable}`}>
      <body>
        <LanguageProvider>
          {isPublicSite && (
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
          )}
          {isPublicSite && <HomepageHeader />}
          {isChat ? (
            children
          ) : (
            <main id="main-content" tabIndex={-1} style={isPublicSite && !isHomepage ? { paddingTop: '88px' } : undefined}>
              {children}
            </main>
          )}
          {isPublicSite && !isHomepage && !isMda && <Footer />}
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  );
}
