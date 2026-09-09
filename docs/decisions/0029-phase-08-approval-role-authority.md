# Decision Record 0029 — Phase 08: Approval Role Authority

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN blocker — role authority matrix for Approval
  creation and decision, per-target-type.
- **Relationship to prior records:** Does not modify Decision Records 0001–0027
  or 0038–0052. All remain authoritative and unchanged. Extends DR 0024
  (Approval actor authority) with per-target-type role mappings enabled by
  DR 0028 Phase 08 (designation of ASSET and QUOTE as target types).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT (DR 0024):** The Approval actor authority framework was established at
the general Approval level, with role-per-target-type mapping explicitly deferred
(DR 0024 §23 item 1) pending target-type designation.

**FACT (DR 0028 Phase 08):** The V1 Approval target types are ASSET and QUOTE.
With the target-type set now confirmed (pending Owner approval of DR 0028
Phase 08), the per-type role authority mapping can be resolved.

**FACT (Phase 08 PLAN):** Without a per-type role authority definition, the
approval creation and decision service functions cannot enforce RBAC.

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 Governing Principle

All Approval mutations (create, decide, cancel) are server-side operations only.
CLIENT approval decisions are never accepted from untrusted client input;
`organization_id` is always sourced from the server-side JWT session. Role
is sourced from the server-side JWT session.

### 2.2 Role Authority Matrix — Asset-Targeting Approvals

| Action | OWNER | ADMIN_OPS | CREATIVE_PROD | QC | CLIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Create Approval (→PENDING) | ✓ | ✓ | — | — | — |
| Decide: APPROVED | — | — | — | — | ✓ |
| Decide: REJECTED | — | — | — | — | ✓ |
| Cancel Approval | ✓ | ✓ | — | — | — |

**Rationale:**
- **Create:** Approval creation is an internal administrative workflow step.
  The decision to present an asset for client review is made by OWNER or
  ADMIN_OPERATIONS after the asset has cleared QC. CREATIVE_PRODUCTION and
  QC roles are production-side roles; they do not have authority to formally
  present assets for client approval. CLIENT does not create approvals.
- **Decide:** The client (CLIENT role) is the party whose decision is sought
  on an Asset-targeting Approval. The CLIENT role's decision authority is
  scoped to Approval records where: (a) `target_type = 'ASSET'`, (b) the
  targeted Asset's `organization_id` matches the CLIENT's JWT `organizationId`,
  and (c) the Approval's `organization_id` matches the CLIENT's JWT
  `organizationId`. No cross-tenant decision is ever permitted.
- **Cancel:** Approval cancellation is an administrative action. Only
  OWNER/ADMIN_OPERATIONS may cancel a PENDING Approval.

### 2.3 Role Authority Matrix — Quote-Targeting Approvals

| Action | OWNER | ADMIN_OPS | CREATIVE_PROD | QC | CLIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Create Approval (→PENDING) | ✓ | ✓ | — | — | — |
| Decide: APPROVED | — | — | — | — | ✓ |
| Decide: REJECTED | — | — | — | — | ✓ |
| Cancel Approval | ✓ | ✓ | — | — | — |

**Rationale:** Quote-targeting Approvals follow the same pattern as Asset-
targeting: the client decides on the subject presented to them for formal
review. CLIENT decision is scoped identically (org-match required).

**Note on DR 0046 ordering:** DR 0046 establishes that a Quote moves to
ACCEPTED when the client signals acceptance, and that Order creation follows
immediately. A Quote-targeting Approval is a separate formal decision record.
The relationship between an Approval APPROVED decision and the Quote ACCEPTED
transition is **DEFERRED** (DR 0028 Phase 08 §8, item 1). In Phase 08, Quote-
targeting Approval records may be created at the data layer, but their
operational integration with the Quote acceptance flow is not implemented.

### 2.4 CREATIVE_PRODUCTION Exclusion

CREATIVE_PRODUCTION has no Approval create or decide authority for any target
type. Rationale: CREATIVE_PRODUCTION is a production execution role (creating
and managing production jobs and assets). Authority to formally present work
for client approval or to decide on approvals is not within that role's scope
in the DREXONYX V1 authority model.

### 2.5 QC Exclusion

QC has no Approval create or decide authority. QC's function is to submit
verdicts on Assets via `qcReviews` records (DR 0039), not to create or decide
Approvals. These are separate workflows.

### 2.6 CLIENT Scope Constraints

CLIENT may only decide Approvals where ALL of the following hold:
1. `approvals.organization_id` = CLIENT's JWT `organizationId`
2. `approvals.target_id` (the target row's `organization_id`) = CLIENT's
   JWT `organizationId` (verified by server-side lookup, never trusted from
   the client)
3. `approvals.status` = `'PENDING'` — only PENDING Approvals may be decided
4. The Approval is targeted at `target_type = 'ASSET'` or `'QUOTE'`
5. The targeted Asset row is in `CLIENT_PREVIEW` state (for ASSET targets)
   or the targeted Quote row is in `SENT` state (for QUOTE targets) — verified
   at decision time, not only at creation time

### 2.7 Idempotency

Approval decisions are write-once per Approval record. Once an Approval is
in APPROVED or REJECTED state, it is terminal; no further decide action is
permitted on that record. A new Approval record must be created for any
subsequent review cycle. This is consistent with DR 0010 (Approval state
machine) terminal states.

---

## 3. Scope

This record governs:
- RBAC authority for Approval creation, decision, and cancellation.
- CLIENT decision scope constraints (all five conditions in §2.6).
- Per-target-type role authority matrices.

---

## 4. Non-Goals

- **Approval physical schema:** governed by DR 0028 Phase 08.
- **Delivery authority:** governed by DR 0035 Phase 08.
- **QC verdict authority:** governed by DR 0039 (approved).
- **Quote ACCEPTED transition authority:** governed by DR 0046 (approved).
- **Notification of decision to decider:** DEFERRED (D10).
- **Expiry enforcement:** DEFERRED.
- **Workflow routing** (how PENDING Approvals are surfaced to CLIENT):
  DEFERRED from Phase 08.

---

## 5. Tenant Isolation

1. All Approval queries are org-scoped: `WHERE organization_id = :orgId` from
   JWT, never from client-supplied parameters.
2. Approval decision mutations include an org-scope WHERE clause:
   `WHERE id = :approvalId AND organization_id = :orgId`.
3. The `organization_id` for a newly created Approval is set from the JWT
   session, not from client input.
4. Cross-tenant target verification is required at creation time per
   DR 0028 Phase 08 §6.

---

## 6. Audit Requirements

All Approval mutations write audit events per DR 0028 Phase 08 §7.
Audit payload for decide actions must include `decision` (`APPROVED` or
`REJECTED`), `decider_role`, and `decider_user_id`.

---

## 7. Failure / Idempotency

- A CLIENT attempt to decide an Approval in a non-PENDING state must return
  a clear error (`Approval is not in a decidable state`), not a silent no-op.
- A CLIENT attempt to decide an Approval targeting a different organization
  must return `Approval not found` (no information leakage).
- A concurrent decide on the same Approval (two CLIENT sessions deciding
  simultaneously) is resolved by the first writer winning; the second receives
  a state-mismatch error.

---

## 8. Dependencies

- DR 0028 Phase 08 — target-type designation and pre-conditions.
- DR 0024 — base Approval actor authority framework.
- DR 0010 — Approval state machine (PENDING terminal states).
- DR 0042 — admin authentication strategy (JWT claims).
- DR 0039 — QC authority (QC role's scope does not include Approval).

---

## 9. Deferred Items

1. **Quote-targeting Approval operational workflow** in Phase 08 — DEFERRED
   (relationship with DR 0046 Quote acceptance flow).
2. **Expiry enforcement** — DEFERRED.
3. **CLIENT notification** when an Approval is created for them to decide —
   DEFERRED (D10).
4. **Role-per-type mapping for additional target types** (Delivery, Tier 3
   candidates) — DEFERRED; not resolved here.

---

## 10. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- RBAC matrix in §2.2 and §2.3 becomes authoritative for Phase 08 build.
- CLIENT decision authority over Asset-targeting Approvals is confirmed.
- All five CLIENT scope constraints (§2.6) are mandatory in implementation.

---

## Explicitly Prohibited Assumptions

- Do not assume CREATIVE_PRODUCTION or QC may create or decide Approvals.
- Do not assume CLIENT may create Approvals.
- Do not assume a CLIENT decision can be accepted from untrusted input —
  organization_id and role are always sourced from the server-side JWT.
- Do not assume Approval APPROVED on a Quote triggers Quote ACCEPTED —
  those are separate events; their relationship is DEFERRED.
- Do not assume a decided (non-PENDING) Approval may be re-decided.
- Do not assume this record authorizes schema changes, migrations, or code.
