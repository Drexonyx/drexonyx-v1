# Decision Record 0020 — Phase 02 Round 02B: Delivery Cardinality & Partial-Delivery Semantics

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the architectural/logical level only. No
  field, table, migration, or physical cardinality is approved by this
  record. No Delivery state is added, changed, or removed.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0019. All remain authoritative and unchanged. This record closes
  the Delivery-side cardinality and partial-delivery items each of 0011,
  0017, and 0018 left open, by consolidating what those records already
  established rather than inventing new business rules.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service and
Package remain **UNVERIFIED** as entities, unchanged from 0013–0019.

## 1. Context

Decision Record 0011 approved Delivery's five states and left
Delivery→Asset cardinality and partial-delivery semantics unresolved.
Decision Record 0017 defined the satisfaction reference and its minimum
anti-partial-credit rule. Decision Record 0018 fixed the default that one
actual record satisfies exactly one requirement and left the deeper
partial-delivery model open. This record is asked to determine, as far
as the existing chain (0011→0012→0014→0015→0016→0017→0018→0019) actually
supports, what cardinality and partial-delivery model governs Delivery,
without inventing new states or business rules the chain does not
already imply.

## 2. Problem

Three questions remain genuinely open after 0011/0017/0018: (1) what,
precisely, does `Delivery.COMPLETED` describe — a single record's own
transfer operation, or the full completeness of whatever content was
owed; (2) can several Delivery records ever jointly, partially satisfy
one Required Delivery, as opposed to each attempt independently
succeeding or failing at the whole thing; (3) what cardinality relations
(Order↔Required Delivery↔Delivery) does the approved chain actually
establish versus merely permit. This record must answer what the chain
supports and name, precisely, what it does not.

## 3. Approved Inputs

- **0011:** `COMPLETED` — "the delivery mechanism successfully made the
  content available; Delivery's own execution responsibility is
  discharged... This is Delivery's own completion fact only." No `RETRY`
  state; retries are new rows; Delivery→Asset cardinality and partial-
  delivery semantics explicitly DEFERRED.
- **0012:** guard uses "ALL required Deliveries `COMPLETED`" —
  unmodified by this record.
- **0015 §7 / 0016 §6:** a Required Delivery needs *some* conceptual
  identity/description of what is owed, exact shape DEFERRED.
- **0017 §5–§7, §12:** satisfaction = a correctly-referencing Delivery
  record reaching `COMPLETED`; existential per requirement; minimum rule
  — incomplete work never satisfies merely by existing.
- **0018 §5, §7, §9, §12:** multiple Required Deliveries permitted, AND
  semantics across them; multiple attempts permitted, existential
  satisfaction; **default: one actual record satisfies exactly one
  requirement**, adopted specifically to prevent false completion;
  formal `FOR EACH ... EXISTS` formula.
- **0019 §9:** empty required sets do not auto-satisfy; not directly
  implicated here but part of the same chain.

## 4. Delivery Execution vs. Requirement Satisfaction

**APPROVED (drawn directly from 0011's own text, not newly invented):**
`Delivery.COMPLETED` means **the delivery mechanism itself succeeded for
that record** — it is scoped to the record's own execution, not to any
claim about the completeness of a larger, multi-record whole. Decision
Record 0011 states this explicitly ("Delivery's own completion fact
only"). Therefore: `Delivery.COMPLETED` reaching true for one record
never, by itself, asserts that "the required deliverable is fully
delivered" in some aggregate sense — it asserts only that *this
record's* transfer succeeded. Whether that is enough to satisfy a
Required Delivery is answered entirely by the satisfaction layer (0017),
not by Delivery's own state semantics. This distinction is the basis for
§8–§9's conclusion.

## 5. Cardinality Analysis

- **Order → Required Delivery:** **1:N, INFERENCE from 0015/0016/0018**
  (multiple obligations logically permitted; each independently
  qualified). Not a new decision — reaffirmed, not re-litigated.
- **Required Delivery → Delivery (actual attempts):** **0:N.** Zero is
  possible (0016 §10 — unsatisfied, not forbidden, while unattempted);
  many is possible (0017 §7.10/0018 §7 — retries after `FAILED`/
  `CANCELLED`). Not all N need succeed; existential satisfaction (0017
  §5) requires only that at least one reach `COMPLETED`.
- **Delivery → Required Delivery:** **N:1, by the already-approved
  default (0018 §9).** Each actual Delivery record's satisfaction
  reference resolves to exactly one Required Delivery; many Delivery
  records may point at the same Required Delivery (retries), but no
  single Delivery record points at more than one by default.
- **Order → Delivery (direct):** **not a new relationship — derived/
  transitive only**, through Required Delivery, reinforced by the
  independent same-Order check already required at the satisfaction
  layer (0017 §7.1/§9). This record does not introduce a direct Order↔
  Delivery physical relationship distinct from what 0017 already implies;
  whether the eventual schema expresses this as one reference or two
  cross-validated ones is a physical decision, **DEFERRED**.

## 6. Required Delivery → Delivery Relationship

**APPROVED (consolidating §5):** one Required Delivery may be addressed
by zero, one, or many actual Delivery records over time; satisfaction is
reached the moment any one of them, correctly referencing that
requirement, reaches `COMPLETED` (0017 §5, 0018 §7). Earlier `FAILED`/
`CANCELLED` attempts against the same requirement neither block nor
require reconciliation with a later success (0018 §7, reaffirmed, not
re-decided here).

## 7. Delivery → Required Delivery Relationship

**APPROVED (consolidating §5):** each actual Delivery record, once it
carries a satisfaction reference, addresses **exactly one** Required
Delivery by default (0018 §9) — never several at once, absent a future,
separately-approved bundled-satisfaction model that this record does not
create or invite.

## 8. Partial Delivery Models

- **A. One Delivery record must represent complete delivery only.**
  **Supporting evidence:** 0011's `COMPLETED` definition (§4) is a
  binary, record-scoped success fact with no partial/percentage
  variant; 0017 §12's minimum rule already forbids partial credit.
  **Contradictions:** none found. **False-completion risk:** low — this
  model is the most conservative. **Implementation implications:** a
  Delivery record's status remains binary, consistent with 0011's
  existing five states. **Classification: INFERENCE**, necessarily
  following from 0011+0017 combined, not a new invention.
- **B. Multiple Delivery records may collectively (partially) satisfy
  one Required Delivery.** **Supporting evidence:** none found in
  0001–0019. **Contradictions:** conflicts directly with 0018 §9's
  already-approved one-record-to-one-requirement default, which was
  adopted specifically as the safeguard against exactly this kind of
  implicit, unapproved multi-record crediting. **False-completion risk:**
  high — would let several individually-incomplete attempts be silently
  summed into a completion no single record ever asserted. **Implementation
  implications:** would require a joint-coverage evaluation mechanism not
  approved anywhere. **Classification: PROPOSAL only, not adopted** —
  would require its own future, explicit decision, tied to whatever
  eventually resolves Delivery→Asset cardinality (0011).
- **C. Partial delivery is represented inside one Delivery record** (a
  percentage/partial sub-state). **Supporting evidence:** none.
  **Contradictions:** directly conflicts with 0011's closed, five-state
  approved list, and with this task's own explicit instruction not to
  introduce a new Delivery state. **False-completion risk:** N/A —
  rejected outright on process grounds, not risk grounds.
  **Classification: REJECTED**, not evaluated further.
- **D. Partial delivery is not modeled in V1 and cannot satisfy a
  requirement.** **Supporting evidence:** this is the necessary
  consequence of A + 0017 §12's minimum rule + 0018 §9's default — not a
  new position, but the sum of what 0011/0017/0018 already jointly
  establish. **Contradictions:** none. **False-completion risk:** none —
  it is the position that eliminates the risk Model B would introduce.
  **Implementation implications:** any real-world need for staged or
  multi-part delivery is expressed through **multiplicity of Required
  Delivery obligations** (§9), not through partial credit within one
  obligation. **Classification: APPROVED**, as the operative consolidation
  of already-approved material.
- **E. Another model directly supported by authoritative architecture.**
  **None found.**

## 9. Selected Model / Unresolved Model

**APPROVED — Model D is adopted as the operative Delivery partial-
completion model:** partial delivery, in the sense of a single Delivery
record only partly succeeding, or several records jointly summing to a
whole, is **not supported** by the approved architecture and is **not**
sufficient to satisfy a Required Delivery. A business need for delivering
distinct pieces of work separately (e.g., three separate deliverable
units) is already fully expressible today through **three separate
Required Delivery obligations** (0015 §19, 0016 §14, 0018 §5) — each
independently qualified, each independently satisfied by its own
`COMPLETED` Delivery record — with no partial-state concept required.

**Genuinely DEFERRED, and not resolved by adopting Model D:** whether a
*single* owed unit that is itself internally divisible (e.g., a batch of
100 items where only 60 were transmitted before the mechanism stopped)
can ever be recorded as that Delivery reaching `COMPLETED` at all. This
depends entirely on what "the content" a given Delivery record is
responsible for actually means — which is defined by the Required
Delivery it references, and that requirement's own conceptual identity/
description remains explicitly **DEFERRED** (0015 §7, 0016 §6). This
record does not, and cannot responsibly, resolve that deeper question
without first resolving 0015/0016's own open item — it is named here as
the precise blocking prerequisite, not worked around.

## 10. Retry / Failure / Cancellation

**Compatible with the approved satisfaction model, confirmed, no new
transition invented:** `FAILED` → a new Delivery record, and `CANCELLED`
→ a new Delivery record, are both already fully consistent with 0011 (no
`RETRY`/`REOPENED` state; a retry is an operational action that creates
an independent new row) and with 0017/0018's existential, multi-attempt
satisfaction model (§6). No automatic transition is introduced by this
record — a new attempt is always a deliberate, separately-triggered
action, never an automatic consequence of a prior `FAILED`/`CANCELLED`
row.

## 11. Order Completion Interaction

**No change to Decision Record 0012 is necessary or made.** "ALL
required Deliveries `COMPLETED`" in 0012's guard is, and remains, most
precisely expressed by 0018 §12's formula — evaluated per Required
Delivery obligation, not per raw Delivery row — and nothing in this
record's cardinality/partial-delivery findings contradicts that formula
or requires amending it. This record only clarifies *how* that formula
behaves under retries and multiplicity (§6, §7), which 0018 already
anticipated.

## 12. Approval Boundary

No Approval target type is resolved or invented here (0010, unchanged).
Approval and Delivery semantics are not merged: Approval's own
satisfaction model (0017 §8, 0018 §8) already applies its own analogous
existential/no-partial-credit logic independently, and needs no
Delivery-specific dependency introduced by this record beyond what
0017/0018 already state.

## 13. Historical Integrity

**Reaffirmed, unchanged from 0014 §14/0015 §16/0016 §10/0018 §16/0019
§11:** a Required Delivery's qualification remains anchored to the Order
Requirements Snapshot as captured; later Campaign, Brief, or Asset
changes do not silently add, remove, or redefine Delivery requirements.
Delivery cardinality/partial-delivery findings in this record do not
alter that principle.

## 14. Security Boundary

Unchanged from 0014 §20/0015 §23/0016 §17/0017 §17/0018 §18/0019 §13:
Required Deliveries and their satisfying Delivery records remain within
the Order's own tenant context. No RLS or authorization mechanism is
designed or implemented by this record.

## 15. Financial Separation

Unchanged from 0012 §12/0015 §24/0016 §18/0017 §18/0018 §19/0019 §14:
Delivery completion — whole or, per §9, never partial — does not
represent, and must not be used to infer, Payment, Revenue, Expense,
Profit, Refund, or Owner Settlement.

## 16. Rejected Alternatives

- Model B (joint/partial multi-record satisfaction) — rejected as
  default (§8); conflicts with 0018 §9's already-approved safeguard.
- Model C (an in-record partial/percentage sub-state) — rejected
  outright (§8); would require modifying 0011's closed state list and
  violates this task's explicit prohibition on new Delivery states.
- Treating `Delivery.COMPLETED` as asserting completeness of an
  aggregate, multi-record whole — rejected (§4); 0011 scopes it to the
  single record's own execution only.
- Inventing a `RETRY` or `REOPENED` state to represent repeated attempts
  — rejected (§10); the existing new-record convention already covers
  this.
- Resolving the deeper "internally divisible single obligation" partial-
  delivery question by inventing an answer — rejected (§9); named as
  DEFERRED and tied to its actual prerequisite (0015 §7/0016 §6) instead.
- Modifying Decision Record 0012's guard text — rejected (§11); no
  necessary dependency or contradiction was found.

## 17. Deferred Decisions

1. Whether a single, internally-divisible Required Delivery can ever be
   partially transmitted and still reach `COMPLETED` — blocked on 0015
   §7/0016 §6's still-open conceptual-identity/description question (§9).
2. Exact Delivery→Asset cardinality (0011, unchanged).
3. The physical mechanism by which a Delivery record's satisfaction
   reference identifies its Required Delivery (0017 §6/§13, unchanged).
4. Whether a future, explicitly-approved bundled/joint-satisfaction model
   (Model B) will ever be adopted, and its design if so (§8).
5. The physical representation of Order↔Required Delivery↔Delivery
   cardinality (§5) — no schema is decided here.
6. Decision Record 0010's Approval target-type set (unchanged, unrelated
   to this record's Delivery-specific findings beyond §12).
7. Exact tenant/RLS implementation (§14).

## 18. Final Recommendation

`Delivery.COMPLETED` is, and has always been per 0011's own text, a
record-scoped execution fact, not an aggregate completeness claim — this
record makes that reading explicit rather than changing it. Order→
Required Delivery is 1:N; Required Delivery→Delivery is 0:N with
existential satisfaction; Delivery→Required Delivery is N:1 under the
already-approved one-record-to-one-requirement default. Partial
delivery — whether within one record or jointly across several — is
**not modeled and cannot satisfy a requirement** (Model D); any
real-world need for staged/multi-part delivery is already served by
creating multiple, independent Required Delivery obligations rather than
by partial credit within one. Retries after `FAILED`/`CANCELLED` are
fully compatible with this model without any new state or automatic
transition. Decision Record 0012's guard requires no change. What
remains genuinely unresolved is narrower and more precise than before
this record: specifically, whether a single, internally-divisible
deliverable unit can itself be partially transmitted and still count —
a question that cannot be answered until the Required Delivery's own
conceptual description (0015 §7/0016 §6) is resolved, and which this
record deliberately does not anticipate.

## Consistency with Decision Records 0001–0019

- Consistent with 0001/0002: introduces no schema; adds no new
  approved entity or state.
- Consistent with 0003–0006, 0008, 0009: none is read by, or a source
  for, this record's conclusions.
- Consistent with 0007 (Order): no new Order schema or state.
- Consistent with 0010 (Approval): no target type resolved; no merge
  with Delivery semantics (§12).
- Consistent with 0011 (Delivery): no new state, no modified transition;
  §4's reading of `COMPLETED` is drawn directly from 0011's own text.
- Consistent with 0012 (Completion Guard): unmodified (§11).
- Consistent with 0013/0014 (Requirements gap, source of truth): does not
  contradict either.
- Consistent with 0015 (Snapshot content): reaffirms multiplicity as the
  mechanism for staged delivery (§9) without inventing new snapshot
  content.
- Consistent with 0016 (Qualification): reaffirms the no-record-means-
  unsatisfied rule (§6) without re-deciding it.
- Consistent with 0017 (Satisfaction): reaffirms the minimum anti-
  partial-credit rule (§8) and the one-requirement-per-reference
  discipline (§7) without re-deciding either.
- Consistent with 0018 (Cardinality/Completion Semantics): adopts and
  applies its one-record-to-one-requirement default (§7, §8) rather than
  reopening it.
- Consistent with 0019 (Zero-Requirement Semantics): unaffected; this
  record concerns populated requirements only.
- No Decision Record 0001–0019 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume `Delivery.COMPLETED` asserts completeness of anything
  beyond that single record's own execution (§4).
- Do not assume multiple Delivery records may jointly/partially satisfy
  one Required Delivery (Model B rejected, §8, §9).
- Do not assume a partial/percentage Delivery state has been introduced
  (Model C rejected, §8).
- Do not assume a single, internally-divisible Required Delivery's
  partial-transmission question has been resolved (§9, §17 item 1).
- Do not assume Delivery→Asset cardinality, the satisfaction-reference
  mechanism, or the Approval target-type set has been decided (§17).
- Do not assume Decision Record 0012 has been modified (§11).
- Do not assume any new Delivery state, transition, or automatic
  transition has been introduced (§10).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0019 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
