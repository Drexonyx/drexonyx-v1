import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db/index';
import { users, orgMemberships } from '@/db/schema/identity';
import { eq, and, isNull, inArray } from 'drizzle-orm';
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


const ADMIN_ROLES = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC'] as const;

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

    // Admin provider — OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION, QC only (DR 0042).
    // CLIENT and AGENT are rejected. Multi-org fail-closed rule: zero or 2+ eligible
    // active memberships → authentication fails (DR 0042 §Multi-Organization Rule).
    // organizationId must never come from client input — only from the single resolved
    // membership record (DR 0042, DR 0001).
    Credentials({
      id: 'admin',
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

        // Fail-closed multi-org rule (DR 0042): query ALL eligible active staff
        // memberships without .limit(). Zero → fail. Exactly 1 → use it.
        // 2 or more → fail closed. Never select first row nondeterministically.
        const adminMembershipRows = await db
          .select({
            organization_id: orgMemberships.organization_id,
            role: orgMemberships.role,
          })
          .from(orgMemberships)
          .where(
            and(
              eq(orgMemberships.user_id, user.id),
              inArray(orgMemberships.role, [...ADMIN_ROLES]),
              isNull(orgMemberships.archived_at),
            ),
          );

        if (adminMembershipRows.length !== 1) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          organizationId: adminMembershipRows[0].organization_id,
          role: adminMembershipRows[0].role,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      // Public sign-in pages
      if (pathname === '/portal/login') return true;
      if (pathname === '/admin/login') return true;
      // Portal: require any valid session (CLIENT gate enforced at provider level)
      if (pathname.startsWith('/portal')) return !!session;
      // Admin: require session with a staff role (DR 0042)
      if (pathname.startsWith('/admin')) {
        if (!session) {
          return Response.redirect(new URL('/admin/login', request.url));
        }
        if (!ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) {
          return Response.redirect(new URL('/admin/login', request.url));
        }
        return true;
      }
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
