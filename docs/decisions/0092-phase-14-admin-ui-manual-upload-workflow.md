# Decision Record 0092 — Phase 14: Admin UI for MANUAL_UPLOAD Workflow

- **Decision Round:** Phase 14
- **Phase:** 14 — Admin UI Completion & Documentation Filing
- **Status:** PROPOSED — Requires Owner approval before implementation is
  authorized. No schema, migration, or implementation is authorized by this
  record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation)
- **Resolves:** Gap A identified in Phase 14 inspection — the server action
  `actionMarkManualAssetReadyForQc` is implemented and wired in
  `app/admin/production/actions.ts` but no admin UI surface calls it.
- **Relationship to prior records:** Does not modify Decision Records 0001–0091.
  All remain authoritative and unchanged. Calls the service functions authorized
  by DR 0087 (markManualAssetReadyForQc, completeManualUploadJob) through the
  server action already implemented in Phase 13. Depends on DR 0006 (Asset state
  machine), DR 0053 (ProductionJob type taxonomy), DR 0087 (MANUAL_UPLOAD QC
  transition), DR 0091 (MANUAL_UPLOAD asset creation).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0091. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0087 §2.4, app/admin/production/actions.ts, Phase 14 inspection):**
The server action `actionMarkManualAssetReadyForQc(assetId, productionJobId)`
exists in `app/admin/production/actions.ts`. It performs server-side auth
verification, role checking (`OWNER`, `ADMIN_OPERATIONS`, `CREATIVE_PRODUCTION`),
and calls `markManualAssetReadyForQc` followed by `completeManualUploadJob`.
The action correctly derives `organizationId` from the server-side JWT session.

**FACT (Phase 14 inspection, Gap A):** No client component or admin page calls
`actionMarkManualAssetReadyForQc`. The action is unreachable through any UI
path in the current codebase. An admin with the required role has no way to
advance a MANUAL_UPLOAD asset from UPLOADED → READY_FOR_QC through the
application.

**FACT (DR 0091, Phase 14 inspection):** DR 0091 authorizes the creation of
assets at UPLOADED status for MANUAL_UPLOAD ProductionJobs. Without the UI
surface defined by this record, those assets are permanently stuck at UPLOADED.

**FACT (DR 0006 §3.1):** The Asset state machine requires UPLOADED →
READY_FOR_QC as the path for MANUAL_UPLOAD assets. The QC gate (DR 0089 §2.1,
Gate QC-1) requires READY_FOR_QC status. Without this transition, QC is
unreachable for MANUAL_UPLOAD assets.

**FACT (app/admin/production/actions.ts §67–98):** The action signature is:
```typescript
actionMarkManualAssetReadyForQc(
  assetId: string,
  productionJobId: string,
): Promise<{ ok: boolean; reason?: string }>
```

**FACT (app/admin/production/page.tsx and related, Phase 14 inspection):**
The admin production page renders ProductionJob rows including MANUAL_UPLOAD
jobs. The page has the infrastructure for client components and server actions
(see `actionCreateProductionJob` being called from existing UI).

---

## 2. Decision

### 2.1 Authorized UI Surface

**PROPOSED:** A client component `ManualUploadReadyForm` (or equivalent)
is authorized for Phase 14 within the admin production area. It surfaces
the "Mark Ready for QC" action for eligible assets.

**PROPOSED:** Eligible assets are those meeting all of the following:
- `asset.status = 'UPLOADED'`
- The asset belongs to a `ProductionJob` with `job_type = 'MANUAL_UPLOAD'`
  and `status = 'QUEUED'`
- The asset is not archived (`archived_at IS NULL`)

### 2.2 UI Inputs

**PROPOSED:** The form requires two inputs from the admin user:
1. **Asset selection:** A dropdown or display of the eligible asset(s)
   within the selected MANUAL_UPLOAD job, identified by `assetId`.
2. **Job reference:** The `productionJobId` of the enclosing MANUAL_UPLOAD
   job. This is surfaced from the page's existing job data — it is not a
   free-text field typed by the admin.

### 2.3 Server Action Call

**PROPOSED:** On submission, the component calls:
```typescript
actionMarkManualAssetReadyForQc(assetId, productionJobId)
```

No business logic is duplicated in the component. The server action is the
single authorized path for this operation. The component handles only UI
state (loading, error display, success).

### 2.4 Authorization Boundary

**PROPOSED:** Authorization is enforced server-side in the existing server
action: `actorRole` must be in `['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']`.

**PROPOSED:** UI visibility (showing or hiding the button) may be conditioned
on role, but UI visibility is not an authorization boundary. The server action
enforces the role check independently of what the UI renders.

### 2.5 organizationId Source

**PROPOSED:** `organizationId` is derived from the server-side JWT session
inside the existing server action. The client component does not pass
`organizationId` as a prop, argument, or hidden field. This constraint is
already enforced by the server action implementation.

### 2.6 Page Integration

**PROPOSED:** The component is integrated into the admin production page
(`app/admin/production/page.tsx` or a sub-component thereof). It appears
in context with the MANUAL_UPLOAD ProductionJob row it acts on. It does not
require a separate admin route.

### 2.7 revalidatePath

**PROPOSED:** On success, the server action already calls
`revalidatePath('/admin/production')`. No additional revalidation targets
are required unless the admin QC page (`/admin/qc`) also displays MANUAL_UPLOAD
assets, in which case `revalidatePath('/admin/qc')` should be added to the
server action.

### 2.8 No Schema Changes

**PROPOSED:** No schema changes, new columns, or migrations are required or
authorized by this record. The existing tables and the service functions
from DR 0087 are sufficient.

### 2.9 Query Extension

**PROPOSED:** If the existing admin production query (`getAdminProductionJobs`
or equivalent) does not already return the associated asset(s) for each
MANUAL_UPLOAD job, a query extension is authorized to fetch them. The query
must scope all lookups to `organization_id` from the server-side session.

---

## 3. Explicitly Prohibited Assumptions

- Do not duplicate business logic from `markManualAssetReadyForQc` or
  `completeManualUploadJob` in the UI component — the server action is the
  single path (§2.3).
- Do not use UI visibility as an authorization boundary — server-side
  enforcement is required (§2.4).
- Do not pass `organizationId` from the client — server-side JWT only (§2.5).
- Do not introduce a new server action for this operation — use the existing
  `actionMarkManualAssetReadyForQc` (§2.3).
- Do not assume schema changes are authorized — they are not (§2.8).
- Do not surface assets at any status other than UPLOADED — eligible assets
  only (§2.1).
- Do not assume this record modifies Decision Records 0001–0091 — it does not.
- Do not assume this record authorizes commits, pushes, or Phase 14 BUILD —
  Owner approval is required first.

---

## 4. Owner Approval

**REQUIRES OWNER DECISION:** This record is PROPOSED. Owner must approve
before Phase 14 BUILD authorization for this item.

Implementation is not authorized until Owner approval is confirmed.
