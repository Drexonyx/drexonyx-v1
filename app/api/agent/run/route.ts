// DR 0058: Endpoint to trigger the async generation driver for a QUEUED ProductionJob.
// Admin-protected. Triggers the 6-step lifecycle and returns immediately after dispatch (HALT).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminRole } from '@/lib/admin/types';
import { runGenerationDriver } from '@/lib/agent/driver';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { organizationId, role } = session.user;
  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return NextResponse.json({ error: 'Forbidden: only OWNER or ADMIN_OPERATIONS may trigger generation' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>).productionJobId !== 'string') {
    return NextResponse.json({ error: 'productionJobId is required' }, { status: 400 });
  }

  const productionJobId = (body as Record<string, unknown>).productionJobId as string;

  const result = await runGenerationDriver({ productionJobId, organizationId });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ providerJobId: result.providerJobId });
}
