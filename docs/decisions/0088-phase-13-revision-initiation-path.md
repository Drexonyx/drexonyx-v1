# Decision Record 0088 — Phase 13: Controlled Revision Job Initiation

- **Decision Round:** Phase 13
- **Phase:** 13 — QC & Revision Engine
- **Status:** APPROVED — Owner approved 2026-09-08. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit 1ffd894 (Phase 12 final)
- **Resolves:** Gap G-2 identified in Phase 13 inspection — no formal mechanism
  connects a REVISION_REQUIRED asset to a new ProductionJob in Phases 1–12.
- **Resolves:** Gap G-3 identified in Phase 13 inspection — portal revisions
  page shows "Revision in Progress" unconditionally for REVISION_REQUIRED assets
  regardless of whether a revision has actually been initiated.
- **Relationship to prior records:** Does not modify Decision Records 0001–0087.
  All remain authoritative and unchanged. Depends on DR 0006 (Asset state machine,
  REVISION_REQUIRED terminal), DR 0053 (ProductionJob taxonomy, CREATIVE_PRODUCTION
  authority), DR 0064 (audit actor identity). The REVISION job type referenced
  in DR 0053 §4.2 remains DEFERRED — this record does not introduce it.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0087. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0006 §3.3):** REVISION_REQUIRED is a terminal status for an Asset.
Once an Asset reaches REVISION_REQUIRED, it does not transition further. The
original Asset row is immutable from this point.

**FACT (DR 0053 §2.1):** V1 job types are `AI_GENERATION` and `MANUAL_UPLOAD`.
The `REVISION` job type is explicitly deferred in DR 0053 §4.2.

**FACT (DR 0053 §5, Owner decision D11):** CREATIVE_PRODUCTION is authorized to
create ProductionJobs of both AI_GENERATION and MANUAL_UPLOAD types. This
authority is confirmed in the existing code: `CREATE_ROLES = ['OWNER',
'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']` in `lib/admin/production-jobs.ts`
and the matching check in `app/admin/production/actions.ts`.

**FACT (Phase 13 inspection, Gap G-2):** In Phases 1–12, no service function,
admin action, or UI path exists that:
(a) connects a REVISION_REQUIRED Asset to a new ProductionJob,
(b) records a `REVISION_INITIATED` audit event, or
(c) provides the admin with a structured path to initiate a revision.
The `createProductionJob` service function exists and is correct but has no
revision-aware caller.

**FACT (app/portal/revisions/page.tsx, Phase 13 inspection, Gap G-3):** The
portal revisions page displays all assets with `status = 'REVISION_REQUIRED'`
as "Revision in Progress" unconditionally. This is inaccurate: a revision is
only in progress if a subsequent ProductionJob has been created for the same
order. Before that, no revision work has started. The portal page does not
query for a subsequent ProductionJob.

**FACT (DR 0053 §4.2):** Lineage tracking (`parent_asset_id`) is explicitly
deferred. This record does not introduce it.

---

## 2. Decision

### 2.1 Revision Model

**PROPOSED:** A revision in Phase 13 is defined as:
- A new `production.assets` row linked to the same order (and campaign/brief
  as the original) with an appropriate initial status (UPLOADED for MANUAL_UPLOAD,
  or created at PROCESSING by materialization for AI_GENERATION).
- A new `production.production_jobs` row for the same order, using an existing
  V1 job type (AI_GENERATION or MANUAL_UPLOAD).
- The original REVISION_REQUIRED Asset row is terminal and is not modified.

**PROPOSED:** The `REVISION` job type from DR 0053 §4.2 remains DEFERRED.
A revision is created by reusing an existing V1 job type, not by introducing
a new job type.

### 2.2 Authorized Roles

**PROPOSED:** Authorized roles for revision initiation:
`['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']`.

This is the same as `CREATE_ROLES` from DR 0053 §5. Revision initiation
reuses `createProductionJob`, which already enforces this role list.
No new role authority is introduced by this record. CREATIVE_PRODUCTION
authority is confirmed (see §1 Context, DR 0053 §5).

### 2.3 Admin Action: actionCreateRevisionJob

**PROPOSED:** A new admin server action `actionCreateRevisionJob` is the
intended entry point for revision initiation. The action:

1. Receives: `originalAssetId`, `orderId`, `jobType` ('AI_GENERATION' |
   'MANUAL_UPLOAD'), and optional `description` and `metadata`.
2. Calls `auth()` and verifies the session.
3. Verifies `actorRole` is in `['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']`.
4. Queries `production.assets` to confirm the original asset exists with
   `status = 'REVISION_REQUIRED'` and `organization_id` from the server-side
   JWT session. Returns an error if not found or wrong status.
5. Calls `createProductionJob` with the provided `orderId`, `jobType`,
   `description`, and `metadata`, using `actorId` and `actorRole` from session.
6. Writes a `REVISION_INITIATED` audit event (see §2.4).
7. Calls `revalidatePath` for the relevant admin pages on success.

### 2.4 REVISION_INITIATED Audit Event

**PROPOSED:** After `createProductionJob` succeeds, an audit event is written
to `system.audit_events`:
- `entity_type = 'production_job'`
- `entity_id = newProductionJobId`
- `actor_id = actorId`
- `actor_role = actorRole`
- `action = 'REVISION_INITIATED'`
- `payload = { original_asset_id: originalAssetId, new_production_job_id: newProductionJobId, order_id: orderId, job_type: jobType }`

**PROPOSED:** The idempotency key for revision initiation is:
`REVISION_INITIATED:{originalAssetId}:{newJobId}`.

### 2.5 No Linkage on Original Asset Row

**PROPOSED:** The original REVISION_REQUIRED Asset row is not modified when
a revision is initiated. No `revision_job_id` or similar back-reference is
added to the original Asset row. Lineage tracking (`parent_asset_id`) remains
DEFERRED per DR 0053 §4.2. The connection between the original asset and the
revision job is recorded only in the `REVISION_INITIATED` audit event (§2.4).

### 2.6 Portal Revisions Page: Accurate Status Display

**PROPOSED:** The portal revisions page (`app/portal/revisions/page.tsx`)
must be updated to display accurate revision status. The corrected logic:

1. Fetch all assets with `status = 'REVISION_REQUIRED'` for the organization.
2. For each such asset, query `system.audit_events` for a `REVISION_INITIATED`
   event where `payload.original_asset_id = asset.id`.
3. Display:
   - If a `REVISION_INITIATED` audit event exists: "Revision in Progress"
   - If no `REVISION_INITIATED` event exists: "Revision Pending" (or equivalent)

This change applies to the portal view only. No admin UI is modified by this
sub-decision.

### 2.7 No Schema Changes

**PROPOSED:** No schema changes, new columns, or migrations are required or
authorized by this record. All required tables (`production.assets`,
`production.production_jobs`, `system.audit_events`, `system.idempotency_keys`)
already exist with the necessary columns.

### 2.8 Tenant Isolation

**PROPOSED:** All queries in §2.3 must include `organization_id = :organizationId`
where `:organizationId` comes from the server-side JWT session. No
`organization_id` from client input is used.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume REVISION_REQUIRED is a non-terminal status — it is terminal
  for the original Asset row (§2.1, DR 0006).
- Do not assume the REVISION job type is introduced by this record — it remains
  DEFERRED (§2.1, DR 0053 §4.2).
- Do not assume lineage tracking (parent_asset_id) is authorized — DEFERRED (§2.5).
- Do not assume AGENT may initiate revision jobs — AGENT is excluded from all
  ProductionJob creation per DR 0053 §5 and DR 0080.
- Do not assume CREATIVE_PRODUCTION lacks revision initiation authority — it is
  confirmed by DR 0053 §5, Owner decision D11 (§2.2).
- Do not assume the portal display change is optional — Gap G-3 is a correctness
  defect, not a cosmetic preference (§2.6).
- Do not assume `organization_id` may come from client input — server-side
  session only (§2.8).
- Do not assume this record modifies Decision Records 0001–0087 — it does not.
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.

---

## 4. Owner Approval

Owner approved 2026-09-08.

**No implementation is authorized by approval of this record alone.**
Phase 13 BUILD authorization is a separate, subsequent decision.
