# Decision Record 0027 — Phase 02 Round 02B: Approval Target Designation Boundary

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting Owner decision. The governance
  boundary and decision requirements for Approval target-type designation
  are fully analyzed (§4–§15). No target type is designated or promoted
  by this record. The Owner's designation authority and its exact scope
  are defined (§10). All candidates retain the classification assigned
  in DR 0025, as updated by DR 0026 (§5).
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0026. All remain authoritative and unchanged. This record
  consolidates the governance framework for Approval target-type
  designation by drawing from DR 0002 D6 (typed target model;
  target-type set reserved), DR 0023 (target shape; immutable-reference
  principle; target-type-set/shape separation), DR 0024 (actor authority
  independent of target type), DR 0025 (candidate inventory; evidentiary
  hierarchy; Owner designation required), and DR 0026 (Delivery
  compatibility: partial CONFIRMED, semantic stability DEFERRED). It
  defines exactly what the Owner must decide, what engineering must
  resolve separately, and what a designation does and does not authorize.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from
0013–0026. No target type is promoted to APPROVED by this record; the
Owner's designation authority is defined but not exercised here.

## 1. Context

Decision Record 0002 D6 established a typed Approval target model in
principle, explicitly reserving the target-type set for "a separate
decision before physical schema design." Decision Records 0005–0011
opened specific candidates as deferred questions. Decision Record 0023
confirmed the target shape (Model A) and the immutable-reference
principle, evaluated all known candidates, and left each at DEFERRED or
UNVERIFIED. Decision Record 0024 established actor/authority boundaries
independently of the target-type set. Decision Record 0025 produced a
comprehensive candidate analysis and evidentiary hierarchy, presenting
them for Owner decision (§15) — but itself unable to supply that
decision. Decision Record 0026 partially resolved Delivery's
immutable-reference compatibility: row identity and terminal-state
stability CONFIRMED; semantic stability DEFERRED pending Delivery→Asset
cardinality resolution. This record synthesizes those findings into a
single governance framework: precisely what must be true before any
candidate may be designated, who holds which decisions, and what a
designation does and does not authorize.

## 2. Problem

The target-type set is the one remaining architectural question between
the current logical model and physical schema design for the Approval
entity (DR 0002 D6; DR 0023 §22 item 1; DR 0024 §23 item 1; DR 0025
§2). The decision chain has now produced: (a) the target shape (Model A
— type + identity, DR 0023 §9), (b) the immutable-reference principle
that any approved target must satisfy (DR 0023 §13), (c) a full
candidate inventory with evidentiary standings (DR 0025 §14), and (d) a
partial compatibility analysis for Delivery (DR 0026 §11). What remains
absent is a governance framework that states precisely: what
constitutes a valid designation, which decisions belong to the Owner
versus engineering, whether candidates can be designated independently,
and whether a designation authorizes physical implementation
immediately. This record supplies that framework without itself
exercising the designation authority it describes.

## 3. Seven Conceptual Layers

**APPROVED distinction, synthesizing 0022 §4, 0023 §5–§6, 0025 §3,
0026 §3, and extending to cover all concepts the Owner's designation
decision touches:**

1. **Approval identity:** the unique identity of an Approval record
   (UUID v7, DR 0002 D2). One Approval record = one formal decision
   event.
2. **Required Approval identity:** the unique identity of a Required
   Approval obligation within an Order's Requirements Snapshot (DR 0022
   §4). Separate from, and independent of, the Approval record that
   satisfies it.
3. **Approval target identity:** the identity of the specific row an
   Approval record's formal decision concerns — the entity being
   formally approved (DR 0023 §5–§6). Expressed via Model A: a
   (target type, target identity) pair.
4. **Target type:** the class of entity the Approval target belongs to
   (e.g., "Asset", "Quote"). **This is the set the Owner is asked to
   designate.** Not yet designated for any candidate (DR 0025 §15).
5. **Candidate status:** the current evidentiary standing of a proposed
   target type — Tier 1, Tier 2, Tier 3, or UNVERIFIED — as established
   by DR 0025 §14. Candidate status is an analytical output, not an
   authorization. Tier 1 standing does not authorize a type; it
   describes the strength of the evidentiary basis for Owner
   consideration.
6. **Actor authority:** the RBAC-role-level rules governing who may
   create and decide Approval records (DR 0024). Established
   independently of the target-type set; applies to whatever types are
   eventually designated.
7. **Satisfaction reference:** the mechanism by which an Approval record
   satisfies a Required Approval obligation — a reference to the
   Required Approval's own identity (layer 2), independent of the
   Approval target (layer 3) (DR 0022 §7; DR 0023 §7).

**These seven layers must not be collapsed.** In particular:

- Candidate status (5) ≠ target-type designation (4): a Tier 1 candidate
  is eligible for designation, not already designated.
- Target-type designation (4) ≠ target identity model (3): designating
  "Asset" as a valid type does not specify which Asset row a particular
  Approval concerns — that is determined per-record at runtime.
- Actor authority (6) is independent of layers 3–5: who may act on an
  Approval is established regardless of what types are approved.
- Satisfaction reference (7) is independent of layers 3–5: how
  Required Approvals are satisfied does not change when the target-type
  set changes.

## 4. Governing Constraints on Designation

**APPROVED — drawn from DR 0002 D6, DR 0023 §13, DR 0025 §15:**

Three constraints govern any valid target-type designation. All three
must be satisfied; no one constraint alone is sufficient.

**Constraint A — Candidacy evidence.** The candidate type must have an
authoritative evidentiary basis for appearing in the V1 Approval
target-type set. Specifically:

- Tier 1 (DR 0025 §14): the candidate's own governing Decision Record
  explicitly named the target-type question as an open item and
  prohibited assuming the answer. This is the strongest basis.
  Candidates: Asset, Quote.
- Tier 2 (DR 0025 §14): a directly related Decision Record named the
  candidate as an open dependency in the Approval context. Candidates:
  Delivery.
- Tier 3 (DR 0025 §14): the candidate appears nowhere in any Decision
  Record 0001–0026 in an Approval target-type discussion. A Tier 3
  candidate cannot be designated without a prior analysis record
  establishing its candidacy and assessing its evidentiary basis.
  Candidates: Campaign, Brief, Order, Brand DNA, Production Job,
  AI Generation.

Tier 3 status is an evidentiary gap, not a rejection. It means the
architecture has not yet addressed whether the entity can serve as an
Approval target — not that it cannot. However, it requires an
intervening analysis step before the Owner can validly designate it.

**Constraint B — Immutable-reference compatibility.** The candidate's
row (the specific instance that would be targeted by an Approval
record) must satisfy DR 0023 §13: it must identify an immutable,
historically-fixed row — never a live or mutable concept that could
later change meaning out from under a terminal Approval decision.
Current compatibility status by candidate:

- Asset: **CONFIRMED** (DR 0023 §14; 0006 row-per-revision design).
- Quote: **CONFIRMED** (DR 0025 §7; 0005 cancel-and-new pattern cited
  in DR 0023 §13).
- Delivery (terminal rows only): **PARTIALLY CONFIRMED** (DR 0026 §11
  — row identity and state stability CONFIRMED; semantic stability
  DEFERRED pending Delivery→Asset cardinality resolution).
- Delivery (non-terminal rows): **NOT COMPATIBLE** (DR 0026 §6, §12;
  mutable status excluded per DR 0023 §13).
- Campaign, Brief, Order, Brand DNA: **UNVERIFIED** (no compatibility
  analysis performed in DR 0001–0026).

A candidate whose compatibility is CONFIRMED satisfies Constraint B. A
candidate whose compatibility is DEFERRED (Delivery) does not yet
satisfy Constraint B — the CONFIRMED portions are necessary but not
sufficient; full compatibility requires semantic stability, which
remains unresolved. A candidate whose compatibility is UNVERIFIED
cannot satisfy Constraint B.

**Constraint C — Explicit Owner designation.** Even when Constraints A
and B are both satisfied, the candidate is not an approved target type
until the Owner makes an explicit designation decision (DR 0002 D6;
DR 0025 §15; DR 0025 §26). An analytical conclusion that a candidate
is eligible does not constitute designation.

## 5. Candidate Inventory — Current Standing

**FACT — updated from DR 0025 §14 to incorporate DR 0026 §11:**

| Candidate | Tier | Constraint A | Constraint B | Constraint C | Eligible? |
|---|---|---|---|---|---|
| Asset | 1 | Satisfied | CONFIRMED | Pending | Yes — awaits Owner |
| Quote | 1 | Satisfied | CONFIRMED | Pending | Yes — awaits Owner |
| Delivery | 2 | Satisfied | Partial CONFIRMED / Partial DEFERRED | Pending | No — Constraint B unmet |
| Campaign | 3 | Not yet satisfied | UNVERIFIED | Pending | No — requires prior analysis |
| Brief | 3 | Not yet satisfied | UNVERIFIED | Pending | No — requires prior analysis |
| Order | 3 | Not yet satisfied | UNVERIFIED | Pending | No — requires prior analysis |
| Brand DNA | 3 | Not yet satisfied | UNVERIFIED | Pending | No — requires prior analysis |
| Production Job | 3 | Not yet satisfied | UNVERIFIED | Pending | No — requires prior analysis |
| AI Generation | 3 | Not yet satisfied | UNVERIFIED | Pending | No — requires prior analysis |

**APPROVED analytical conclusion:** of all candidates, Asset and Quote
are the only ones currently eligible for Owner designation under all
three constraints. Delivery is eligible for Constraint A (Tier 2) but
not yet for Constraint B (semantic stability DEFERRED). Tier 3
candidates are not eligible for either Constraint A or B without
intervening analysis.

**This table replaces no prior decision.** DR 0025's evidentiary
hierarchy (§14) remains authoritative; this table adds the Constraint B
update DR 0026 §11 introduced for Delivery, and restates the
three-constraint framework to make eligibility explicit.

## 6. Evidence Requirements for Designation

**APPROVED framework — derived from DR 0002 D6, DR 0023 §13, and
DR 0025 §15:**

Before the Owner may validly designate any candidate as an approved
V1 Approval target type, the following must be true:

1. **A Decision Record establishes the candidacy.** The candidate must
   have at minimum a Tier 2 evidentiary basis: it was named, not merely
   assumed, as a plausible Approval target in an authoritative context.
   For Tier 3 candidates, a dedicated analysis record establishing
   candidacy must precede designation.

2. **Immutable-reference compatibility is fully confirmed.** The
   candidate row must satisfy all three conditions of DR 0026 §2's
   decomposition: (a) row identity stability, (b) state stability in
   the targeting condition (terminal state if applicable), and (c)
   semantic stability — the row's meaning must be determinable and
   historically fixed. A partial CONFIRMED (as for Delivery) does not
   satisfy this requirement.

3. **The Owner makes an explicit designation decision.** The decision
   must state which candidate(s) are designated and from which Decision
   Record the designation takes effect. Inference from analytical
   conclusions, evidentiary tier, or compatibility findings does not
   constitute designation.

**What designation does not require:**

4. **Physical schema design need not precede designation.** The Owner
   may designate a type while the physical column layout, FK design, and
   migration remain DEFERRED engineering tasks. DR 0002 D6's sequence
   is: target-type set decided "separately before physical schema
   design" — designation is the gate, not the conclusion, of schema
   design. The schema work follows a designation; it does not enable it.

5. **Role-per-target-type mapping need not precede designation.** DR
   0024 §23 item 1 defers role-per-type mapping to after the type set
   is known. Designation unlocks that work; it does not require it to
   be complete first.

6. **All types need not be designated simultaneously.** Candidates
   may be designated one at a time, in any order, as they individually
   satisfy all three constraints. A decision to designate Asset does
   not require a simultaneous decision on Quote, Delivery, or any
   other candidate.

## 7. Independence of Candidate Designation

**APPROVED (INFERENCE, consistent with DR 0023 §10 and DR 0025 §16):**

Each candidate's designation is independent. Designating Asset does
not require designating Quote; designating Quote does not require
designating Asset; neither requires resolving Delivery. This follows
from three features of the approved architecture:

- Model A's typed target model expresses (target type, target
  identity) per Approval record (DR 0023 §9). The type discriminator
  selects one type per record; different records may select different
  types. Adding one type to the approved set does not affect records
  using another type.
- Satisfaction mechanics (DR 0022 §7, DR 0023 §7) depend on the
  Required Approval's own identity, not on the Approval's target type.
  Satisfaction operates identically across all target types.
- Actor authority (DR 0024) applies at the RBAC-role level
  independently of target type. The role-per-type mapping (DR 0024
  §23 item 1) is a subsequent refinement, not a prerequisite for
  designating any particular type.

**Consequence:** the Owner may designate Asset, leave Quote as
DEFERRED, and the system's logical model functions correctly for
Asset-targeting Approvals — the absence of a Quote designation does not
invalidate Asset-targeting Approvals, and vice versa.

## 8. DEFERRED Candidates — Blocking Analysis

**APPROVED (INFERENCE, consistent with DR 0025 §16, DR 0022 §7):**

A DEFERRED or UNVERIFIED candidate does not block the designation or
operation of an independently eligible candidate. Specifically:

- Delivery's Tier 2 DEFERRED status and its unresolved semantic
  stability (DR 0026 §10) do not block Asset's or Quote's designation.
  Asset and Quote have already satisfied Constraints A and B
  independently (§5). The prerequisite blocking Delivery's designation
  (Delivery→Asset cardinality → semantic stability) is internal to
  Delivery's own qualification path.
- Tier 3 candidates' UNVERIFIED status does not block any Tier 1 or
  Tier 2 candidate. Their absence from the target-type discussion is an
  evidentiary gap in their own path, not a constraint on candidates
  already analyzed.
- The Order completion guard (DR 0012) and satisfaction mechanics (DR
  0017–0022) operate identically regardless of which target types are
  in the approved set. These systems ask whether Required Approvals
  are satisfied — they do not depend on what types are approved.

**DEFERRED candidates do not block schema design for designated
types.** Once the Owner designates Asset as an approved type, the
physical schema for Asset-targeting Approvals may be designed, even
while Delivery remains DEFERRED. The schema for a DEFERRED type is
simply not designed until that type is designated.

## 9. Physical DB Representation — Decoupled from Designation

**APPROVED (drawn from DR 0002 D6, DR 0023 §10, DR 0023 §22 item 6,
DR 0025 §15 item c):**

The Owner's designation of a target type is a logical/governance
decision. It is distinct from, and upstream of, the physical database
representation of that type in Approval records. Specifically:

- **Designation** establishes which entity class may be referenced by
  an Approval record's target fields. It is a named Owner decision
  expressed in a Decision Record.
- **Physical schema design** determines the column layout, FK type, FK
  constraint, CHECK constraint, and NULL policy that implement Model A
  (type + identity) for the designated set of types. This is an
  engineering task, DEFERRED, governed by DR 0023 §22 item 6 and DR
  0025 §25 item 4.
- **Migration** creates the physical schema in the database. Downstream
  of schema design; also DEFERRED and not authorized by designation
  alone.
- **Runtime enforcement** implements the immutable-reference constraint
  (DR 0023 §13), tenant isolation (DR 0023 §19; DR 0024 §20; DR 0025
  §22), and terminal-state pre-condition for Delivery (DR 0026 §16).
  Also DEFERRED; also downstream of schema design.

**The sequence is:** designation → schema design → migration →
implementation. A designation decision enables, but does not authorize,
the downstream steps. Each downstream step requires its own explicit
approval. This record does not collapse those steps.

**INFERENCE:** the Owner can designate a type at any point where
Constraints A–C (§4) are satisfied. The absence of schema design is
not a reason to delay designation, and the existence of a schema design
proposal is not a substitute for Owner designation.

## 10. The Designation Decision Boundary

**APPROVED framework — synthesizing DR 0002 D6, DR 0023 §10, DR 0024
§13, DR 0025 §15:**

The Owner's target-type designation decision has a precise boundary.
It includes:

**Within the Owner's designation:**
- Naming which candidate entity types are approved V1 Approval
  target types.
- Setting the temporal scope: from which record forward the designation
  applies (prospective only — it does not retroactively alter existing
  Approval records or Requirements Snapshots, per DR 0025 §21).
- Deciding in what order candidates are designated, if not
  simultaneously.
- Deciding whether to evaluate and designate any Tier 3 candidates
  (Campaign, Brief, Order, Brand DNA) or to exclude them from V1.

**Outside the Owner's designation — engineering/deferred:**
- Physical schema design for target references in Approval records.
- Migration implementing that schema.
- Runtime enforcement of DR 0023 §13 (immutable-reference constraint).
- Runtime enforcement of tenant isolation on target rows.
- Role-per-target-type mapping (which roles hold creation/decision
  authority for which types).
- Workflow routing (how PENDING Approvals are surfaced to the
  appropriate decision-maker).
- Terminal-state pre-condition enforcement for Delivery (if and when
  designated).
- Delivery→Asset cardinality resolution (prerequisite for Delivery
  designation — an engineering/data-model question, not the Owner's
  designation call).

**INFERENCE:** the Owner's designation is a declarative act: "Asset is
an approved V1 target type." It does not specify implementation
details. Engineering receives the designation as an architectural
input and proceeds to schema design within the existing constraints
(DR 0002 D1–D6, DR 0023 §13, DR 0025 §22, etc.).

## 11. Interaction: DR 0012 Order Completion Guard

**No change to DR 0012. No conflict.**

**APPROVED (reaffirmed from DR 0025 §19, DR 0026 §17):** the Order
`ACTIVE` → `COMPLETED` guard evaluates whether each Required Approval
obligation is satisfied by an APPROVED Approval record (DR 0012; DR
0017 §5–§7; DR 0018 §8). This evaluation uses the Required Approval
identity (layer 2 in §3) and the satisfaction reference (layer 7) —
both of which are independent of the Approval target type (layer 4).

**Consequence of designation on DR 0012:** designating Asset or Quote
as an approved target type changes what Approval records may concern
(their target); it does not change how the guard determines whether
Required Approvals are satisfied. The guard does not inspect target
type. No Required Approval is automatically created or satisfied by a
target-type designation. DR 0012 is unaffected by the designation
decision, by which candidate is designated, by the order of
designations, and by the remaining DEFERRED and UNVERIFIED candidates.

## 12. Interaction: DR 0017–0022 Requirement Satisfaction

**No conflict — satisfaction is orthogonal to target type.**

**APPROVED (reaffirmed from DR 0022 §7, DR 0023 §7, DR 0025 §16):**
satisfaction of a Required Approval uses a reference from an Approval
record to the Required Approval's own identity (layer 2). The Approval
record's target (layer 3) is neither inspected nor required to be of
any particular type for satisfaction to occur. This independence was
established in DR 0022 §7, confirmed in DR 0023 §7, and reaffirmed
in DR 0025 §16.

**Designation does not alter satisfaction mechanics.** Adding Asset or
Quote to the approved set does not change how satisfaction is tested.
Removing Delivery from consideration does not alter how existing
Approval records satisfy their Required Approvals. DR 0017–0022's
findings carry forward unchanged regardless of which types are
eventually designated.

**AND-semantics across requirements (DR 0018 §8) and one-to-one
default (DR 0018 §9; DR 0022 §13) remain unchanged.** The designation
decision does not introduce ANY-semantics, shared-target satisfaction,
or bundled Approval models — these remain DEFERRED as in DR 0022 §13.

## 13. Interaction: DR 0024 Actor Authority

**No conflict — actor authority is independent of target type.**

**APPROVED (reaffirmed from DR 0024 §13, DR 0025 §18):** DR 0024's
Role Authority Matrix (§13) applies to every Approval record regardless
of what type it targets. The matrix is not gated on the target-type set;
it was established independently.

**Effect of designation on DR 0024:** once the Owner designates
specific types, two downstream engineering tasks are unlocked:

1. **Role-per-target-type mapping** (DR 0024 §23 item 1): which roles
   hold creation and decision authority for each specific designated
   type. This is a refinement of DR 0024's role framework applied to
   each type, not a change to the framework itself.
2. **CLIENT scope definition** (DR 0024 §12, §22 item 1): the
   "contractual scope" governing CLIENT decision authority is dependent
   on the target-type set. Once Asset and/or Quote are designated, the
   boundaries of CLIENT authority can be made concrete.

Both are engineering/deferred tasks that the designation enables, not
prerequisites for the designation itself. DR 0024's structural
principles — creator/decision-maker separation (§5), AGENT exclusion
(§7, §11), QC exclusion from APPROVED/REJECTED (§8), CREATIVE/
PRODUCTION exclusion from APPROVED/REJECTED (§7) — are unaffected.

## 14. Interaction: DR 0026 Delivery Compatibility

**DR 0026 narrows but does not close Delivery's prerequisite for
designation.**

**FACT:** DR 0026 §11 produced a partial compatibility verdict for
Delivery: row identity stability and terminal-state stability (for
COMPLETED rows) are CONFIRMED; semantic stability is DEFERRED pending
Delivery→Asset cardinality resolution (DR 0011 §9; DR 0020 §17 item 2).
Full DR 0023 §13 compatibility is therefore DEFERRED (DR 0026 §11).

**Consequence for Delivery's designation path:**

- Constraint B (§4) is not yet satisfied for Delivery. Partial
  CONFIRMED is not sufficient; all three compatibility conditions (row
  identity, state stability, semantic stability) must be confirmed.
- Delivery→Asset cardinality must first be resolved (a separately
  deferred engineering question); then semantic stability must be
  re-assessed in a successor record; then, if semantic stability is
  confirmed, Constraint B is satisfied and the Owner may designate
  Delivery.
- DR 0026 §12's non-terminal exclusion is a structural consequence that
  carries forward: if Delivery is ever designated, only COMPLETED
  Delivery rows may be targeted. This is not a new rule introduced here
  — it follows from DR 0023 §13 as analyzed in DR 0026 §6.

**DR 0026 does not change Delivery's Tier 2 DEFERRED status.** Delivery
remains at Tier 2 from DR 0025 §14. It is more precisely characterized
(two of three conditions confirmed), but not closer to satisfying
Constraint B until Delivery→Asset cardinality is resolved.

**DR 0026 does not affect the designation path of Asset or Quote.** The
DEFERRED items in DR 0026 are internal to Delivery's path. Asset and
Quote satisfy Constraint B independently.

## 15. Owner Decisions vs. Engineering/Deferred Questions

**APPROVED classification (synthesizing DR 0023, DR 0024, DR 0025,
DR 0026):**

### Owner Decisions

The following require an explicit Owner decision. No engineering action
can substitute for them:

1. **Designation of Asset as a V1 Approval target type.** Currently
   eligible: Tier 1 (DR 0025 §6), Constraint B satisfied (DR 0023 §14),
   Constraint C pending. Requires only the explicit Owner decision.
2. **Designation of Quote as a V1 Approval target type.** Currently
   eligible: Tier 1 (DR 0025 §7), Constraint B satisfied (DR 0025 §7),
   Constraint C pending. Requires only the explicit Owner decision.
3. **Decision on Tier 3 candidates.** Whether to evaluate Campaign,
   Brief, Order, Brand DNA, Production Job, or AI Generation as V1
   target candidates, or to exclude them from V1. Currently UNVERIFIED;
   neither designated nor rejected. A decision to evaluate any Tier 3
   candidate triggers a prior analysis record (not a schema decision).
4. **Designation of Delivery**, once engineering prerequisites are
   satisfied. Not currently eligible (Constraint B unmet). Becomes an
   Owner decision only after: (a) Delivery→Asset cardinality is
   resolved, (b) semantic stability is re-assessed and confirmed, and
   (c) full DR 0023 §13 compatibility is established.

### Engineering/Deferred Questions

The following are not Owner designation decisions; they are engineering
or analytical tasks, gated on upstream inputs:

1. **Physical schema design** for Approval target references — columns,
   FKs, CHECK constraints; DEFERRED; gated on designation (DR 0023
   §22 item 6; DR 0025 §25 item 4).
2. **Migration** implementing that schema — gated on schema design.
3. **Role-per-target-type mapping** — applying DR 0024's role framework
   to each designated type; DEFERRED (DR 0024 §23 item 1; DR 0025
   §25 item 3); gated on designation.
4. **Delivery→Asset cardinality** — the specific engineering/data-model
   decision about the relationship between Delivery and Asset rows;
   DEFERRED (DR 0011 §9; DR 0020 §17 item 2); prerequisite for
   Delivery's Constraint B.
5. **Semantic stability re-assessment for Delivery** — a successor
   analysis record after Delivery→Asset cardinality is resolved;
   DEFERRED (DR 0026 §23 item 2).
6. **Terminal-state enforcement** for Delivery targeting — runtime
   enforcement that only COMPLETED Delivery rows may be targeted;
   DEFERRED (DR 0026 §23 item 6); gated on Delivery designation.
7. **Tenant/RLS enforcement** for target rows (DR 0023 §19; DR 0024
   §20; DR 0025 §22) — DEFERRED; gated on schema design.
8. **Actor attribution implementation** (DR 0024 §14, §22 item 7) —
   DEFERRED; gated on schema design.
9. **Workflow routing** — how PENDING Approvals are surfaced to
   decision-makers (DR 0024 §22 item 4; DR 0025 §25 item 7) —
   DEFERRED; gated on designation and role-per-type mapping.
10. **CLIENT scope definition** for each designated type — the exact
    contractual boundary of CLIENT decision authority (DR 0024 §12,
    §22 item 1) — DEFERRED; gated on designation.
11. **Analysis records for Tier 3 candidates** — if the Owner decides to
    evaluate any Tier 3 candidate, a prior analysis record establishing
    candidacy and assessing Constraint B is required before that
    candidate can be designated.
12. **Expiration and cancellation mechanics** per target type (DR 0024
    §23 items 5–6; DR 0025 §25 item 6) — DEFERRED.

## 16. Rejected Alternatives

- Designating any candidate as an approved target type by analytical
  conclusion alone — rejected; Constraint C (explicit Owner decision)
  is not satisfiable by inference, even when Constraints A and B are
  both met (§4). DR 0025 §24 already established this; the conclusion
  is unchanged.
- Treating Tier 1 evidentiary standing as authorization — rejected
  (§4 Constraint A; DR 0025 §14); Tier 1 means the question was
  foreseen and preserved, not that the answer is affirmative.
- Treating partial Constraint B satisfaction (Delivery's CONFIRMED
  row identity and state stability) as full satisfaction — rejected
  (§4 Constraint B; DR 0026 §11); all three compatibility conditions
  are necessary; semantic stability is not confirmed.
- Requiring schema design before designation — rejected (§6, §9); DR
  0002 D6 explicitly sequences designation before schema design, not
  the reverse.
- Requiring all candidates to be designated simultaneously — rejected
  (§7); Model A's typed target model and the independence of
  satisfaction mechanics make per-candidate sequential designation
  architecturally valid.
- Requiring Delivery to be designated before Asset or Quote — rejected
  (§7, §8); Delivery's DEFERRED status is internal to its own
  qualification path and does not block independently eligible
  candidates.
- Blocking schema design for designated types pending resolution of
  DEFERRED candidates — rejected (§8); once a type is designated, its
  schema design may proceed. DEFERRED candidates' schema work simply
  remains DEFERRED.
- Treating DR 0026's partial CONFIRMED finding as designation of
  Delivery — rejected (§14; DR 0026 §11); DR 0026 characterizes
  compatibility, it does not designate. Constraint C requires an
  explicit Owner decision, not a compatibility finding.
- Inventing a "provisional designation" that enables schema work before
  full Constraint B satisfaction — rejected; no such concept exists in
  DR 0002 D6 or any prior record; introducing it here would invent a
  new governance mechanism not approved by any prior record.
- Resolving Delivery→Asset cardinality in this record — rejected; not
  within this record's scope, not approved by any prior record for
  this session, and the task explicitly instructs not to invent
  Delivery→Asset cardinality.
- Treating a candidate's own lifecycle `APPROVED` state (e.g., Brief's
  — DR 0004) as evidence of Approval-target candidacy — rejected
  (DR 0025 §10); lifecycle states in an entity's own state machine are
  not evidence that a separate Approval record targets that entity.

## 17. Deferred Decisions

1. **Owner designation of Asset** — currently eligible under all three
   constraints (§5); awaits explicit Owner decision.
2. **Owner designation of Quote** — currently eligible under all three
   constraints (§5); awaits explicit Owner decision.
3. **Owner decision on Tier 3 candidates** — whether any of Campaign,
   Brief, Order, Brand DNA, Production Job, or AI Generation will be
   evaluated as V1 target candidates (§15 Owner item 3).
4. **Delivery→Asset cardinality resolution** — engineering prerequisite
   for Delivery's Constraint B (DR 0011 §9; DR 0020 §17 item 2;
   DR 0026 §23 item 1).
5. **Delivery semantic stability re-assessment** — analysis record
   required after item 4 is resolved; prerequisite for Delivery's
   Constraint B (DR 0026 §23 item 2).
6. **Owner designation of Delivery** — becomes possible only after
   items 4–5 produce full DR 0023 §13 compatibility confirmation;
   then awaits explicit Owner decision (§15 Owner item 4).
7. **Physical schema design** for designated type(s) — gated on
   item 1 and/or item 2 (§9; DR 0025 §25 item 4).
8. **Role-per-target-type mapping** for designated type(s) — gated on
   item 1 and/or item 2 (§15 Engineering item 3; DR 0024 §23 item 1).
9. **CLIENT scope definition** for each designated type — gated on
   item 1 and/or item 2 (§15 Engineering item 10; DR 0024 §22 item 1).
10. **All prior deferred items** from DR 0024, DR 0025, and DR 0026
    not addressed here remain independently unresolved and unchanged.

## 18. Final Recommendation

**PROPOSED — presented for Owner review.**

The governance framework for Approval target-type designation is now
complete. The Owner's designation decision (Constraint C, §4) is the
sole remaining blocker for Asset and Quote. No analysis record,
compatibility study, or engineering work is required before the Owner
may designate either.

Summary of current designation eligibility:

- **Asset** — eligible now. Constraints A (Tier 1), B (CONFIRMED via
  DR 0023 §14), and C (pending Owner decision) are all assessable.
  Awaits only the Owner's explicit designation.
- **Quote** — eligible now. Constraints A (Tier 1), B (CONFIRMED via
  DR 0025 §7), and C (pending Owner decision) are all assessable.
  Awaits only the Owner's explicit designation.
- **Delivery** — not yet eligible. Constraint B (semantic stability)
  is DEFERRED pending Delivery→Asset cardinality resolution. The
  designation path requires: (a) Delivery→Asset cardinality resolved,
  (b) semantic stability confirmed in a successor record, then (c)
  explicit Owner designation decision.
- **Campaign, Brief, Order, Brand DNA, Production Job, AI Generation**
  — not yet eligible. Constraint A is not satisfied; no authoritative
  evidentiary basis exists. Prior analysis records are required before
  the Owner can validly designate any of them.

A designation of Asset and/or Quote unlocks the following engineering
work: physical schema design, migration, role-per-target-type mapping,
CLIENT scope definition, and workflow routing (§15 Engineering). None
of that work is authorized until at least one designation is made.

## Consistency with Decision Records 0001–0026

- Consistent with 0001/0002: D6 typed-target-model-in-principle
  (§3 layer 4) and sequential-before-schema-design framing (§9) are
  applied unchanged; D1 tenant isolation (§9) is preserved.
- Consistent with 0003–0009: none is directly implicated; their
  entities appear only as target candidates assessed by evidentiary
  standing (§5).
- Consistent with 0010 (Approval): no target type is resolved or
  designated; the Approval state machine is unmodified; DR 0010's
  DEFERRED items are not re-opened.
- Consistent with 0011 (Delivery): no new state or transition;
  Delivery→Asset cardinality remains DEFERRED (§14; DR 0026 §9).
- Consistent with 0012 (Completion Guard): unaffected (§11).
- Consistent with 0013–0016: Order Requirements Snapshot,
  source-of-truth, and qualification mechanics are unaffected.
- Consistent with 0017–0022 (Satisfaction): confirmed orthogonal (§12);
  satisfaction mechanism unchanged.
- Consistent with 0023 (Target Model): Model A, immutable-reference
  principle, and target-type-set/shape separation all carry forward
  unchanged (§4, §9, §10).
- Consistent with 0024 (Actor Authority): role authority independence
  confirmed (§13); role-per-type mapping identified as downstream
  engineering work (§15 Engineering item 3).
- Consistent with 0025 (Target-Type Set): evidentiary hierarchy and
  candidate standings updated for DR 0026's Delivery finding (§5);
  no candidate is promoted; Owner designation authority is preserved.
- Consistent with 0026 (Delivery Compatibility): partial compatibility
  finding accurately represented (§4 Constraint B; §5; §14); Delivery
  remains Tier 2 DEFERRED; no new compatibility claim is made.
- No Decision Record 0001–0026 is modified, reinterpreted, or
  superseded by this record.

## Explicitly Prohibited Assumptions

- Do not assume Asset is designated as an approved Approval target type
  — it is not; it is eligible for designation (§5), awaiting the
  Owner's explicit decision.
- Do not assume Quote is designated as an approved Approval target type
  — it is not; same standing as Asset (§5).
- Do not assume Delivery is eligible for designation — Constraint B
  is not yet satisfied (§4, §5, §14).
- Do not assume Tier 3 candidates (Campaign, Brief, Order, Brand DNA,
  Production Job, AI Generation) have been analyzed or are eligible —
  they are UNVERIFIED and require prior analysis records (§5).
- Do not assume that Constraint A or B satisfaction implies Constraint C
  satisfaction — Owner designation is a separate, explicit act (§4).
- Do not assume that physical schema design, migration, or
  implementation are authorized by this record — designation is a
  prerequisite for schema design; schema design is a prerequisite for
  migration (§9).
- Do not assume that Delivery's Tier 2 status or DR 0026's CONFIRMED
  findings constitute designation of Delivery — they characterize
  compatibility, not authorization (§14).
- Do not assume that designating one candidate requires or implies
  the simultaneous designation of another (§7).
- Do not assume that DEFERRED or UNVERIFIED candidates block the
  designation or operation of eligible candidates (§8).
- Do not assume DR 0012 has been modified (§11).
- Do not assume DR 0017–0022's satisfaction mechanics have been
  modified (§12).
- Do not assume DR 0024's actor authority framework has been modified
  (§13).
- Do not assume Delivery→Asset cardinality has been resolved (§14;
  DR 0026 §9).
- Do not assume any financial event is triggered or inferred from a
  target-type designation or from any Approval's target (§23 of
  DR 0025, unchanged).
- Do not assume this record authorizes schema creation, migration
  creation, dependency installation, code changes, or implementation.
- Do not assume Decision Records 0001–0026 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
