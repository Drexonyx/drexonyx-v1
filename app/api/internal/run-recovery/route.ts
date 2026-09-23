// One-time recovery endpoint for stuck pipeline orders (2026-09-23).
// Protected by DREXONYX_RECOVERY_TOKEN env var. Accepts GET for proxy-safe access.
// TEMPORARY — remove once recovery is complete and DREXONYX_RECOVERY_TOKEN is deleted.

import { NextRequest, NextResponse } from 'next/server';
import { recoverStuckGeneration } from '@/lib/agent/driver';
import { verifyZiinaPayment } from '@/lib/portal/verify-ziina-payment';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.ENABLE_ADMIN_ROUTES !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const token = process.env.DREXONYX_RECOVERY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Recovery token not configured' }, { status: 500 });
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key || key !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId = process.env.DREXONYX_ORG_ID;
  if (!organizationId) {
    return NextResponse.json({ error: 'DREXONYX_ORG_ID not configured' }, { status: 500 });
  }

  const mode = req.nextUrl.searchParams.get('mode');

  // Mode: recover stuck ai_generation (RUNNING, no provider_job_id)
  if (mode === 'stuck') {
    const aiGenerationId = req.nextUrl.searchParams.get('aiGenerationId');
    const productionJobId = req.nextUrl.searchParams.get('productionJobId');
    if (!aiGenerationId || !productionJobId) {
      return NextResponse.json({ error: 'aiGenerationId and productionJobId required' }, { status: 400 });
    }
    const result = await recoverStuckGeneration({ aiGenerationId, productionJobId, organizationId });
    return NextResponse.json({ mode: 'stuck', result });
  }

  // Mode: recover missing production job for a PAID payment
  if (mode === 'payment') {
    const paymentId = req.nextUrl.searchParams.get('paymentId');
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId required' }, { status: 400 });
    }
    const result = await verifyZiinaPayment(paymentId, organizationId);
    return NextResponse.json({ mode: 'payment', result });
  }

  return NextResponse.json({ error: 'mode required (stuck|payment)' }, { status: 400 });
}
