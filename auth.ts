// Phase 24: Admin auth path removed from Auth.js. Admin login/session is now handled by
// /api/admin/login (custom HMAC-SHA256 JWT cookie). See lib/admin/session.ts.
// Auth.js here serves portal (CLIENT) authentication only.

import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db/index';
import { users, orgMemberships } from '@/db/schema/identity';
import { eq, and, isNull } from 'drizzle-orm';
import { selectPreferredMembership } from '@/lib/portal/types';

declare module 'next-auth' {
  interface User {
    organizationId?: string;
    role?: string;
  }

  interface Session {
    user: {
      userId: string;
      organizationId: string;
      role: string;
    } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required on Vercel and any multi-domain deployment: Auth.js v5 rejects
  // requests whose Host header it cannot verify unless this is set.
  // Equivalent to AUTH_TRUST_HOST=true. Safe because Vercel controls the host.
  trustHost: true,

  providers: [
    // Portal provider — CLIENT-only (DR 0039). No explicit id: effective default is
    // "credentials". Must not be renamed to preserve Phase 05 regression compatibility
    // (DR 0042 FACT 10).
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const userRows = await db
          .select({
            id: users.id,
            email: users.email,
            display_name: users.display_name,
            password_hash: users.password_hash,
            archived_at: users.archived_at,
          })
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (userRows.length === 0) return null;
        const user = userRows[0];

        if (user.archived_at !== null) return null;
        if (!user.password_hash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash,
        );
        if (!valid) return null;

        const membershipRows = await db
          .select({
            organization_id: orgMemberships.organization_id,
            role: orgMemberships.role,
          })
          .from(orgMemberships)
          .where(
            and(
              eq(orgMemberships.user_id, user.id),
              eq(orgMemberships.role, 'CLIENT'),
              isNull(orgMemberships.archived_at),
            ),
          );

        if (membershipRows.length === 0) return null;

        // DR 0106: Prefer the DREXONYX production org membership so the client's session
        // organizationId resolves to the production workspace. Falls back to any CLIENT
        // membership when DREXONYX_ORG_ID is not set (development mode).
        const membership = selectPreferredMembership(membershipRows, process.env.DREXONYX_ORG_ID);

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          organizationId: membership.organization_id,
          role: membership.role,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      // Public auth pages
      if (pathname === '/portal/login') return true;
      if (pathname === '/portal/signup') return true;
      if (pathname === '/admin/login') return true;
      // Portal: require any valid session (CLIENT gate enforced at provider level)
      if (pathname.startsWith('/portal')) return !!session;
      // Admin: custom session cookie checked in each page/action via getAdminSession().
      // Auth.js does not gate admin routes; returning true passes the request through.
      if (pathname.startsWith('/admin')) return true;
      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token['userId'] = user.id;
        token['organizationId'] = user.organizationId;
        token['role'] = user.role;
      }
      return token;
    },

    session({ session, token }) {
      session.user.userId = (token['userId'] as string) ?? '';
      session.user.organizationId = (token['organizationId'] as string) ?? '';
      session.user.role = (token['role'] as string) ?? '';
      return session;
    },
  },

  pages: {
    signIn: '/portal/login',
  },
});
