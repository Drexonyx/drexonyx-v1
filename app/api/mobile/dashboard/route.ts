// GET /api/mobile/dashboard — authenticated dashboard summary

import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileJWT, parseBearerToken, mobileAuthHeaders } from '@/lib/mobile/jwt';
import { getDashboardCounts } from '@/lib/portal/queries';

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

  const counts = await getDashboardCounts(payload.organizationId);

  return json({
    ok: true,
    data: {
      creditBalance: counts.creditBalance,
      campaigns: counts.campaigns,
      readyForReview: counts.assetsReadyForReview,
      inRevision: counts.assetsInRevision,
      pendingApprovals: counts.pendingApprovals,
      pendingQuotes: counts.pendingQuotes,
      delivered: counts.completedDeliveries,
    },
  });
}
