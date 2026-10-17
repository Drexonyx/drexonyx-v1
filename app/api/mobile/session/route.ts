// GET /api/mobile/session — verify Bearer token, return user info

import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileJWT, parseBearerToken, mobileAuthHeaders } from '@/lib/mobile/jwt';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: mobileAuthHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: mobileAuthHeaders() });
}

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req);
  if (!token) return json({ ok: false, error: 'No token' }, 401);

  const payload = verifyMobileJWT(token);
  if (!payload) return json({ ok: false, error: 'Invalid or expired token' }, 401);

  return json({
    ok: true,
    user: {
      userId: payload.userId,
      organizationId: payload.organizationId,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
    },
  });
}
