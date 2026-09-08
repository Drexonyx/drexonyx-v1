# Decision Record 0089 — Phase 13: QC / Approval / Delivery Gates

- **Decision Round:** Phase 13
- **Phase:** 13 — QC & Revision Engine
- **Status:** APPROVED — Owner approved 2026-09-08. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit 1ffd894 (Phase 12 final)
- **Consolidates:** The gate logic distributed across DR 0006, DR 0034, and the
  Phase 13 inspection report into a single authoritative reference for Phase 13.
  Does not modify those records.
- **Relationship to prior records:** Does not modify Decision Records 0001–0088.
  All remain authoritative and unchanged. Depends on DR 0006 (Asset state machine),
  DR 0034 (approval/delivery orchestration), DR 0087 (MANUAL_UPLOAD → READY_FOR_QC).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0088. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0006):** Asset status sequence: UPLOADED → [PROCESSING →] READY_FOR_QC
→ CLIENT_PREVIEW. REVISION_REQUIRED and REJECTED are also reachable from
READY_FOR_QC. Terminal states: REVISION_REQUIRED, REJECTED.

**FACT (lib/admin/qc.ts, Phase 13 inspection):** `createQcReview` enforces
`asset.status === 'READY_FOR_QC'` as a precondition. If not satisfied, the
function returns `ok: false, reason: 'not_in_ready_for_qc'`. This gate is
enforced server-side.

**FACT (lib/admin/approvals.ts, Phase 13 inspection):** `createApproval`
enforces `asset.status === 'CLIENT_PREVIEW'` for ASSET target type. If not
satisfied, the function returns `ok: false, reason: ...`. This gate is enforced
server-side.

**FACT (lib/admin/deliveries.ts, Phase 13 inspection):** `createDelivery`
enforces: Order status = ACTIVE, at least one Approval exists, all Approvals
are in APPROVED status. A `DELIVERY_CREATION_BLOCKED` audit event is written
when delivery is rejected due to gate failure.

**FACT (lib/admin/qc.ts, Phase 13 inspection):** QC PASS transitions the Asset
to CLIENT_PREVIEW. It does not create an Approval record. The Approval must be
created separately by an authorized admin.

**FACT (db/schema/production.ts, Phase 13 inspection):** The `REJECTED` status
is present in the Asset status CHECK constraint. No code path in Phases 1–12
produces an REJECTED status. Its operational semantics — the transition that
sets it, the authority required, and its relationship to approval — are undefined.

**FACT (DR 0087):** MANUAL_UPLOAD assets start at UPLOADED status and must be
explicitly advanced to READY_FOR_QC via `markManualAssetReadyForQc`. Only after
reaching READY_FOR_QC may a QC review be submitted for a MANUAL_UPLOAD asset.

---

## 2. Decision: Gate Definitions

### 2.1 Gate QC-1: QC Review Precondition

**APPROVED (existing behavior, DR 0006, lib/admin/qc.ts):** A QC review
(`createQcReview`) may only be submitted when the target Asset has
`status = 'READY_FOR_QC'`. Any other status is a hard rejection.

This gate applies to all Asset types, including MANUAL_UPLOAD assets that
have been advanced to READY_FOR_QC via DR 0087.

### 2.2 Gate QC-2: Approval Precondition

**APPROVED (existing behavior, DR 0034, lib/admin/approvals.ts):** An Approval
for an Asset target may only be created when the Asset has `status = 'CLIENT_PREVIEW'`.
Any other status is a hard rejection.

Gate QC-1 must be satisfied and result in a PASS verdict before Gate QC-2
becomes reachable. QC PASS transitions the Asset to CLIENT_PREVIEW, enabling
Gate QC-2.

### 2.3 Gate QC-3: Delivery Precondition

**APPROVED (existing behavior, DR 0034, lib/admin/deliveries.ts):** Delivery
creation requires ALL of the following:
1. The associated Order has `status = 'ACTIVE'`.
2. At least one Approval record exists for the order.
3. All Approval records for the order have `status = 'APPROVED'`.

A `DELIVERY_CREATION_BLOCKED` audit event is written on failure.

### 2.4 Gate QC-4: QC PASS Does Not Auto-Create Approval

**APPROVED (existing behavior, lib/admin/qc.ts):** A QC PASS verdict transitions
the Asset to CLIENT_PREVIEW but does NOT automatically create an Approval record.
Creating an Approval is a separate, subsequent admin action governed by
DR 0034.

This separation is intentional: admin review of the QC verdict before client
presentation is preserved. There is no automatic pipeline from QC PASS to
Approval to Delivery. Each gate requires a discrete human action.

### 2.5 Gate QC-5: MANUAL_UPLOAD Asset Must Reach READY_FOR_QC First

**PROPOSED (Phase 13, DR 0087):** Before a QC review may be submitted for a
MANUAL_UPLOAD asset, the asset must have been explicitly advanced to
READY_FOR_QC via `markManualAssetReadyForQc` (DR 0087 §2.1). Gate QC-1 is
not reachable for a MANUAL_UPLOAD asset still at UPLOADED status.

This gate does not introduce a new check in `createQcReview` — Gate QC-1
(`status = 'READY_FOR_QC'`) already serves as the enforcement point. Gate QC-5
is a workflow statement: MANUAL_UPLOAD assets require an explicit admin action
to clear UPLOADED → READY_FOR_QC before QC becomes possible.

### 2.6 REVISION_REQUIRED Is Terminal for the Failed Asset Row

**APPROVED (DR 0006):** When a QC review results in a FAIL verdict, the Asset
transitions to REVISION_REQUIRED. REVISION_REQUIRED is terminal. The original
Asset row does not transition further. No gate permits re-entry of a
REVISION_REQUIRED asset into the QC pipeline.

A revision produces a new Asset row (DR 0088 §2.1), which begins at UPLOADED
or PROCESSING and must pass through all gates independently.

### 2.7 REJECTED Status: Deferred

**DEFERRED:** The REJECTED status is present in the schema but has no
operational definition in Phases 1–12 or Phase 13. The following are deferred
to a future decision record:
- Which transition(s) produce REJECTED status.
- What authority is required for the transition.
- The relationship between REJECTED and Approval (e.g., client rejection).
- Whether REJECTED is reachable from CLIENT_PREVIEW.

No implementation may produce a REJECTED status until a future decision record
defines these semantics.

### 2.8 No Financial Writes in Phase 13

**PROPOSED:** No QC, revision-initiation, or gate-enforcement action in Phase 13
writes to any financial table (`financial.financial_ledger`, `financial.expenses`,
`financial.payments`, `financial.reserves`, `financial.owner_settlements`,
`financial.provider_credits`). Financial recording remains scoped to AI
generation cost (DR 0083) and provider credit consumption (DR 0066).

---

## 3. Gate Summary Table

| Gate | Precondition | Enforced by | Failure result |
|------|-------------|-------------|----------------|
| QC-1 | Asset `status = 'READY_FOR_QC'` | `createQcReview` | `ok: false, reason: 'not_in_ready_for_qc'` |
| QC-2 | Asset `status = 'CLIENT_PREVIEW'` | `createApproval` | `ok: false, reason: ...` |
| QC-3 | Order ACTIVE + ≥1 Approval + all APPROVED | `createDelivery` | `DELIVERY_CREATION_BLOCKED` audit event |
| QC-4 | (Prohibition) QC PASS does not auto-create Approval | `createQcReview` | N/A — by design |
| QC-5 | MANUAL_UPLOAD: UPLOADED → READY_FOR_QC must precede QC-1 | `markManualAssetReadyForQc` (DR 0087) | QC-1 rejects at UPLOADED status |

---

## 4. Explicitly Prohibited Assumptions

- Do not assume a QC PASS automatically creates an Approval — it does not (§2.4).
- Do not assume Delivery may be created before all Approvals are APPROVED — it
  may not (§2.3).
- Do not assume REVISION_REQUIRED allows re-entry into the QC pipeline — it
  does not (§2.6).
- Do not assume REJECTED status has defined operational semantics — deferred (§2.7).
- Do not assume any Phase 13 gate action writes to financial tables — prohibited (§2.8).
- Do not assume Gate QC-5 adds a new check inside `createQcReview` — Gate QC-1
  already enforces it (§2.5).
- Do not assume this record modifies Decision Records 0001–0088 — it does not.
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.

---

## 5. Owner Approval

Owner approved 2026-09-08.

**No implementation is authorized by approval of this record alone.**
Phase 13 BUILD authorization is a separate, subsequent decision.
