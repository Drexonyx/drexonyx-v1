# Decision Record 0098 — Phase 16: Client Approval Decision

- **Decision Round:** Phase 16
- **Phase:** 16 — Client Approval, Delivery, Revision & Test Coverage
- **Status:** APPROVED — Owner approved as part of Phase 16 build. No schema,
  migration, or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-09
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation) + Phase 15 BUILD
- **Clarifies:** The client approval decision flow — established in DR 0029 Phase 08
  and DR 0034 Phase 08 — as fully implemented in Phase 15 and requiring no schema
  or service-layer changes in Phase 16. Identifies the asset preview integration
  gap as the only remaining Phase 16 deliverable for this area.
- **Relationship to prior records:** Does not modify Decision Records 0001–0097.
  All remain authoritative and unchanged. Depends on DR 0010 (Approval state
  machine), DR 0029 Phase 08 (CLIENT approval authority and 5 scope constraints),
  DR 0034 Phase 08 (Approval→Delivery gate), DR 0086 (signed URL delivery).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0097. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (lib/portal/approvals.ts, Phase 16 inspection):** `decideApproval` is
fully implemented. It enforces all five DR 0029 §2.6 scope constraints:

1. `organizationId` from server-side JWT session — never from client input.
2. Approval must have `status = 'PENDING'`.
3. Approval `expires_at` must not be in the past.
4. Approval `target_type` must be `'ASSET'`.
5. Approval `organization_id` must match session `organizationId` (tenant isolation).

The function applies a CAS update (`WHERE status = 'PENDING'` + `.returning()`)
and throws `CONCURRENT_MODIFICATION` if zero rows are returned. Idempotency key:
`APPROVAL_DECIDED:{approvalId}`. Audit events written:
`APPROVAL_DECIDED_APPROVED` or `APPROVAL_DECIDED_REJECTED`.

**FACT (app/portal/approvals/actions.ts, Phase 16 inspection):**
`actionDecideApproval` is a fully implemented `'use server'` action. It calls
`getPortalSession()` (which enforces `CLIENT` role), derives `organizationId`,
`userId`, and `role` from the session, calls `decideApproval`, calls
`revalidatePath('/portal/approvals')` on success, and returns `{ ok, reason }`.

**FACT (app/portal/approvals/page.tsx, Phase 16 inspection):** The portal
approvals page is fully implemented. It renders a table of the client's
approvals, filtered to `target_type = 'ASSET'` and `status = 'PENDING'`, and
mounts `<ApprovalDecide approvalId={a.id} />` for each pending ASSET approval.

**FACT (app/portal/approvals/ApprovalDecide.tsx, Phase 16 inspection):**
`ApprovalDecide` is a fully implemented `'use client'` component. It calls
`actionDecideApproval` with `'APPROVED'` or `'REJECTED'`, shows an inline error
on failure, and disables the buttons during the transition.

**FACT (Phase 16 inspection):** The portal approvals page does not currently
provide a mechanism for the client to view (download or preview) the asset
content before submitting their decision. The `GET /api/assets/[assetId]/url`
route (DR 0086) exists and generates a signed URL for asset content, but is not
wired into the approvals page.

**FACT (DR 0086 §2.2):** The four-step authorization flow for
`GET /api/assets/[assetId]/url` requires: (1) authentication, (2) tenant
membership, (3) tenant-isolated asset lookup with `file_key` check, (4) signed
URL generation. The route is defined for internal admin use but is not restricted
to any specific role beyond tenant membership.

**FACT (DR 0010):** Approval states are PENDING, APPROVED, REJECTED, CANCELLED,
EXPIRED. All states except PENDING are terminal. No reopening is permitted.

---

## 2. Decision

### 2.1 No Service-Layer Changes Required

**APPROVED (existing behavior):** The `decideApproval` service function,
`actionDecideApproval` server action, and `ApprovalDecide` client component
implement the complete approval decision flow as specified in DR 0029 Phase 08.
No changes to these artifacts are authorized or required in Phase 16.

### 2.2 Asset Preview Integration on the Portal Approvals Page

**PROPOSED:** The portal approvals page (`app/portal/approvals/page.tsx`) must
be updated to provide the client with a secure, time-limited link to view each
asset under review before submitting their decision. The integration:

1. For each pending ASSET approval, the page fetches or links to
   `GET /api/assets/[assetId]/url` (DR 0086), where `assetId` is
   `approval.target_id`.
2. The returned `{ url, expiresAt }` is used to render a temporary "View Asset"
   link for the client.
3. The link is rendered as an anchor (`<a href={url} target="_blank">`) or
   equivalent, opening the signed R2 URL in a new tab.
4. The link is not cached beyond the response's `expiresAt`. The page fetches
   a fresh URL on each render (server component) or on demand (client component
   fetch).

**PROPOSED:** The signed URL delivered to the client via this mechanism is a
presigned R2 URL (DR 0086 §2.3). It is not a Higgsfield CDN URL, a public URL,
or any other URL shape. DREXONYX remains the source of truth (DR 0086 §2.5).

**PROPOSED:** The `GET /api/assets/[assetId]/url` route enforces tenant
membership (step 2 of the four-step flow). When called from a CLIENT session,
`organizationId` comes from the server-side JWT. No `organization_id` from client
input is used. The asset returned is restricted to the authenticated client's
organization.

### 2.3 Expiry Display

**PROPOSED:** The portal approvals page should display the `expiresAt` value
alongside the "View Asset" link, informing the client that the link is
time-limited. No mechanism enforces that the client views the asset before
deciding. Reviewer sovereignty applies (DR 0090 §2.3 by analogy).

### 2.4 No Changes to the Approval State Machine

**APPROVED (existing behavior, DR 0010):** The approval state machine is
unchanged. PENDING → APPROVED | REJECTED remain the only CLIENT-authorized
transitions. Terminal states (APPROVED, REJECTED, CANCELLED, EXPIRED) cannot
be reopened. No new states are introduced by this record.

### 2.5 CLIENT Role Constraint

**APPROVED (existing behavior, DR 0029 Phase 08):** Only authenticated users
with role `CLIENT` may call `actionDecideApproval`. `getPortalSession()`
enforces this. No other role may decide an approval through the portal approval
path.

### 2.6 Tenant Isolation

**APPROVED (existing behavior, DR 0029 §2.6, lib/portal/approvals.ts):**
`organizationId` for all approval queries and updates is derived from
`session.user.organizationId` (server-side JWT). No `organizationId` from
client request input is used at any layer.

### 2.7 No Schema Changes

**PROPOSED:** No schema changes, new columns, or migrations are required or
authorized by this record. The asset preview integration requires no new tables.

---

## 3. Non-Goals

- This record does not introduce a client-facing asset upload or submission path.
- This record does not modify the admin approval creation path (`createApproval`,
  DR 0034).
- This record does not define QUOTE approval behavior (target_type = 'QUOTE');
  that is governed by existing records.
- This record does not introduce email notification for approval decisions; that
  is addressed in DR 0099.

---

## 4. Audit Requirements

**APPROVED (existing behavior):** Audit events `APPROVAL_DECIDED_APPROVED` and
`APPROVAL_DECIDED_REJECTED` are already written by `decideApproval` on every
successful decision. No new audit events are authorized by this record.

---

## 5. Explicitly Prohibited Assumptions

- Do not assume the approval decision flow needs to be re-implemented — it is
  fully implemented (§2.1).
- Do not assume `organizationId` may come from client input at any layer —
  server-side JWT only (§2.6, DR 0029 §2.6).
- Do not assume terminal approval states (APPROVED, REJECTED, CANCELLED,
  EXPIRED) can be reopened — they cannot (DR 0010).
- Do not assume the signed URL may be a Higgsfield CDN URL or public URL —
  prohibited (§2.2, DR 0086 §2.3).
- Do not assume the signed URL may be cached beyond `expiresAt` — prohibited
  (DR 0086 §2.4).
- Do not assume this record modifies Decision Records 0001–0097 — it does not.
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.

---

## 6. Owner Approval

Owner approved as part of Phase 16 build authorization.

**No BUILD is authorized by approval of this record alone.**
Phase 16 BUILD authorization is a separate, explicit instruction.
