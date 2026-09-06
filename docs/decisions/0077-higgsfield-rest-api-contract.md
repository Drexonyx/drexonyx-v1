# DR 0077 — Higgsfield REST API Contract (Phase 11 Interim)

**Status:** APPROVED  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration

## 1. Context

Phase 09 implemented the Higgsfield provider adapter (`lib/agent/providers/higgsfield.ts`)
using specific endpoint paths and status string conventions. The exact Higgsfield REST API
contract was not formally verified at approval time (DR 0057 §2.1 comment noted this).
Phase 11 adopts the Phase 09 implementation as the current approved contract and documents
what requires external verification before production traffic.

## 2. Current Approved Contract

### 2.1 — Dispatch endpoint

`POST {HIGGSFIELD_API_BASE_URL}/v1/generate`  
Authentication: `Authorization: Bearer {HIGGSFIELD_API_KEY}`

**Request body fields (Phase 09 implementation):**
- `model` — provider model identifier
- `prompt` — generation prompt
- `file_key` — input file reference (may be empty string; adapter passes through)
- `...params` — spread of provider-specific params from `AiGeneration.params`

**Response:** JSON containing `job_id` or `id` as the `providerJobId`.

> ⚠️ REQUIRES EXTERNAL VERIFICATION: Endpoint path, request body shape, and response
> field names must be verified against current Higgsfield API documentation before
> production traffic is enabled.

### 2.2 — Polling status endpoint (bounded recovery)

`GET {HIGGSFIELD_API_BASE_URL}/v1/generate/{job_id}`  
Authentication: `Authorization: Bearer {HIGGSFIELD_API_KEY}`

**Response:** JSON containing `status` field using the same string conventions as webhook.

> ⚠️ REQUIRES EXTERNAL VERIFICATION: Polling endpoint path and response shape must be
> verified against current Higgsfield API documentation.

### 2.3 — Webhook status strings

Phase 09 implementation maps provider status strings as follows:

| Provider string | Domain status |
|---|---|
| `completed`, `succeeded`, `done` | `SUCCEEDED` |
| `timeout`, `rate_limited`, `server_error`, `unavailable` | `FAILED` (transient) |
| any other | `FAILED` (permanent) |

**Result URL field:** `output_url` falling back to `result_url`.

> ⚠️ REQUIRES EXTERNAL VERIFICATION: Status string values must be verified against
> current Higgsfield webhook documentation.

### 2.4 — Webhook signature verification

HMAC-SHA256 of raw request body using `HIGGSFIELD_WEBHOOK_SECRET`, compared
constant-time against `x-higgsfield-signature` header.

> ⚠️ REQUIRES EXTERNAL VERIFICATION: Signature header name and HMAC algorithm must be
> verified against current Higgsfield webhook documentation.

## 3. Non-decisions

- MCP model IDs exposed by the Higgsfield MCP server are NOT assumed to be valid
  REST API model IDs. Model selection is separate from this DR.
- Financial/credit accounting for Higgsfield API calls remains DEFERRED (DR 0060,
  DR 0066, DR 0067).
- Provider fallback architecture is NOT introduced in Phase 11.
