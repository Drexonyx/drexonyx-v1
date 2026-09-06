// DR 0081: Cloudflare R2 is the V1 internal object-storage provider (S3-compatible).
// Only this module reads R2 credentials. Domain code calls putObject() and knows nothing
// about R2, accounts, buckets, or signing — those details stay here.

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
