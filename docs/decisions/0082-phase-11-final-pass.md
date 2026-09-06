# DR 0082 — Phase 11 Final Pass

**Status:** FINAL PASS  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration  
**Commit:** b689472  
**Branch:** claude/drexonyx-v1-baseline-inspection-fb76lg

## 1. Summary

Phase 11 — Higgsfield AI Provider Integration — has completed all implementation
and validation steps. This record documents the final pass status, the exact
validation results, the implementation scope as delivered, and the external
verification items that remain open before production traffic may be enabled.

This record does not authorize Phase 12.

## 2. Validation Results

| Check | Result |
|---|---|
| Tests | 701 PASS (32 test files) |
| TypeScript typecheck | CLEAN |
| Production build | CLEAN |
| Schema changes | NONE |
| Financial system changes | NONE |
| DR 0057 interface changes | NONE (interface unchanged) |

## 3. Implementation Scope

### 3.1 — Higgsfield contract repair (commit b689472)

The following items were corrected against the evidence recovered from the
official Higgsfield SDK and documentation:

**A. Authentication**  
Replaced single `HIGGSFIELD_API_KEY` with `HIGGSFIELD_API_KEY_ID` +
`HIGGSFIELD_API_KEY_SECRET`. Authorization header now uses the verified
scheme: `Key {ID}:{SECRET}`.

**B. Generation endpoints**  
Removed the invalid generic `/v1/generate/{model}` path. Introduced
`MODEL_ENDPOINT_MAP` mapping three explicitly verified model identifiers to
their endpoint paths. Unknown models fail closed with `isTransient: false`
and no network request.

Supported models as of this pass:

| Model identifier | Endpoint path |
|---|---|
| `text2image/soul` | `/v1/text2image/soul` |
| `image2video/dop` | `/v1/image2video/dop` |
| `speak/higgsfield` | `/v1/speak/higgsfield` |

**C. Request body**  
Removed unverified `file_key` field. Generation body contains: `prompt`,
operator-supplied `genParams`, and (when a file input is present) `image_url`
from the Higgsfield upload flow.

**D. File upload flow**  
Implemented two-phase Higgsfield upload for non-empty `fileKey` inputs:
`POST /files/generate-upload-url` → `PUT upload_url` → `public_url` set as
`image_url` in the generation request body. R2 (`getObject`) is the source;
the Higgsfield upload is a transport step only.

**E. Submission response**  
Updated to V2 response shape: `request_id`, `status_url`, `cancel_url`.
Legacy fallback fields `job_id` and `id` are retained during the transition
period.

**F. Polling endpoint**  
Replaced invalid `/v1/status/{id}` fallback with the verified pattern
`/requests/{request_id}/status`. Removed `_lastStatusUrl` mutable singleton.
Status URL is fully derivable from `provider_job_id` (persisted in
`ai_generations`); no schema change is required.

**G. Terminal status values**  
`SUCCEEDED_STATUSES = { 'completed' }` only. Added `nsfw` as a terminal-failed
status with `isTransient: false`. Removed unofficial values `succeeded`, `done`,
`timeout`, and `rate_limited`.

**H. Output extraction**  
Both polling and webhook parsing now use the verified V2 output structure:
`video?.url` and `images?.[0]?.url`. Removed `output_url` and `result_url`
from all response interfaces.

**I. Webhook delivery**  
`?hf_webhook={encodedUrl}` query param appended to every dispatch request when
`HIGGSFIELD_WEBHOOK_URL` is set.

**J. Webhook signature**  
Preserved as-is. The existing HMAC-SHA256 / `x-higgsfield-signature` mechanism
has not been modified. See §4 for verification status.

### 3.2 — Infrastructure additions

`lib/infrastructure/object-storage.ts`: added `getObject(key: string): Promise<Buffer>`
as a sibling to the existing `putObject()`. R2 remains the sole internal object-storage
provider per DR 0081.

### 3.3 — Environment variable changes

| Variable | Change |
|---|---|
| `HIGGSFIELD_API_KEY` | **Removed** |
| `HIGGSFIELD_API_KEY_ID` | **Added** — Key ID for `Key {ID}:{SECRET}` auth |
| `HIGGSFIELD_API_KEY_SECRET` | **Added** — Secret for `Key {ID}:{SECRET}` auth |
| `HIGGSFIELD_WEBHOOK_URL` | **Added** — Drexonyx endpoint sent as `?hf_webhook=` |

All variables remain server-side only. No variable carries the `NEXT_PUBLIC_` prefix.

### 3.4 — Architecture preserved

- DR 0054 canonical `file_key` semantics unchanged.
- DR 0057 `DispatchParams`, `DispatchResult`, `ParsedWebhookPayload`, and `AiProvider`
  interfaces are byte-for-byte identical to the pre-repair versions.
- DR 0081 R2 canonical storage preserved: `assets.content_url = null` after
  materialization; Higgsfield CDN URLs are not persisted as canonical asset storage.
- DR 0078 materialization failure handling unchanged.
- Financial boundary (DR 0060, DR 0066, DR 0067) unchanged — no financial ledger,
  credit deduction, or cost recording introduced.

### 3.5 — Test coverage

New test file: `lib/__tests__/agent-higgsfield-provider.test.ts` (30 tests) covering
authentication, model endpoint mapping, webhook query param, request body, file upload
flow, dispatch response parsing, polling URL construction, terminal status handling,
output extraction, and webhook payload parsing.

## 4. External Verification Items

The following items remain unverified and require a live authenticated Higgsfield API
session before production traffic may be enabled. They are not code defects; they
are open verification tasks.

**4.1 — Webhook signature mechanism (⚠️ UNVERIFIED)**  
Current assumption: HMAC-SHA256 of raw request body, hex-encoded, in header
`x-higgsfield-signature`. Neither the algorithm, the header name, nor the scope have
been confirmed against current Higgsfield webhook documentation. The implementation is
preserved as-is (per governance rules); it has not been modified and must not be
modified without authoritative evidence.  
Risk: If incorrect, all production webhooks will be rejected. The polling fallback
(5 attempts, 10-second intervals) provides bounded recovery.

**4.2 — Endpoint path prefix on `platform.higgsfield.ai` (⚠️ PARTIALLY VERIFIED)**  
The `/v1/` prefix on endpoint paths (e.g. `/v1/text2image/soul`) and the pairing
with the V2 base URL (`https://platform.higgsfield.ai`) requires live dispatch
verification. A first test dispatch against a supported model will confirm this
immediately.

**4.3 — `image_url` field name for file-input generations (⚠️ UNVERIFIED)**  
The field name `image_url` used to pass the uploaded file's `public_url` in the
generation request body is best-evidence from SDK usage and has not been confirmed
from authoritative documentation. A first test dispatch using a file-input model
will confirm this immediately.

## 5. Pre-Production Checklist

Before enabling live traffic:

1. Confirm webhook signature mechanism against current Higgsfield webhook documentation.
2. Confirm endpoint path prefix with one test dispatch (`text2image/soul` or
   `image2video/dop`).
3. Confirm `image_url` field name with one file-input test dispatch.
4. Ensure `HIGGSFIELD_WEBHOOK_URL` is set in the production environment.
5. Communicate supported model identifiers to operators:
   `text2image/soul`, `image2video/dop`, `speak/higgsfield`.

## 6. Non-decisions

- Phase 12 is NOT started by this record.
- Signed URL generation for content delivery remains DEFERRED (DR 0081 §5).
- Financial ledger recording for storage and generation costs remains DEFERRED
  (DR 0060, DR 0066, DR 0067).
- Multi-model routing, fallback provider selection, and cost governance remain
  DEFERRED to Phase 12 (DR 0073 §2.3, §2.4).
- `status_url` persistence to the database remains DEFERRED (no schema change
  introduced; polling URL is derivable from `provider_job_id`).
- `cancel_url` handling remains DEFERRED (captured in response interface only).
