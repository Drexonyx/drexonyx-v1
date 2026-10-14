import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/photo-*',
      },
    ],
  },
  async redirects() {
    return [
      // Redirect bare domain to www in production.
      // Vercel's custom domain settings also handle this at the edge, but this
      // provides an application-level fallback when NEXT_PUBLIC_BASE_URL is set.
      {
        source: "/:path*",
        has: [{ type: "host", value: "drexonyx.com" }],
        destination: "https://www.drexonyx.com/:path*",
        permanent: true,
      },
      // /work was an alternate entry point for the portfolio; redirect permanently.
      {
        source: "/work",
        destination: "/portfolio",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
