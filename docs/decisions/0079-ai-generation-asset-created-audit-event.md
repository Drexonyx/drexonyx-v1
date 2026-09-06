# DR 0079 — AI_GENERATION_ASSET_CREATED Audit Event

**Status:** APPROVED  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration

## 1. Context

Phase 11 adds asset materialization between AiGeneration SUCCEEDED and ProductionJob
completion. A new audit event is needed to record when an Asset is created and linked
to an AiGeneration during this materialization step.

## 2. Decisions

### 2.1 — New audit action: AI_GENERATION_ASSET_CREATED

Action string: `'AI_GENERATION_ASSET_CREATED'`

Emitted after:
1. The `assets` row is inserted with `status = 'PROCESSING'`
2. The `asset_ai_generations` join row is inserted

Emitted before:
- `transitionAssetToReadyForQc` (which emits `ASSET_READY_FOR_QC`)

### 2.2 — Actor identity follows DR 0064

`actor_id = production_job_id`, `actor_role = 'AGENT'`

### 2.3 — Payload shape

```json
{
  "ai_generation_id": "<uuid>",
  "asset_id": "<uuid>",
  "production_job_id": "<uuid>",
  "organization_id": "<uuid>",
  "file_key": "<string>",
  "content_url": "<string | null>"
}
```

### 2.4 — Entity identity

`entity_type = 'asset'`, `entity_id = <newly created asset id>`

### 2.5 — auditEvents.action has no CHECK constraint

The `system.audit_events` table uses plain TEXT for `action` (no enum constraint).
`AI_GENERATION_ASSET_CREATED` is a new action string that requires no schema change.

## 3. Non-decisions

- A separate audit event for the `ASSET_READY_FOR_QC` transition is already emitted
  by `transitionAssetToReadyForQc` in `lib/agent/terminal.ts`. No duplicate is added.
