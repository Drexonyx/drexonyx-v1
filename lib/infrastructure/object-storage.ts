// DR 0081: Cloudflare R2 is the V1 internal object-storage provider (S3-compatible).
// Only this module reads R2 credentials. Domain code calls putObject() and knows nothing
// about R2, accounts, buckets, or signing — those details stay here.
// DR 0086: generateSignedUrl() provides short-lived, object-specific, server-side signed URLs.
//   R2 credentials never leave this module. No R2 credentials or configuration are exposed
//   to browser code, API responses, or domain logic.

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';

// DR 0086 §2.7: Default signed URL expiry — 1 hour (3600 seconds).
// Short-lived: authorized clients receive a URL valid only for this window.
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600;

export interface PutObjectParams {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  contentLength?: number;
}

function getR2Endpoint(): string {
  const explicit = process.env.R2_ENDPOINT;
  if (explicit) return explicit.replace(/\/$/, '');
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error('R2_ACCOUNT_ID or R2_ENDPOINT environment variable is required');
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function createS3Client(): S3Client {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId) throw new Error('R2_ACCESS_KEY_ID environment variable is not set');
  if (!secretAccessKey) throw new Error('R2_SECRET_ACCESS_KEY environment variable is not set');

  return new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(),
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('R2_BUCKET_NAME environment variable is not set');
  return bucket;
}

// Downloads an object from R2 and returns its full contents as a Buffer.
// Throws on failure — callers must handle and not assume success.
export async function getObject(key: string): Promise<Buffer> {
  const s3 = createS3Client();
  const result = await s3.send(
    new GetObjectCommand({ Bucket: getBucketName(), Key: key }),
  );
  if (!result.Body) throw new Error(`R2 object not found: ${key}`);
  const stream = result.Body as Readable;
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// DR 0086: Generates a short-lived presigned GET URL for a specific R2 object.
// The URL is object-specific, expires after expiresInSeconds, and is generated server-side.
// R2 credentials are never exposed — they remain in createS3Client() within this module.
// Callers must authorize the request before calling this function.
// Provider CDN URLs are never used as canonical asset URLs (DR 0081 §2.5, DR 0086).
export async function generateSignedUrl(
  key: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
): Promise<string> {
  const s3 = createS3Client();
  const command = new GetObjectCommand({ Bucket: getBucketName(), Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// Uploads an object to R2. Throws on failure — callers must handle and not assume success.
export async function putObject(params: PutObjectParams): Promise<void> {
  const s3 = createS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ...(params.contentLength !== undefined ? { ContentLength: params.contentLength } : {}),
    }),
  );
}
