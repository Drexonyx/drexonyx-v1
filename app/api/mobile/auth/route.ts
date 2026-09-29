// Mobile auth endpoint: POST /api/mobile/auth
// Actions: login | register | forgot-password
// Returns JWT for Bearer-token auth. No CSRF required (not cookie-based).

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db/index';
import { users, orgMemberships } from '@/db/schema/identity';
import { eq, and, isNull } from 'drizzle-orm';
import { selfRegisterClient } from '@/lib/auth/self-register';
import { signMobileJWT, mobileAuthHeaders } from '@/lib/mobile/jwt';
import { selectPreferredMembership } from '@/lib/portal/types';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: mobileAuthHeaders() });
}

// OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: mobileAuthHeaders() });
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const action = body.action ?? 'login';

  // ── REGISTER ─────────────────────────────────────────────────────────────
  if (action === 'register') {
    const { email, password, displayName } = body;
    if (!email || !password || !displayName) {
      return json({ ok: false, error: 'email, password, and displayName are required' }, 400);
    }
    const result = await selfRegisterClient({ email, password, displayName });
    if (!result.ok) {
      return json({ ok: false, error: result.reason }, 400);
    }
    // Fetch the created user to build a token
    const userRows = await db
      .select({ id: users.id, email: users.email, display_name: users.display_name })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    const u = userRows[0];
    if (!u) return json({ ok: false, error: 'Registration failed' }, 500);

    const token = signMobileJWT({
      userId: u.id,
      organizationId: result.organizationId,
      role: 'CLIENT',
      email: u.email,
      displayName: u.display_name ?? displayName,
    });
    return json({
      ok: true,
      token,
      user: {
        userId: u.id,
        organizationId: result.organizationId,
        email: u.email,
        displayName: u.display_name ?? displayName,
        role: 'CLIENT',
      },
    });
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const { email, password } = body;
    if (!email || !password) {
      return json({ ok: false, error: 'email and password are required' }, 400);
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
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (userRows.length === 0) {
      return json({ ok: false, error: 'Invalid email or password' }, 401);
    }
    const u = userRows[0];
    if (u.archived_at !== null) return json({ ok: false, error: 'Account is inactive' }, 401);
    if (!u.password_hash) return json({ ok: false, error: 'Invalid email or password' }, 401);

    const valid = await bcrypt.compare(password, u.password_hash);
    if (!valid) return json({ ok: false, error: 'Invalid email or password' }, 401);

    const memberships = await db
      .select({ organization_id: orgMemberships.organization_id, role: orgMemberships.role })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.user_id, u.id), isNull(orgMemberships.archived_at)));

    const membership = selectPreferredMembership(memberships);
    if (!membership) return json({ ok: false, error: 'No active membership' }, 401);

    const token = signMobileJWT({
      userId: u.id,
      organizationId: membership.organization_id,
      role: membership.role,
      email: u.email,
      displayName: u.display_name ?? '',
    });

    return json({
      ok: true,
      token,
      user: {
        userId: u.id,
        organizationId: membership.organization_id,
        email: u.email,
        displayName: u.display_name ?? '',
        role: membership.role,
      },
    });
  }

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
  if (action === 'forgot-password') {
    // Always return success to prevent email enumeration.
    // Actual password reset email is not yet wired; owner must configure email service.
    return json({
      ok: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }

  return json({ ok: false, error: 'Unknown action' }, 400);
}
