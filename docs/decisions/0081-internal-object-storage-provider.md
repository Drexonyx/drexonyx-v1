# DR 0081 — Internal Object Storage Provider (Phase 11)

**Status:** APPROVED  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration  
**Owner:** Drexonyx V1 Engineering

## 1. Context

Phase 11 materialization requires an approved internal object-storage implementation capable
of receiving downloaded AI generation outputs and storing them as internal assets. DR 0054
established the logical file_key model and deferred provider selection. This record approves
a specific provider for V1 and establishes the operational requirements for it.

## 2. Decision

**Cloudflare R2** is the V1 internal object-storage provider.

### 2.1 — Why R2

- S3-compatible API: standard `PutObjectCommand` via `@aws-sdk/client-s3`; no proprietary SDK
- No egress fees between R2 and Cloudflare network, reducing cost for serving generated assets
- GDPR-friendly data residency configuration
- Bucket and credential model compatible with existing environment variable conventions
- Replaceable: the S3-compatible interface means switching to AWS S3, GCS, or another
  S3-compatible provider requires only adapter changes, not domain model changes

### 2.2 — Storage abstraction

R2 is accessed exclusively through `lib/infrastructure/object-storage.ts`. This module:
- Exports `putObject(params: PutObjectParams): Promise<void>`
- Reads all R2 credentials from server-side environment variables
- Domain code (`lib/agent/`, application routes) imports `putObject` and knows nothing
  about R2, account IDs, bucket names, or signing

This abstraction boundary ensures that replacing R2 with another provider requires
changes only in `lib/infrastructure/object-storage.ts`.

### 2.3 — Canonical file_key semantics

The `file_key` on the `Asset` schema row is the canonical, long-term reference to an
internal storage object. Its format follows the DR 0054 §2.2 convention:

    {provider}/{organizationId}/{assetId}/generation

Example:

    higgsfield/org-01jz.../asset-01jy.../generation

This key is deterministic: it can be reconstructed from known identifiers. It is stored
in the database at insert time and serves as the authoritative object identifier
independent of any URL.

### 2.4 — Provider URL handling

Higgsfield CDN URLs (e.g., `https://cdn.higgsfield.ai/…`) are temporary provider URLs.
They MUST NOT be stored as canonical long-term asset references.

Correct materialization flow:

1. Receive `result_url` (Higgsfield CDN URL) from webhook or polling
2. Download the generated output server-side
3. Upload to R2 under the canonical `file_key`
4. Store `file_key` on the Asset row
5. Set `content_url = null` (or a derived internal URL if the bucket is publicly accessible
   and a stable public URL is available; otherwise null)
6. Discard the Higgsfield CDN URL — do not persist it as the canonical reference

### 2.5 — Asset.content_url

`content_url` on the Asset row is nullable per DR 0054 §2.4. After R2 materialization,
`content_url` is set to `null`. The canonical object is identified by `file_key` only.
Content URL derivation (signed URLs, CDN routing) is a separate concern deferred past Phase 11.

## 3. Credentials and security

- R2 credentials are server-side only. No R2 credential may be prefixed `NEXT_PUBLIC_`.
- Credentials are never logged, committed to source control, or returned in API responses.
- The `R2_ENDPOINT` environment variable allows overriding the default R2 endpoint,
  supporting staging vs. production bucket separation.

Required environment variables (server-side only):

| Variable | Purpose |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID (used to construct default endpoint) |
| `R2_ACCESS_KEY_ID` | R2 API token Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token Secret Access Key |
| `R2_BUCKET_NAME` | Target bucket name |
| `R2_ENDPOINT` | Optional: override the R2 S3-compatible endpoint URL |

## 4. Failure semantics

If R2 upload fails:

- `putObject()` throws; `materializeGenerationAsset()` catches and returns `{ ok: false }`
- The Asset row is NOT created (upload is a prerequisite)
- No `AI_GENERATION_ASSET_CREATED` audit event is emitted
- The ProductionJob is NOT marked COMPLETED
- The AiGeneration remains SUCCEEDED but Asset creation is deferred
- This is consistent with DR 0078: materialization failure leaves job state recoverable

## 5. Non-decisions

- **AWS S3 is NOT approved** for V1. Do not substitute S3 for R2.
- **Supabase Storage is NOT approved** for V1.
- **Multiple storage providers are NOT introduced.** R2 is the sole provider.
- **Multipart upload** for very large objects is deferred; Phase 11 uses `PutObjectCommand`
  with in-memory buffer. This is adequate for Phase 11 generation sizes.
- **Signed URL generation** for content delivery is deferred past Phase 11.
- **Financial ledger recording** for storage costs remains DEFERRED (DR 0060, DR 0066).
- **Phase 12 work** was NOT started in this decision record.
