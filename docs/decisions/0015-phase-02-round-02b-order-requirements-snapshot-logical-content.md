# Decision Record 0015 — Phase 02 Round 02B: Order Requirements Snapshot — Logical Content

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the logical/conceptual level only. No field,
  table, migration, target type, or cardinality is approved by this
  record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0014. All remain authoritative and unchanged. This record defines
  the logical content and behavior of the Order Requirements Snapshot
  concept that Decision Record 0014 established the role of, without
  designing its physical representation.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Consistent
with Decision Records 0013 and 0014: Service and Package remain
**UNVERIFIED** as entities — nothing in Decision Records 0001–0014 or in
`ARCHITECTURE.md` approves either, and this record does not add them to
the architecture.

## 1. Context

Decision Record 0012 fixed the Order completion guard's shape
(conjunction of Delivery and Approval coverage). Decision Record 0013
found no approved entity could define "required" for either side.
Decision Record 0014 resolved that gap at the architectural-concept
level by naming the **Order Requirements Snapshot** — an Order-anchored,
creation-time-captured, change-controlled concept — as the correct home
for that answer, while deferring its content. This record defines that
content, logically.

## 2. Problem

Naming a concept ("Order Requirements Snapshot") is not the same as
defining what it logically holds and how it behaves. This record must
state what a Required Delivery and a Required Approval mean
conceptually, where the snapshot's content originates, when it becomes
authoritative, how it survives later change, and how it relates to every
adjacent entity — all without inventing physical schema, a target type,
or a cardinality rule that no prior record approved.

## 3. Approved Inputs

- **0012 (APPROVED):** `Order.ACTIVE → COMPLETED` requires ALL required
  Deliveries `COMPLETED` AND ALL required Approvals `APPROVED`; neither
  condition alone suffices; nine named single-signals are insufficient
  alone; Order cancellation stays non-automatic relative to Delivery/
  Approval failure; the guard is financially inert and Campaign-inert.
- **0013 (APPROVED finding):** no existing entity's approved content
  defines "required"; Service/Package are UNVERIFIED; Quote/Order/
  Campaign/Asset/Delivery/Approval each disqualified for a specific,
  documented reason.
- **0014 (APPROVED at concept level):** the Order Requirements Snapshot
  is the correct architectural home; it is Order-anchored, captured at
  Order-creation time, not continuously derived from Campaign/Asset/
  Delivery/Approval state, and changed only through a controlled,
  traceable act — never silently. Its content was explicitly left to a
  later record. This record is that later record.

## 4. Purpose of the Snapshot

**APPROVED (this record):** the Order Requirements Snapshot's sole
purpose is to answer, for one specific Order, the two questions Decision
Record 0012's guard needs answered: which Deliveries are required for
this Order to reach `COMPLETED`, and which Approvals are required for
this Order to reach `COMPLETED`. It has no other purpose — it is not a
commercial record, not a financial record, not a Campaign-progress
record, and not a substitute for Order, Quote, Delivery, or Approval's
own approved state machines.

## 5. Logical Snapshot Boundary

**APPROVED (this record):** the snapshot is a **logical grouping of two
kinds of obligations** — Required Deliveries (§7) and Required Approvals
(§8) — associated with exactly one Order. It is not itself a new
physical entity family; per the task's explicit terminology
instruction, no "Order Requirement," "Delivery Requirement," "Approval
Requirement," "Deliverable Requirement," "Fulfillment Requirement," or
"Completion Requirement" table/entity is created or approved by this
record. Where physical representation is eventually needed, it remains
**DEFERRED** (§27).

## 6. Origin of Requirements

**Logical flow (per the requesting task):**

```
Commercial Scope -> Quote -> Order Creation -> Order Requirements Snapshot
```

**INFERENCE:** this ordering is consistent with the approved Quote→Order
relationship (0002: 1 Quote → 1 Order) and with 0014's conclusion that
the snapshot is captured at Order-creation time from "whatever commercial
scope produced the Order."

**What can safely be inherited from upstream commercial scope today:
nothing structured.** Decision Record 0005 approves Quote's lifecycle and
its Cost Check/Margin Check guards, but never approves Quote *content*
(no line items, deliverable list, or approval requirement is part of the
approved Quote model — reconfirmed from 0005 directly). Service and
Package remain UNVERIFIED (§ Governance Note). Therefore: **the upstream
commercial scope that would populate the snapshot is not yet itself
defined with enough content to populate anything.** This is recorded, as
the task requires, as an **architecture dependency**: before the
snapshot's content can be automatically derived from Quote (or a future
Service/Package), a separate decision must first approve what commercial-
scope content exists to derive it from. This record does not invent that
content, and does not silently add Service or Package to the
architecture to fill the gap.

## 7. Required Delivery — Logical Definition

**APPROVED (conceptual definition only):** a Required Delivery is a
statement, held within an Order's Requirements Snapshot, that **this
Order owes one identifiable unit of deliverable output** to be made
available to the client before this Order can be considered fulfilled on
the Delivery side of Decision Record 0012's guard.

Answering the task's five framing points, at the logical level only:

- **What deliverable obligation exists?** An obligation that some
  deliverable output — described in whatever terms the still-undefined
  upstream commercial scope (§6) eventually specifies — must be produced
  and handed off.
- **Which Order does it belong to?** Exactly one Order; a Required
  Delivery is not shared across Orders (consistent with Order being the
  anchor per 0014).
- **What makes it required?** Its presence in that Order's Requirements
  Snapshot, captured at Order-creation time (§9) — not any Delivery,
  Asset, or Campaign state observed later.
- **What identifies the required output conceptually?** A description of
  *what* is owed (not a specific database identifier or field) —
  DEFERRED as to its exact conceptual shape until the upstream commercial
  scope (§6) and Delivery→Asset cardinality (0011, unchanged) are
  resolved.
- **What completion condition must eventually be satisfied?** Some
  future-approved relationship between this obligation and an actual
  Delivery record reaching `COMPLETED` (0011) — **the exact satisfaction
  relationship is not invented by this record** (§14, §22).

**Explicitly not decided here:** exact Delivery→Asset cardinality, exact
number of Delivery records per requirement, and partial-delivery
behavior — all remain governed by Decision Record 0011's own existing
deferrals, unchanged.

## 8. Required Approval — Logical Definition

**APPROVED (conceptual definition only):** a Required Approval is a
statement, held within an Order's Requirements Snapshot, that **this
Order owes one identifiable formal decision** — to be recorded via the
Approval entity (0010) — before this Order can be considered fulfilled
on the Approval side of Decision Record 0012's guard.

Answering the task's four framing points:

- **What decision requires approval?** A decision described in whatever
  terms the still-undefined upstream commercial scope (§6) eventually
  specifies (e.g., acceptance of a deliverable, or of the engagement as a
  whole) — not finalized here.
- **Which Order does it belong to?** Exactly one Order, same as §7.
- **What makes that approval required?** Its presence in that Order's
  Requirements Snapshot, captured at Order-creation time — not any later
  observation of Approval activity.
- **What approval outcome satisfies the requirement?** A future-approved
  relationship between this obligation and an actual Approval record
  reaching `APPROVED` (0010) — **not invented here.**

**Can the snapshot identify an approval obligation without choosing a
physical target type? Yes, at the logical level, but only partially.**
The snapshot can logically state *that* an approval is owed and *what
decision* it concerns, in descriptive terms, without naming a
`target_type` value. What it **cannot** yet do is establish a physical,
queryable link between that logical obligation and a specific Approval
row's `target_type`/`target_id`, because Decision Record 0010 has not
approved the target-type set. **This limitation is marked DEFERRED, per
the task's explicit instruction**, rather than resolved by inventing a
target type here.

## 9. Order Creation Point

**INFERENCE, consistent with 0014:** the snapshot becomes authoritative
at, or immediately following, Order-row creation — i.e., "Quote
acceptance + Order creation = the point at which requirements are
captured" is the correct **temporal** answer, because Order creation is
the first moment an Order (the anchor, per 0014 §8) exists to hold
anything. This does **not** mean Quote itself is assumed to contain the
fulfillment information copied at that point — per §6, that content does
not yet exist in any approved form. The temporal point is fixed by this
record; the informational content transferred at that point is not
(§6). Decision Record 0005 (Quote) and Decision Record 0007 (Order) are
referenced here, not modified.

## 10. Relationship to Quote

Quote remains the closest approved candidate for "the commercial event
that precedes Order creation" (0002: 1 Quote → 1 Order), but, per §6 and
per Decision Record 0013 §10/0014 §7, Quote's approved scope is lifecycle
only. The Requirements Snapshot's relationship to Quote is therefore: **a
temporal predecessor and an eventual conceptual reference point** ("this
is the Quote whose acceptance led to this Order"), not a live or
structural data source. No Quote content, field, or state is created,
inferred, or assumed by this record.

## 11. Relationship to Campaign

Unchanged from 0013 §12/0014 §9: Campaign remains disqualified as a
requirements source (it is downstream of Order in the approved
relationship, and 0003 Rule 4 forbids inferring completion from Campaign
progress). The Requirements Snapshot does not read Campaign state, and
Campaign's own state machine (0003) is not modified or referenced as
authoritative for Order requirements.

## 12. Relationship to Brief

Brief (0004) remains a Campaign-scoped, pre-Order artifact (`BRIEFING`
precedes `ORDERED` in Campaign's lifecycle, 0003). The Requirements
Snapshot does not read Brief content or Brief status; a Brief revision
occurring after Order creation does not, by itself, alter an existing
Order's Requirements Snapshot (this is an instance of the general
historical-integrity principle in §16, applied to Brief specifically, as
the task requests).

## 13. Relationship to Asset

Asset (0006) remains the eventual object a Required Delivery's obligation
would be satisfied against, once Delivery→Asset cardinality (0011,
unchanged) is resolved. The Requirements Snapshot does not read Asset
state directly and does not gain a new Asset-derived state; an Asset's
own revision (new row per 0006) does not, by itself, alter an existing
Order's Requirements Snapshot.

## 14. Relationship to Delivery

**Requirement ≠ Delivery, explicitly.** A Required Delivery entry in the
snapshot states an obligation; the Delivery entity (0011) records the
actual attempt/outcome lifecycle (`PREPARING`→`SENDING`→terminal) against
that obligation. **The relationship connecting a specific Required
Delivery to the specific Delivery record(s) that would satisfy it is not
invented by this record** — per the task's explicit instruction, this is
left to a future decision once Delivery cardinality (0011) is resolved.
Until then, "Delivery `COMPLETED` satisfies a requirement" remains a
conceptual statement of intent, not an implementable rule.

## 15. Relationship to Approval

**Requirement ≠ Approval, explicitly**, for the same reason as §14. A
Required Approval entry states an obligation; the Approval entity (0010)
records the actual decision lifecycle. **The relationship connecting a
specific Required Approval to the specific Approval record that would
satisfy it is not invented by this record** — deferred until Decision
Record 0010's target-type set is resolved.

## 16. Historical Integrity

**APPROVED principle (extending 0014 §14 into an explicit standalone
rule, as the task requests):** *once an Order exists, its Requirements
Snapshot must not change merely because upstream information changes.*
Specifically, none of the following, by themselves, alter an existing
Order's Requirements Snapshot:

- A Campaign moving to a new lifecycle phase (0003).
- A Brief revision or a new Brief version (0004).
- A new Asset revision/version (0006).
- A change to commercial/pricing configuration occurring after this
  Order's creation.
- The eventual approval of Service/Package as entities, or any change to
  them, occurring after this Order's creation.

This mirrors the house convention already established across the
architecture (Asset new-row-per-revision, Quote cancel+replace instead of
in-place edit, the general immutability principle in 0002) rather than
introducing a new principle from nothing.

## 17. Revision Rules

Per the task's explicit A/B distinction:

- **(A) Revision within existing Order scope** — e.g., an Asset
  revision cycle, a Production Job retry, a rejected-then-resubmitted
  Approval decision, all of which already occur without touching Order's
  own state (0006, 0008, 0009, 0010) — **does not automatically change**
  the Order Requirements Snapshot. The underlying obligation the revision
  is working toward remains the same obligation.
- **(B) Genuine commercial scope expansion or reduction** — a new
  deliverable or approval obligation that was never part of what this
  Order originally owed, or the removal of one — **is a different
  commercial fact**, not a correction of an existing one, and requires a
  separate, future commercial decision before the snapshot may reflect
  it. **This record does not design that mechanism.** It is recorded as
  **FUTURE / DEFERRED** (§27), consistent with the task's explicit
  instruction not to design a scope-change mechanism here and not to
  assume an existing Order's requirements can simply be overwritten.

The test for distinguishing (A) from (B) is itself **DEFERRED** — this
record states the two categories exist and behave differently; it does
not invent the rule that classifies a given change into one or the
other.

## 18. Scope Change

Consistent with §17(B): a genuine scope change is never represented as a
silent, in-place edit of the existing Requirements Snapshot. If and when
a controlled amendment mechanism is approved, the mechanism itself
remains **FUTURE / DEFERRED**. This record does not assume such a
mechanism looks like a mutable update, a new row, or any other specific
shape — only that it must be a controlled, traceable, separately-decided
act (§25).

## 19. Multiple Requirements

**INFERENCE:** the snapshot concept must not assume a single Required
Delivery or a single Required Approval per Order — nothing approved
limits an Order to exactly one of either, and the task explicitly warns
against assuming singular cardinality. **Logically, an Order's
Requirements Snapshot may need to hold more than one Required Delivery
and more than one Required Approval.** This is a statement about the
*logical shape* of the concept (a collection, not a single value) —
**exact physical cardinality (how many, what upper/lower bound, whether
enforced) remains DEFERRED**, unchanged from Decision Record 0011
(Delivery) and Decision Record 0010 (Approval).

## 20. Empty Requirements

**DEFERRED, per the task's explicit instruction.** Structurally, Decision
Record 0012's guard ("ALL required Deliveries `COMPLETED`," "ALL required
Approvals `APPROVED`") is a universal condition over the required set; a
universal condition over an *empty* set is vacuously satisfied as a
matter of ordinary logic (**INFERENCE**, not a business rule). However,
this record does **not** conclude from that logical fact that a
zero-Required-Delivery or zero-Required-Approval Order is a legitimate,
approved business scenario — nothing in Decision Records 0001–0014
establishes whether every Order must owe at least one Delivery and/or one
Approval, or whether some Order categories are legitimately exempt (this
mirrors 0007's own deferred item on the same question, and 0011's
deferred item on whether every Order requires a Delivery). **Whether
zero is a legitimate state remains DEFERRED**, distinct from the logical
fact of how the guard formula would evaluate if it occurred.

## 21. Failure and Cancellation

**APPROVED (restating and extending 0012 §11 to the snapshot level):** a
Delivery reaching `FAILED` or `CANCELLED`, or an Approval reaching
`REJECTED`, `CANCELLED`, or `EXPIRED`, does **not** automatically remove
the underlying Required Delivery or Required Approval from the Order's
Requirements Snapshot. The obligation persists; only a new,
successfully-completed Delivery or Approval (created per the existing
new-record-not-reopened-terminal-state convention, 0008–0011) can
eventually satisfy it. Consistent with 0012 §11 and §12: no automatic
Order cancellation and no automatic financial consequence follows from
such a failure — the Order simply remains blocked from `COMPLETED` until
the obligation is otherwise satisfied or a separate, authorized decision
intervenes.

## 22. Order Completion Relationship

The logical chain, unchanged and not collapsed, per the task's explicit
diagram:

```
Order Requirements Snapshot
        |
Required Deliveries        Required Approvals
        |                          |
  Delivery completion        Approval completion
        |                          |
        +----------+---------------+
                   |
        Order Completion Guard (Decision Record 0012)
                   |
             Order.COMPLETED
```

Each layer keeps its own identity: the snapshot states obligations; the
Delivery and Approval entities record actual outcomes against those
obligations (via a satisfaction relationship this record does not
define, §14/§15); the guard (0012) evaluates coverage; only then can
Order transition. No layer is merged into another.

## 23. Security and Tenant Boundary

Unchanged from 0014 §20: the Requirements Snapshot, whatever its eventual
physical form, must belong to the same tenant context as its Order
(`organization_id` scoping plus the composite-FK pattern, Decision Record
0002 D1). One Organization must never observe or modify another
Organization's Order Requirements Snapshot. Client-facing access must be
server-authorized; no authorization or RLS mechanism is designed or
implemented by this record.

## 24. Financial Boundary

Unchanged from 0012 §12/0014 §21: the Requirements Snapshot is not a
financial record. It does not represent, and must not be used to infer,
revenue, expense, profit, reserve, owner settlement, payment, or refund.
Financial consequences remain the exclusive concern of the Financial
Ledger and the approved financial architecture.

## 25. Versioning / Change Control

**PROPOSAL, prioritizing historical integrity as the task requires:**
of the options offered (immutable / controlled-and-amendable / replaced-
by-a-new-snapshot / another model), the option most consistent with the
already-established house convention (§16; Asset new-row-per-revision,
Quote cancel+replace, the general immutability principle) is: **the
Requirements Snapshot is not freely amendable, and its content is not
edited in place.** Within existing scope (§17-A), it does not change at
all. When a genuine, separately-authorized scope change occurs (§17-B),
the correct pattern — by analogy, not by new invention — is a
**controlled replacement** (a new, superseding statement of requirements,
with the prior one preserved for historical reference) rather than an
in-place overwrite. This record does **not** decide the physical
mechanism (versioned rows, an append-only log, or another pattern) — that
remains **DEFERRED** (§27) — and does not declare unconditional
immutability, since the task explicitly warns against assuming that
without justification, and a wholly immutable snapshot with literally no
path to correction would be inconsistent with §17-B/§18's acknowledgement
that genuine scope changes must eventually be representable somehow.

## 26. Rejected Alternatives

- Naming any physical entity ("Order Requirement," "Delivery
  Requirement," "Approval Requirement," "Deliverable Requirement,"
  "Fulfillment Requirement," "Completion Requirement") — rejected; no
  authoritative source requires one, per the task's own instruction (§5).
- Treating Service or Package as approved sources for snapshot content —
  rejected; both remain UNVERIFIED (§6, Governance Note).
- Treating Quote content as an already-existing, safely-inheritable
  source — rejected; no such content is approved (§6, §10).
- Inventing an Approval target type to make §8 concrete — rejected;
  explicitly deferred instead.
- Deciding exact Delivery→Asset cardinality or Delivery-record count to
  make §7 concrete — rejected; explicitly deferred instead (0011
  unchanged).
- Assuming zero Required Deliveries/Approvals is a valid business state
  merely because the guard formula tolerates it logically — rejected;
  the logical fact and the business legitimacy question are kept
  separate (§20).
- Assuming every revision changes the snapshot, or that no revision ever
  does — rejected; the A/B distinction is kept, with the classifying
  test itself deferred (§17).
- Automatic Order cancellation or automatic financial consequence on
  Delivery/Approval failure — rejected (§21, consistent with 0012 §11).
- Declaring the snapshot unconditionally immutable with no path to
  correction — rejected; a controlled-replacement model is proposed
  instead (§25).
- Allowing an existing Order's requirements to be silently overwritten —
  rejected outright (§17, §18, §25).

## 27. Deferred Decisions

1. The actual upstream commercial-scope content (Quote content model, or
   a future Service/Package) that would populate the snapshot (§6) — an
   architecture dependency, not resolved here.
2. The approvable Approval target-type set (Decision Record 0010,
   unchanged — blocks §8, §15).
3. Delivery→Asset and Delivery→Order cardinality, multiple-Delivery, and
   partial-delivery semantics (Decision Record 0011, unchanged — blocks
   §7, §14).
4. The satisfaction relationship connecting a Required Delivery to the
   Delivery record(s) that discharge it (§14).
5. The satisfaction relationship connecting a Required Approval to the
   Approval record that discharges it (§15).
6. The test distinguishing an in-scope revision (§17-A) from a genuine
   scope change (§17-B).
7. The controlled amendment/scope-change mechanism itself (§17-B, §18) —
   FUTURE / DEFERRED.
8. Whether zero Required Deliveries and/or zero Required Approvals is a
   legitimate business state for some or all Orders (§20).
9. The physical mechanism for change control / versioning of the
   snapshot (versioned rows, append-only log, or otherwise) (§25).
10. Any physical database representation of the snapshot, its
    obligations, or their satisfaction relationships (§5, all sections).
11. Exact tenant/RLS implementation (§23).
12. Exact `CHECK`/constraint implementation for any future schema.

## 28. Final Recommendation

The Order Requirements Snapshot (established by Decision Record 0014) is
defined, at the logical level, as an Order-anchored collection of
**Required Delivery** obligations and **Required Approval** obligations,
each stating that something is owed without yet specifying its exact
shape, captured at Order-creation time from upstream commercial scope
that itself does not yet contain enough approved content to populate it
(§6 — a named architecture dependency, not silently worked around). The
snapshot does not change merely because Campaign, Brief, Asset, or
commercial configuration changes later (§16); in-scope revisions leave it
untouched, while genuine scope changes require a future, separately-
decided, controlled-replacement mechanism (§17, §18, §25) rather than an
in-place overwrite. Delivery and Approval completion remain distinct
from the requirement itself, with the relationship that connects them
explicitly left for later decisions (§14, §15). Failure or cancellation
of a Delivery or Approval never silently discharges or removes a
requirement, and never automatically cancels the Order or triggers a
financial consequence (§21). **What is resolved by this record:** the
logical shape and behavioral principles of the snapshot concept. **What
remains deferred:** every point of physical specificity — content model,
target types, cardinality, satisfaction relationships, and physical
change-control mechanism (§27) — consistent with Decision Record 0014's
own stated limitation that architectural source of truth is resolved
while physical implementation remains deferred.

## Consistency with Decision Records 0001–0014

- Consistent with 0001/0002: introduces no schema, no new versioning-
  scope expansion of D3, and does not add Service or Package to the
  approved entity list.
- Consistent with 0003 (Campaign) and 0004 (Brief): neither is read by,
  or a source for, the snapshot (§11, §12); their own state machines are
  unmodified.
- Consistent with 0005 (Quote): preserves its lifecycle-only approved
  scope; does not assume Quote content exists (§6, §10); Quote's state
  machine is unmodified.
- Consistent with 0006 (Asset): reuses its new-row-per-revision
  convention as precedent (§16, §25) without expanding Asset's own
  versioning scope or reading Asset state directly (§13).
- Consistent with 0007 (Order): the snapshot is anchored to Order without
  adding schema to Order or modifying its state machine (§9); Order's
  state machine is unmodified.
- Consistent with 0008/0009 (Production Job, AI Generation): reuses their
  retry-is-a-new-record convention as precedent (§17-A) without altering
  their own approved behavior.
- Consistent with 0010 (Approval): does not invent a target type or
  resolve the target-type set (§8, §15).
- Consistent with 0011 (Delivery): does not resolve cardinality or
  partial-delivery semantics (§7, §14, §19).
- Consistent with 0012 (Completion Guard): preserves its conjunctive
  guard shape and its failure/cancellation non-automaticity rule,
  extended to the snapshot level (§21, §22).
- Consistent with 0013 (Requirements gap): does not contradict any
  finding; extends the same disqualification reasoning to Campaign,
  Brief, and Asset explicitly (§11–§13).
- Consistent with 0014 (Source of truth): implements exactly the content
  definition that record deferred, without expanding its concept-level
  approval into physical schema.
- No Decision Record 0001–0014 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any physical table, column, or field for the Order
  Requirements Snapshot, a Required Delivery, or a Required Approval has
  been approved (§5, §27).
- Do not assume Service or Package are approved entities, or that Quote
  content has been approved (§6, §10, Governance Note).
- Do not assume an Approval target type or a Delivery cardinality has
  been chosen (§7, §8, §14, §15).
- Do not assume the satisfaction relationship between a requirement and
  its discharging Delivery/Approval record has been defined (§14, §15).
- Do not assume every revision changes the snapshot, or that none ever
  does (§17).
- Do not assume an existing Order's requirements can be silently
  overwritten, or that a scope-change mechanism has been designed (§17,
  §18, §25).
- Do not assume zero Required Deliveries/Approvals is a settled,
  legitimate business state (§20).
- Do not assume Delivery/Approval failure removes a requirement, cancels
  the Order, or triggers a financial consequence (§21).
- Do not assume the snapshot is a financial record (§24).
- Do not assume the snapshot has been declared unconditionally immutable
  (§25).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0014 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
