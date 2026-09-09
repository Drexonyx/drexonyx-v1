// DR 0094: File Storage for MANUAL_UPLOAD Assets.
// Accepts a multipart upload for an asset in UPLOADED status.
// Stores the file to R2 under a tenant-namespaced key, then records the
// file_key, file_type, and file_size on the asset row. Does NOT advance
// the asset to READY_FOR_QC — that step requires an explicit admin action.
// organizationId is always sourced from the authenticated server-side session.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminRole } from '@/lib/admin/types';
import { db } from '@/db/index';
import { assets } from '@/db/schema/production';
import { auditEvents } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { putObject } from '@/lib/infrastructure/object-storage';
import { uuidv7 } from 'uuidv7';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const UPLOAD_ROLES = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION'] as const;
type UploadRole = (typeof UPLOAD_ROLES)[number];

function isUploadRole(role: string): role is UploadRole {
  return UPLOAD_ROLES.includes(role as UploadRole);
}

function sanitizeFilename(raw: string): string {
  // Strip path separators so the filename can never traverse storage key segments.
  const base = raw.replace(/[/\\]/g, '');
  // Allow alphanumerics, dots, hyphens, underscores, spaces; replace everything else.
  const safe = base.replace(/[^a-zA-Z0-9._\- ]/g, '_');
  // Collapse consecutive dots to prevent any residual traversal ambiguity.
  const collapsed = safe.replace(/\.{2,}/g, '_');
  return collapsed.slice(0, 255) || 'upload';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> {
  // Step 1: Authenticate — admin session required.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role, organizationId, userId } = session.user;

  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Step 2: Authorize — OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION only; QC excluded.
  if (!isUploadRole(role)) {
    return NextResponse.json({ error: 'Forbidden: insufficient authority to upload asset files' }, { status: 403 });
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'No organization context' }, { status: 403 });
  }

  const { assetId } = await params;

  // Step 3: Load asset — tenant-isolated by (assetId, organizationId).
  const assetRows = await db
    .select({ id: assets.id, status: assets.status })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organization_id, organizationId)))
    .limit(1);

  if (assetRows.length === 0) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const asset = assetRows[0];

  // Step 4: Enforce upload-only-when-UPLOADED constraint.
  if (asset.status !== 'UPLOADED') {
    return NextResponse.json(
      { error: `Asset must be in UPLOADED status to receive a file (currently ${asset.status})` },
      { status: 409 },
    );
  }

  // Step 5: Parse the multipart form.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Failed to parse multipart form data' }, { status: 400 });
  }

  const fileField = formData.get('file');
  if (!(fileField instanceof File)) {
    return NextResponse.json({ error: 'Missing or invalid file field' }, { status: 400 });
  }

  const file = fileField;

  // Step 6: Validate MIME type — image/* and video/* only.
  const contentType = file.type || 'application/octet-stream';
  if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
    return NextResponse.json(
      { error: `Unsupported media type: ${contentType}. Only image/* and video/* are accepted.` },
      { status: 415 },
    );
  }

  // Step 7: Enforce 100 MB size limit.
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large: ${file.size} bytes. Maximum is ${MAX_FILE_SIZE} bytes.` },
      { status: 413 },
    );
  }

  // Step 8: Build tenant-namespaced R2 key.
  const safeFilename = sanitizeFilename(file.name || 'upload');
  const fileKey = `${organizationId}/${assetId}/${safeFilename}`;

  // Step 9: Upload to R2. DB is only updated on success.
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    await putObject({
      key: fileKey,
      body: fileBuffer,
      contentType,
      contentLength: file.size,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Storage upload failed: ${msg}` }, { status: 500 });
  }

  // Step 10: Update asset row with file metadata. Status remains UPLOADED.
  await db
    .update(assets)
    .set({
      file_key: fileKey,
      file_type: contentType,
      file_size: file.size,
      updated_at: new Date(),
    })
    .where(and(eq(assets.id, assetId), eq(assets.organization_id, organizationId)));

  // Step 11: Audit event.
  await db.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: 'asset',
    entity_id: assetId,
    actor_id: userId,
    actor_role: role,
    action: 'ASSET_FILE_UPLOADED',
    payload: {
      asset_id: assetId,
      file_key: fileKey,
      file_type: contentType,
      file_size: file.size,
      organization_id: organizationId,
    },
  });

  return NextResponse.json({ ok: true, fileKey }, { status: 200 });
}
