// TEMPORARY DIAGNOSTIC — remove after root cause identified.
// Returns opaque codes only. No sensitive data in any response.
// POST /api/admin/login-diag  body: { email: string }

import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { users, orgMemberships } from '@/db/schema/identity';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { ADMIN_ROLES } from '@/lib/admin/types';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  let email: string;
  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ code: 'AUTH_DIAG_01' });
  }

  if (!email) {
    return NextResponse.json({ code: 'AUTH_DIAG_01' });
  }

  // Check DREXONYX_ORG_ID env var presence.
  const drexOrgId = process.env.DREXONYX_ORG_ID;
  if (!drexOrgId) {
    return NextResponse.json({ code: 'AUTH_DIAG_02' });
  }

  // Check user exists.
  let userRows: { id: string; archived_at: Date | null }[];
  try {
    userRows = await db
      .select({ id: users.id, archived_at: users.archived_at })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
  } catch {
    return NextResponse.json({ code: 'AUTH_DIAG_08' });
  }

  if (userRows.length === 0) {
    return NextResponse.json({ code: 'AUTH_DIAG_03' });
  }

  const user = userRows[0];

  if (user.archived_at !== null) {
    return NextResponse.json({ code: 'AUTH_DIAG_04' });
  }

  // Count memberships WITHOUT the org filter to distinguish mismatch from none.
  let allAdminMemberships: { organization_id: string; role: string }[];
  try {
    allAdminMemberships = await db
      .select({ organization_id: orgMemberships.organization_id, role: orgMemberships.role })
      .from(orgMemberships)
      .where(
        and(
          eq(orgMemberships.user_id, user.id),
          inArray(orgMemberships.role, [...ADMIN_ROLES]),
          isNull(orgMemberships.archived_at),
        ),
      );
  } catch {
    return NextResponse.json({ code: 'AUTH_DIAG_05' });
  }

  if (allAdminMemberships.length === 0) {
    // No admin membership of any kind exists.
    return NextResponse.json({ code: 'AUTH_DIAG_06' });
  }

  // Now apply org filter.
  const orgFiltered = allAdminMemberships.filter(
    (m) => m.organization_id === drexOrgId,
  );

  if (orgFiltered.length === 0) {
    // Admin membership exists but not in the DREXONYX org — env var mismatch.
    return NextResponse.json({ code: 'AUTH_DIAG_02B' });
  }

  if (orgFiltered.length !== 1) {
    // Multiple matches in the DREXONYX org.
    return NextResponse.json({ code: 'AUTH_DIAG_06B' });
  }

  // Check session secret availability (token creation would fail without it).
  const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET;
  if (!sessionSecret) {
    return NextResponse.json({ code: 'AUTH_DIAG_07' });
  }

  return NextResponse.json({ code: 'AUTH_DIAG_OK' });
}
