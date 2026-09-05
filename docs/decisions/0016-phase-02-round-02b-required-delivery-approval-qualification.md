# Decision Record 0016 — Phase 02 Round 02B: Required Delivery and Required Approval Qualification

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the architectural/logical level only. No
  field, table, migration, target type, or cardinality is approved by
  this record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0015. All remain authoritative and unchanged. This record defines
  the qualification rule Decision Record 0015 left open: precisely when a
  Delivery or Approval obligation counts as "Required" for an Order.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Consistent
with Decision Records 0013–0015: Service and Package remain **UNVERIFIED**
as entities in Decision Records 0001–0015 or `ARCHITECTURE.md`, and are
not added to the architecture by this record.

## 1. Context

Decision Record 0012 fixed the completion guard's shape. Decision Record
0014 named the Order Requirements Snapshot as the architectural home for
"required." Decision Record 0015 defined the snapshot's logical content —
Required Delivery and Required Approval obligations — but did not state
the precise rule by which something *becomes* a member of either set.
This record supplies that rule.

## 2. Problem

"Required" has so far been used descriptively (0012: "required Delivery/
Approval conditions"; 0015: "an obligation... captured in the snapshot")
without a crisp qualification test. This record must state that test in
a way that is architectural (does not depend on unresolved physical
detail) and testable in principle (a reader could, in theory, evaluate
it against a real Order once the remaining physical gaps are closed),
without inventing an Approval target type, a Delivery cardinality, or
treating any unverified entity as approved.

## 3. Approved Inputs

- **0012:** conjunctive guard; ALL required Deliveries `COMPLETED` AND
  ALL required Approvals `APPROVED`; failure/cancellation on either side
  does not auto-cancel the Order or trigger financial consequences.
- **0014:** the Order Requirements Snapshot is the architectural source
  of truth for "required," anchored to Order, captured at creation,
  changed only through controlled, non-silent means.
- **0015:** the snapshot logically contains Required Delivery and
  Required Approval obligations; Requirement ≠ Delivery/Approval outcome;
  in-scope revisions do not change the snapshot; genuine scope change
  needs a future controlled mechanism; multiple obligations are logically
  permissible; zero obligations left DEFERRED; upstream commercial-scope
  content (Quote, and any future Service/Package) is an unresolved
  architecture dependency.

## 4. Qualification Principle

**APPROVED (this record):** *An obligation — Delivery-side or Approval-
side — is Required for a given Order if and only if it is a current
member of that Order's Requirements Snapshot.*

This is a **membership test against a recorded fact, not a computed
property of any other entity's current state.** It is deliberately
definitional rather than derivational: qualification is not "whatever
Campaign/Asset/Delivery/Approval currently looks like," it is "whatever
was captured into this Order's snapshot, as it stands after any
controlled amendment." This is the only formulation consistent with
0014's rejection of continuous derivation and with 0015's historical-
integrity principle (§10, §16 of 0015) — a computed rule would
necessarily re-introduce the instability both records rejected. The test
is **architectural and testable in principle**: "is X a current member
of Order O's Requirements Snapshot" is a well-formed question regardless
of what physical form the snapshot eventually takes.

## 5. Candidate Source Analysis

Re-examined specifically against the qualification question (not the
broader "source of truth" question 0013/0014 already closed):

- **A. Commercial scope** — **UNVERIFIED / insufficiently defined.** No
  approved content exists to qualify anything today (0015 §6). Named as
  the eventual *input* to a future capture step, not itself the
  qualification test.
- **B. Quote** — **Approved to exist, insufficient content.** Same
  reasoning as A; Quote's approved scope is lifecycle only (0005, 0013
  §7, 0015 §10). Cannot safely define "required" directly.
- **C. Order** — **Approved to exist; the anchor, not the test.** Order
  holds the snapshot but does not itself compute qualification (0014
  §8).
- **D. Campaign** — **Rejected.** Downstream of Order; own completion-
  inference rule (0003 Rule 4) forbids using its progress to establish
  another entity's completion-relevant facts; would violate 0013 §12/
  0015 §11 if adopted.
- **E. Brief** — **Rejected.** Pre-Order, Campaign-scoped artifact
  (0004); adopting it would violate 0015 §12's historical-integrity
  treatment of Brief changes.
- **F. Asset set** — **Rejected.** Which Assets are "final"/"required" is
  exactly the undecided Delivery↔Asset cardinality question (0011 §16);
  circular if adopted (0013 §13, 0015 §13).
- **G. Delivery records** — **Rejected for qualification** (though
  central to *satisfaction*, §8). A Delivery record reports an outcome;
  it cannot report whether it — or any other Delivery — was ever owed in
  the first place (0013 §14, 0015 §14).
- **H. Approval records** — **Rejected for qualification**, same
  reasoning as G, plus the unresolved target-type gap (0013 §15, 0015
  §15).
- **I. Order Requirements Snapshot** — **The only candidate that
  qualifies.** It has enough approved conceptual content (0015) to be
  tested against; it preserves historical meaning by construction (§4);
  it remains authoritative after Order creation precisely because it is
  not re-derived from anything else; adopting it violates no existing
  decision — it is the entity 0014 already approved for this exact role.
- **J. Other existing approved mechanisms** — **None found.** No
  Decision Record 0001–0015 supplies an alternative mechanism; the search
  performed for 0013/0014 is not repeated in full here but no new
  candidate has since been approved.

## 6. Required Delivery Qualification

**APPROVED (minimum logical properties, confirming the task's six
points):**

1. A Required Delivery represents an obligation **owed by the Order**
   (not by Campaign, Brief, or any Asset) — consistent with Order being
   the anchor (0014 §8, 0015 §7).
2. It **exists independently of whether delivery has already occurred**
   — qualification (§8) is a fact about the snapshot, unaffected by any
   Delivery record's current or historical state.
3. It **is captured in the Order Requirements Snapshot** — per §4, this
   is not merely a *consequence* of qualification, it **is** the
   qualification test itself.
4. It **can eventually be evaluated against a Delivery lifecycle
   outcome** — via a satisfaction relationship not defined by this
   record (0015 §14, unchanged; §8 below).
5. **Failure or cancellation of an actual Delivery does not erase the
   obligation** — reaffirmed from 0012 §11/0015 §21; a `FAILED` or
   `CANCELLED` Delivery is a satisfaction-layer event and cannot
   retroactively change qualification (§15).
6. **A revision inside existing scope does not automatically create a
   new requirement** — reaffirmed from 0015 §17(A); qualification changes
   only through the snapshot's own controlled-amendment path (§12),
   never as a side effect of an in-scope Asset/Production revision.

**Does a Required Delivery need a conceptual identity/description?**
**INFERENCE: yes, at least minimally.** Without some description of
*what* is owed, satisfaction (§8) could never be conceptually evaluated
— there would be nothing to check a completed Delivery against. This
record does not invent that description's exact shape, fields, or
format; it only concludes that *some* conceptual identity is logically
necessary for the obligation to be meaningful, leaving the shape
**DEFERRED** (0015 §7, unchanged) pending the still-open upstream-
content (§5-A/B) and Delivery-cardinality (0011) questions.

## 7. Required Approval Qualification

**APPROVED (minimum logical properties, confirming the task's six
points):**

1. A Required Approval represents an approval obligation **associated
   with the Order** (0015 §8).
2. It **exists independently of whether approval has already occurred**
   — same reasoning as §6.2.
3. It **is captured in the Order Requirements Snapshot** — same
   qualification test as §4/§6.3.
4. It **can eventually be evaluated against an Approval lifecycle
   outcome** — via a satisfaction relationship not defined here (0015
   §15, unchanged).
5. **Rejected, cancelled, or expired Approval does not erase the
   obligation** — reaffirmed from 0012 §11/0015 §21.
6. **A revision inside existing scope does not automatically create a
   new approval requirement** — same reasoning as §6.6.

**Can the logical concept be defined without selecting a physical
Approval target type? Yes — qualification and target-type selection are
separable.** Qualification only requires that the snapshot can state
*that* an approval is owed and, minimally, *what decision it concerns*,
in descriptive terms (0015 §8). It does **not** require knowing which
`target_type` value a future Approval row would carry — that is a
**satisfaction-layer** concern (linking the obligation to an actual
Approval record, §8 below), not a qualification-layer one. **This
record therefore resolves qualification for Required Approval without
needing Decision Record 0010's target-type gap to close first** — the
gap still blocks *satisfaction* (0015 §15, unchanged, and reaffirmed
DEFERRED here), but does not block *qualification*.

## 8. Qualification vs. Satisfaction

**APPROVED distinction (central deliverable of this record):**

| | Qualification | Satisfaction |
|---|---|---|
| Question | "Is this obligation required?" | "Has the required obligation been fulfilled?" |
| Tested against | Order Requirements Snapshot membership (§4) | Delivery/Approval lifecycle outcome |
| Established | At Order creation / controlled amendment (§9, §12) | Whenever a Delivery reaches `COMPLETED` or an Approval reaches `APPROVED` |
| Changed by | Only a controlled snapshot amendment (§19) | Every new Delivery/Approval record's own lifecycle progress |
| Affected by failure/cancellation | No (§6.5, §7.5, §15) | Yes — a `FAILED`/`CANCELLED` Delivery or `REJECTED`/`CANCELLED`/`EXPIRED` Approval fails to satisfy, but the obligation remains qualified and open |

Required Delivery qualification must never be read as `Delivery.
COMPLETED`, and Required Approval qualification must never be read as
`Approval.APPROVED` — those are satisfaction facts about a *specific
record*, while qualification is a fact about the *snapshot*. Conflating
them would let an Order silently lose a requirement merely because no
Delivery/Approval yet exists to test it against, which is precisely the
instability 0014/0015 were designed to prevent.

## 9. Order Creation Boundary

**INFERENCE, consistent with 0015 §9:** qualification becomes
authoritative at, or immediately following, Order creation — "Quote
accepted → Order created → requirements captured" remains the correct
temporal sequence. Decision Record 0005 (Quote) and Decision Record 0007
(Order) are referenced, not modified. **The commercial content that
would be captured at that point remains an architecture dependency**
(§5-A/B, unchanged from 0015 §6) — this record fixes *when* qualification
starts being authoritative, not *what* populates it initially.

## 10. Historical Integrity

**APPROVED (restated from 0015 §16, applied specifically to
qualification):** the qualification result for an existing Order's
obligations does not change merely because Campaign changes, Brief
changes, Assets are revised, commercial/pricing configuration changes,
or upstream commercial data changes, after that Order's creation. Because
qualification is defined as snapshot membership (§4), and the snapshot
is not continuously re-derived (0014), this follows as an **INFERENCE**
from §4 rather than as a separately invented rule.

## 11. Revision Handling

**APPROVED (restated from 0015 §17-A):** a revision occurring within
existing Order scope — an Asset revision, a Production Job retry, a
resubmitted Approval decision — does not, by itself, add or remove any
Required Delivery or Required Approval. Under §4, such a revision simply
does not touch snapshot membership; the qualification test's answer is
unchanged before and after.

## 12. Scope Expansion / Reduction

Per §4, qualification is exactly snapshot membership, so by construction:
**genuine scope expansion or reduction is the only thing that *can*
change a qualification result for an existing Order** (adding a new
obligation, or removing/deactivating an existing one, changes what is a
"current member" of the snapshot). This record does **not** design how
such a change happens — the controlled amendment mechanism itself remains
**FUTURE / DEFERRED** (0015 §17-B, §18, unchanged). What this record adds
is the precise statement of *where* such a change would take effect:
directly on snapshot membership, and nowhere else (not by mutating
Campaign, Brief, Asset, Delivery, or Approval state to simulate a
requirement change).

## 13. Zero Requirements

**DEFERRED, unchanged from 0015 §20.** Whether an Order may legitimately
carry zero Required Deliveries and/or zero Required Approvals is not
established by any Decision Record 0001–0015. **Consequence for the
Completion Guard, stated as an INFERENCE, not a business rule:** if a
given side's required set is legitimately empty, Decision Record 0012's
"ALL required X `COMPLETED`/`APPROVED`" condition for that side is a
universal condition over an empty set, which classical logic treats as
vacuously satisfied — meaning that side would not block `ACTIVE` →
`COMPLETED`. This is stated purely as how the existing guard formula
would evaluate *if* zero were ever a qualifying state; it is not a
decision that zero is an approved, legitimate business scenario for any
Order.

## 14. Multiple Requirements

**INFERENCE, unchanged from 0015 §19:** qualification (§4) is a set-
membership test, so nothing about it limits the Required Deliveries or
Required Approvals sets to a single member — logically, an Order's
snapshot may contain more than one Required Delivery and more than one
Required Approval. **Logical multiplicity is distinct from physical
cardinality**: how many are actually enforced, permitted, or bounded at
the database level remains **DEFERRED**, governed by Decision Record
0011 (Delivery) and Decision Record 0010 (Approval), unchanged.

## 15. Failure / Cancellation

**APPROVED (reaffirming 0012 §11 and 0015 §21 through the qualification/
satisfaction lens of §8):** a Delivery reaching `FAILED` or `CANCELLED`
is a satisfaction-layer outcome for one specific Delivery record; it
supplies information about *that record*, not about whether the
underlying Required Delivery is still owed. The Required Delivery
remains qualified (still a snapshot member) until a controlled amendment
(§12) says otherwise — the same reasoning applies to Required Approval
against `REJECTED`/`CANCELLED`/`EXPIRED` Approval outcomes. No automatic
Order cancellation and no automatic financial consequence follows,
unchanged from 0012 §11/§12.

## 16. Completion Guard Relationship

The chain, preserved without collapsing layers:

```
Order Requirements Snapshot
        |
   Qualification  ("is this obligation a current snapshot member?")
        |
Required Deliveries          Required Approvals
        |                            |
   Satisfaction                 Satisfaction
   (Delivery outcome)           (Approval outcome)
        |                            |
        +-------------+--------------+
                       |
        Order Completion Guard (Decision Record 0012, unchanged)
                       |
                 Order.COMPLETED
```

Decision Record 0012 is not modified. This record only sharpens what
"required" (its own vocabulary) means, by splitting the single word into
the qualification test (§4) that determines *membership* and the
pre-existing satisfaction concept (0015 §14/§15) that determines
*fulfillment* of a qualified member.

## 17. Security Boundary

Unchanged from 0014 §20/0015 §23: qualification is evaluated within the
Order's own tenant context (`organization_id` scoping, composite-FK
pattern, Decision Record 0002 D1). One Organization's snapshot
membership must never be observable or alterable from another
Organization's context. Client-facing access must be server-authorized.
No RLS or authorization mechanism is designed or implemented here.

## 18. Financial Separation

Unchanged from 0012 §12/0015 §24: qualification is not Payment, Revenue,
Expense, Profit, Reserve, or Owner Settlement, and does not trigger or
infer any financial event. It is a fulfillment-scope fact only.

## 19. Version / Change Control

**Confirms, and applies at finer grain, the conclusion already reached
in 0015 §25:** the snapshot (and therefore the set of qualified
obligations) is not freely edited in place; a genuine scope change is
represented as a controlled, traceable act rather than a silent
overwrite (§12). This record adds, as an **INFERENCE**, that such
control need not necessarily mean re-issuing the entire snapshot — since
qualification is a per-obligation membership fact (§4), a controlled
amendment could in principle add or deactivate individual obligations
rather than replace the whole set — but this is noted only as a
possibility, not decided. The exact physical mechanism remains
**DEFERRED**, unchanged from 0015 §25/§27.

## 20. Rejected Alternatives

- Defining "required" as a property computed from Campaign, Brief,
  Asset, Delivery, or Approval current state — rejected (§5, D–H);
  reintroduces the instability 0014/0015 already rejected.
- Treating Delivery `COMPLETED` or Approval `APPROVED` as the
  qualification test itself — rejected (§8); this conflates satisfaction
  with qualification and would make an Order's requirements disappear
  merely because no matching record yet exists.
- Selecting a physical Approval target type to make §7 concrete —
  rejected; qualification is shown to be definable without one (§7).
- Deciding exact Delivery cardinality or Required-Delivery field shape —
  rejected; left DEFERRED (§6, §14), consistent with 0011.
- Declaring zero Required Deliveries/Approvals either always valid or
  always invalid — rejected; left DEFERRED with only the guard's logical
  consequence stated (§13).
- Designing the scope-expansion/reduction mechanism — rejected;
  identified as FUTURE/DEFERRED only (§12).
- Assuming Delivery/Approval failure removes a qualified obligation —
  rejected (§15).

## 21. Deferred Decisions

1. Upstream commercial-scope content that would populate the snapshot at
   Order creation (0015 §6, unchanged).
2. The Approval target-type set (Decision Record 0010) — blocks
   satisfaction, not qualification (§7).
3. Delivery→Asset/Order cardinality and partial-delivery semantics
   (Decision Record 0011) — blocks satisfaction and the exact shape of a
   Required Delivery's description (§6).
4. The satisfaction relationships linking a qualified Required Delivery/
   Approval to the specific Delivery/Approval record(s) that discharge it
   (0015 §14/§15, unchanged).
5. The exact conceptual/physical description format of a Required
   Delivery or Required Approval (§6, §7).
6. Whether zero Required Deliveries and/or zero Required Approvals is a
   legitimate business state for some or all Orders (§13).
7. The physical/DB cardinality bounds on multiple Required Deliveries/
   Approvals (§14).
8. The controlled amendment mechanism for scope expansion/reduction
   (§12, §19).
9. Whether such amendment operates per-obligation or by whole-snapshot
   replacement (§19).
10. Any physical database representation of the snapshot, its
    obligations, or the qualification/satisfaction relationships.
11. Exact tenant/RLS implementation (§17).

## 22. Final Recommendation

**A Delivery obligation is Required for an Order if and only if it is a
current member of that Order's Requirements Snapshot's Required Delivery
set. An Approval obligation is Required for an Order if and only if it
is a current member of that Order's Requirements Snapshot's Required
Approval set.** Membership is established once, at Order creation, from
upstream commercial scope whose content remains an open architecture
dependency (§9), and changes thereafter only through a future, controlled
amendment mechanism reacting to genuine scope expansion or reduction
(§12) — never as a side effect of Campaign/Brief/Asset change, in-scope
revision, or Delivery/Approval failure (§10, §11, §15). Qualification is
kept strictly distinct from satisfaction (§8): an obligation can be
qualified (owed) long before, and independent of whether, it is ever
satisfied, and remains qualified even after a failed or cancelled attempt
to satisfy it. This resolves the qualification question at the
architectural level in full; it does not make Decision Record 0012's
guard implementable end-to-end, because the satisfaction relationships
(§21 item 4) and the upstream content that populates the snapshot (§21
item 1) remain open, exactly as Decision Records 0014 and 0015 already
established.

## Consistency with Decision Records 0001–0015

- Consistent with 0001/0002: introduces no schema; does not add Service
  or Package to the approved entity list.
- Consistent with 0003 (Campaign) and 0004 (Brief): neither defines
  qualification (§5-D/E); their state machines are unmodified.
- Consistent with 0005 (Quote): preserves its lifecycle-only scope; does
  not assume Quote content exists (§5-B, §9); unmodified.
- Consistent with 0006 (Asset): does not treat Asset as a qualification
  source (§5-F); its versioning principle is not altered.
- Consistent with 0007 (Order): Order remains the anchor without gaining
  new schema or a modified state machine (§5-C, §9).
- Consistent with 0008/0009 (Production Job, AI Generation): their
  retry-is-a-new-record convention is the basis for §11's reasoning,
  unaltered.
- Consistent with 0010 (Approval): does not select or invent a target
  type; explicitly separates qualification (resolved) from satisfaction
  (still blocked by the target-type gap) (§7).
- Consistent with 0011 (Delivery): does not resolve cardinality or
  partial-delivery semantics (§6, §14).
- Consistent with 0012 (Completion Guard): does not modify the guard;
  clarifies its own vocabulary (§16).
- Consistent with 0013 (Requirements gap) and 0014 (Source of truth):
  builds directly on their conclusions without contradicting them.
- Consistent with 0015 (Snapshot logical content): supplies exactly the
  qualification rule that record left open, without re-opening any of
  its other conclusions (§3–§21 throughout).
- No Decision Record 0001–0015 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume Service, Package, or Quote content are approved sources
  of qualification content (§5, §9).
- Do not assume Delivery `COMPLETED` or Approval `APPROVED` is itself the
  qualification test — both are satisfaction facts (§8).
- Do not assume an Approval target type or Delivery cardinality has been
  chosen (§6, §7, §21).
- Do not assume the satisfaction relationships linking qualified
  obligations to actual Delivery/Approval records have been defined
  (§21 item 4).
- Do not assume Campaign, Brief, Asset, or configuration changes alter
  qualification for an existing Order (§10).
- Do not assume every revision changes qualification, or that scope
  expansion/reduction has a designed mechanism (§11, §12).
- Do not assume zero Required Deliveries/Approvals is a settled,
  legitimate business state (§13).
- Do not assume Delivery/Approval failure or cancellation removes a
  qualified obligation (§15).
- Do not assume qualification is a financial fact (§18).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0015 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
