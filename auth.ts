import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db/index';
import { users, orgMemberships } from '@/db/schema/identity';
import { eq, and, isNull } from 'drizzle-orm';

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
  providers: [
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
          )
          .limit(1);

        if (membershipRows.length === 0) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          organizationId: membershipRows[0].organization_id,
          role: membershipRows[0].role,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === '/portal/login') return true;
      if (pathname.startsWith('/portal')) return !!session;
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
