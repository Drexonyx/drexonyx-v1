# Decision Record 0087 — Phase 13: Manual Upload → Ready for QC

- **Decision Round:** Phase 13
- **Phase:** 13 — QC & Revision Engine
- **Status:** APPROVED — Owner approved 2026-09-08. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit 1ffd894 (Phase 12 final)
- **Resolves:** Gap G-1 identified in Phase 13 inspection — MANUAL_UPLOAD assets
  have no path from UPLOADED → READY_FOR_QC in Phases 1–12.
- **Resolves:** Gap G-4 identified in Phase 13 inspection — `attemptProductionJobCompletion`
  returns early when no AiGenerations exist, so MANUAL_UPLOAD jobs can never
  auto-complete.
- **Relationship to prior records:** Does not modify Decision Records 0001–0086.
  All remain authoritative and unchanged. Depends on DR 0006 (Asset state machine),
  DR 0053 (ProductionJob type taxonomy), DR 0063 (ProductionJob terminal-transition
  authority), DR 0064 (audit actor identity).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0086. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0006 §3.1):** The Asset state machine defines the following
status sequence: UPLOADED → PROCESSING → READY_FOR_QC → CLIENT_PREVIEW.
REVISION_REQUIRED and REJECTED are also terminal states. The UPLOADED status
is the entry point for MANUAL_UPLOAD assets.

**FACT (lib/agent/terminal.ts, Phase 13 inspection):** The existing function
`transitionAssetToReadyForQc` performs the transition to READY_FOR_QC using
the following CAS guard:
```
WHERE status = 'PROCESSING'
```
This guard is correct for AI_GENERATION assets, which are created at PROCESSING
status by `lib/agent/materialization.ts`. It is not correct for MANUAL_UPLOAD
assets.

**FACT (DR 0053 §2.1):** MANUAL_UPLOAD is a V1 job type. A MANUAL_UPLOAD
ProductionJob is created at QUEUED status. A manually uploaded asset is created
at UPLOADED status. The PROCESSING step (provider download → R2 upload) does
not occur for MANUAL_UPLOAD assets. Therefore, a MANUAL_UPLOAD asset can never
satisfy `WHERE status = 'PROCESSING'`.

**FACT (Phase 13 inspection, Gap G-1):** There is no path from UPLOADED →
READY_FOR_QC for MANUAL_UPLOAD assets in Phases 1–12. The QC gate defined by
DR 0089 §2.1 (Gate QC-1) is therefore unreachable for all MANUAL_UPLOAD assets.
This is a blocking gap — QC cannot be performed on any manually uploaded asset.

**FACT (lib/agent/terminal.ts, Phase 13 inspection):** The function
`attemptProductionJobCompletion` contains the following guard:
```typescript
if (genRows.length === 0) return;
```
This means: if a ProductionJob has no AiGeneration records, completion is
silently skipped. MANUAL_UPLOAD jobs have no AiGeneration records by definition.
Therefore, MANUAL_UPLOAD ProductionJobs can never auto-complete through the
existing code path (Gap G-4).

**FACT (DR 0053 §5, lib/admin/production-jobs.ts):** CREATIVE_PRODUCTION is
explicitly authorized to create ProductionJobs of both AI_GENERATION and
MANUAL_UPLOAD types. This is the Owner decision D11, confirmed in the existing
`CREATE_ROLES = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']`.

**FACT (DR 0064 §2.2):** For admin-initiated operations, `actor_id` is the
authenticated admin user's id and `actor_role` is the admin's role.

---

## 2. Decision

### 2.1 New Service Function: markManualAssetReadyForQc

**PROPOSED:** A new service function `markManualAssetReadyForQc` is authorized
for Phase 13. This function transitions a MANUAL_UPLOAD asset from UPLOADED →
READY_FOR_QC. It is distinct from `transitionAssetToReadyForQc`, which handles
AI_GENERATION assets (PROCESSING → READY_FOR_QC).

**PROPOSED:** Authorized roles: `['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']`.
This matches the CREATE_ROLES from DR 0053 §5: the roles that can create a
MANUAL_UPLOAD job may also advance the asset it contains to QC.

**PROPOSED:** The function performs the following steps within a single database
transaction:

1. **Tenant-isolated asset lookup:** Query `production.assets` where
   `id = :assetId AND organization_id = :organizationId`. Return `ok: false,
   reason: 'not_found'` if no row is returned.
2. **Status precondition:** If `asset.status !== 'UPLOADED'`, return
   `ok: false, reason: 'invalid_status'`. The asset may already be at
   READY_FOR_QC or beyond.
3. **Idempotency check:** Query `system.idempotency_keys` for
   key `MANUAL_ASSET_READY_FOR_QC:{assetId}` with `organization_id`. If
   status is `COMPLETED`, return `ok: true, recorded: false, reason: 'already_recorded'`
   without re-applying the transition.
4. **Insert idempotency key** at `PENDING` status.
5. **CAS update:**
   ```
   UPDATE production.assets
   SET status = 'READY_FOR_QC', updated_at = NOW()
   WHERE id = :assetId
     AND organization_id = :organizationId
     AND status = 'UPLOADED'
   RETURNING id
   ```
   An empty RETURNING result means concurrent modification. Return
   `ok: false, reason: 'concurrent_modification'`.
6. **Insert audit event** to `system.audit_events`:
   - `entity_type = 'asset'`, `entity_id = assetId`
   - `actor_id = actorId`, `actor_role = actorRole`
   - `action = 'ASSET_READY_FOR_QC'`
   - `payload = { job_type: 'MANUAL_UPLOAD', previous_status: 'UPLOADED' }`
7. **Update idempotency key** to `COMPLETED`.

### 2.2 New Service Function: completeManualUploadJob

**PROPOSED:** A new service function `completeManualUploadJob` is authorized
for Phase 13. This function transitions a MANUAL_UPLOAD ProductionJob from
QUEUED → COMPLETED, called after `markManualAssetReadyForQc` succeeds.

**PROPOSED:** The transition is gated on the asset having reached READY_FOR_QC
or beyond (READY_FOR_QC, CLIENT_PREVIEW). The function queries the asset status
before applying the CAS update.

**PROPOSED:** CAS guard:
```
UPDATE production.production_jobs
SET status = 'COMPLETED', updated_at = NOW()
WHERE id = :jobId
  AND organization_id = :organizationId
  AND status = 'QUEUED'
RETURNING id
```
An empty RETURNING result: no-op (concurrent modification or already completed).

**PROPOSED:** An audit event is written in the same transaction:
- `action = 'PRODUCTION_JOB_COMPLETED'`
- `actor_id = actorId`, `actor_role = actorRole`
- `payload = { job_type: 'MANUAL_UPLOAD', trigger: 'ASSET_READY_FOR_QC' }`

### 2.3 Call Order

**PROPOSED:** The intended call sequence for a MANUAL_UPLOAD asset advancing
to QC is:
1. `markManualAssetReadyForQc` — transitions Asset UPLOADED → READY_FOR_QC.
2. On success, `completeManualUploadJob` — transitions ProductionJob QUEUED → COMPLETED.

These may be called from a single admin action handler. They are separate
functions to allow individual error handling.

### 2.4 Server Action Boundary

**PROPOSED:** An admin server action `actionMarkManualAssetReadyForQc` (in
`app/admin/production/actions.ts` or `app/admin/qc/actions.ts`) is the
intended entry point. The action:
- Calls `auth()` and verifies the session.
- Verifies `actorRole` is in `['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']`.
- Passes `organizationId` from the server-side JWT session — never from client input.
- Calls `markManualAssetReadyForQc` then `completeManualUploadJob`.
- Calls `revalidatePath` for the relevant admin pages on success.

### 2.5 No Change to transitionAssetToReadyForQc

**PROPOSED:** The existing `transitionAssetToReadyForQc` function (used by
`lib/agent/materialization.ts` for AI_GENERATION assets) is not modified by
this record. It retains its `WHERE status = 'PROCESSING'` guard. The two
functions are parallel, not merged.

### 2.6 No Schema Changes

**PROPOSED:** No schema changes, new columns, or migrations are required or
authorized by this record. The existing `production.assets` and
`production.production_jobs` status CHECK constraints already include all
values used by this transition.

### 2.7 Tenant Isolation

**PROPOSED:** All queries in §2.1 and §2.2 must include `organization_id =
:organizationId` where `:organizationId` comes from the server-side JWT
session. No `organization_id` from client input is used.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume `transitionAssetToReadyForQc` applies to MANUAL_UPLOAD assets
  — it does not (§2.5).
- Do not assume UPLOADED → READY_FOR_QC may skip the CAS guard — required (§2.1).
- Do not assume the idempotency check is optional — required (§2.1 step 3).
- Do not assume `completeManualUploadJob` may be called before
  `markManualAssetReadyForQc` succeeds — call order is defined (§2.3).
- Do not assume `organization_id` may come from client input — server-side
  session only (§2.7).
- Do not assume this record modifies Decision Records 0001–0086 — it does not.
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.

---

## 4. Owner Approval

Owner approved 2026-09-08.

**No implementation is authorized by approval of this record alone.**
Phase 13 BUILD authorization is a separate, subsequent decision.
