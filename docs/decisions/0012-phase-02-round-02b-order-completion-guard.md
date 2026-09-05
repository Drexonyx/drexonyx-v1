# Decision Record 0012 — Phase 02 Round 02B: Order `ACTIVE` → `COMPLETED` Guard

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0011. All remain authoritative and unchanged. This record resolves
  the specific deferred item named in Decision Record 0007 ("Exact
  `ACTIVE` → `COMPLETED` guard mechanics, pending Delivery and Approval
  state-machine design") using the now-approved Decision Record 0010
  (Approval) and Decision Record 0011 (Delivery).

## 1. Context

Decision Record 0007 approved the Order state machine (`ACTIVE`,
`COMPLETED`, `CANCELLED`) and named the `ACTIVE` → `COMPLETED` transition
guard as dependent on Delivery and Approval conditions, deferring the
exact mechanics because neither entity had a state machine yet. Decision
Record 0010 has since defined Approval (`PENDING`, `APPROVED`,
`REJECTED`, `CANCELLED`, `EXPIRED`) without finalizing its target model.
Decision Record 0011 has since defined Delivery (`PREPARING`, `SENDING`,
`COMPLETED`, `FAILED`, `CANCELLED`) without finalizing its cardinality
against Order/Asset. This record combines 0007, 0010, and 0011 to resolve
what can now be resolved about the guard, and to state precisely what
still cannot be resolved without inventing requirements that no approved
record has established.

## 2. Problem

"Delivery/Approval conditions must be satisfied" (0007) is not an
implementable guard on its own. This record must state exactly which
Delivery-side fact and which Approval-side fact the guard checks, whether
both are required or either alone suffices, and must do so without
assuming values for the Approval target model (0010, still open) or the
Delivery cardinality model (0011, still open) that have not been decided.

## 3. Approved Guard Structure

**The `ACTIVE` → `COMPLETED` guard is a conjunction. Both a Delivery-side
condition and an Approval-side condition must hold simultaneously.
Neither condition alone is sufficient.**

This reading is taken directly from 0007's own guard text — "required
Delivery/Approval conditions must be satisfied" names both entities as
conditions (plural) that must be satisfied (plural), not alternatives —
and is reinforced by 0010 and 0011 each independently naming the other as
a co-dependency rather than a substitute (0010 §"Order Completion": "the
relationship to Delivery completion"; 0011 §17: "Decision Record 0007
identified Delivery **and** Approval as dependencies").

## 4. Delivery-Side Condition — Candidate Formulations Considered

Without assuming any of the following, the candidates evaluated against
0011 are:

- **Option A — "Any Delivery completed":** at least one Delivery record
  associated with the Order has reached `COMPLETED`, regardless of how
  many other Deliveries exist or what state they are in.
- **Option B — "All Deliveries completed":** every Delivery record
  associated with the Order has reached `COMPLETED`; none remain
  `PREPARING`/`SENDING`, and none are `FAILED`/`CANCELLED`.
- **Option C — "Designated final Delivery completed":** a specific
  Delivery record (e.g., most recent, or one flagged as authoritative)
  has reached `COMPLETED`, independent of the state of earlier Delivery
  records.
- **Option D — "Full Asset coverage":** every deliverable Asset required
  by the Order is covered by some `COMPLETED` Delivery (a coverage
  condition rather than a Delivery-record-count condition).
- **Option E — "Delivery not required":** some Orders may complete
  without any Delivery record at all (e.g., non-deliverable engagement
  types), making the Delivery-side condition vacuously true for those
  Orders.

**Evaluation:** Option A is rejected — it would allow an Order to
complete while a later or parallel Delivery for the same Order is still
outstanding or has failed, which contradicts 0011's own terminal-state
discipline (a `FAILED` Delivery for still-owed content cannot be silently
ignored). Option C is rejected — 0011 defines no "authoritative Delivery"
flag or designation mechanism; inventing one here would exceed this
record's scope. Option D is rejected as the operative formulation — it
requires an Asset ↔ Delivery cardinality that 0011 §16 explicitly leaves
**DEFERRED**; it is retained as a description of the outcome the guard
should approximate once that cardinality exists, not as an implementable
rule today. Option E is rejected as a default — 0007 does not identify
any Order category exempt from the Delivery dependency, and inventing
such a category is out of scope. Option B is the closest fit: it is the
only formulation that does not require deciding cardinality, partial-
delivery, or Asset-coverage rules that 0011 leaves open, because "all"
degrades correctly to a single record when only one exists.

## 5. Delivery-Side Condition — Resolution

**Resolved:** the Delivery-side condition is a coverage condition —
*every Delivery record required for the Order has reached `COMPLETED`,
and none required for the Order remains non-terminal (`PREPARING`,
`SENDING`) or has terminated as `FAILED` or `CANCELLED` while still
required.*

**Not resolved by this record** (inherited unchanged from 0011, not
newly deferred here): which Deliveries are "required for the Order" in
the first place. That enumeration depends on the still-open Delivery →
Order/Asset cardinality, multiplicity, and partial-delivery rules (0011
§15, §16, §22 items 1–3). This record supplies the *rule shape*
("required-and-complete, none-outstanding"); it does not supply the
*membership test* ("which Deliveries count as required"), because no
approved record has defined that test.

## 6. Approval-Side Condition — Target Model Status

Decision Record 0010 leaves the approvable target model, `target_type`
values, and target cardinality **unresolved** (0010 §"Target Model").
This record cannot name a specific Approval `target_type` (e.g. "Order
Approval" vs. "Delivery Approval" vs. "Final Client Approval") as the one
that gates Order completion, because no such target type has been
approved to exist. Doing so here would invent a target-model decision
that belongs to Decision Record 0010's own deferred scope, not to this
guard record.

## 7. Approval-Side Condition — Resolution

**Resolved (shape only, mirroring §5):** the Approval-side condition is
a coverage condition — *every Approval record required for the Order has
reached `APPROVED`, and none required for the Order remains `PENDING`, or
has terminated as `REJECTED`, `CANCELLED`, or `EXPIRED` while still
required.*

**Not resolved by this record:** which Approval target(s) are "required
for the Order," how many are required, and whether "required" is
evaluated directly against the Order or transitively through an
Order-related target (e.g. a Delivery or a final deliverable). This
remains dependent on 0010's still-open target model and is not newly
invented or narrowed here.

## 8. Formal Guard Statement

```
Order.status: ACTIVE -> COMPLETED is permitted only if:

  (a) DELIVERY CONDITION
      For every Delivery record required for this Order:
        Delivery.status = COMPLETED
      AND no Delivery record required for this Order is in
        PREPARING, SENDING, FAILED, or CANCELLED

  AND

  (b) APPROVAL CONDITION
      For every Approval record required for this Order:
        Approval.status = APPROVED
      AND no Approval record required for this Order is in
        PENDING, REJECTED, CANCELLED, or EXPIRED

Both (a) and (b) must hold. Neither alone is sufficient.
"Required for this Order" in both (a) and (b) is not defined by this
record — see §5 and §7.
```

This statement is descriptive of the guard's logic, not an implemented
`CHECK` constraint, trigger, or application-code guard. No database
object, migration, or code is created by this record.

## 9. Why Conjunction, Not Disjunction

An Order could reach `COMPLETED` under a disjunctive ("Delivery OR
Approval") reading with only one side satisfied, which would let an
Order complete despite content never having been delivered (Approval
alone) or despite content having been delivered without ever having been
formally accepted (Delivery alone). 0007 pairs the two as joint
dependencies, not alternatives, and neither 0010 nor 0011 describes
either entity as capable of independently discharging the other's
concern. Conjunction is therefore the only reading consistent with all
three records.

## 10. Explicitly Rejected Sufficient-Alone Conditions

None of the following, alone, is sufficient for Order `ACTIVE` →
`COMPLETED`:

- **Payment `PAID` alone** — Payment is a separate concern from Order
  fulfillment (0007 §"Payment Separation"; 0007 §"Payment / Production
  Eligibility Rule"). A paid, undelivered Order must not complete.
- **Production Job `COMPLETED` alone** — Production Job's `COMPLETED`
  means execution finished, not that QC, Approval, or Delivery occurred
  (0008 §"State Definitions": "`COMPLETED` does not mean QC passed").
- **AI Generation `SUCCEEDED` alone** — governs a single generation
  attempt only, several layers below Order (0009).
- **QC Review `PASS` alone** — QC passing does not imply client
  acceptance or delivery (0010 §"QC Separation": QC `PASS` with Approval
  `PENDING` or `REJECTED` are both valid simultaneous states).
- **Client Preview alone** — Campaign's `CLIENT_PREVIEW` state (0003) is
  a Campaign-narrative marker, not a completion fact for Order.
- **Asset `CLIENT_PREVIEW` alone** — an Asset-level state (0006); does
  not represent formal Approval or Delivery.
- **Campaign `DELIVERY` alone** — Campaign's `DELIVERY` state (0003)
  indicates the Campaign has entered its delivery phase narratively; it
  does not report that any specific Delivery record reached `COMPLETED`.
- **Delivery `COMPLETED` alone (if Approval is required)** — satisfies
  only condition (a) in §8; without (b), the guard is not met.
- **Approval `APPROVED` alone (if Delivery is required)** — satisfies
  only condition (b) in §8; without (a), the guard is not met.

## 11. Order Cancellation Boundary

This record does not alter Decision Record 0007's `ACTIVE` →
`CANCELLED` transition or its guard ("business decision / authorized
actor," actor/authorization still **DEFERRED**). Specifically:

- Delivery `FAILED` does **not** automatically transition Order to
  `CANCELLED`. It only means condition (a) in §8 is not met, so
  `ACTIVE` → `COMPLETED` is blocked; the Order remains `ACTIVE`.
- Approval `REJECTED`, `CANCELLED`, or `EXPIRED` does **not**
  automatically transition Order to `CANCELLED`, for the same reason —
  it blocks condition (b), it does not trigger cancellation.
- No automatic cascade from a Delivery or Approval terminal-failure state
  into Order `CANCELLED` is created by this record. Any decision to
  cancel an Order after such a failure remains the separate, still-
  deferred, authorized-actor decision governed by 0007.

## 12. Financial Separation

Consistent with 0001, 0002, 0007, 0008, 0009, 0010, and 0011: the guard
defined here is a fulfillment-completeness check only. It does not read,
write, or imply Payment status, Revenue, Provider Credit, Order Budget,
Profit, Distributable Profit, Reserve, or Owner Settlement, and none of
those systems are permitted to infer their own state from Order
`COMPLETED`. Order `COMPLETED` is not, and does not trigger, a financial
event.

## 13. Campaign `CLOSED` Non-Linkage

Consistent with 0007 §"Campaign Relationship" and 0011 §11: Order
`COMPLETED` does not automatically set Campaign `CLOSED`. Decision
Record 0003's Campaign state machine is unmodified. Whether/how Campaign
`CLOSED` depends on its Orders' completion remains **DEFERRED**, exactly
as it was before this record (0007 deferred item 3; 0011 deferred item
11).

## 14. Concurrency (Unimplemented, Recorded as a Requirement)

Evaluating the guard requires reading potentially-changing Delivery and
Approval rows; concurrent updates (e.g., a Delivery completing while an
Approval is simultaneously rejected) could race against a guard
evaluation. This is recorded as a requirement for the eventual
implementation to address (e.g., via transactional evaluation or
row-level locking) and is **not** designed, implemented, or decided by
this record.

## 15. Idempotency (Unimplemented, Recorded as a Requirement)

Repeated or duplicate guard-evaluation triggers (e.g., a Delivery
completion callback firing twice) must not cause the guard to be
evaluated or applied inconsistently, and Order `COMPLETED` must not be
set more than once with divergent side effects. This is recorded as a
requirement only, consistent with the idempotency requirements already
recorded in 0009 and 0010. No idempotency mechanism is designed or
implemented here.

## 16. Authorization (Unimplemented, Recorded as a Requirement)

This record does not decide who or what is permitted to trigger guard
evaluation, whether evaluation is automatic (event-driven) or on-demand,
or what actor (if any) is authorized to force Order `COMPLETED` outside
the guard. These remain **DEFERRED**, consistent with 0007's own
deferral of `ACTIVE` → `CANCELLED` actor/authorization.

## 17. Non-Interference with Adjacent Entities

- **Order Budget:** unaffected; Order `COMPLETED` does not represent
  budget health, profit, or remaining budget (0007 §"Order Budget
  Relationship", unchanged).
- **Production Job / AI Generation:** the guard does not read Production
  Job or AI Generation status directly; Delivery and Approval are the
  only two conditions in §8. A Production Job may be `COMPLETED` or
  `FAILED` independent of the guard's outcome (0008, 0009 unchanged).
- **QC Review:** the guard does not read QC verdicts directly. QC's
  influence on Order completion, if any, is mediated entirely through
  whether it causes Approval to reach `APPROVED` or `REJECTED` — QC
  itself is not a term in the guard (0010 §"QC Separation" unchanged).
- **Asset:** the guard does not read Asset status directly; Asset's
  relationship to the guard is mediated entirely through Delivery (0011
  §9, unchanged).

## 18. Rejected Alternatives

- A disjunctive ("Delivery OR Approval") guard — rejected in §9.
- Naming a specific Approval `target_type` as the completion-gating
  target — rejected in §6 (would invent an 0010 target-model decision).
- Naming a specific Delivery-to-Asset or Delivery-to-Order cardinality
  rule (Options A, C, D in §4) — rejected in §4 (would invent an 0011
  cardinality decision).
- Treating Delivery `COMPLETED` or Approval `APPROVED` as independently
  sufficient — rejected in §10.
- Automatic Order `CANCELLED` on Delivery `FAILED`/`CANCELLED` or
  Approval `REJECTED`/`CANCELLED`/`EXPIRED` — rejected in §11.
- Automatic Campaign `CLOSED` on Order `COMPLETED` — rejected in §13.
- Any financial side effect triggered by the guard — rejected in §12.
- Designing concurrency, idempotency, or authorization mechanics as part
  of this record — rejected in §§14–16 (recorded as requirements only).

## 19. Deferred Items

The following remain explicitly unresolved after this record and must
not be treated as decided:

1. Which Delivery records are "required for the Order" (depends on
   0011's still-open Delivery cardinality/partial-delivery model).
2. Which Approval records are "required for the Order," including the
   exact target(s) they must decide on (depends on 0010's still-open
   target model).
3. The number of required Deliveries and Approvals per Order.
4. Whether every Order requires at least one Delivery and at least one
   Approval, or whether some Order categories are exempt.
5. Whether the guard is evaluated automatically (event-driven, e.g. on
   every Delivery/Approval state change) or on-demand.
6. Concurrency handling for guard evaluation (§14).
7. Idempotent application of the guard's result (§15).
8. Authorization for who/what may trigger guard evaluation or force
   completion outside it (§16).
9. Whether Campaign `CLOSED` will ever depend on Order `COMPLETED`
   (0007 deferred item 3; 0011 deferred item 11 — unchanged).
10. Exact database implementation of the guard (query, trigger,
    application-layer check, or otherwise).
11. Exact tenant/RLS implementation for any guard-evaluation query.

## 20. Consequences

This design:

- Gives the `ACTIVE` → `COMPLETED` transition a precise, implementable
  logical shape (conjunction of two coverage conditions) without waiting
  for the Approval target model or Delivery cardinality model to be
  finalized.
- Prevents any single upstream entity (Payment, Production Job, AI
  Generation, QC, Asset, Campaign) from being mistaken for a sufficient
  completion signal.
- Keeps Order cancellation a separate, non-automatic decision from
  Delivery/Approval failure, preserving 0007's existing cancellation
  guard as-is.
- Keeps the guard financially inert and Campaign-inert, preserving the
  separations established in 0001, 0002, 0003, 0007, and 0011.
- Leaves membership ("which records are required") explicitly open,
  because closing it would require deciding the Approval target model
  (0010) or the Delivery cardinality model (0011) — decisions this
  record has no mandate to make.
- Once the target model and cardinality model are each decided, this
  record's §8 formal statement is expected to remain unchanged; only the
  "required for this Order" membership test needs to be filled in.

## 21. Consistency with Decision Records 0001–0011

- Consistent with 0001/0002: UUID identity, tenant scoping via
  `organization_id` and the composite-FK pattern (D1), `TEXT`+`CHECK`
  state representation (D8), and all financial separations (Payment ≠
  Revenue, Provider Credit ≠ Cash, Order Budget ≠ Profit, Profit ≠ Owner
  Settlement) — unchanged, and extended here to the guard itself (§12).
- Consistent with 0003 (Campaign): does not redefine `DELIVERY` or
  `CLOSED`, and does not create an automatic `COMPLETED` → `CLOSED` link
  (§13).
- Consistent with 0006 (Asset): does not read Asset state directly in
  the guard (§17); Asset's role remains mediated through Delivery.
- Consistent with 0007 (Order): implements exactly the guard 0007 named
  and deferred ("required Delivery/Approval conditions must be
  satisfied"); does not modify Order's approved states, transitions, or
  its separate `ACTIVE` → `CANCELLED` guard (§11).
- Consistent with 0008 (Production Job) and 0009 (AI Generation): the
  guard does not read either directly (§17), and their respective
  `COMPLETED`/`SUCCEEDED` states continue to not imply QC, Approval, or
  Delivery outcomes.
- Consistent with 0010 (Approval): does not resolve the target model
  (§6), does not add Order-mirrored states to Approval, and treats
  `APPROVED` as necessary-but-not-solely-sufficient per 0010's own
  framing of Approval as a guard dependency rather than the guard itself.
- Consistent with 0011 (Delivery): does not resolve cardinality (§5),
  does not treat Delivery `COMPLETED` as automatically implying Order
  `COMPLETED` (0011 §10, §17 unchanged), and reuses exactly the
  Delivery-side fact 0011 §17 identified ("whether a Delivery associated
  with the Order has reached `COMPLETED`") as the basis for condition
  (a) in §8.
- No Decision Record 0001–0011 is modified, reinterpreted, or superseded
  by this record.

## 22. Explicitly Prohibited Assumptions

- Do not assume the guard is satisfied by either condition (a) or (b) in
  §8 alone; both are required.
- Do not assume any of the conditions listed in §10 is, by itself,
  sufficient for Order `COMPLETED`.
- Do not assume which specific Delivery records or Approval records
  count as "required for the Order" — that membership test is not
  defined by this record (§5, §7, §19 items 1–2).
- Do not assume a specific Approval `target_type` has been chosen for
  Order-completion purposes (§6).
- Do not assume a specific Delivery → Order or Delivery → Asset
  cardinality has been chosen (§4, §5).
- Do not assume Delivery `FAILED`/`CANCELLED` or Approval
  `REJECTED`/`CANCELLED`/`EXPIRED` automatically cancels the Order (§11).
- Do not assume Order `COMPLETED` triggers, implies, or infers any
  financial event (§12).
- Do not assume Order `COMPLETED` automatically sets Campaign `CLOSED`
  (§13).
- Do not assume concurrency, idempotency, or authorization for guard
  evaluation have been designed or implemented (§14–§16).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0011 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.

## 23. Summary of Resolution vs. Remaining Ambiguity

**Resolved by this record:** the guard is a conjunction of a Delivery
coverage condition and an Approval coverage condition (§3, §8); the
qualitative shape of each condition (§5, §7); the explicit rejection of
every single-entity signal listed in §10 as independently sufficient;
the non-automatic relationship between Delivery/Approval failure and
Order cancellation (§11); the guard's financial and Campaign inertness
(§12, §13).

**Not resolved by this record, and not invented:** the exact membership
test for "required" Deliveries and Approvals, which depends entirely on
Decision Record 0010's still-open Approval target model and Decision
Record 0011's still-open Delivery cardinality model (§19, items 1–4).
This record supplies the guard's shape; it deliberately does not fill in
the two open models that a complete implementation would still need.
