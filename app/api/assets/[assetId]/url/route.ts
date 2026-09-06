// DR 0086: Secure Asset Delivery.
// Generates a short-lived, object-specific presigned URL for an R2-stored asset.
// R2 remains private — no direct bucket access is granted to clients.
// Requires: authenticated session, active org membership, asset owned by the org.
// R2 credentials stay server-side within lib/infrastructure/object-storage.ts.
// Provider CDN URLs are never exposed as canonical asset URLs (DR 0081 §2.5).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/index';
import { assets } from '@/db/schema/production';
import { and, eq } from 'drizzle-orm';
import { getMembership } from '@/lib/auth/authorization';
import { generateSignedUrl } from '@/lib/infrastructure/object-storage';

// Signed URL lifetime in seconds — short-lived per DR 0086.
const SIGNED_URL_EXPIRY_SECONDS = 3600;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> {
  // Step 1: Authenticate via Auth.js session.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assetId } = await params;
  if (!assetId || typeof assetId !== 'string') {
    return NextResponse.json({ error: 'Invalid assetId' }, { status: 400 });
  }

  const userId = session.user.id;
  const organizationId = session.user.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'No organization context' }, { status: 403 });
  }

  // Step 2: Assert active membership in the organization (DR 0086: authorization-gated).
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Step 3: Load asset — tenant-isolated by (assetId, organizationId).
  const assetRows = await db
    .select({ id: assets.id, file_key: assets.file_key, status: assets.status })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organization_id, organizationId)))
    .limit(1);

  if (assetRows.length === 0) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const asset = assetRows[0];

  if (!asset.file_key) {
    return NextResponse.json({ error: 'Asset has no stored file' }, { status: 404 });
  }

  // Step 4: Generate short-lived, object-specific signed URL server-side.
  // R2 credentials never leave lib/infrastructure/object-storage.ts.
  let signedUrl: string;
  try {
    signedUrl = await generateSignedUrl(asset.file_key, SIGNED_URL_EXPIRY_SECONDS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to generate signed URL: ${msg}` }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();

  return NextResponse.json({ url: signedUrl, expiresAt });
}
