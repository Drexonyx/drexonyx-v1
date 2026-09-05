# Decision Record 0028 — Phase 02 Round 02B: Approval Target Designation — Asset and Quote

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner approval. If the Owner
  approves this record, Asset and Quote become the designated V1
  Approval target types, with the exact consequences stated in §6 and
  §8. No schema, migration, or implementation is authorized by approval
  of this record alone. Delivery remains DEFERRED. Tier 3 candidates
  remain UNVERIFIED.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0027. All remain authoritative and unchanged. This record applies
  the governance framework established in DR 0027 §4 to the two
  currently eligible candidates, confirms that both satisfy all three
  designation constraints, and presents Owner designation of Asset and
  Quote as the proposed resolution to the long-standing deferred item
  opened by DR 0002 D6 ("target-type set will be decided separately
  before physical schema design"). It directly resolves: DR 0006
  Deferred Item "Whether Asset is a valid Approval target type," DR 0005
  Deferred Item "Exact Approval target relationship for Quote" (in part),
  DR 0010 Deferred Item 1 "Exact approvable target types" (partially —
  for Asset and Quote; Delivery and Tier 3 remain open), and DR 0023
  §22 item 1.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from
0013–0027. This record proposes the Owner designation of Asset and
Quote but does not itself constitute that designation — Owner approval
of this record is the act of designation.

## 1. Context

Decision Record 0027 established the three-constraint governance
framework for Approval target-type designation (Constraint A:
candidacy evidence; Constraint B: immutable-reference compatibility;
Constraint C: explicit Owner designation). It identified Asset and
Quote as the only two candidates currently satisfying Constraints A and
B, and named Constraint C — the explicit Owner decision — as the sole
remaining requirement for their designation. This record verifies those
constraints afresh from first-principles evidence, presents the exact
terms and consequences of each designation, and frames both for Owner
approval.

## 2. Problem

The Approval entity's physical schema design cannot begin until the
V1 Approval target-type set is resolved (DR 0002 D6; DR 0027 §2).
Asset and Quote are the only candidates presently eligible for
designation (DR 0027 §5). This record resolves the open question for
those two candidates, without touching Delivery (still DEFERRED per
DR 0026 §11) or Tier 3 candidates (Campaign, Brief, Order, Brand DNA,
Production Job, AI Generation — all UNVERIFIED per DR 0025 §14).

## 3. Conceptual Layer Separation

**APPROVED (reaffirmed from DR 0027 §3; not re-decided here):**

The following layers remain distinct throughout this record:

1. **Approval identity:** the unique identity of an Approval record
   (UUID v7, DR 0002 D2). One record = one formal decision event.
2. **Required Approval identity:** the unique identity of a Required
   Approval obligation within an Order's Requirements Snapshot (DR 0022
   §4). Independent of the Approval record that satisfies it.
3. **Approval target identity:** the identity of the specific row an
   Approval record concerns (DR 0023 §5–§6). If Asset is designated,
   this is a specific Asset row's UUID. If Quote is designated, this
   is a specific Quote row's UUID.
4. **Target type:** the class of entity the Approval target belongs to
   — "Asset" or "Quote." This record proposes both as approved V1
   types.
5. **Candidate status:** evidentiary standing per DR 0025 §14. Tier 1
   for both Asset and Quote; this layer is distinct from designation.
6. **Actor authority:** RBAC-role rules governing who may create and
   decide Approvals (DR 0024). Independent of target type; not changed
   by this record.
7. **Satisfaction reference:** the mechanism by which an Approval
   satisfies a Required Approval obligation — uses Required Approval
   identity (layer 2), independent of Approval target identity (layer 3)
   (DR 0022 §7; DR 0023 §7).

These seven layers are not collapsed by this record. Designating Asset
or Quote as a target type resolves layer 4 for those types; it does
not alter layers 1–3 or 5–7.

## 4. DR 0027 Constraint Framework — Applied

**APPROVED constraint framework, DR 0027 §4:**

Constraint A — Candidacy evidence: the candidate must have at minimum
a Tier 2 evidentiary basis (named, not assumed, in an authoritative
Approval-target context).

Constraint B — Immutable-reference compatibility: the candidate's
targeted row must satisfy DR 0023 §13 — immutable, historically-fixed
identity; not a live or mutable concept that could change meaning
after a terminal Approval decision.

Constraint C — Explicit Owner designation: even when A and B are both
satisfied, the candidate is not designated until the Owner makes an
explicit decision.

§5–§8 below verify each constraint for Asset and Quote separately.

## 5. Asset — Constraint Verification

### Constraint A — Candidacy Evidence

**SATISFIED. FACT (DR 0006 Deferred Items):** Decision Record 0006
explicitly lists "Whether Asset is a valid Approval target type" as a
deferred item, and its Prohibited Assumptions section states "Do not
assume Asset is an approved Approval target type." This is Tier 1
evidentiary standing (DR 0025 §14): the question was anticipated within
Asset's own governing record and deliberately preserved for a later
decision. Constraint A is satisfied.

### Constraint B — Immutable-Reference Compatibility

**SATISFIED. APPROVED (DR 0023 §14, drawing on DR 0006):**

Decision Record 0023 §14 states: "an Approval can logically refer to
a specific Asset version without inventing any new concept, because
0006 already makes each Asset revision a distinct row with its own
identity — referring to that row's identity is referring to that
version; no separate 'target version' field or mechanism needs to be
invented."

The mechanism that produces DR 0023 §13 compatibility for Asset is
the row-per-revision principle established in DR 0006: "Each revision
produces a new Asset row/version." The previous version's row is not
mutated; it becomes terminal at `REVISION_REQUIRED`. An Approval's
target reference to a specific Asset row's UUID is therefore a
reference to a historically-fixed object — the row's content (the
Asset files, version, QC outcome that cleared it to `CLIENT_PREVIEW`)
does not change after the row is created, regardless of what lifecycle
state transitions occur afterward. DR 0023 §14 confirmed this without
reservation. Constraint B is satisfied for Asset.

**No new versioning concept is introduced.** DR 0006's row-per-revision
design is the complete and sufficient mechanism. This record does not
add to it.

### Constraint C — Owner Designation

**PENDING.** This record proposes the designation. Constraint C is
satisfied when, and only when, the Owner approves this record. Until
that approval, Asset remains in its current state: Tier 1 DEFERRED,
eligible for designation, not yet designated.

**Proposed designation (§6):** Asset is a V1 Approval target type.

## 6. Asset — Proposed Designation and Consequences

**PROPOSAL — presented for Owner approval:**

**Proposed designation:** Asset is a designated V1 Approval target
type. An Approval record may reference a specific Asset row — by its
UUID v7 identity — as the Approval's formal decision subject (its
target, in the sense of DR 0023 §5–§6 and Model A).

**If the Owner approves this record, the following consequences take
effect immediately and prospectively:**

1. **DR 0006 Deferred Item resolved:** "Whether Asset is a valid
   Approval target type" is resolved: YES. The Prohibited Assumption
   "Do not assume Asset is an approved Approval target type" is lifted
   for Approval records created after this record's approval.

2. **DR 0010 Deferred Item 1 partially resolved:** "Exact approvable
   target types" now includes Asset. Quote's resolution is in §8.
   Delivery and Tier 3 candidates remain open.

3. **DR 0023 §22 item 1 partially resolved:** the target-type set now
   includes Asset (and Quote upon §8's approval). The physical schema
   design prerequisite from DR 0002 D6 is partially met.

4. **Schema design gate opened for Asset:** engineering may proceed to
   design the physical representation of an Approval record's target
   reference to an Asset row — column layout, FK type, CHECK constraint,
   null policy — within the constraints of DR 0002 D1/D2/D6, DR 0023
   §13, and DR 0025 §22. This is an engineering task; schema design is
   not authorized by this record.

5. **Role-per-type mapping gate opened for Asset:** DR 0024 §23 item 1
   (role-per-target-type mapping) may now be addressed for Asset-
   targeting Approvals — which roles hold creation and decision authority
   for Approvals that target Asset rows. This is a downstream
   engineering/governance task; it is not resolved by this record.

6. **Prospective only:** this designation does not retroactively alter
   any existing Approval records, Required Approval obligations, or
   Order Requirements Snapshots (DR 0025 §21). It governs only Approval
   records created after this record's approval.

7. **Asset's own lifecycle is unchanged:** DR 0006's state machine
   (UPLOADED, PROCESSING, READY_FOR_QC, CLIENT_PREVIEW,
   REVISION_REQUIRED, REJECTED) is not modified. `APPROVED` remains
   explicitly not an Asset state (DR 0006 Rejected States). An
   Approval record's terminal state of APPROVED is the Approval's own
   status; it does not advance Asset's lifecycle state.

8. **Approval and Asset remain separate entities:** DR 0006's
   architectural consequence "Any future Approval or Delivery
   implementation must reference Asset by its own identity without
   expecting Asset's status column to reflect approval or delivery
   outcomes" is preserved unchanged. The Approval targeting an Asset
   row does not write to that Asset row's `status` column.

**What this designation does NOT authorize:**
- Physical schema design for the target reference (engineering,
  DEFERRED).
- Migration implementing that schema (engineering, DEFERRED).
- Role-per-target-type mapping for Asset-targeting Approvals
  (engineering/governance, DEFERRED).
- Any specific Asset lifecycle state as a required pre-condition for
  targeting (engineering, DEFERRED).
- Any new relationship between Asset's QC Review and the Approval
  entity beyond what DR 0006 already establishes.
- Any implementation, dependency installation, or code change.

## 7. Quote — Constraint Verification

### Constraint A — Candidacy Evidence

**SATISFIED. FACT (DR 0005 Deferred Items):** Decision Record 0005
explicitly lists "Exact Approval target relationship for Quote" as a
deferred item, and its Prohibited Assumptions section states "Do not
assume Quote is an approved Approval target type." This is identical
Tier 1 evidentiary standing to Asset (DR 0025 §14, §7): the question
was anticipated within Quote's own governing record. Constraint A is
satisfied.

### Constraint B — Immutable-Reference Compatibility

**SATISFIED. APPROVED (DR 0025 §7, drawing on DR 0005 Boundary 5 and
DR 0023 §13):**

Decision Record 0023 §13 cited the cancel-and-new pattern explicitly
as satisfying the immutable-reference principle. Decision Record 0005
Boundary 5 establishes that pattern for Quote: "Post-SENT changes do
not use SENT → DRAFT. If a sent Quote must be changed, the approved
direction is: cancel the existing Quote, create a new Quote." Decision
Record 0025 §7 confirmed: "Structural compatibility with §13 is
CONFIRMED."

The mechanism that produces DR 0023 §13 compatibility for Quote is the
prohibition on in-place content mutation: a Quote row's commercial
terms (pricing, scope, conditions) are fixed at creation. If those
terms must change, the existing Quote is CANCELLED (a terminal state
— DR 0005) and a new Quote row is created. An Approval's target
reference to a specific Quote row's UUID is therefore a reference to
fixed commercial terms that cannot be silently altered. Later lifecycle
state transitions (SENT → ACCEPTED, SENT → REJECTED, SENT → EXPIRED,
SENT → CANCELLED) do not change the terms the row represents; they
record the outcome of the commercial process. Constraint B is satisfied
for Quote.

**INFERENCE:** the cancel-and-new pattern's effect on immutable-
reference compatibility is structurally equivalent to Asset's
row-per-revision effect: in both cases, content changes produce new
rows, preserving the historical meaning of any row already targeted by
an Approval. The mechanism differs (new row on revision for Asset; new
row on supersession for Quote), but the result — content-stable rows
once created — is the same.

### Constraint C — Owner Designation

**PENDING.** This record proposes the designation. Constraint C is
satisfied when, and only when, the Owner approves this record.

**Proposed designation (§8):** Quote is a V1 Approval target type.

## 8. Quote — Proposed Designation and Consequences

**PROPOSAL — presented for Owner approval:**

**Proposed designation:** Quote is a designated V1 Approval target
type. An Approval record may reference a specific Quote row — by its
UUID v7 identity — as the Approval's formal decision subject (its
target, in the sense of DR 0023 §5–§6 and Model A).

**If the Owner approves this record, the following consequences take
effect immediately and prospectively:**

1. **DR 0005 Deferred Item partially resolved:** "Exact Approval target
   relationship for Quote" is partially resolved: Quote is an approved
   target type. The "exact" physical FK/column/constraint mechanism
   remains a downstream engineering design task.

2. **DR 0010 Deferred Item 1 further resolved:** "Exact approvable
   target types" now includes Quote (and Asset upon §6's approval).

3. **DR 0023 §22 item 1 further resolved:** the target-type set now
   includes Quote. The physical schema design prerequisite from DR 0002
   D6 is further met.

4. **Schema design gate opened for Quote:** engineering may proceed to
   design the physical representation of an Approval record's target
   reference to a Quote row. This is an engineering task; schema design
   is not authorized by this record.

5. **Role-per-type mapping gate opened for Quote:** DR 0024 §23 item 1
   may now be addressed for Quote-targeting Approvals. DR 0024 §8/§12
   established CLIENT decision authority for client-facing Approvals
   within contractual scope — Quote-targeting Approvals are a likely
   candidate for CLIENT decision authority, but the exact role-per-type
   mapping is a downstream task, not resolved here. No role assignment
   is made by this designation.

6. **Prospective only:** does not alter existing Approval records,
   Required Approval obligations, or Requirements Snapshots (DR 0025
   §21).

7. **DR 0005 Architectural Consequence preserved:** "Any future
   Order-creation logic must treat Quote ACCEPTED, a Client Approval
   record (if Quote is later approved as an Approval target type), and
   Order creation as three separate events/records, not one." This
   consequence now applies without the "if" qualifier: Quote is an
   approved Approval target type. Quote ACCEPTED, an Approval record
   targeting that Quote, and Order creation are three separate events.
   They are not collapsed and their ordering is not established by this
   record.

8. **DR 0005's Approval/Quote state separation preserved:** "No
   Approval states are created by this record" (DR 0005 Boundary 9,
   restated inversely). An Approval record's terminal state of APPROVED
   is not a Quote state. Quote's terminal states remain ACCEPTED,
   REJECTED, EXPIRED, CANCELLED (DR 0005). The Approval's APPROVED
   state and Quote's ACCEPTED state are independent events in
   independent entities.

9. **Quote state machine unchanged:** DR 0005's six states and their
   transitions are not modified.

**What this designation does NOT authorize:**
- Physical schema for the target reference (engineering, DEFERRED).
- Migration (engineering, DEFERRED).
- Role-per-target-type mapping for Quote-targeting Approvals
  (engineering/governance, DEFERRED).
- Any specific Quote lifecycle state as a required pre-condition for
  targeting (engineering, DEFERRED).
- Ordering of Quote state transition and Approval state transition
  (not established; DEFERRED).
- Any specific mechanism for the Approval's decision to drive a Quote
  state transition (not established; DEFERRED).
- Any implementation, dependency installation, or code change.

## 9. Combined Designation Effect

**APPROVED (proposed — contingent on Owner approval of this record):**

If the Owner approves this record, both Asset and Quote are V1
Approval target types. The combined effect is:

- **DR 0002 D6** partially fulfilled: the target-type set is partially
  decided (Asset + Quote). Delivery and Tier 3 candidates remain open.
  Physical schema design for Asset-targeting and Quote-targeting
  Approval records may now proceed.
- **DR 0010 Deferred Item 1** partially resolved: "exact approvable
  target types" includes Asset and Quote. Delivery (Tier 2 DEFERRED)
  and Tier 3 candidates remain listed items in DR 0010 Deferred Items
  1 that are not yet resolved.
- The Approval entity now has a confirmed minimum type set: {Asset,
  Quote}. Additional types (Delivery, or any Tier 3 candidate after
  prior analysis) may be added by future designation decisions without
  modifying this record.
- No candidate is removed from the DEFERRED or UNVERIFIED set by this
  record. Delivery's standing does not change; Tier 3 candidates do
  not change.

**Independence confirmed (DR 0027 §7):** Asset and Quote designations
take effect independently. Approval of this record for both is not
required to be all-or-nothing; however, since this record presents
both together, the Owner's decision applies to the record as a whole.
Future records may designate additional types independently.

## 10. Remaining Engineering Questions

**After designation — engineering tasks unlocked but not authorized:**

**For Asset-targeting Approvals:**
1. Physical schema: column layout for Approval.target_type and
   Approval.target_id referencing an Asset row (DR 0023 §22 item 6;
   DR 0027 §9).
2. Pre-condition on Asset state at targeting time: which Asset
   lifecycle states are valid target states (e.g., must the Asset be
   in `CLIENT_PREVIEW`? any state? DEFERRED).
3. Role-per-target-type mapping: which roles (in DR 0024's framework)
   hold creation and decision authority for Asset-targeting Approvals
   (DR 0024 §23 item 1; DR 0027 §15 Engineering item 3).
4. Tenant enforcement: same-organization cross-check for Asset row
   vs. Approval record (DR 0025 §22; DR 0027 §9).
5. DR 0006's lineage/traceability mechanism between Asset versions
   remains separately DEFERRED (DR 0006 Deferred Items — unchanged).

**For Quote-targeting Approvals:**
6. Physical schema: column layout for Approval.target_type and
   Approval.target_id referencing a Quote row.
7. Pre-condition on Quote state at targeting time: which Quote
   lifecycle states are valid target states (e.g., must the Quote be
   in `SENT`? DEFERRED).
8. Role-per-target-type mapping: which roles hold creation and
   decision authority for Quote-targeting Approvals; CLIENT role
   scope definition for Quote-targeting is a primary candidate (DR
   0024 §12, §22 item 1; DR 0027 §15 Engineering item 10).
9. Temporal ordering of Approval decision and Quote state transition:
   whether the Approval's APPROVED/REJECTED decision triggers the
   Quote's ACCEPTED/REJECTED transition, and how that is enforced
   (DEFERRED; not established by this record).
10. DR 0005's Deferred Items (Exact actor/role permissions for Quote
    transitions; Exact transition guards; Exact expiry implementation
    mechanism) remain independently DEFERRED and are not resolved here.

**Shared engineering tasks:**
11. Actor attribution implementation (DR 0024 §14, §22 item 7) —
    unchanged, DEFERRED.
12. Workflow routing: how PENDING Approvals are surfaced to the
    appropriate decision-maker for each type (DR 0027 §15
    Engineering item 9) — DEFERRED.
13. Expiration and cancellation mechanics per target type (DR 0024
    §23 items 5–6; DR 0025 §25 item 6) — DEFERRED.
14. Tenant/RLS enforcement specific to each designated type (DR 0025
    §25 item 5; DR 0027 §15 Engineering item 7) — DEFERRED.

## 11. Interaction: DR 0012 Order Completion Guard

**No change to DR 0012. No conflict.**

**APPROVED (reaffirmed from DR 0025 §19, DR 0026 §17, DR 0027 §11):**
the Order `ACTIVE` → `COMPLETED` guard evaluates Required Approval
satisfaction using the Required Approval identity (layer 2), not the
Approval target type (layer 4). Designating Asset and Quote as target
types does not change the guard's evaluation logic, the definition of
satisfaction, or the mechanics of DR 0017–0022. DR 0012 is unaffected.

## 12. Interaction: DR 0017–0022 Requirement Satisfaction

**No conflict — satisfaction is orthogonal to target type.**

**APPROVED (reaffirmed from DR 0022 §7, DR 0023 §7, DR 0025 §16,
DR 0027 §12):** satisfaction of a Required Approval uses a reference
to the Required Approval's own identity, independent of what type the
Approval targets. Whether an Approval targets an Asset row, a Quote
row, or any future designated type, the satisfaction mechanic is
identical. AND-semantics across requirements (DR 0018 §8) and one-to-
one default (DR 0018 §9; DR 0022 §13) remain unchanged.

## 13. Interaction: DR 0024 Actor Authority

**No conflict — actor authority is independent of target type.**

**APPROVED (reaffirmed from DR 0024 §13, DR 0025 §18, DR 0027 §13):**
DR 0024's Role Authority Matrix applies to every Approval record
regardless of what it targets. Designation of Asset and Quote unlocks
the role-per-target-type mapping task (DR 0024 §23 item 1; §10 items
3 and 8 above) and enables CLIENT scope definition for each type (§10
item 8 above). Neither the matrix nor any structural rule in DR 0024
is modified. The creator/decision-maker separation (DR 0024 §5)
applies to Approvals targeting Asset or Quote rows exactly as it
applies to any Approval record.

## 14. Interaction: DR 0026 Delivery Compatibility

**No change to DR 0026. No conflict. Delivery remains DEFERRED.**

**FACT:** DR 0026 §11 produced a partial compatibility verdict for
Delivery: row identity and terminal-state stability CONFIRMED; semantic
stability DEFERRED pending Delivery→Asset cardinality. Delivery is not
eligible for designation (DR 0027 §5; Constraint B unsatisfied).
Designating Asset and Quote has no effect on this standing. Delivery
remains Tier 2 DEFERRED from DR 0025 §14 and DR 0026's verdict.

**INFERENCE:** the designation of Asset does not collapse the
Delivery→Asset relationship. Delivery→Asset cardinality (DR 0011 §9;
DR 0020 §17 item 2) remains its own separately deferred question.
Whether Delivery eventually references Asset rows (as its content)
and whether Delivery is eventually designated as an Approval target
type are two independent questions, neither of which is resolved or
influenced by this record.

## 15. Delivery — Status Unchanged

**DEFERRED. Status: unchanged from DR 0025 §14 and DR 0026 §11.**

Delivery is not designated by this record. The prerequisites
blocking Delivery's designation remain:

1. Delivery→Asset cardinality resolution (DR 0011 §9; DR 0020 §17
   item 2) — unresolved.
2. Semantic stability re-assessment after item 1 (DR 0026 §23
   item 2) — not yet possible.
3. Full DR 0023 §13 compatibility confirmation (DR 0026 §11) — DEFERRED
   pending items 1–2.
4. Explicit Owner designation decision — requires items 1–3 first.

No action on Delivery is implied, authorized, or triggered by this
record.

## 16. Tier 3 Candidates — Status Unchanged

**UNVERIFIED. Status: unchanged from DR 0025 §14.**

Campaign, Brief, Order, Brand DNA, Production Job, and AI Generation
are not addressed by this record. Their UNVERIFIED status (no
authoritative evidentiary basis in any Approval-target-type context
in DR 0001–0027) is unchanged. Designation of Asset and Quote has no
effect on their standing.

## 17. Historical Integrity

**Reaffirmed, unchanged from 0014 §14 through 0027 §18:**

Once an Approval record is created targeting a specific Asset or Quote
row, that target reference is permanently fixed and non-revisable. The
Asset row's row-per-revision design (DR 0006) and the Quote row's
cancel-and-new pattern (DR 0005 Boundary 5) ensure that the content
identity of the targeted row is historically stable. An Approval's
terminal state (APPROVED, REJECTED, CANCELLED — per DR 0010) is
itself non-revisable. Combined: an APPROVED Approval targeting an Asset
revision row is a permanent, auditable record of a specific formal
decision on a specific Asset version.

**This record does not alter the historical-integrity rules.** It
confirms that the two designated types are architecturally consistent
with those rules as already established.

## 18. Security / Tenancy

**APPROVED principle, unchanged from DR 0023 §19, DR 0024 §20,
DR 0025 §22, DR 0026 §20, DR 0027 §9:**

Any Asset or Quote row referenced as an Approval target must belong
to the same organization as the Approval record and the Order it
ultimately serves. Cross-tenant target references are never permitted.
The enforcement mechanism (cross-check on organization_id, RLS policy)
is DEFERRED and is not implemented by this record.

## 19. Financial Separation

Unchanged from every prior record: the designation of Asset and Quote
as Approval target types does not represent, and must not be used to
infer, Payment, Revenue, Expense, Profit, Refund, or Owner Settlement.
An Approval targeting an Asset or Quote row has no direct financial
consequence per the architecture.

## 20. Rejected Alternatives

- Designating Asset alone without Quote, or Quote alone without Asset
  — rejected as a presentation choice; both independently satisfy all
  three constraints; there is no reason to delay one relative to the
  other, and presenting both together is more efficient. The Owner may
  approve only one if they choose; this record documents both.
- Designating Delivery alongside Asset and Quote — rejected; DR 0026
  §11 confirms Constraint B is not fully satisfied for Delivery;
  DR 0027 §5 confirms Delivery is not eligible.
- Designating any Tier 3 candidate — rejected; Constraint A is not
  satisfied for any Tier 3 candidate (DR 0027 §4).
- Treating this record's approval as authorization for physical schema
  design, migration, or implementation — rejected; §6 item 4 and §8
  item 4 explicitly identify schema design as a downstream engineering
  task unlocked by, but not authorized by, designation.
- Establishing pre-conditions on Asset or Quote state at targeting time
  — rejected; no prior Decision Record 0001–0027 establishes these
  pre-conditions, and inventing them would exceed the scope of this
  record (§10 items 2 and 7).
- Establishing the ordering between Approval decision and Quote state
  transition — rejected (§8 item 9); not established by any prior
  record; a downstream engineering question.
- Establishing the role-per-target-type mapping for Asset or Quote —
  rejected; this is a downstream task identified explicitly in DR 0024
  §23 item 1 and DR 0027 §15 Engineering item 3; it is gated on
  designation, not concurrent with it.
- Closing DR 0005's or DR 0006's remaining deferred items not related
  to Approval-target designation — rejected; this record resolves only
  the target-type questions those records opened; their other deferred
  items remain independently open.
- Treating Constraint C as satisfiable by analytical conclusion —
  rejected; DR 0027 §4 Constraint C requires an explicit Owner act;
  this record frames that act but does not supply it.

## 21. Deferred Decisions

**After Owner approval of this record (if approved):**

1. **Physical schema design** for Approval target references to Asset
   and Quote rows — engineering, gated on this record's approval
   (DR 0027 §9; §10 items 1 and 6 above).
2. **Role-per-target-type mapping** for Asset-targeting and Quote-
   targeting Approvals — engineering/governance, gated on this record's
   approval (DR 0024 §23 item 1; §10 items 3 and 8 above).
3. **Pre-condition on Asset state** at Approval-targeting time (§10
   item 2).
4. **Pre-condition on Quote state** at Approval-targeting time (§10
   item 7).
5. **Temporal ordering** of Approval decision and Quote state transition
   (§10 item 9).
6. **CLIENT scope definition** for Quote-targeting Approvals (DR 0024
   §22 item 1; §10 item 8).
7. **Workflow routing** for Asset-targeting and Quote-targeting Approvals
   (DR 0027 §15 Engineering item 9).
8. **Tenant/RLS enforcement** for Asset and Quote target rows (DR 0025
   §25 item 5; §10 item 14).
9. **Delivery designation** — still blocked on Delivery→Asset
   cardinality and semantic stability (§15).
10. **All prior deferred items** from DR 0005, DR 0006, DR 0010,
    DR 0023–0027 not addressed here remain independently open and
    unchanged.

## 22. Final Recommendation

**PROPOSED — presented for Owner approval.**

Both Asset and Quote satisfy Constraints A and B of DR 0027's
designation framework. Constraint C — the explicit Owner decision —
is presented here for resolution.

**Proposed designation, for Owner decision:**

> **Asset** is a V1 Approval target type. An Approval record may
> formally concern a specific Asset row, identified by its UUID v7
> identity. This resolves DR 0006 Deferred Item "Whether Asset is a
> valid Approval target type" as: YES.

> **Quote** is a V1 Approval target type. An Approval record may
> formally concern a specific Quote row, identified by its UUID v7
> identity. This partially resolves DR 0005 Deferred Item "Exact
> Approval target relationship for Quote" — Quote is an approved
> target type; the exact physical FK/constraint mechanism is an
> engineering design task.

Upon Owner approval of this record:

- The V1 Approval target-type set is confirmed as: {Asset, Quote}
  (with Delivery and Tier 3 candidates remaining open for future
  decisions).
- Physical schema design for Asset-targeting and Quote-targeting
  Approval records may proceed.
- Role-per-target-type mapping for those types may be addressed.
- DR 0002 D6's prerequisite ("target-type set decided before physical
  schema design") is met for Asset and Quote.

No schema, migration, or implementation is authorized by this record.

## Consistency with Decision Records 0001–0027

- Consistent with 0001/0002: D1 tenant isolation (§18); D2 UUID v7
  identity for Approval records and for the targeted rows (§3 layer 3);
  D6 typed target model in principle (§9 combined effect); no schema
  or migration authorized.
- Consistent with 0005 (Quote): Boundary 5 cancel-and-new pattern
  confirmed as the basis for Constraint B (§7); six states and
  transitions unchanged (§8 item 9); Architectural Consequence
  regarding Quote ACCEPTED / Approval / Order creation preserved
  (§8 item 7).
- Consistent with 0006 (Asset): row-per-revision principle confirmed
  as the basis for Constraint B (§5); six states and transitions
  unchanged (§6 item 7); Architectural Consequence regarding Approval
  reference by identity preserved (§6 item 8); `APPROVED` remains not
  an Asset state (§6 item 7).
- Consistent with 0007–0009: Order, Production Job, AI Generation
  state machines are unaffected.
- Consistent with 0010 (Approval): state machine unchanged; Deferred
  Item 1 partially resolved for Asset and Quote (§9); no state added
  or removed.
- Consistent with 0011 (Delivery): Delivery state machine unchanged;
  Delivery→Asset cardinality remains DEFERRED (§14).
- Consistent with 0012 (Completion Guard): unaffected (§11).
- Consistent with 0013–0016: Order Requirements Snapshot,
  qualification, and source-of-truth mechanics unaffected.
- Consistent with 0017–0022 (Satisfaction): satisfaction mechanics
  orthogonal to target type (§12); unchanged.
- Consistent with 0023 (Target Model): Model A (type + identity)
  reaffirmed (§3); immutable-reference principle (§13) applied to
  confirm Constraint B (§5, §7); target-type-set/shape separation
  preserved.
- Consistent with 0024 (Actor Authority): role authority unchanged
  (§13); role-per-type mapping identified as downstream (§10 items
  3, 8).
- Consistent with 0025 (Target-Type Set): evidentiary hierarchy
  (§14) respected; Asset and Quote at Tier 1 correctly; Delivery at
  Tier 2 unchanged; Tier 3 candidates unchanged.
- Consistent with 0026 (Delivery Compatibility): Delivery DEFERRED
  unchanged (§14, §15).
- Consistent with 0027 (Designation Boundary): three-constraint
  framework applied directly (§4–§8); independence of designation
  confirmed (§9); DEFERRED/UNVERIFIED candidates not disturbed (§15,
  §16).
- No Decision Record 0001–0027 is modified, reinterpreted, or
  superseded by this record.

## Explicitly Prohibited Assumptions

- Do not assume Asset is designated as a V1 Approval target type until
  the Owner explicitly approves this record — it is proposed, not yet
  designated.
- Do not assume Quote is designated as a V1 Approval target type until
  the Owner explicitly approves this record — it is proposed, not yet
  designated.
- Do not assume physical schema design, migration, or implementation
  is authorized by this record or by its approval — those are
  downstream engineering tasks gated on designation (§6, §8, §10).
- Do not assume role-per-target-type mapping is resolved by this
  record — it is a downstream task (§10 items 3, 8).
- Do not assume Delivery is designated or eligible for designation —
  Constraint B is not satisfied; Delivery remains Tier 2 DEFERRED
  (§15).
- Do not assume any Tier 3 candidate (Campaign, Brief, Order, Brand
  DNA, Production Job, AI Generation) has been designated or evaluated
  — all remain UNVERIFIED (§16).
- Do not assume Asset's `APPROVED` state exists — `APPROVED` is not
  an Asset state (DR 0006 Rejected States; §6 item 7).
- Do not assume Quote ACCEPTED and Approval APPROVED are the same
  event — they are distinct events in distinct entities (§8 item 8).
- Do not assume any pre-condition on Asset or Quote state at Approval-
  targeting time has been established — those are engineering questions
  (§10 items 2, 7).
- Do not assume the ordering of Approval decision and Quote state
  transition has been established (§10 item 9).
- Do not assume DR 0012 has been modified (§11).
- Do not assume DR 0017–0022's satisfaction mechanics have been
  modified (§12).
- Do not assume DR 0024's actor authority framework has been modified
  (§13).
- Do not assume Delivery→Asset cardinality has been resolved (§14;
  DR 0026 §9).
- Do not assume any financial event is triggered or inferred from a
  target-type designation or from any Approval targeting an Asset or
  Quote row (§19).
- Do not assume Decision Records 0001–0027 have been altered,
  reinterpreted, or superseded — all remain authoritative and
  unchanged.
