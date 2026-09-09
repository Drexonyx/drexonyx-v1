import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "DREXONYX — Performance Creative Studio",
    template: "%s | DREXONYX",
  },
  description:
    "AI-powered UGC advertising built for modern brands. DREXONYX delivers performance creative at scale.",
  keywords: ["UGC advertising", "performance creative", "AI advertising", "brand campaigns"],
  openGraph: {
    type: "website",
    siteName: "DREXONYX",
    title: "DREXONYX — Performance Creative Studio",
    description:
      "AI-powered UGC advertising built for modern brands. DREXONYX delivers performance creative at scale.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navigation />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
