// Internal recovery endpoint: re-runs the post-payment pipeline for an already-PAID payment
// that had no production job created (e.g. due to the actorId bug fixed in this release).
// Protected by X-Recovery-Key matching ADMIN_SESSION_SECRET. Server-side only.
// One-time use per missed payment; idempotent — safe to call multiple times.

import { NextRequest, NextResponse } from 'next/server';
import { verifyZiinaPayment } from '@/lib/portal/verify-ziina-payment';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.ENABLE_ADMIN_ROUTES !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const key = req.headers.get('x-recovery-key');
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || key !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { paymentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { paymentId } = body;
  if (!paymentId || typeof paymentId !== 'string') {
    return NextResponse.json({ error: 'paymentId required' }, { status: 400 });
  }

  const organizationId = process.env.DREXONYX_ORG_ID;
  if (!organizationId) {
    return NextResponse.json({ error: 'DREXONYX_ORG_ID not configured' }, { status: 500 });
  }

  const result = await verifyZiinaPayment(paymentId, organizationId);
  return NextResponse.json({ result });
}
