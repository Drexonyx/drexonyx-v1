// DR 0065: Service token issuance endpoint — admin-protected, server-to-server only.
// Issues a scoped service token for a ProductionJob. Raw token returned once; never stored.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminRole } from '@/lib/admin/types';
import { issueServiceToken } from '@/lib/agent/service-tokens';
import { db } from '@/db/index';
import { productionJobs } from '@/db/schema/production';
import { and, eq } from 'drizzle-orm';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { organizationId } = session.user;

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

  // Verify job belongs to this organization and is AI_GENERATION type
  const jobRows = await db
    .select({ id: productionJobs.id, job_type: productionJobs.job_type, status: productionJobs.status })
    .from(productionJobs)
    .where(and(eq(productionJobs.id, productionJobId), eq(productionJobs.organization_id, organizationId)))
    .limit(1);

  if (jobRows.length === 0) {
    return NextResponse.json({ error: 'ProductionJob not found' }, { status: 404 });
  }
  if (jobRows[0].job_type !== 'AI_GENERATION') {
    return NextResponse.json({ error: 'ProductionJob is not AI_GENERATION type' }, { status: 400 });
  }

  const result = await issueServiceToken({ organizationId, productionJobId });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  // rawToken is returned once — caller must store it immediately.
  return NextResponse.json({
    tokenId: result.tokenId,
    rawToken: result.rawToken,
    expiresAt: result.expiresAt.toISOString(),
  });
}
