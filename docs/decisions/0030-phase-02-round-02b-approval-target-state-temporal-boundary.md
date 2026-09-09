# Decision Record 0030 — Phase 02 Round 02B: Approval Target State & Temporal Boundary

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner approval. If the Owner
  approves this record, the target-identity fixation principle (§6),
  temporal ordering rules (§7), Asset-revision implications (§10),
  Quote-cancel-and-replace implications (§11), and lifecycle-independence
  conclusions (§12–§13) become governing boundaries. Formal Asset and
  Quote target-state pre-conditions remain DEFERRED (§8.2, §9.2).
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0029. All remain authoritative and unchanged. This record
  applies the immutable-reference principle (DR 0023 §13) and the
  approved lifecycle boundaries (DR 0006, DR 0005, DR 0010, DR 0028)
  to define what is established — and what remains deferred — about
  when, at what state, and in what temporal relationship an Approval
  record may reference an Asset or Quote row. It directly addresses
  DR 0028 §21 items 3 and 4 (pre-conditions on Asset and Quote state
  at targeting time) and DR 0010 Deferred Items 11 (Approval → Revision
  orchestration boundary) as far as the current evidence permits.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from
0013–0029. This record does not claim Owner approval; it proposes
Owner approval of the conclusions in §6–§13.

## 1. Context

Decision Record 0028 designated Asset and Quote as the two V1
Approval target types (subject to Owner approval) and explicitly
listed, in §10 and §21, a set of downstream questions requiring
separate decisions:

- "Pre-condition on Asset state at targeting time: which Asset
  lifecycle states are valid target states (e.g., must the Asset be
  in `CLIENT_PREVIEW`? any state? DEFERRED)" (DR 0028 §10 item 2;
  §21 item 3).
- "Pre-condition on Quote state at targeting time: which Quote
  lifecycle states are valid target states (e.g., must the Quote be
  in `SENT`? DEFERRED)" (DR 0028 §10 item 7; §21 item 4).
- "Temporal ordering of Approval decision and Quote state transition"
  (DR 0028 §10 item 9; §21 item 5).

Decision Record 0029 established per-type role authority for Asset
and Quote Approval records. Decision Record 0023 §13 established the
immutable-reference principle. This record applies those foundations
to define what can now be resolved about target state and temporal
boundaries, and to state precisely what remains deferred.

## 2. Problem

The Approval target reference (DR 0023 Model A: target type + target
identity) is a reference to a specific row. Four related questions
follow from that reference:

1. **State pre-condition:** must the referenced row be in a specific
   lifecycle state before an Approval may reference it?
2. **Post-reference state change:** does the referenced row's later
   lifecycle state change affect the Approval's target reference?
3. **Approval decision effect on target:** does the Approval decision
   (APPROVED or REJECTED) cause the target row to change state?
4. **Temporal ordering:** what sequence constraints govern target
   creation, Approval creation, and Approval decision?

Without answers to (2)–(4), the immutable-reference principle (DR 0023
§13) cannot be applied coherently. Without an answer to (1), the
pre-condition gate for Approval creation is undefined. This record
resolves (2)–(4) fully, and (1) as far as the approved evidence permits.

## 3. Governing Sources

**APPROVED sources used in this record:**

- **DR 0006** — Asset state machine. Approval/Delivery Boundary
  section: "Asset status remains `CLIENT_PREVIEW` after a successful
  **client-facing** review." Row-per-revision principle: "Each revision
  produces a new Asset row/version." Approved/Delivery Boundary:
  "`APPROVED` is not created as an Asset state." Architectural
  Consequence: "Any future Approval or Delivery implementation must
  reference Asset by its own identity without expecting Asset's `status`
  column to reflect approval or delivery outcomes."
- **DR 0005** — Quote state machine. SENT Definition: "`SENT` —
  Quote has been presented to the client and awaits the client's
  decision." Boundary 5: cancel-and-new pattern ("If a sent Quote
  must be changed, the approved direction is: cancel the existing
  Quote, create a new Quote"). Architectural Consequence: "Quote
  ACCEPTED, a Client Approval record (if Quote is later approved as
  an Approval target type), and Order creation remain conceptually
  distinct events."
- **DR 0010** — Approval state machine. Target Boundary: "Approval
  does not own the lifecycle of the target it decides on." Revision
  Separation: a new Approval record is created for a revised target;
  no reopening. Historical Integrity: terminal records are never
  overwritten.
- **DR 0023** — Approval target model. §13 (immutable-reference
  principle): target must be a historically-fixed row, never live or
  mutable. §14: Asset revision row-per-revision design already suffices
  without inventing a new version concept.
- **DR 0028** — Asset and Quote designation. §6 item 8: Approval
  targeting an Asset row does not write to that row's `status` column.
  §8 item 8: Approval APPROVED terminal state is not a Quote state.
  §17 (historical integrity): target reference permanently fixed.
- **DR 0029** — Role authority mapping. §7.1: QC creation authority
  APPROVED for Asset, applying DR 0024 §6's scope boundary ("QC actors
  may initiate an Approval request for a target that has passed QC
  review").

## 4. Scope of This Record

**This record establishes:**

1. The immutable-reference principle applied to Asset-targeting and
   Quote-targeting Approvals: target identity is permanently fixed at
   Approval creation (§6).
2. The temporal ordering constraints that are established from approved
   sources (§7).
3. The Asset-state evidence and observations (INFERENCE-level) about
   the natural pre-condition, with the formal pre-condition remaining
   DEFERRED (§8).
4. The Quote-state evidence and observations (INFERENCE-level) about
   the natural pre-condition, with the formal pre-condition remaining
   DEFERRED (§9).
5. Asset revision implications: a revised Asset row is a distinct
   target from the original (§10).
6. Quote cancel-and-replace implications: a replacement Quote row is
   a distinct target from the cancelled original (§11).
7. Effect of Approval decision on Asset lifecycle: no Asset state
   transition (§12.1).
8. Effect of Approval decision on Quote lifecycle: no direct Quote
   state transition (§12.2).
9. Effect of target lifecycle changes on the Approval target reference:
   no change to the reference (§13).

**This record does NOT:**

- Formally establish the exact Asset lifecycle state required at
  Approval-targeting time — DEFERRED (§8.2).
- Formally establish the exact Quote lifecycle state required at
  Approval-targeting time — DEFERRED (§9.2).
- Establish temporal ordering between Approval decision and Quote
  state transition — DEFERRED (§9.2, §20 item 3).
- Establish the orchestration mechanism by which an Approval REJECTED
  triggers Asset revision — DEFERRED (§10, §20 item 6).
- Establish the orchestration mechanism by which an Approval APPROVED
  causes any downstream effect on Order, Delivery, or other entities
  beyond what DR 0012, DR 0017–0022 already establish.
- Design physical schema, columns, FK, CHECK constraints, or any
  implementation artifact.
- Introduce new Asset states, Quote states, or Approval states.
- Introduce new roles or permissions.

## 5. Immutable-Reference Principle — Reaffirmed

**APPROVED (from DR 0023 §13, DR 0028 §17):**

An Approval record's target reference must identify an immutable,
historically-fixed row — never a live or mutable concept that could
later change meaning out from under a terminal Approval decision.

This principle was established in DR 0023 §13 and confirmed for Asset
and Quote specifically in DR 0028 §17. It is the foundational rule
from which §6–§13 of this record derive.

**Mechanism for Asset:** DR 0006's row-per-revision design. Each Asset
revision produces a new row with a new identity. An Approval's target
reference to a specific Asset row's UUID is a reference to a row
whose content (the asset's files, QC outcome) does not change after
the row is created. (APPROVED — from DR 0023 §14, DR 0028 §5.)

**Mechanism for Quote:** DR 0005's cancel-and-new pattern. A Quote
row's commercial terms are fixed at creation; changes require cancelling
the existing Quote and creating a new row. An Approval's target
reference to a specific Quote row's UUID is a reference to fixed
commercial terms. (APPROVED — from DR 0028 §7, DR 0023 §13.)

## 6. Target Identity Fixation — What Is Established

**APPROVED:**

The following are established from DR 0023 §13, DR 0028 §17, and
DR 0010 (Historical Integrity):

1. **Target identity is set at Approval creation and does not change.**
   The specific Asset or Quote row UUID recorded as the Approval's
   target at the moment the Approval record is created is the target
   for the lifetime of that Approval record. It is not modified by
   any subsequent event — not by the Approval's own state transitions,
   not by the target row's own lifecycle transitions, and not by any
   other action.

2. **The target row must exist before it can be referenced.** An
   Approval record can only reference a row that exists as of Approval
   creation. A future row — one not yet created — cannot be the target
   of an existing Approval record. This follows necessarily from the
   immutable-reference principle: you cannot hold a historically-fixed
   reference to a row that does not yet have a fixed identity.

3. **A terminal Approval record permanently captures its target
   reference.** Once an Approval reaches a terminal state (APPROVED,
   REJECTED, CANCELLED, EXPIRED — DR 0010), that record, including
   its target reference, is historically preserved and never
   overwritten (DR 0010 Historical Integrity, DR 0023 §16).

4. **No retroactive re-targeting.** An Approval targeting Asset row v1
   cannot be re-targeted to Asset row v2 (a later revision) after the
   Approval is created. An Approval targeting Quote row Q1 cannot be
   re-targeted to replacement Quote row Q2 after the Approval is created.
   Re-targeting would violate the immutable-reference principle (DR 0023
   §13).

5. **Each Approval-target-row pairing is distinct.** An Approval on
   Asset v1 and an Approval on Asset v2 (a revision) are two distinct
   Approval records targeting two distinct Asset rows. They do not share
   identity, do not satisfy each other's satisfaction reference, and
   do not share Required Approval resolution. (Consistent with DR 0022
   §7, DR 0023 §11.)

## 7. Temporal Ordering — What Is Established

**APPROVED:**

The following ordering constraints are established from the approved
sources in §3:

1. **Target row creation precedes Approval creation.** An Approval
   record can only be created after the target row exists (§6 item 2).
   This ordering constraint is absolute for both Asset-targeting and
   Quote-targeting Approvals.

2. **Approval creation (PENDING initiation) precedes Approval decision.**
   Every Approval record starts in PENDING and transitions to a terminal
   state (APPROVED, REJECTED, CANCELLED, EXPIRED) — DR 0010. The
   decision occurs after the PENDING record exists.

3. **Combined ordering:** for any complete Approval event on an Asset
   or Quote row, the ordering constraint is:

   ```
   Target row creation → Approval creation (PENDING) → Approval decision (terminal)
   ```

   This is APPROVED as a structural constraint. It does not fix the
   time gap between any two events — the gap may be arbitrarily short
   or long.

4. **Target lifecycle transitions are not ordered relative to Approval
   decision (DEFERRED for both types).** Whether the target must be in
   a specific state at Approval creation time, and whether the Approval
   decision must precede or follow a particular target lifecycle
   transition, remain DEFERRED (§8.2, §9.2, §20 items 1–3). The
   ordering above is the minimum established structure.

5. **New Approval cycle ordering for a revised target.** DR 0010
   (Revision Separation) and DR 0006 (row-per-revision) establish the
   conceptual sequence for an Asset revision cycle:

   ```
   Asset v1 created → Approval #1 created (targeting v1) →
   Approval #1 terminal → Asset v2 created → Approval #2 created
   (targeting v2) → Approval #2 terminal
   ```

   Specifically: Asset v2 must exist before Approval #2 can be created
   (from §6 item 2). Approval #1's terminal state (REJECTED, in the
   revision scenario) must precede the revision action conceptually
   (though the exact orchestration mechanism is DEFERRED — §20 item 6).

   The equivalent for Quote:

   ```
   Quote Q1 created → Approval #A created (targeting Q1) →
   Approval #A terminal → Quote Q1 CANCELLED → Quote Q2 created →
   Approval #B created (targeting Q2) → Approval #B terminal
   ```

   (Ordering of "Approval #A terminal" relative to "Quote Q1 CANCELLED"
   is DEFERRED — §20 item 3.)

## 8. Asset-Targeting: Target-State Analysis

### 8.1 Evidence from Primary Sources

**FACT (DR 0006, Approval/Delivery Boundary):** "Asset status remains
`CLIENT_PREVIEW` after a successful **client-facing** review —
approval and delivery are represented through their respective entities,
not through further Asset-state advancement."

This statement contains two distinct claims:
- (a) The client-facing review — which is the Approval event — occurs
  when the Asset is in `CLIENT_PREVIEW`. The phrase "remains `CLIENT_PREVIEW`
  after" implies the state is `CLIENT_PREVIEW` before and after.
- (b) The Approval decision does not advance Asset's `status` column
  to `APPROVED` or any other new value. The Asset stays in
  `CLIENT_PREVIEW`.

**FACT (DR 0006, transitions):** the only path to `CLIENT_PREVIEW` is
`READY_FOR_QC → CLIENT_PREVIEW`, guarded by a QC pass (DR 0006 QC
Boundary). An Asset reaches `CLIENT_PREVIEW` only after passing QC.

**FACT (DR 0029 §7.1):** QC creation authority for Asset-targeting
Approvals is APPROVED. The basis is DR 0024 §6: "QC actors may
initiate an Approval request for a target **that has passed QC review**,
routing it to a formal decision-maker as a handoff." An Asset has
passed QC review precisely when it transitions to `CLIENT_PREVIEW`.
The QC handoff Approval is therefore initiated when — and because —
the Asset has entered `CLIENT_PREVIEW`.

### 8.2 Formal Pre-Condition: DEFERRED

**DEFERRED (from DR 0028 §10 item 2, §21 item 3):**

The formal constraint "an Approval may only target an Asset row in
state X" requires an explicit decision on which states are valid at
targeting time. DR 0028 explicitly listed this as a downstream
engineering task: "Pre-condition on Asset state at targeting time:
which Asset lifecycle states are valid target states (e.g., must the
Asset be in `CLIENT_PREVIEW`? any state? DEFERRED)."

This record does not resolve that formal constraint. The observations
in §8.1 are strong evidence favoring `CLIENT_PREVIEW` as the natural
pre-condition; they are not sufficient to establish a formal prohibition
without explicit Owner decision.

### 8.3 Natural Pre-Condition — Inference

**INFERENCE:** combining §8.1's evidence, the natural pre-condition
for Asset-targeting Approval creation is that the Asset is in
`CLIENT_PREVIEW`:

- DR 0006 explicitly describes the client-facing review as occurring
  at `CLIENT_PREVIEW`.
- DR 0029's QC handoff pattern (QC creates Approval after QC pass)
  places Approval creation precisely at the `CLIENT_PREVIEW` entry
  point.
- Asset states prior to `CLIENT_PREVIEW` (UPLOADED, PROCESSING,
  READY_FOR_QC) represent incomplete processing stages; the Asset is
  not yet ready for a client-facing formal decision.
- Asset terminal states (REVISION_REQUIRED, REJECTED) represent a
  completed negative outcome for that version; creating an Approval
  on a terminated Asset version has no natural purpose within the
  established workflow.

**This is INFERENCE, not an APPROVED constraint.** The formal pre-
condition — whether `CLIENT_PREVIEW` is required, or whether some
other states are also valid — is DEFERRED (§8.2). The inference
documents the evidence-based expectation without converting it to an
enforced rule.

## 9. Quote-Targeting: Target-State Analysis

### 9.1 Evidence from Primary Sources

**FACT (DR 0005, SENT State Definition):** "`SENT` — Quote has been
presented to the client and awaits the client's decision."

**FACT (DR 0005, Boundary 2):** "No `PENDING_CLIENT_APPROVAL` state.
`SENT` represents the Quote being presented to the client and awaiting
their decision."

**FACT (DR 0005, DRAFT State Definition):** "`DRAFT` — Quote is being
composed internally." DRAFT is the internal composition stage;
the Quote has not yet been presented to the client.

**FACT (DR 0028 §8 item 7):** "Quote `ACCEPTED`, an Approval record
targeting that Quote, and Order creation are three separate events."
This confirms the conceptual distinction between (a) a Quote in SENT
state awaiting a formal decision and (b) the Approval record on that
Quote. It does not constrain which state the Quote must be in when
the Approval is created.

**FACT (DR 0028 §10 item 9):** "Temporal ordering of Approval decision
and Quote state transition: whether the Approval's APPROVED/REJECTED
decision triggers the Quote's ACCEPTED/REJECTED transition, and how
that is enforced (DEFERRED)."

### 9.2 Formal Pre-Condition: DEFERRED

**DEFERRED (from DR 0028 §10 item 7, §21 item 4):**

The formal constraint "an Approval may only target a Quote row in
state Y" is explicitly deferred: "Pre-condition on Quote state at
targeting time: which Quote lifecycle states are valid target states
(e.g., must the Quote be in `SENT`? DEFERRED)."

**DEFERRED (from DR 0028 §10 item 9, §21 item 5):**

The temporal relationship between the Approval's formal decision and
the Quote's own state transitions is also explicitly deferred. Whether
an Approval APPROVED decision causes, or must precede, or must follow,
the Quote's own ACCEPTED transition is not established by any Decision
Record 0001–0029.

### 9.3 Natural Pre-Condition — Inference

**INFERENCE:** combining §9.1's evidence, the natural pre-condition
for Quote-targeting Approval creation is that the Quote is in `SENT`:

- DR 0005 explicitly defines `SENT` as the state in which the Quote
  "awaits the client's decision" — the state naturally associated with
  a pending client authorization (which is what a CLIENT-decided
  Approval represents per DR 0029 §8.2).
- `DRAFT` is the internal composition stage; the Quote has not been
  presented to the client (DR 0005 DRAFT Definition). An Approval on
  a DRAFT Quote would precede the client-presentation event; DR 0005
  Boundary 2 specifically rejected a `PENDING_CLIENT_APPROVAL` state
  in favor of `SENT` as the "awaiting decision" state.
- Terminal Quote states (ACCEPTED, REJECTED, EXPIRED, CANCELLED) are
  final dispositions; creating an Approval on a terminated Quote has
  no natural purpose within the established commercial workflow.
  Specifically: ACCEPTED is the "deal made" state — the commercial
  decision is already recorded; CANCELLED means the Quote was withdrawn;
  EXPIRED means the offer lapsed; REJECTED means the client declined.

**This is INFERENCE, not an APPROVED constraint.** The formal pre-
condition — whether `SENT` is required, or whether some other states
are also valid — is DEFERRED (§9.2). The inference documents the
evidence-based expectation without converting it to an enforced rule.

## 10. Asset Revision Implications

**APPROVED (from DR 0006, DR 0023 §14, DR 0010 Revision Separation):**

1. **Asset v1 and Asset v2 (revision) are distinct rows with distinct
   UUIDs.** An Approval that targets Asset v1 does not target Asset v2.
   There is no identity continuity between versions from the Approval's
   perspective — the Approval refers to a specific row UUID, and that
   UUID is unique to one Asset version. (DR 0006: "Each revision produces
   a new Asset row/version"; DR 0023 §14.)

2. **A revision requires a new Approval record.** When a client-facing
   Approval on Asset v1 concludes with a REJECTED decision and Asset v2
   is subsequently created (revision), the approval cycle for Asset v2
   requires a new Approval record (DR 0010 Revision Separation). Approval
   #1 (targeting v1, terminal state REJECTED) is not reopened; it
   preserves the historical record that v1 was rejected. Approval #2
   (targeting v2) is an independent record with its own PENDING → terminal
   lifecycle.

3. **Asset v1's terminal state after revision.** DR 0006 states: "The
   previous version becomes terminal at `REVISION_REQUIRED` when revision
   is required; it is not modified in place afterward." This means:
   - Asset v1 transitions to `REVISION_REQUIRED` (terminal).
   - Asset v1's row content is immutable after that transition.
   - The Approval targeting v1 (now in its own terminal state)
     permanently and correctly reflects: "this specific version (v1)
     was reviewed and rejected."

4. **No lineage field is introduced.** DR 0006 explicitly defers the
   "exact Asset lineage/traceability mechanism between versions." This
   record does not introduce any parent/child reference between Asset
   rows or between Approval records. The historical record is preserved
   by distinct rows with distinct identities; no new linking concept
   is required or invented.

5. **The revision orchestration mechanism is DEFERRED.** Whether an
   Approval REJECTED decision automatically triggers the Asset's
   `REVISION_REQUIRED` transition, or whether those are two separate,
   manually-coordinated events, is not established by any Decision
   Record 0001–0029. DR 0010 Deferred Item 11 explicitly deferred
   "Approval → Revision orchestration." This record does not resolve
   that item.

## 11. Quote Cancel-and-Replace Implications

**APPROVED (from DR 0005 Boundary 5, DR 0023 §13, DR 0028 §7, §17):**

1. **Original Quote Q1 and replacement Quote Q2 are distinct rows
   with distinct UUIDs.** An Approval targeting Q1 does not target Q2.
   There is no identity continuity from the Approval's perspective —
   the Approval refers to the specific row UUID that exists at the
   time of Approval creation, and Q2 did not exist at that time.
   (DR 0005 Boundary 5; DR 0023 §13.)

2. **A replacement Quote requires a new Approval record.** If Q1 is
   CANCELLED (terminal — DR 0005) and Q2 is created as its replacement,
   any Approval cycle for Q2 requires a new Approval record. Any
   Approval targeting Q1 remains historically fixed as a record of the
   formal decision on Q1's commercial terms; it is not reopened,
   transferred, or applied to Q2.

3. **Q1's terminal state after cancellation.** DR 0005 Boundary 5
   states: the old row is `CANCELLED` (terminal). Q1's content is
   immutable in the `CANCELLED` state. An Approval targeting Q1 (in
   its own terminal state) permanently reflects: "this specific
   commercial proposal (Q1) was subject to a formal decision."

4. **No Quote versioning concept is introduced.** DR 0005 Boundary 4
   states: "Quote is not added to the approved versioning scope
   (Decision Record 0002, D3). No Quote versioning architecture is
   introduced." This record does not introduce such a concept. The
   cancel-and-new pattern is the complete and sufficient mechanism;
   no parent/child relationship between Quote rows is invented.

5. **The temporal relationship between Approval decision and Quote
   CANCELLED transition is DEFERRED.** Whether the Approval's REJECTED
   decision must precede, or causes, the Quote's CANCELLED transition,
   and whether an Approval may be in PENDING while the Quote is SENT,
   ACCEPTED, REJECTED, EXPIRED, or CANCELLED — all of these sequencing
   constraints are DEFERRED (DR 0028 §10 item 9; §20 item 3 of this
   record).

## 12. Effect of Approval Decision on Target Lifecycle

### 12.1 Effect on Asset — APPROVED

**APPROVED (from DR 0006 Approval/Delivery Boundary, DR 0028 §6
item 8):**

An Approval decision — regardless of outcome (APPROVED, REJECTED,
CANCELLED, EXPIRED) — does not cause any Asset state transition and
does not write to the Asset row's `status` column.

- **DR 0006:** "Asset status remains `CLIENT_PREVIEW` after a
  successful client-facing review." The Asset's `status` column is not
  updated by the Approval event.
- **DR 0006 Architectural Consequence:** "Any future Approval or
  Delivery implementation must reference Asset by its own identity
  without expecting Asset's `status` column to reflect approval or
  delivery outcomes."
- **DR 0028 §6 item 8:** "The Approval targeting an Asset row does
  not write to that Asset row's `status` column."
- **DR 0006:** "`APPROVED` is not created as an Asset state." An
  Approval record reaching the `APPROVED` terminal state does not
  create or imply an Asset state of APPROVED.

**Corollary:** the Approval and the Asset maintain entirely separate
state machines. After an Approval APPROVED decision on Asset v1:
- Approval #1: terminal state = APPROVED (permanent).
- Asset v1: state = CLIENT_PREVIEW (unchanged).
- Delivery (if any): separate entity, separate lifecycle (DR 0010,
  DR 0011).

**Corollary:** after an Approval REJECTED decision on Asset v1:
- Approval #1: terminal state = REJECTED (permanent).
- Asset v1: state not determined by this event alone. DR 0006 lists
  REVISION_REQUIRED as the terminal state for a version that was
  revised, but whether the Approval REJECTED decision triggers the
  REVISION_REQUIRED transition is DEFERRED (§10 item 5; DR 0010
  Deferred Item 11).

### 12.2 Effect on Quote — APPROVED

**APPROVED (from DR 0028 §8 items 7–8, DR 0005, DR 0010):**

An Approval decision on a Quote-targeting Approval does not directly
cause any Quote state transition and does not write to the Quote row's
`status` column.

- **DR 0028 §8 item 8:** "An Approval record's terminal state of
  APPROVED is not a Quote state. Quote's terminal states remain
  ACCEPTED, REJECTED, EXPIRED, CANCELLED."
- **DR 0005:** the Quote's own transitions (SENT → ACCEPTED, SENT →
  REJECTED, etc.) are governed by DR 0005's state machine, not by the
  Approval entity.
- **DR 0010 (Target Boundary):** "Approval does not own the lifecycle
  of the target it decides on."
- **DR 0028 §8 item 7:** "Quote ACCEPTED, an Approval record targeting
  that Quote, and Order creation are three separate events." Three
  events, three records — none collapses into another.

**Corollary:** the Approval and the Quote maintain entirely separate
state machines. After an Approval APPROVED decision on Quote Q1:
- Approval #A: terminal state = APPROVED (permanent).
- Quote Q1: state not determined by this event alone. Whether the
  Approval APPROVED decision causes or precedes the Quote's ACCEPTED
  transition is DEFERRED (DR 0028 §10 item 9; §9.2 of this record).

**Corollary:** Approval APPROVED ≠ Quote ACCEPTED. These are two
separate state transitions in two separate entities. An Approval
reaching APPROVED does not imply Quote is ACCEPTED, and Quote reaching
ACCEPTED does not imply any Approval exists or has been decided.
(Consistent with DR 0028 §8 items 7–8, DR 0005.)

## 13. Effect of Target Lifecycle Changes on Approval Target Reference

**APPROVED (from DR 0023 §13, DR 0028 §17, DR 0006, DR 0005):**

Once an Approval record is created referencing a specific Asset or
Quote row, the target's subsequent lifecycle state transitions do not
alter the Approval's target reference. The Approval continues to
reference the same row regardless of what state that row later
occupies.

**For Asset:**

- If the targeted Asset row transitions from `CLIENT_PREVIEW` to
  `REVISION_REQUIRED` (after an Approval REJECTED, if that is the
  mechanism — DEFERRED), the Approval's target reference still points
  to the same Asset row. The Approval record's historical meaning —
  "this Approval was a formal decision on this specific Asset version"
  — is preserved.
- If the Asset row remains in `CLIENT_PREVIEW` (after an Approval
  APPROVED), the Approval's target reference still points to the same
  Asset row. No state change in either direction alters the reference.

**For Quote:**

- If the targeted Quote row transitions from `SENT` to `ACCEPTED`,
  `REJECTED`, `EXPIRED`, or `CANCELLED` — whether before or after the
  Approval reaches a terminal state — the Approval's target reference
  still points to the same Quote row. The Approval record's historical
  meaning — "this Approval was a formal decision on this specific
  commercial proposal" — is preserved.

**General principle (APPROVED):** DR 0023 §13 establishes that the
target must be a "historically-fixed row — never a live or mutable
concept." The immutability is the target row's content, not its
lifecycle state column. A state change is a change to the `status`
column of the target row; it does not alter the row's fundamental
identity (its UUID), and therefore does not alter any Approval's target
reference to that UUID. The Approval's record of "what was formally
decided on which specific object" remains permanently correct regardless
of what that object's `status` column later shows.

## 14. Interaction: DR 0010

**Consistent with and extending DR 0010.**

- **Target Boundary (DR 0010):** "Approval does not own the lifecycle
  of the target it decides on." This record reaffirms (§12.1, §12.2)
  that Approval decisions do not modify Asset or Quote `status` columns.
- **Revision Separation (DR 0010):** new Approval record for revised
  target. This record extends that to both Asset (§10 item 2) and Quote
  (§11 item 2) specifically.
- **Historical Integrity (DR 0010):** terminal Approval records are
  never overwritten. This record adds (§6 item 3) that the target
  reference is part of what the terminal record preserves.
- **DR 0010 Deferred Item 11 (Approval → Revision orchestration):**
  partially addressed in §10 (§10 item 5 establishes this is still
  DEFERRED); the mechanism is not resolved by this record.
- **DR 0010 Deferred Item 12 (Approval ↔ Delivery orchestration):**
  unchanged. Not addressed by this record; remains DEFERRED.

No transition, state, or principle in DR 0010 is modified.

## 15. Interaction: DR 0017–0022

**Consistent and orthogonal.**

**APPROVED (reaffirmed from DR 0022 §7, DR 0023 §7, DR 0028 §12):**
the satisfaction of a Required Approval uses a reference to the
Required Approval's own identity — independent of the Approval record's
target type, target state, or temporal position. Whether Asset is in
`CLIENT_PREVIEW` or `REVISION_REQUIRED` when the Approval is decided,
and whether Quote is in `SENT` or `ACCEPTED` when the Approval is
decided, has no bearing on the satisfaction formula (DR 0018 §12).

The target-state pre-condition question (§8.2, §9.2) governs whether
the Approval can be *created*; the satisfaction question (DR 0017–0022)
governs whether a terminal APPROVED Approval *satisfies* a Required
Approval obligation. These are independent dimensions.

AND-semantics (DR 0018 §8), one-to-one default (DR 0018 §9), and
Required Approval identity (DR 0022 §4) are not modified by this record.

## 16. Interaction: DR 0023

**Consistent and extending.**

This record applies DR 0023 §13 (immutable-reference principle) and
§14 (Asset revision boundary) to the specific conclusions in §6–§13:

- §6 (target identity fixation) is the per-type application of DR 0023
  §13.
- §10 (Asset revision implications) is the per-type application of
  DR 0023 §14.
- §11 (Quote cancel-and-replace implications) is the per-type
  application of DR 0023 §13's "Quote replacement (0005 boundary 5)"
  citation.
- §13 (lifecycle independence) is the extension of DR 0023 §13 to
  the post-creation case: the immutability of the reference survives
  the target's own later lifecycle changes.

DR 0023's Model A (target type + target identity) is not modified.
No new model or mechanism is introduced.

## 17. Interaction: DR 0028

**Consistent — DR 0028 §21 items 3 and 4 addressed by this record.**

- **DR 0028 §21 item 3** ("Pre-condition on Asset state at targeting
  time"): addressed in §8. Formal pre-condition remains DEFERRED (§8.2);
  inference documented (§8.3).
- **DR 0028 §21 item 4** ("Pre-condition on Quote state at targeting
  time"): addressed in §9. Formal pre-condition remains DEFERRED (§9.2);
  inference documented (§9.3).
- **DR 0028 §21 item 5** ("Temporal ordering of Approval decision and
  Quote state transition"): addressed in §9.2 and §12.2. Remains
  DEFERRED.
- **DR 0028 §6 item 8** and **§8 item 8** (Approval decision does not
  write to target status column): reaffirmed and extended in §12.
- **DR 0028 §17** (historical integrity of target reference):
  reaffirmed and extended in §6 and §13.

DR 0028 is not modified.

## 18. Interaction: DR 0029

**Consistent.**

DR 0029's role authority mapping applies to Approval records regardless
of target state at creation. The pre-condition question (who may create
and decide) is separate from the pre-condition question (what state the
target must be in). Both are prerequisites for a complete Approval
workflow, but they govern different aspects.

**APPROVED observation (from DR 0029 §7.1 and this record §8.3):**
the QC handoff pattern (QC creates Approval after Asset passes QC,
entering `CLIENT_PREVIEW`) connects role authority and target state in
a consistent way: the natural workflow is that QC initiates the Approval
precisely when the Asset enters `CLIENT_PREVIEW`, which is also the
natural pre-condition state. This is inference-level consistency, not
a formal rule.

DR 0029 is not modified.

## 19. Interaction: DR 0012

**No change to DR 0012.**

**APPROVED (reaffirmed from DR 0028 §11, DR 0023 §17):** the Order
`ACTIVE` → `COMPLETED` guard evaluates Required Approval satisfaction,
which is based on Required Approval identity (DR 0022 §7) — independent
of the target's lifecycle state or the temporal position of the
Approval decision. The guard's logic is not modified by this record.

## 20. Remaining Deferred Items

The following remain explicitly DEFERRED after this record:

**Asset-specific:**

1. **Formal Asset state pre-condition at targeting time** — which Asset
   lifecycle state(s) must the targeted Asset row be in when the
   Approval record is created (DR 0028 §21 item 3). The inference in
   §8.3 documents the evidence but does not establish a formal constraint.
2. **Whether an Approval may validly target an Asset in `UPLOADED`,
   `PROCESSING`, `READY_FOR_QC`, `REVISION_REQUIRED`, or `REJECTED`.**
   No authoritative source explicitly permits or prohibits targeting
   these states. DEFERRED.
3. **Orchestration mechanism for Asset revision** — whether an Approval
   REJECTED decision automatically triggers the Asset's `REVISION_REQUIRED`
   transition, or whether these are two separately coordinated events
   (DR 0010 Deferred Item 11; §10 item 5 of this record).

**Quote-specific:**

4. **Formal Quote state pre-condition at targeting time** — which Quote
   lifecycle state(s) must the targeted Quote row be in when the Approval
   is created (DR 0028 §21 item 4). The inference in §9.3 documents the
   evidence but does not establish a formal constraint.
5. **Whether an Approval may validly target a Quote in `DRAFT`,
   `ACCEPTED`, `REJECTED`, `EXPIRED`, or `CANCELLED`.** No authoritative
   source explicitly permits or prohibits targeting these states. DEFERRED.
6. **Temporal ordering of Approval decision and Quote state transition**
   — whether the Approval APPROVED/REJECTED decision causes, precedes,
   or follows the Quote's ACCEPTED/REJECTED transition, and the
   enforcement mechanism (DR 0028 §10 item 9, §21 item 5).
7. **Orchestration mechanism for Quote replacement** — whether an
   Approval REJECTED decision on Q1 automatically triggers Q1's
   CANCELLED transition before Q2 is created, or whether these are
   separately coordinated events.

**Shared/general:**

8. **Approval → Delivery orchestration** — how (and whether) an
   Approval APPROVED decision on an Asset-targeting or Quote-targeting
   record interacts with Delivery lifecycle (DR 0010 Deferred Item 12;
   DR 0028 §10 item 12). Not addressed by this record.
9. **Expiration policy per target type** — whether Approval expiration
   duration or mechanism differs between Asset-targeting and Quote-
   targeting Approvals (DR 0024 §23 item 6; DR 0028 §10 item 13).
10. **All prior deferred items from DR 0001–0029** not addressed here
    remain independently open and unchanged.

## 21. Historical Integrity

**Reaffirmed, unchanged from DR 0014 §14 through DR 0029 §23:**

Once an Approval record reaches a terminal state, the entire record —
including its target reference (target type + target row UUID), its
creation actor identity, and its decision actor identity — is
permanently preserved and non-revisable. This record adds to that
established principle: the target row's subsequent lifecycle changes
do not alter the historical meaning of the Approval record. The
permanent record of "a formal decision was made on this specific object"
is correct regardless of what state that object later occupies.

## 22. Security / Tenancy

**APPROVED principle, unchanged from DR 0023 §19, DR 0024 §20,
DR 0028 §18, DR 0029 §24:**

The target Asset or Quote row must belong to the same organization as
the Approval record and the Order it ultimately serves. Cross-tenant
target references are never permitted. Temporal ordering (§7) and
target-state pre-conditions (§8.2, §9.2) operate within this
tenant boundary — a cross-tenant reference is invalid regardless of
the target's lifecycle state. Enforcement mechanism remains **DEFERRED**.

## 23. Financial Separation

Unchanged from every prior record. No target-state or temporal
constraint established here implies, triggers, or is inferred from
Payment, Revenue, Expense, Profit, Refund, or Owner Settlement. An
Approval APPROVED on an Asset or Quote row has no direct financial
consequence per the architecture.

## 24. Rejected Alternatives

- Establishing `CLIENT_PREVIEW` as a formal required Asset state at
  targeting time — rejected; DR 0028 §10 item 2 explicitly deferred
  this; converting INFERENCE to APPROVED without an explicit Owner
  decision would violate the governing task constraint "Only decide
  where authoritative evidence supports it; otherwise mark DEFERRED"
  (§8.2).
- Establishing `SENT` as a formal required Quote state at targeting
  time — rejected; DR 0028 §10 item 7 explicitly deferred this; same
  reasoning (§9.2).
- Establishing that Approval REJECTED causes Asset `REVISION_REQUIRED`
  — rejected; DR 0010 Deferred Item 11 defers the orchestration
  mechanism; no prior record establishes the causal linkage as an
  APPROVED rule (§10 item 5, §20 item 3).
- Establishing that Approval APPROVED causes Quote `ACCEPTED` — rejected;
  DR 0028 §10 item 9 explicitly deferred the temporal ordering; DR 0028
  §8 item 7 established these as separate events without establishing
  an ordering (§12.2, §20 item 6).
- Treating "client-facing review" (DR 0006) as a formal pre-condition
  constraint rather than a characterization — rejected; DR 0006 uses
  the phrase as a boundary description (Approval decisions don't advance
  Asset state), not as an explicit CREATE Approval guard; the formal
  guard is deferred (§8.2).
- Introducing Asset "version" fields or Quote "version" fields to
  support Approval targeting — rejected; DR 0023 §14 and DR 0006
  confirm that no new versioning concept is needed; DR 0005 Boundary 4
  explicitly prohibits Quote versioning (§10 item 4, §11 item 4).
- Allowing an Approval's target to be changed after Approval creation
  — rejected; violates DR 0023 §13 immutable-reference principle and
  DR 0028 §17 (§6 item 4).
- Treating target lifecycle changes as invalidating the Approval target
  reference — rejected; the reference is to the row UUID, which does not
  change when the row's `status` column changes (§13).
- Establishing Approval ↔ Delivery ordering as part of this record —
  rejected; DR 0010 Deferred Item 12 defers this; it is outside the
  scope of this record (§20 item 8).
- Claiming that Approval APPROVED and Quote ACCEPTED are equivalent
  events — rejected; DR 0028 §8 item 7 explicitly establishes them as
  three separate events; DR 0010 Target Boundary confirms Approval does
  not own Quote lifecycle (§12.2).

## 25. Final Recommendation

**PROPOSAL — presented for Owner approval:**

The following conclusions are established from authorized sources
and are proposed for Owner approval:

**Established (APPROVED):**

1. **Target identity is permanently fixed at Approval creation.** The
   specific Asset or Quote row UUID is the target for the Approval
   record's lifetime; it cannot change.

2. **The target row must exist before the Approval is created.** This
   follows from the immutable-reference principle (DR 0023 §13).

3. **Temporal structure:** target row creation → Approval creation
   (PENDING) → Approval decision (terminal). This three-step ordering
   is a structural constraint.

4. **Approval decisions do not cause Asset state transitions.** Asset
   stays in `CLIENT_PREVIEW` after an Approval APPROVED decision; the
   Approval REJECTED decision does not directly cause Asset to enter
   `REVISION_REQUIRED` (the orchestration mechanism is DEFERRED).

5. **Approval decisions do not directly cause Quote state transitions.**
   Approval APPROVED is not Quote ACCEPTED; Approval REJECTED is not
   Quote REJECTED. They are separate events in separate entities.

6. **Target lifecycle changes do not alter the Approval target
   reference.** The Approval's record of "formal decision on this
   specific object" is permanently correct regardless of the object's
   later state.

7. **Asset revision produces a distinct target row.** An Approval on
   Asset v1 does not extend to Asset v2; a new Approval is needed for
   v2.

8. **Quote cancel-and-replace produces a distinct target row.** An
   Approval on Quote Q1 does not extend to replacement Quote Q2; a new
   Approval is needed for Q2.

**Established as INFERENCE (not formal constraints):**

- The natural Asset state for an Approval is `CLIENT_PREVIEW` —
  supported by DR 0006 ("client-facing review") and DR 0029 (QC
  handoff pattern). Formal pre-condition: DEFERRED.
- The natural Quote state for an Approval is `SENT` — supported by
  DR 0005 ("awaits the client's decision"). Formal pre-condition:
  DEFERRED.

**Remaining principal deferred items:** exact Asset state pre-condition,
exact Quote state pre-condition, temporal ordering of Approval decision
and Quote state transition, Asset revision and Quote replacement
orchestration mechanisms, Approval ↔ Delivery orchestration.

## Consistency with Decision Records 0001–0029

- Consistent with 0001/0002: no schema, no new entity, no new role;
  tenant isolation preserved (§22); UUID identity unaffected.
- Consistent with 0003/0004: Campaign and Brief unchanged; not addressed.
- Consistent with 0005 (Quote): Quote state machine unmodified (§12.2);
  cancel-and-new pattern applied as approved (§11); terminal states
  unchanged.
- Consistent with 0006 (Asset): Asset state machine unmodified (§12.1);
  row-per-revision principle applied as approved (§10); no new Asset
  states.
- Consistent with 0007 (Order): Order state machine unmodified.
- Consistent with 0010 (Approval): Target Boundary, Revision Separation,
  and Historical Integrity all reaffirmed and extended (§14); no
  Approval state modified.
- Consistent with 0011 (Delivery): Delivery unaffected; Approval ↔
  Delivery orchestration still DEFERRED.
- Consistent with 0012 (Completion Guard): guard unaffected (§19).
- Consistent with 0013–0022: satisfaction mechanics unaffected (§15);
  AND-semantics, one-to-one default, Required Approval identity all
  unchanged.
- Consistent with 0023: immutable-reference principle applied (§5, §6,
  §10–§13); Model A unchanged (§16).
- Consistent with 0024: actor authority matrix unchanged; temporal and
  state questions are orthogonal to actor authority.
- Consistent with 0025/0026/0027: candidate inventory and Delivery
  standing unchanged.
- Consistent with 0028: §21 items 3–5 addressed as far as evidence
  permits (§17); §6 item 8 and §8 item 8 reaffirmed; DR 0028 not
  modified.
- Consistent with 0029: role authority unaffected; role and target-state
  questions are orthogonal dimensions (§18).
- No Decision Record 0001–0029 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume `CLIENT_PREVIEW` is a formally required pre-condition
  for Asset-targeting Approval creation — DEFERRED (§8.2).
- Do not assume `SENT` is a formally required pre-condition for Quote-
  targeting Approval creation — DEFERRED (§9.2).
- Do not assume an Approval targeting an Asset in `UPLOADED`,
  `PROCESSING`, `READY_FOR_QC`, `REVISION_REQUIRED`, or `REJECTED`
  is invalid — DEFERRED (§20 item 2).
- Do not assume an Approval targeting a Quote in `DRAFT`, `ACCEPTED`,
  `REJECTED`, `EXPIRED`, or `CANCELLED` is invalid — DEFERRED
  (§20 item 5).
- Do not assume Approval REJECTED causes Asset `REVISION_REQUIRED` —
  orchestration DEFERRED (§10 item 5, §20 item 3).
- Do not assume Approval APPROVED causes or implies Quote ACCEPTED —
  they are separate events (§12.2, §20 item 6).
- Do not assume the temporal ordering of Approval decision and Quote
  state transition has been decided — DEFERRED (§9.2, §20 item 6).
- Do not assume an Approval's target reference can change after the
  Approval is created — prohibited (§6 item 4).
- Do not assume the target row's later lifecycle changes alter the
  Approval's target reference — they do not (§13).
- Do not assume a new Asset version concept or Quote versioning
  architecture has been introduced (§10 item 4, §11 item 4).
- Do not assume Approval ↔ Delivery orchestration has been established
  — DEFERRED (§20 item 8).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0029 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
