# DR 0078 — Asset Materialization Failure Handling

**Status:** APPROVED  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration

## 1. Context

When the Higgsfield webhook delivers a SUCCEEDED status, the system must materialize
an Asset record before the ProductionJob can complete. Materialization can fail (e.g.,
database error, missing ProductionJob, constraint violation). This DR defines how
such failures are handled.

## 2. Decisions

### 2.1 — Materialization failure does NOT fail the ProductionJob immediately

A materialization failure leaves `AiGeneration.status = SUCCEEDED` and
`ProductionJob.status = RUNNING`. The state is recoverable — polling recovery
(DR 0077 §2.2) can re-trigger materialization on the next pass.

### 2.2 — Webhook returns 200 on materialization failure

The webhook handler MUST return HTTP 200 even when materialization fails, to prevent
the provider from retrying the same SUCCEEDED notification. An HTTP 5xx response would
cause Higgsfield to re-deliver, which would re-enter `handleSuccess` and attempt
materialization again — acceptable behavior, but not controllable from our side.

Returning 200 means: "we received your notification; internal processing is our problem."

### 2.3 — Materialization failure is logged but not surfaced to the provider

The webhook logs the materialization error. It does NOT write an audit event for
the failure (the AiGeneration SUCCEEDED audit event is already written). Recovery
is out-of-band.

### 2.4 — Idempotency guard prevents double-materialization

Before inserting, `materializeGenerationAsset` checks `asset_ai_generations` for
an existing row with the given `ai_generation_id`. If found, it returns the existing
`assetId` immediately without re-inserting. This is the primary idempotency guard.

A secondary `system.idempotency_keys` entry with key
`ASSET_MATERIALIZED:{aiGenerationId}` provides defense-in-depth.

### 2.5 — `attemptProductionJobCompletion` is NOT called on materialization failure

The completion check requires all linked Assets to be `READY_FOR_QC`. A failed
materialization leaves no Asset linked, so calling the completion check would
succeed vacuously (DR 0063 §2.2 C2 is vacuously true with no assets). To prevent
premature ProductionJob completion, `attemptProductionJobCompletion` is called
ONLY after successful materialization.

## 3. Non-decisions

- Automated retry of failed materialization is not implemented in Phase 11.
- An alerting/monitoring mechanism for stuck ProductionJobs is not implemented in
  Phase 11.
