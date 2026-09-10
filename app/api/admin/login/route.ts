// DR 0042 / Phase 24: Custom admin login route (email-only, temporary V1 period).
// Password authentication will be added from the Admin dashboard in a future phase.
//
// Security guarantees:
//   - Looks up the user by email in the database (never trusts email text alone).
//   - Requires the user to be active (not archived).
//   - Requires exactly one active Admin-role membership in the DREXONYX production org
//     (identified by DREXONYX_ORG_ID — fail closed if unset).
//   - Multi-org fail-closed (DR 0042): 0 or 2+ eligible memberships → rejected.
//   - organizationId always comes from the resolved membership, never from client input.
//   - Session token is HMAC-SHA256 signed; cookie is HttpOnly + Secure + SameSite=Lax.

import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { users, orgMemberships } from '@/db/schema/identity';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { ADMIN_ROLES } from '@/lib/admin/types';
import { createAdminToken, makeSessionCookieHeader } from '@/lib/admin/session';
import type { AdminRole } from '@/lib/admin/types';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  let email: string;
  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 401 });
  }

  // Fail closed if the production org ID is not configured.
  const drexOrgId = process.env.DREXONYX_ORG_ID;
  if (!drexOrgId) {
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      display_name: users.display_name,
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

  // Multi-org fail-closed (DR 0042): exactly 1 active admin membership in the
  // DREXONYX production organization required. Role must be in ADMIN_ROLES.
  const membershipRows = await db
    .select({
      organization_id: orgMemberships.organization_id,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.user_id, user.id),
        eq(orgMemberships.organization_id, drexOrgId),
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
