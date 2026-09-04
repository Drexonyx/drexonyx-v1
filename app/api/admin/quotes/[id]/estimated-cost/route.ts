// DR 0043 §5.5: OWNER and ADMIN_OPERATIONS may set estimated_cost while the
// quote is in DRAFT status. organizationId always comes from the server-side
// JWT — never from the request body or URL parameters.

import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { quotes } from '@/db/schema/commercial';
import { and, eq, isNull } from 'drizzle-orm';
import { isAdminRole } from '@/lib/admin/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only OWNER and ADMIN_OPERATIONS may set estimated_cost (DR 0043 §5.5)
  if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN_OPERATIONS') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // organizationId from server-side JWT — never from request
  const organizationId = session.user.organizationId;
  const { id: quoteId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('estimated_cost' in body) ||
    typeof (body as Record<string, unknown>).estimated_cost !== 'string'
  ) {
    return NextResponse.json(
      { error: 'estimated_cost must be provided as a string' },
      { status: 400 },
    );
  }

  const rawCost = (body as Record<string, unknown>).estimated_cost as string;
  const costValue = parseFloat(rawCost);

  if (isNaN(costValue) || costValue <= 0) {
    return NextResponse.json(
      { error: 'estimated_cost must be a positive number' },
      { status: 422 },
    );
  }

  // Verify quote exists and is DRAFT (org-scoped, non-archived)
  const existing = await db
    .select({ id: quotes.id, status: quotes.status })
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organization_id, organizationId),
        isNull(quotes.archived_at),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  if (existing[0].status !== 'DRAFT') {
    return NextResponse.json(
      {
        error: `estimated_cost may only be set on DRAFT quotes (current status: ${existing[0].status})`,
      },
      { status: 409 },
    );
  }

  // Format to 4 decimal places (NUMERIC 19,4) and persist
  const formattedCost = costValue.toFixed(4);

  await db
    .update(quotes)
    .set({ estimated_cost: formattedCost, updated_at: new Date() })
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organization_id, organizationId),
        eq(quotes.status, 'DRAFT'),
      ),
    );

  return NextResponse.json({ ok: true, estimated_cost: formattedCost });
}
