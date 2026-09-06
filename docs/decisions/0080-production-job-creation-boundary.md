# DR 0080 — ProductionJob Creation Boundary

**Status:** APPROVED  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration

## 1. Context

Phase 09 implemented the generation driver (`lib/agent/driver.ts`) which dispatches an
existing `AiGeneration` (in `REQUESTED` state) to a provider. Phase 11 requires a
boundary that creates the `ProductionJob` + `AiGeneration` pair before dispatch, so that
the dispatch step consumes an already-persisted record rather than creating one inline.

## 2. Decisions

### 2.1 — Job creation endpoint: POST /api/agent/jobs

Route: `POST /api/agent/jobs`  
Authentication: session-based (Auth.js v5), server-side only.  
Authorized roles: `OWNER`, `ADMIN_OPERATIONS`

This is the only surface where a `ProductionJob` of type `AI_GENERATION` is created
in Phase 11.

### 2.2 — Creation is separate from dispatch

The endpoint creates the records and returns their IDs. It does NOT call
`runGenerationDriver` or any provider dispatch. Dispatch is triggered separately
(e.g., by the caller, a background job, or a future scheduling mechanism).

This separation preserves auditability and allows creation-time validation before
any provider credits are consumed.

### 2.3 — Records created atomically

Within a single transaction:
1. `production.production_jobs` row: `job_type = 'AI_GENERATION'`, `status = 'QUEUED'`
2. `production.ai_generations` row: `status = 'REQUESTED'`, all provider fields set

Both rows share the same `organization_id` and `order_id`.

### 2.4 — Request body shape

```json
{
  "orderId": "<uuid>",
  "provider": "<string>",
  "model": "<string>",
  "prompt": "<string>",
  "params": { "<key>": "<value>" }
}
```

`params.input_file_key` (optional) carries the source file reference consumed by
`DispatchParams.fileKey` at dispatch time (DR 0076).

### 2.5 — Response shape

HTTP 201  
```json
{
  "productionJobId": "<uuid>",
  "aiGenerationId": "<uuid>"
}
```

### 2.6 — Financial recording remains DEFERRED

No financial ledger entry is created by this endpoint. Cost recording is deferred
per DR 0060, DR 0066, DR 0067.

### 2.7 — Audit event emitted on creation

Action: `PRODUCTION_JOB_CREATED`  
`entity_type = 'production_job'`, `entity_id = productionJobId`  
`actor_id` = authenticated user's `userId`  
`actor_role` = authenticated user's `role`

## 3. Non-decisions

- Automatic dispatch after creation is not implemented in Phase 11.
- Job cancellation is not implemented in Phase 11 (DR 0063: RUNNING→CANCELLED not
  authorized in Phase 09).
- Multiple AiGenerations per ProductionJob at creation time is not supported.
