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
    "Dubai-based performance creative studio. AI-powered UGC advertising for global brands — creative at scale, built to perform.",
  keywords: ["UGC advertising", "performance creative", "AI advertising", "brand campaigns", "Dubai", "UAE", "UGC studio"],
  openGraph: {
    type: "website",
    siteName: "DREXONYX",
    title: "DREXONYX — Performance Creative Studio",
    description:
      "Dubai-based performance creative studio. AI-powered UGC advertising for global brands — creative at scale, built to perform.",
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
