// GET /api/mobile/campaigns — authenticated campaign list

import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileJWT, parseBearerToken, mobileAuthHeaders } from '@/lib/mobile/jwt';
import { getCampaigns } from '@/lib/portal/queries';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: mobileAuthHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: mobileAuthHeaders() });
}

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req);
  if (!token) return json({ ok: false, error: 'Unauthorized' }, 401);

  const payload = verifyMobileJWT(token);
  if (!payload) return json({ ok: false, error: 'Invalid or expired token' }, 401);

  const campaigns = await getCampaigns(payload.organizationId);

  return json({
    ok: true,
    data: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  });
}
