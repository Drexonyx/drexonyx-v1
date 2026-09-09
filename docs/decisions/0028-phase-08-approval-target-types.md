# Decision Record 0028 — Phase 08: Approval Target Types (Physical Schema)

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN blocker D1 — "Approval target model (CRITICAL
  BLOCKER): DR 0028 is PROPOSED. The approvals schema has no target_type /
  target_id."
- **Relationship to prior records:** Does not modify Decision Records 0001–0027
  or 0038–0052. All remain authoritative and unchanged. The Phase 02 Round 02B
  draft of DR 0028 (conceptual designation of Asset and Quote) is incorporated
  and extended here to the physical schema and pre-condition level needed for
  Phase 08 implementation.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT:** The `production.approvals` table has no `target_type` or `target_id`
columns. Approval records cannot be linked to the entity they formally concern.

**FACT (Phase 02 Round 02B DR 0028 draft):** The conceptual designation of
Asset and Quote as V1 Approval target types was proposed and analyzed. Owner
direction for Phase 08 confirms: both are designated.

**FACT (Phase 08 PLAN):** Without physical `target_type`/`target_id` columns
and a CHECK constraint bounding `target_type`, Phase 08 cannot implement
approval creation, approval decision, or the delivery orchestration gate
(DR 0034 Phase 08).

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 Designated V1 Approval Target Types

The V1 Approval target-type set is: **{ASSET, QUOTE}**.

No other target type is supported in V1. Any Approval record must target
either an Asset row or a Quote row. An Approval record with no target
(null `target_type` / `target_id`) is not permitted.

### 2.2 Physical Schema Additions

The `production.approvals` table requires two additional columns:

```sql
ALTER TABLE production.approvals
  ADD COLUMN target_type TEXT NOT NULL,
  ADD COLUMN target_id   UUID NOT NULL;

ALTER TABLE production.approvals
  ADD CONSTRAINT approvals_target_type_check
  CHECK (target_type IN ('ASSET', 'QUOTE'));
```

- `target_type` — the class of entity this Approval formally concerns.
  Values: `'ASSET'` or `'QUOTE'`. NOT NULL; set at creation; immutable.
- `target_id` — the UUID v7 of the specific row (Asset or Quote) this
  Approval targets. NOT NULL; set at creation; immutable.
- Both columns are set atomically at Approval creation and are never updated.

### 2.3 Target Pre-Conditions

**PROPOSED — the following pre-conditions govern which rows are valid targets:**

**For Asset-targeting Approvals:**
- The targeted Asset row must be in `CLIENT_PREVIEW` state at the time the
  Approval record is created. An Asset in any other state (`UPLOADED`,
  `PROCESSING`, `READY_FOR_QC`, `REVISION_REQUIRED`, `REJECTED`) may not
  be targeted.
- Rationale: DR 0006 establishes `CLIENT_PREVIEW` as the state where an
  Asset has cleared internal QC and is ready for client-facing review.
  An Asset not yet cleared by QC must not be presented for client approval.

**For Quote-targeting Approvals:**
- The targeted Quote row must be in `SENT` state at the time the Approval
  record is created. A Quote in any other state may not be targeted.
- Rationale: DR 0005 establishes `SENT` as the state where a Quote has
  been presented to the client for their decision. An unsent or already-
  terminal Quote is not a valid target.
- **Note on ordering with DR 0046:** DR 0046 establishes that Quote ACCEPTED
  triggers Order creation. A Quote-targeting Approval is an independent
  formal decision record; it does not replace or trigger the ACCEPTED
  transition. The relationship between Approval APPROVED and Quote ACCEPTED
  is **DEFERRED** for Phase 08 (see §8).

### 2.4 Immutability

Once set, `target_type` and `target_id` are immutable. An Approval record's
target is fixed at creation. No update to these columns is ever permitted.

---

## 3. Scope

This record governs:
- The physical column additions to `production.approvals`.
- The `target_type` CHECK constraint.
- The pre-conditions for targeting an Asset or Quote row.
- The immutability rule for `target_type` and `target_id`.

---

## 4. Non-Goals

- **Asset status machine:** NOT modified by this record. `APPROVED` and
  `REJECTED` are not Asset states and will never be. An Approval record
  targeting an Asset row does not write to the Asset row's `status` column.
  The admin badge map inconsistency (invalid `QC_PASS`, `QC_FAIL`, `APPROVED`,
  `DELIVERED` badge keys in `app/admin/assets/page.tsx`) is a UI bug to be
  corrected, not evidence of additional Asset states. (Addressed in Phase 08 build.)
- **Quote status machine:** NOT modified by this record.
- **Delivery:** Not an Approval target type in V1. Delivery designation remains
  DEFERRED (DR 0026 Phase 02 analysis).
- **Financial events:** Approval targeting does not represent or trigger any
  payment, expense, or ledger entry.
- **Notification delivery:** Not implemented in Phase 08 (D10, DEFERRED).
- **Automatic state cascades:** An Approval's APPROVED/REJECTED decision does
  not automatically advance the targeted entity's status. Cascade behavior is
  DEFERRED.

---

## 5. Role Authority

Approval creation authority is governed by DR 0029 Phase 08. This record
does not reassign roles.

Summary for reference (normative source: DR 0029 Phase 08):
- **Create Approval:** OWNER, ADMIN_OPERATIONS only.
- **Decide Approval (APPROVED/REJECTED):** CLIENT role for Asset-targeting
  Approvals. Detailed matrix in DR 0029 Phase 08.
- **CLIENT may not create Approvals.** CLIENT is the decider, not the creator.

---

## 6. Tenant Isolation

**PROPOSED — required enforcement:**

1. The targeted Asset or Quote row must have the same `organization_id` as
   the Approval record being created. Cross-tenant target references are
   prohibited.
2. The targeted Asset or Quote row must belong to the same Order as the
   Approval record, or be traceable to the same Order context (for Quote
   targets: the Quote must be associated with the Order context).
3. Enforcement is at the service layer: the create-approval service function
   must perform an org-scoped lookup of the target row before inserting the
   Approval record. No assumption of caller-supplied `target_id` validity.
4. The `organization_id` cross-check must be performed in the same database
   transaction as the Approval insert.

---

## 7. Audit Requirements

Every Approval status transition must write an audit event to
`system.audit_events` in the same atomic transaction as the status update.

**Canonical audit action strings (D14, Owner-approved):**

| Event | `action` string |
|---|---|
| Approval created (PENDING) | `APPROVAL_CREATED` |
| Approval decided APPROVED | `APPROVAL_DECIDED_APPROVED` |
| Approval decided REJECTED | `APPROVAL_DECIDED_REJECTED` |
| Approval cancelled | `APPROVAL_CANCELLED` |
| Approval expired | `APPROVAL_EXPIRED` |

The `payload` must include: `approval_id`, `order_id`, `organization_id`,
`target_type`, `target_id`, `actor_id`, `actor_role`.

---

## 8. Deferred Items

1. **Quote-targeting Approval operational workflow in Phase 08:** The
   interaction between Approval APPROVED on a Quote and the Quote ACCEPTED /
   Order creation flow (DR 0046) is DEFERRED. Quote-targeting Approvals
   may be implemented at the schema and service level in Phase 08 but their
   operational workflow requires a separate Owner decision.
2. **Automatic state cascade from Approval to target entity:** DEFERRED.
3. **Expiry enforcement mechanism** (the `expires_at` column exists; a
   background job or check-on-read to transition PENDING → EXPIRED is
   DEFERRED from Phase 08).
4. **Workflow routing** (how PENDING Approvals are surfaced to the appropriate
   decider): DEFERRED from Phase 08.
5. **RLS policy** at the database layer: DEFERRED. Application-layer
   org-scoped queries are the V1 enforcement mechanism.
6. **Tier 3 candidates** (Campaign, Brief, Order, Production Job, AI
   Generation): remain UNVERIFIED as target types and are not addressed here.

---

## 9. Dependencies

- DR 0006 (Asset state machine) — Asset `CLIENT_PREVIEW` pre-condition.
- DR 0005 (Quote state machine) — Quote `SENT` pre-condition.
- DR 0010 (Approval state machine) — Approval status values unchanged.
- DR 0029 Phase 08 (Role Authority) — creation and decision authority.
- DR 0034 Phase 08 (Delivery Orchestration) — delivery gate depends on
  Approval APPROVED state.
- Phase 08 migration file (to be created): adds `target_type`, `target_id`
  columns and CHECK constraint.

---

## 10. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- `production.approvals` gains `target_type` and `target_id` columns.
- The V1 target-type set is confirmed as {ASSET, QUOTE}.
- Phase 08 build of approval creation and decision services is unblocked.
- DR 0028 Phase 02 Round 02B draft is superseded by this record for
  Phase 08 implementation.

---

## Explicitly Prohibited Assumptions

- Do not assume `APPROVED` or `REJECTED` are Asset states — they are not.
- Do not assume CLIENT may create Approvals — CLIENT is the decider only.
- Do not assume Quote ACCEPTED and Approval APPROVED on a Quote are the
  same event — they are distinct.
- Do not assume Approval targeting automatically advances the target
  entity's status column.
- Do not assume this record authorizes schema changes, migrations, or code.
- Do not assume Delivery is a V1 Approval target type.
- Do not assume expiry enforcement is implemented in Phase 08.
