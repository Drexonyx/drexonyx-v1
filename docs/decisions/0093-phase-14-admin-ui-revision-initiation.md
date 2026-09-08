# Decision Record 0093 — Phase 14: Admin UI for Revision Initiation

- **Decision Round:** Phase 14
- **Phase:** 14 — Admin UI Completion & Documentation Filing
- **Status:** PROPOSED — Requires Owner approval before implementation is
  authorized. No schema, migration, or implementation is authorized by this
  record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation)
- **Resolves:** Gap B identified in Phase 14 inspection — the server action
  `actionCreateRevisionJob` is implemented and wired in
  `app/admin/production/actions.ts` but no admin UI surface calls it.
- **Relationship to prior records:** Does not modify Decision Records 0001–0091.
  All remain authoritative and unchanged. Calls the service function authorized
  by DR 0088 (createRevisionJob) through the server action already implemented
  in Phase 13. Depends on DR 0006 (Asset state machine), DR 0053 (ProductionJob
  type taxonomy), DR 0088 (revision initiation path).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0091. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0088 §2.4, app/admin/production/actions.ts, Phase 14 inspection):**
The server action `actionCreateRevisionJob(originalAssetId, orderId, jobType, description?)` 
exists in `app/admin/production/actions.ts`. It performs server-side auth
verification, role checking (`OWNER`, `ADMIN_OPERATIONS`, `CREATIVE_PRODUCTION`),
and calls `createRevisionJob`. The action correctly derives `organizationId`
from the server-side JWT session.

**FACT (Phase 14 inspection, Gap B):** No client component or admin page calls
`actionCreateRevisionJob`. The action is unreachable through any UI path in
the current codebase. An admin with the required role has no way to initiate a
revision job for a REVISION_REQUIRED asset through the application.

**FACT (DR 0088 §2.1):** A revision job is initiated when an asset has
reached `REVISION_REQUIRED` status — the terminal state after a QC FAIL
verdict (DR 0090 §2.3). The revision path creates a new ProductionJob
(AI_GENERATION or MANUAL_UPLOAD) and a new Asset record for the revision,
leaving the original asset at REVISION_REQUIRED as an immutable historical
record.

**FACT (DR 0088 §2.6, Phase 14 inspection, app/portal/revisions/page.tsx):**
The portal already shows revision status to the client. The admin-side revision
initiation (creating the new ProductionJob) is a prerequisite for the portal
to show "Revision in Progress" status. Without the UI surface defined by this
record, the portal cannot advance beyond "Revision Pending — Pending Scheduling."

**FACT (app/admin/production/actions.ts §101–128):** The action signature is:
```typescript
actionCreateRevisionJob(
  originalAssetId: string,
  orderId: string,
  jobType: 'AI_GENERATION' | 'MANUAL_UPLOAD',
  description?: string,
): Promise<{ ok: boolean; reason?: string; newProductionJobId?: string }>
```

**FACT (DR 0088 §2.2):** The revision job creates a new ProductionJob linked
to the original order, not to the original asset. The `orderId` must be the
order that originally produced the REVISION_REQUIRED asset.

---

## 2. Decision

### 2.1 Authorized UI Surface

**PROPOSED:** A client component `RevisionInitiationForm` (or equivalent)
is authorized for Phase 14 within the admin production area. It surfaces
the "Initiate Revision" action for eligible assets.

**PROPOSED:** Eligible assets are those meeting all of the following:
- `asset.status = 'REVISION_REQUIRED'`
- The asset has an associated `order_id` (required to create the revision job)
- The asset is not archived (`archived_at IS NULL`)

### 2.2 UI Inputs

**PROPOSED:** The form requires the following from the admin user:
1. **Asset identification:** The `originalAssetId` — identified from the
   page's existing asset/job data, not a free-text field.
2. **Order identification:** The `orderId` — derived from the asset row's
   `order_id`, not entered by the admin.
3. **Job type selection:** `'AI_GENERATION' | 'MANUAL_UPLOAD'` — a dropdown
   or radio selection the admin chooses explicitly.
4. **Description (optional):** A free-text description field for the revision
   job. May be left empty.

### 2.3 Server Action Call

**PROPOSED:** On submission, the component calls:
```typescript
actionCreateRevisionJob(originalAssetId, orderId, jobType, description)
```

No business logic is duplicated in the component. The server action is the
single authorized path for this operation. The component handles only UI state
(loading, error display, success).

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
in context with the REVISION_REQUIRED asset row it acts on. It does not
require a separate admin route.

**PROPOSED:** The component may also be surfaced from the admin QC page
(`app/admin/qc/`) if that page already displays REVISION_REQUIRED assets,
provided it calls the same server action without duplication.

### 2.7 revalidatePath

**PROPOSED:** On success, the server action already calls
`revalidatePath('/admin/production')`. No additional revalidation targets
are required unless the admin QC page or admin assets page also displays
revision status, in which case those paths should be added to the server action.

### 2.8 No Schema Changes

**PROPOSED:** No schema changes, new columns, or migrations are required or
authorized by this record. The existing tables and the service function from
DR 0088 are sufficient.

### 2.9 Original Asset Immutability

**PROPOSED:** The UI must not suggest that the original REVISION_REQUIRED
asset will be modified. It remains at REVISION_REQUIRED as an immutable
historical record (DR 0088 §2.1). The revision creates a new Asset and a
new ProductionJob. The UI should convey this: e.g., "Initiate Revision Job
(creates new production job)" rather than "Edit Asset."

### 2.10 Query Extension

**PROPOSED:** If the existing admin production query does not already surface
REVISION_REQUIRED assets with their `order_id`, a query extension is authorized
to include them. The query must scope all lookups to `organization_id` from the
server-side session.

---

## 3. Explicitly Prohibited Assumptions

- Do not duplicate business logic from `createRevisionJob` in the UI
  component — the server action is the single path (§2.3).
- Do not use UI visibility as an authorization boundary — server-side
  enforcement is required (§2.4).
- Do not pass `organizationId` from the client — server-side JWT only (§2.5).
- Do not introduce a new server action for this operation — use the existing
  `actionCreateRevisionJob` (§2.3).
- Do not assume schema changes are authorized — they are not (§2.8).
- Do not surface assets at any status other than REVISION_REQUIRED — eligible
  assets only (§2.1).
- Do not assume the original asset is modified by revision initiation — it
  remains at REVISION_REQUIRED (§2.9, DR 0088).
- Do not allow the admin to enter `orderId` as a free-text field — derive it
  from the asset row (§2.2).
- Do not assume this record modifies Decision Records 0001–0091 — it does not.
- Do not assume this record authorizes commits, pushes, or Phase 14 BUILD —
  Owner approval is required first.

---

## 4. Owner Approval

**REQUIRES OWNER DECISION:** This record is PROPOSED. Owner must approve
before Phase 14 BUILD authorization for this item.

Implementation is not authorized until Owner approval is confirmed.
