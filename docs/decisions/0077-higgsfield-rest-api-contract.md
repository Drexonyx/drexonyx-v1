# DR 0077 — Higgsfield REST API Contract (Phase 11)

**Status:** APPROVED (PARTIALLY VERIFIED)  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration

## 1. Context

Phase 09 implemented the Higgsfield provider adapter. Phase 11 corrects field names based
on the official Higgsfield API contract and documents the verification status of each
element. Items marked ✅ VERIFIED are confirmed from official Higgsfield documentation or
authoritative guidance. Items marked ⚠️ UNVERIFIED require external verification (live
authenticated request or current API documentation) before production traffic is enabled.

## 2. Base URL

`https://api.higgsfield.ai`

✅ VERIFIED: Base API URL confirmed.

## 3. Dispatch endpoint

### 3.1 — Endpoint path

`POST {HIGGSFIELD_API_BASE_URL}/v1/generate/{model}`

✅ VERIFIED: Endpoints are model-specific (asynchronous, per-model).  
⚠️ PARTIALLY VERIFIED: The exact URL path pattern `…/v1/generate/{model}` is a best-match
interpretation of "model-specific asynchronous endpoints." The precise path structure
requires verification against current Higgsfield API documentation.

### 3.2 — Authentication

`Authorization: Bearer {HIGGSFIELD_API_KEY}`

⚠️ UNVERIFIED: The authentication header scheme is assumed to be Bearer but has not been
confirmed against current Higgsfield documentation. If the API uses API key ID/secret
pair authentication or a different header, update this and `lib/agent/providers/higgsfield.ts`.

### 3.3 — Request body

```json
{
  "prompt": "...",
  "file_key": "...",
  "...params": "provider-specific params from AiGeneration.params"
}
```

Note: `model` is in the URL path, not the request body (per model-specific endpoint design).

⚠️ UNVERIFIED: Request body field names require external verification.

### 3.4 — Dispatch response

✅ VERIFIED: Response contains:
- `request_id` — canonical asynchronous job correlation identifier
- `status_url` — polling URL for bounded recovery

```json
{
  "request_id": "...",
  "status_url": "..."
}
```

The adapter reads `request_id` as `providerJobId`. `status_url` is stored in-memory
for immediate use; persisting it to the DB for recovery polling requires a schema change
(deferred — see §6 Non-decisions).

Fallback fields `job_id` and `id` are accepted during the transition period.

## 4. Polling endpoint (bounded recovery)

`GET {status_url}`

✅ VERIFIED: `status_url` is the authoritative polling URL from the dispatch response.  
⚠️ PARTIALLY VERIFIED: When `status_url` is unavailable (recovery path from DB),
the adapter falls back to `GET {HIGGSFIELD_API_BASE_URL}/v1/status/{request_id}`.
This fallback URL pattern requires external verification.

## 5. Webhook

### 5.1 — Webhook payload

```json
{
  "request_id": "...",
  "status": "...",
  "output_url": "...",
  "..."
}
```

✅ VERIFIED: Webhook carries `request_id` as the correlation identifier.  
⚠️ UNVERIFIED: Status string values, output URL field name (`output_url` vs `result_url`),
and any additional envelope fields require external verification.

Implemented terminal status mapping:

| Provider string | Domain status |
|---|---|
| `completed`, `succeeded`, `done` | `SUCCEEDED` |
| `timeout`, `rate_limited`, `server_error`, `unavailable` | `FAILED` (transient) |
| `failed`, `error`, `cancelled` | `FAILED` (permanent) |

All mappings ⚠️ UNVERIFIED against current Higgsfield documentation.

### 5.2 — Webhook signature

HMAC-SHA256 of raw request body, compared constant-time against the `x-higgsfield-signature` header.

⚠️ UNVERIFIED: Both the HMAC algorithm and the signature header name require external
verification against current Higgsfield webhook documentation.

## 6. Non-decisions

- **`status_url` persistence:** Persisting `status_url` from the dispatch response to the
  database for full recovery-polling correctness requires either adding `statusUrl` to
  `DispatchResult` (DR 0057 amendment) or a new column on `ai_generations` (schema change).
  Both are deferred. Recovery polling falls back to the constructed URL pattern (§4).
- **MCP model IDs** are NOT assumed to be valid REST API model identifiers. Model selection
  is separate from this DR.
- **Financial/credit accounting** for Higgsfield API calls remains DEFERRED.
- **Provider fallback architecture** is NOT introduced.
- **Live authenticated verification** has not been performed — no real credentials were
  available during Phase 11 implementation. The items marked ⚠️ UNVERIFIED above must be
  confirmed before production traffic is enabled.
