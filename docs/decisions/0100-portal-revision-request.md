# Decision Record 0100 — Phase 16: Portal Revision Request

- **Decision Round:** Phase 16
- **Phase:** 16 — Client Approval, Delivery, Revision & Test Coverage
- **Status:** APPROVED — Owner approved as part of Phase 16 build. No schema,
  migration, or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-09
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation) + Phase 15 BUILD
- **Resolves:** Gap G-3 complement — the portal revisions page (DR 0088 §2.6)
  was corrected to show accurate status ("Revision in Progress" vs. "Revision
  Pending") but provides no client action to formally signal that a revision is
  wanted. This record defines the client-facing revision request signal.
- **Relationship to prior records:** Does not modify Decision Records 0001–0099.
  All remain authoritative and unchanged. Depends on DR 0006 (Asset state
  machine — REVISION_REQUIRED terminal), DR 0029 Phase 08 (CLIENT scope
  constraints), DR 0088 (revision model — new ProductionJob path, REVISION
  job type DEFERRED), DR 0089 §2.6 (REVISION_REQUIRED terminal for original
  row).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0099. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0006 §3.3, DR 0089 §2.6):** REVISION_REQUIRED is a terminal status
for the original Asset row. Once an Asset reaches REVISION_REQUIRED, it does
not transition further. The original Asset row is immutable from this point.

**FACT (DR 0088 §2.3):** `actionCreateRevisionJob` is the admin-facing entry
point for revision initiation. It is authorized for
`['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']`. It creates a new
`production_jobs` row and writes a `REVISION_INITIATED` audit event. CLIENT is
not in this role list.

**FACT (app/portal/revisions/page.tsx, Phase 16 inspection):** The portal
revisions page displays assets with `status = 'REVISION_REQUIRED'`. It
distinguishes between "Revision in Progress" (a `REVISION_INITIATED` audit
event exists for the asset) and "Revision Pending — Pending Scheduling" (no
such event exists). The page provides no client action to signal a revision
request.

**FACT (lib/portal/, Phase 16 inspection):** No `revisions.ts` file exists
in `lib/portal/`. No `requestRevision` function is defined anywhere in the
portal service layer. No server action for portal revision request exists.

**FACT (Phase 16 inspection):** No schema table or column for storing a client
revision request as a persistent record is defined in the schema. The
`system.audit_events` table exists and is the established pattern for recording
lightweight operational signals.

**FACT (DR 0029 Phase 08 §2.6):** The CLIENT role is scoped to their
organization only. All portal service functions derive `organizationId` from
the server-side JWT session.

---

## 2. Decision

### 2.1 Nature of the Revision Request

**PROPOSED:** A portal revision request is a client-initiated signal — not an
operational command. The CLIENT submits a revision request to notify the DREXONYX
team that they want a revision on a REVISION_REQUIRED asset. The request:

- Does NOT transition any Asset status (REVISION_REQUIRED is terminal per DR 0006).
- Does NOT create a ProductionJob (that is admin authority, DR 0088 §2.3).
- Does NOT trigger the `actionCreateRevisionJob` admin action.
- Is recorded as an audit event so the admin team can see the client's signal.

The revision request is a notification mechanism, not an operational gate.

### 2.2 REVISION_REQUESTED Audit Event

**PROPOSED:** When a client submits a portal revision request, a
`REVISION_REQUESTED` audit event is written to `system.audit_events`:

- `entity_type = 'asset'`
- `entity_id = assetId`
- `actor_id = userId` (client's user ID from server-side session)
- `actor_role = 'CLIENT'`
- `action = 'REVISION_REQUESTED'`
- `payload = { asset_id: assetId, organization_id: organizationId, notes: notesIfProvided }`

**PROPOSED:** The idempotency key for revision requests is:
`REVISION_REQUESTED:{assetId}:{actorId}`.

This allows a client to re-submit a revision request if their first attempt
failed, but prevents duplicate events from the same actor for the same asset
within a single action attempt.

### 2.3 Client Authorization Constraints

**PROPOSED:** A portal revision request is authorized when ALL of the following
are true:

1. The actor has an authenticated portal session with `role = 'CLIENT'`.
2. `organizationId` from the server-side session matches the Asset's
   `organization_id`.
3. The Asset has `status = 'REVISION_REQUIRED'`.
4. The Asset's `organization_id` matches the session `organizationId`
   (tenant isolation — enforced server-side via query scoping).

If any condition is not met, the function returns `ok: false` with an
appropriate reason code.

### 2.4 requestRevision Service Function

**PROPOSED:** A new function `requestRevision` is implemented in
`lib/portal/revisions.ts`:

```typescript
export async function requestRevision(params: {
  assetId: string;
  organizationId: string;
  actorId: string;
  actorRole: string;
  notes?: string;
}): Promise<RequestRevisionResult>
```

The function:

1. Queries `production.assets` for `id = :assetId AND organization_id =
   :organizationId`. If not found: returns `ok: false, reason: 'not_found'`.
2. Checks `asset.status === 'REVISION_REQUIRED'`. If not:
   returns `ok: false, reason: 'not_revision_required'`.
3. Checks idempotency key `REVISION_REQUESTED:{assetId}:{actorId}` via
   `system.idempotency_keys`. If already consumed: returns `ok: true`
   (idempotent success).
4. Writes the `REVISION_REQUESTED` audit event to `system.audit_events`.
5. Inserts idempotency key.
6. Returns `ok: true`.

The function does not modify any Asset row, does not create a ProductionJob,
and does not call `actionCreateRevisionJob`.

### 2.5 actionRequestRevision Server Action

**PROPOSED:** A new `'use server'` action `actionRequestRevision` is implemented
in `app/portal/revisions/actions.ts`:

```typescript
export async function actionRequestRevision(
  assetId: string,
  notes?: string,
): Promise<{ ok: boolean; reason?: string }>
```

The action:

1. Calls `getPortalSession()` (enforces authenticated CLIENT session).
2. Derives `organizationId`, `userId`, `role` from session.
3. Calls `requestRevision({ assetId, organizationId, actorId: userId, actorRole: role, notes })`.
4. On success: calls `revalidatePath('/portal/revisions')`.
5. Returns `{ ok, reason }`.

### 2.6 Portal Revisions Page: Request Button

**PROPOSED:** The portal revisions page (`app/portal/revisions/page.tsx`) is
updated to render a "Request Revision" button for assets where no
`REVISION_INITIATED` event exists (status: "Revision Pending — Pending
Scheduling"). Assets that already have a `REVISION_INITIATED` event do not
show the request button (revision is already in progress).

The button calls `actionRequestRevision(asset.id, optionalNotes)`. On success,
the page revalidates and updates the display.

**PROPOSED:** The optional `notes` field allows the client to include a brief
description of what revision they need. Notes are stored in the audit event
payload only, not in any Asset or ProductionJob column.

### 2.7 No Schema Changes

**PROPOSED:** No schema changes, new columns, or migrations are authorized by
this record. All required tables (`production.assets`, `system.audit_events`,
`system.idempotency_keys`) already exist with the necessary columns.

### 2.8 Tenant Isolation

**PROPOSED:** All queries in §2.4 must include `organization_id = :organizationId`
where `:organizationId` comes from the server-side JWT session. No
`organization_id` from client request input is used.

### 2.9 Admin Visibility of Revision Requests

**PROPOSED:** The `REVISION_REQUESTED` audit event is visible to admin users
through the existing audit event query infrastructure. No dedicated admin UI
surface for revision requests is authorized by this record. The admin team
monitors `system.audit_events` for `action = 'REVISION_REQUESTED'` entries as
the signal to proceed with `actionCreateRevisionJob` (DR 0088).

---

## 3. Non-Goals

- This record does not authorize the CLIENT to create a ProductionJob directly.
- This record does not authorize the CLIENT to transition any Asset status.
- This record does not introduce a notification email for revision requests;
  admin monitoring of the audit log is the intended mechanism in Phase 16.
- This record does not modify the admin revision initiation path (`actionCreateRevisionJob`,
  DR 0088).
- This record does not introduce `parent_asset_id` lineage tracking — DEFERRED
  per DR 0053 §4.2.

---

## 4. Audit Requirements

**PROPOSED:** The `REVISION_REQUESTED` audit event (§2.2) is the only audit
event introduced by this record. It is written once per successful
`requestRevision` call, after idempotency check.

---

## 5. Explicitly Prohibited Assumptions

- Do not assume the CLIENT may create a ProductionJob — prohibited (§2.1,
  DR 0088 §2.3).
- Do not assume the CLIENT may transition Asset status — prohibited (§2.1,
  DR 0006).
- Do not assume REVISION_REQUIRED is non-terminal — it is terminal for the
  original Asset row (DR 0006, DR 0089 §2.6).
- Do not assume `organizationId` may come from client request input — server-side
  session only (§2.8).
- Do not assume lineage tracking (parent_asset_id) is authorized — DEFERRED
  (DR 0053 §4.2).
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.
- Do not assume this record modifies Decision Records 0001–0099 — it does not.

---

## 6. Owner Approval

Owner approved as part of Phase 16 build authorization.

**No BUILD is authorized by approval of this record alone.**
Phase 16 BUILD authorization is a separate, explicit instruction.
