// DR 0042 / Phase 24: Custom admin login route — replaces Auth.js Credentials provider.
// organizationId always comes from the single resolved membership (multi-org fail-closed).
// Never echoes password_hash, never accepts organizationId from client input.

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db/index';
import { users, orgMemberships } from '@/db/schema/identity';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { ADMIN_ROLES } from '@/lib/admin/types';
import { createAdminToken, makeSessionCookieHeader } from '@/lib/admin/session';
import type { AdminRole } from '@/lib/admin/types';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  let email: string;
  let password: string;
  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      display_name: users.display_name,
      password_hash: users.password_hash,
      archived_at: users.archived_at,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (userRows.length === 0) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const user = userRows[0];

  if (user.archived_at !== null) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  if (!user.password_hash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Multi-org fail-closed (DR 0042): exactly 1 eligible active membership required.
  const membershipRows = await db
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

  if (membershipRows.length !== 1) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const membership = membershipRows[0];
  const token = createAdminToken({
    userId: user.id,
    organizationId: membership.organization_id,
    role: membership.role as AdminRole,
    name: user.display_name,
    email: user.email,
  });

  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', makeSessionCookieHeader(token));
  return response;
}
