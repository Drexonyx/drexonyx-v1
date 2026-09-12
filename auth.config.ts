// Edge-safe NextAuth config — no Node.js-only imports (no DB, no bcrypt).
// Used by middleware.ts which runs in the Vercel Edge runtime.
// auth.ts (the full config with DB and providers) is used server-side only.

import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  trustHost: true,
  providers: [],
  session: { strategy: 'jwt' as const },
  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === '/portal/login') return true;
      if (pathname === '/admin/login') return true;
      if (pathname.startsWith('/portal')) return !!session;
      if (pathname.startsWith('/admin')) return true;
      return true;
    },
  },
  pages: {
    signIn: '/portal/login',
  },
} satisfies NextAuthConfig;
