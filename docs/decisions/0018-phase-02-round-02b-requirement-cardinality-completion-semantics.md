# Decision Record 0018 — Phase 02 Round 02B: Requirement Cardinality and Completion Semantics

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the architectural/logical level only. No
  field, table, migration, target type, or physical cardinality is
  approved by this record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0017. All remain authoritative and unchanged. This record
  consolidates and completes the logical multiplicity/cardinality
  questions Decision Records 0011, 0015, 0016, and 0017 each partially
  addressed but never jointly resolved into a single completion formula.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service and
Package remain **UNVERIFIED** as entities, unchanged from 0013–0017.

## 1. Context

Decision Record 0016 established qualification (snapshot membership).
Decision Record 0017 established satisfaction (a correctly-referencing
Delivery/Approval record reaching its terminal-success state) and its
anti-ambiguity rule (a reference must resolve to exactly one
requirement), but left "can one record satisfy multiple requirements"
explicitly **DEFERRED**. Neither record stated, as a single formal
formula, how per-requirement satisfaction (§ singular) combines into
per-side completion (§ plural, "ALL required X") for Decision Record
0012's guard. This record supplies that formula and closes the one
default question 0017 left open, without touching physical schema.

## 2. Problem

Decision Record 0012's guard uses "ALL required Deliveries `COMPLETED`"
and "ALL required Approvals `APPROVED`" as if these were self-evidently
well-formed once individual requirements and individual satisfactions
exist. They are not, without three additional rules: (a) how multiple
requirements on one side combine (AND vs. OR), (b) how multiple attempts
against one requirement combine, and (c) whether one attempt may be
credited against more than one requirement. This record states all
three, plus the treatment of an unattempted requirement, without
resolving any of the physical-cardinality questions 0010/0011 still
leave open.

## 3. Approved Inputs

- **0011 (Delivery):** only `COMPLETED` represents success; no `RETRY`
  state; retries are new rows; Delivery→Asset cardinality DEFERRED.
- **0010 (Approval):** only `APPROVED` represents success; no `RETRY`/
  `REVISION` state; target-type set DEFERRED.
- **0012 (Guard):** `ALL required Deliveries COMPLETED AND ALL required
  Approvals APPROVED`; failure/cancellation non-cancelling, financially
  inert; unchanged by this record.
- **0015:** multiple obligations per side are logically permissible;
  zero-requirement legitimacy DEFERRED.
- **0016:** qualification = snapshot membership; independent of
  satisfaction; existing obligations are not erased by failure.
- **0017:** satisfaction = a correctly-referencing record reaching
  `COMPLETED`/`APPROVED`; existential per requirement (at least one
  qualifying record suffices); reference must resolve to exactly one
  requirement; one-record-to-multiple-requirements left **DEFERRED**
  (0017 §10, §21 item 4) — the specific gap this record closes (§9).

## 4. Logical Multiplicity

**APPROVED (consolidating 0015 §19/0016 §14, not re-litigating):** the
Order Requirements Snapshot's Required Delivery and Required Approval
sets are **collections**, not single values. Nothing approved in
0001–0017 limits either set to exactly one member. This record proceeds
on that basis without deciding physical bounds (minimum, maximum, or
exact count), which remain governed by Decision Records 0010/0011,
unchanged.

## 5. Multiple Required Deliveries

**APPROVED:** an Order may logically contain Required Delivery A,
Required Delivery B, Required Delivery C, ... as independent obligations,
each separately qualified (0016 §4) and each separately requiring its own
satisfaction (0017 §7). **ALL such obligations must be satisfied before
the Delivery side of the guard is satisfied** — **AND semantics**,
justified directly by Decision Record 0012's own wording ("ALL required
Deliveries `COMPLETED`"), which is explicitly universal, not existential,
over the required set. **OR semantics (satisfying any one obligation
excuses the others) is rejected** — nothing in 0012 or any later record
suggests obligations are alternatives to one another, and treating three
independently-qualified obligations as interchangeable would silently
under-deliver relative to whatever business fact placed three obligations
in the snapshot rather than one.

## 6. Multiple Required Approvals

**APPROVED, by identical reasoning to §5:** an Order may logically
contain multiple independent Required Approval obligations; **ALL must
reach satisfaction** (AND semantics) before the Approval side of the
guard is satisfied, for the same reason 0012's wording is universal, not
existential. OR semantics is rejected for the same reason as §5.

## 7. Multiple Actual Deliveries

**Scenario:** one Required Delivery; Delivery attempt 1 → `FAILED`;
attempt 2 → `CANCELLED`; attempt 3 → `COMPLETED`.

**APPROVED conclusion:** the requirement **is** ultimately satisfied,
because satisfaction is existential per requirement (0017 §7.10) — "at
least one correctly-referencing Delivery reaches `COMPLETED`," not "the
first attempt" or "every attempt." Attempts 1 and 2 do not block, negate,
or need to be reconciled with attempt 3's success; they simply never
counted (0011: `FAILED`/`CANCELLED` are terminal for that row only, no
`RETRY` state; 0017 §7.4/§7.5: neither satisfies, but neither removes the
requirement either). Decision Record 0011 is not altered — no retry state
is introduced; this is only the read-side conclusion given three already-
approved, independent Delivery rows.

## 8. Multiple Actual Approvals

**Scenario:** one Required Approval; attempt 1 → `REJECTED`; attempt 2 →
`EXPIRED`; attempt 3 → `APPROVED`.

**APPROVED conclusion, by identical reasoning to §7:** the requirement is
ultimately satisfied by attempt 3. Decision Record 0010 is not altered —
no `RETRY` or `REVISION` state is introduced on Approval; each attempt is
already, per 0010's own approved design, a separate Approval record, and
satisfaction (0017 §8.10) is existential over those records.

## 9. One Record → Multiple Requirements

**Question left DEFERRED by 0017 §10/§21 item 4; resolved here as a
default, per this task's explicit instruction to determine the safest
logical default without inventing a physical uniqueness constraint.**

**Analysis:** if one actual Delivery record could satisfy more than one
Required Delivery at once (e.g., a single Delivery discharging both
Required Delivery A and Required Delivery B), then completing one
physical handoff would silently close obligations the snapshot (0015)
recorded as independent facts — obligations placed there, by
construction (0014 §13, 0015 §6), because the upstream commercial scope
identified them as distinct. Allowing implicit multi-requirement credit
would let an Order reach `COMPLETED` while under-delivering relative to
whatever distinct scope those separate obligations represented — the
exact **false-completion risk** the task asks this record to guard
against.

**APPROVED default:** *by default, one actual Delivery (or Approval)
record's satisfying reference resolves to, and satisfies, exactly one
Required Delivery (or Required Approval).* Many-records-to-one-
requirement is approved (§7, §8 — retries); **one-record-to-many-
requirements is not adopted as the default** and does not occur unless a
future, separately-and-explicitly-approved bundled/joint-satisfaction
model says otherwise — such a model would itself depend on the still-
open Delivery→Asset/partial-delivery cardinality resolution (0011) and
is not designed or invited by this record. This default is a logical
rule, not a uniqueness constraint on any physical schema — its eventual
enforcement mechanism remains **DEFERRED**.

## 10. No Actual Record

**APPROVED, exactly as instructed — a definite rule, not a business
judgment call:** if a Required Delivery exists in the snapshot and no
Delivery record yet references it, that Required Delivery is
**UNSATISFIED**. If a Required Approval exists and no Approval record yet
references it, that Required Approval is **UNSATISFIED**. Absence of a
record is never treated as vacuous satisfaction. This is a distinct
question from whether the required *set itself* may legitimately be
empty (§ zero-requirement question, unchanged **DEFERRED** per 0016
§13/0015 §20) — this record addresses only the case where a qualified
obligation *exists* but has *no* satisfying evidence yet, which is always
and unambiguously unsatisfied, never subject to the vacuous-truth
reasoning that applies only to an empty required set.

## 11. Failure / Cancellation

**APPROVED (consolidating 0011, 0010, 0012 §11, 0017 §14 — not
re-deciding):**

- Delivery: `FAILED ≠ SATISFIED`, `CANCELLED ≠ SATISFIED`.
- Approval: `REJECTED ≠ SATISFIED`, `CANCELLED ≠ SATISFIED`,
  `EXPIRED ≠ SATISFIED`.
- None of these outcomes removes the underlying Required Delivery/
  Approval (0016 §6.5/§7.5, 0017 §7.9/§8.9).
- None of these outcomes automatically cancels the Order (0012 §11,
  reaffirmed).
- None of these outcomes triggers a financial consequence (§19).

## 12. Satisfaction Formula

**APPROVED — the formal statement this record exists to supply:**

```
Delivery side satisfied :=
  FOR EACH Required Delivery D in Order's Requirements Snapshot:
    EXISTS a Delivery record R such that
      R.order = D.order                      (§ Order boundary, §17)
      AND R correctly references D            (§ exactly one, §9)
      AND R.status = COMPLETED

Approval side satisfied :=
  FOR EACH Required Approval A in Order's Requirements Snapshot:
    EXISTS an Approval record R such that
      R.order = A.order
      AND R correctly references A
      AND R.status = APPROVED

Order eligible for ACTIVE -> COMPLETED :=
  Delivery side satisfied AND Approval side satisfied
```

This is a restatement, in the now-complete qualification/satisfaction/
cardinality vocabulary, of exactly Decision Record 0012's own formula —
**0012 is not changed.** The inner "FOR EACH ... EXISTS" structure is the
precise logical shape implied by combining AND-across-requirements (§5,
§6) with existential-per-requirement satisfaction (§7, §8, 0017 §5).

**Zero-requirement ambiguity:** if a required set (Delivery or Approval)
is legitimately empty, "FOR EACH ... EXISTS" is vacuously true over that
side (an ordinary logical fact, **INFERENCE**, not a business rule).
Whether an Order may legitimately have such an empty set at all remains
**DEFERRED**, unchanged from 0015 §20/0016 §13 — this record does not
resolve that business question, only restates its logical consequence
for the formula, as instructed.

## 13. Order Completion Relationship

The chain, preserved without collapsing layers, now with §12's formula
inserted at the appropriate layer:

```
Order Requirements Snapshot
        |
Required Deliveries / Required Approvals        (Qualification — 0016)
        |
Satisfaction Relationships                       (0017)
        |
Per-side "FOR EACH ... EXISTS" evaluation         (this record, §12)
        |
Order Completion Guard (Decision Record 0012, unchanged)
        |
Order.COMPLETED
```

## 14. Partial Delivery Boundary

**Not resolved here, per explicit instruction.** The only rule this
record states: **a Required Delivery cannot be satisfied by incomplete
Delivery work** — restated unchanged from 0017 §12; a Delivery record
that has not itself reached `COMPLETED` never satisfies, however much of
the underlying work is done. Whether a future partial-delivery model
(joint coverage across several Deliveries, or partial credit toward one
requirement) is ever approved, and how it would interact with the
satisfaction formula in §12, remains **DEFERRED**, tied to Decision
Record 0011's own still-open partial-delivery resolution.

## 15. Retry / Revision

**Reaffirmed, unchanged from 0017 §11:** Production Job retry (new
Production Job row, 0008), AI Generation retry (new AI Generation row,
0009), and Asset revision (new Asset row, 0006) are each already-approved
new-record conventions; none of them is a Delivery or Approval record,
and none of them directly satisfies an Order requirement. Only an actual
Delivery reaching `COMPLETED`, or an actual Approval reaching `APPROVED`,
counts in §12's formula.

## 16. Historical Integrity

**Reaffirmed, unchanged from 0014 §14/0015 §16/0016 §10/0017 §15:**
Required Deliveries and Required Approvals remain anchored to the Order
Requirements Snapshot as captured (and only as later amended through a
still-undesigned controlled mechanism, 0015/0016). Actual Delivery and
Approval records supply satisfaction evidence only — per §12's formula,
they are read as inputs to "EXISTS," never as a source that creates or
removes a "FOR EACH" member. A later change to Campaign, Brief, Asset, or
upstream commercial configuration does not silently add or remove a
requirement.

## 17. Order Boundary

**Reaffirmed, unchanged from 0017 §9, now embedded directly in §12's
formula** (`R.order = D.order` / `R.order = A.order`): an actual Delivery
or Approval belonging to a different Order can never satisfy this
Order's requirement. This record does not design RLS or a database
constraint to enforce it — it is stated as a mandatory precondition of
the "EXISTS" clause itself.

## 18. Security Boundary

Unchanged from 0014 §20/0015 §23/0016 §17/0017 §17: evaluation of §12's
formula occurs within the Order's own tenant context; one Organization's
requirements/satisfaction data must never be observable or alterable
from another Organization's context. Client-facing access must be
server-authorized. No RLS or authorization mechanism is designed or
implemented by this record.

## 19. Financial Separation

Unchanged from 0012 §12/0015 §24/0016 §18/0017 §18: the cardinality and
completion semantics defined here do not represent, and must not be used
to infer, Payment, Revenue, Expense, Profit, Reserve, or Owner
Settlement, and do not trigger any financial event.

## 20. Rejected Alternatives

- OR semantics across multiple Required Deliveries or multiple Required
  Approvals (satisfying one excuses the rest) — rejected (§5, §6); not
  supported by Decision Record 0012's universal ("ALL") wording.
- Treating the first or the most recent attempt, rather than existential
  "at least one `COMPLETED`/`APPROVED`," as the satisfaction rule for
  multiple attempts — rejected (§7, §8); inconsistent with 0017 §7.10/
  §8.10's existential framing.
- Adopting one-record-to-many-requirements as the default — rejected
  (§9); identified as the specific false-completion risk this record
  exists to close off.
- Treating an unattempted (record-less) requirement as vacuously
  satisfied — rejected (§10); explicitly distinguished from the separate,
  still-open, empty-required-set question.
- Introducing a `RETRY` state on Delivery or a `RETRY`/`REVISION` state
  on Approval to explain multiple attempts — rejected (§7, §8); both
  already handled by the existing new-record convention (0010, 0011).
- Resolving the empty-required-set business question, the partial-
  delivery model, or the Approval target-type set to make §12's formula
  fully concrete — rejected; all three remain named, unresolved
  dependencies (§12, §14, and 0016/0017's own deferrals).

## 21. Deferred Decisions

1. Whether an Order may legitimately have zero Required Deliveries and/or
   zero Required Approvals (0015 §20/0016 §13, unchanged; restated in
   §12).
2. Decision Record 0011's partial-delivery model and its eventual
   interaction with §12's formula (§14).
3. Decision Record 0010's Approval target-type set (unchanged; still
   blocks the physical "correctly references" mechanism in §12).
4. The physical mechanism enforcing the one-record-to-one-requirement
   default in §9 (a logical default only, not a schema decision).
5. Whether a future, explicitly-approved bundled/joint-satisfaction model
   could ever override the §9 default, and its design if so.
6. Exact Delivery→Asset and Delivery→Order cardinality (0011, unchanged).
7. Exact physical database representation of the requirement/satisfaction
   relationships and the §12 formula's evaluation (query, trigger, or
   application logic).
8. Exact tenant/RLS implementation (§18).
9. The scope-expansion/reduction amendment mechanism (0015/0016,
   unchanged) and its effect on already-recorded satisfaction (0017
   §19, unchanged).

## 22. Final Recommendation

Multiple Required Deliveries and multiple Required Approvals are
logically valid per Order; each is an independent obligation, and **ALL**
must be satisfied (AND, never OR) before its respective side of the
guard is satisfied. Multiple actual Delivery or Approval attempts against
one requirement are logically valid; satisfaction is existential — one
successful (`COMPLETED`/`APPROVED`) correctly-referencing record is
sufficient regardless of how many failed/cancelled/rejected/expired
attempts preceded it, and none of those failed attempts removes the
requirement. By default, one actual record satisfies exactly one
requirement — the safest choice against false completion, given that
0001–0017 provide no basis for treating a bundled multi-requirement
satisfaction as approved. A requirement with no actual record at all is
unambiguously unsatisfied, never vacuously completed. The full
satisfaction formula (§12) restates, without altering, Decision Record
0012's own guard in this now-complete vocabulary. What remains
unresolved (§21) is exclusively physical: the Approval target-type set,
Delivery cardinality/partial-delivery semantics, the reference
enforcement mechanism, and whether zero-requirement Orders are ever
legitimate — none of which this record invents an answer for.

## Consistency with Decision Records 0001–0017

- Consistent with 0001/0002: introduces no schema; does not add Service
  or Package to the approved entity list.
- Consistent with 0003/0004 (Campaign, Brief): neither is read by, or
  involved in, cardinality/completion semantics.
- Consistent with 0005 (Quote): unaffected.
- Consistent with 0006 (Asset), 0008 (Production Job), 0009 (AI
  Generation): their new-record-per-retry/revision conventions are
  reaffirmed, not altered (§15).
- Consistent with 0007 (Order): Order remains the tenant/scope anchor;
  no new Order schema or state is introduced.
- Consistent with 0010 (Approval): no `RETRY`/`REVISION` state
  introduced (§8); target-type set not resolved (§21 item 3).
- Consistent with 0011 (Delivery): no `RETRY` state introduced (§7);
  cardinality/partial-delivery not resolved (§14, §21 items 2, 6).
- Consistent with 0012 (Completion Guard): §12's formula is a restatement
  of 0012's own guard, not a modification of it.
- Consistent with 0013/0014 (Requirements gap, source of truth): does not
  contradict either.
- Consistent with 0015 (Snapshot content): reaffirms multiple-obligation
  permissibility (§4) and the zero-requirement deferral without
  re-litigating either.
- Consistent with 0016 (Qualification): reaffirms qualification's
  independence from satisfaction throughout.
- Consistent with 0017 (Satisfaction): resolves exactly the one question
  that record left open (§9) without altering any other conclusion of
  0017.
- No Decision Record 0001–0017 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume OR semantics across multiple Required Deliveries or
  Required Approvals (§5, §6).
- Do not assume the first or most recent attempt, rather than "at least
  one success," determines satisfaction (§7, §8).
- Do not assume one actual record may satisfy multiple requirements by
  default (§9) — this is the one point this record actively decided, and
  it decided against that default.
- Do not assume an unattempted requirement is vacuously satisfied (§10)
  — distinct from the still-open empty-required-set question.
- Do not assume Delivery/Approval failure, rejection, cancellation, or
  expiration removes a requirement or cancels the Order (§11).
- Do not assume the empty-required-set business question, the Approval
  target-type set, or the Delivery partial-delivery/cardinality model has
  been resolved (§12, §14, §21).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0017 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
