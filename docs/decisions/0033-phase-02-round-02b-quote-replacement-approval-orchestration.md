# Decision Record 0033 — Phase 02 Round 02B: Quote Replacement & Approval Orchestration Boundary

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner approval. If the Owner
  approves this record, the evidentiary conclusions in §5–§9 become
  authoritative: (1) Q1 and Q2 are distinct rows with permanently separate
  Approval lineages — an Approval targeting Q1 can never be retargeted to
  Q2; (2) terminal Approval records on Q1 are unaffected by Q1's CANCELLED
  transition — the historical record stands; (3) a PENDING Approval on Q1
  at the time of Q1's cancellation is not automatically resolved by any
  existing record — orchestration remains DEFERRED; (4) an Approval
  targeting Q2 must be a new Approval record, not a transfer; (5) Q1's
  CANCELLED transition does not silently alter any Required Approval
  obligation in the Order, and an already-APPROVED Approval on Q1
  continues to satisfy its Required Approval regardless of Q1's later
  CANCELLED state. No schema, migration, or implementation is authorized.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0032. All remain authoritative and unchanged. This record directly
  addresses DR 0030 §20 item 7 ("Orchestration mechanism for Quote
  replacement — whether an Approval REJECTED decision on Q1 automatically
  triggers Q1's CANCELLED transition before Q2 is created, or whether these
  are separately coordinated events"), DR 0032 §18 item 7 (same item,
  carried forward), and the Related Approval analysis opened in DR 0030
  §11. It resolves what existing records support, and explicitly preserves
  the deferrals from DR 0032 that are not in scope.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from 0013–0032.
This record does not claim Owner approval; it proposes Owner approval of
the evidentiary conclusions in §5–§9.

## 1. Context

Decision Record 0030 §11 established the structural implications of the
cancel-and-replace pattern for Approvals: Q1 and Q2 are distinct rows;
an Approval on Q1 does not target Q2; a replacement Quote requires a new
Approval record; Q1's CANCELLED state is terminal and immutable; the
temporal relationship between the Approval decision and Q1's CANCELLED
transition is DEFERRED. Decision Record 0032 confirmed the temporal
ordering deferrals but left the orchestration boundary between Q1's
cancellation and existing Approvals on Q1 unresolved.

Two separate boundary questions remain:

1. **What happens to existing Approvals targeting Q1** when Q1 is
   CANCELLED — per Approval state (PENDING, APPROVED, REJECTED,
   CANCELLED, EXPIRED).
2. **What the cancel-and-replace means for Required Approval
   obligations** in the Order — whether Q1's cancellation silently
   redefines those obligations, and whether Q2's Approval can satisfy
   the same Required Approvals that Q1's Approval was directed at.

This record evaluates both questions against Decision Records 0001–0032.

## 2. Objective and Evidentiary Standard

### 2.1 Objective

Determine, for each Approval state on Q1 at the time Q1 is CANCELLED,
and for the Required Approval dimension of the replacement scenario,
what Decision Records 0001–0032 formally support. Where evidence reaches
the constraint-grade threshold, the conclusion is labeled APPROVED. Where
it does not, the question remains DEFERRED.

### 2.2 Evidentiary Standard

**APPROVED classification requires** a direct statement or a structural
consequence necessarily entailed by an authoritative record in DR 0001–0032.
Characterizations and natural workflow descriptions are inference-grade
only (as established in DR 0031 §2.2 and DR 0032 §2.2).

**DEFERRED applies** when no constraint-grade evidence establishes the
behavior, even when an inference supports it.

### 2.3 Scope Boundary

This record does **not** resolve:
- Temporal ordering between Approval decision and Q1's CANCELLED
  transition (DEFERRED per DR 0032; preserved unchanged).
- Temporal ordering between Q1's CANCELLED transition and Q2's creation.
- Temporal ordering between Approval creation on Q2 and any of Q2's
  lifecycle transitions.
- Quote or Approval target-state preconditions (DEFERRED per DR 0031).
- Approval ↔ Delivery orchestration (DR 0010 Deferred Item 12).
- Order completion guard finalization (DR 0010 Deferred Item 13).
- Expiration policy per target type (DR 0010 Deferred Items 7–8).

## 3. Governing Sources

**APPROVED sources used in this record:**

- **DR 0005** — Quote state machine. Boundary 5: cancel-and-replace
  pattern ("If a sent Quote must be changed, the approved direction is:
  cancel the existing Quote, create a new Quote"). CANCELLED Definition:
  "The company has withdrawn the Quote before client acceptance" (terminal).
  Six states; terminal states: ACCEPTED, REJECTED, EXPIRED, CANCELLED.
- **DR 0010** — Approval state machine. Target Boundary: "Approval does
  not own the lifecycle of the target it decides on." Historical Integrity:
  "terminal Approval records remain historically meaningful and are never
  overwritten to simulate a new approval cycle. Each new approval decision
  cycle creates a new Approval record." Revision Separation: new Approval
  record for revised target; no reopening. PENDING definition: awaiting
  formal decision. Terminal states: APPROVED, REJECTED, CANCELLED, EXPIRED
  — no transitions out, no reopening.
- **DR 0022** — Required Approval logical description and identity. §4:
  Required Approval identity is opaque, per-Order-unique, mandatory.
  §7: satisfaction reference = {order_reference + required_approval_reference
  (= the Required Approval's own identity)}. §12: satisfaction is
  existential (at least one correctly-referencing Approval reaching APPROVED
  satisfies); PENDING never satisfies; earlier failed records do not block
  a later APPROVED record. §13: one-Approval-to-one-requirement default.
  §14: Required Approval identity fixed at Order creation; "a later change
  to any of those [upstream objects] must never silently redefine an
  existing Required Approval." §15: identity fixed at same Order-creation
  capture point as the rest of the snapshot.
- **DR 0023** — Approval target model. §13: immutable-reference principle.
  §16: historical integrity of terminal Approval records.
- **DR 0028** — Asset and Quote designation. §8 item 7: Quote ACCEPTED,
  Approval on that Quote, and Order creation are three separate events.
  §8 item 8: Approval APPROVED is not a Quote state.
- **DR 0029** — Role authority mapping. No temporal rule introduced.
- **DR 0030** — Target-state and temporal boundary. §6: target identity
  fixed at Approval creation. §6 item 3: terminal Approval preserves target
  reference permanently. §6 item 4: no retroactive retargeting. §11:
  Quote cancel-and-replace implications (items 1–5). §13: target lifecycle
  changes do not alter Approval target reference. §15: satisfaction
  independent of target lifecycle state.
- **DR 0031** — Target-state precondition. Evidentiary standard (§2.2).
  No temporal ordering or orchestration established.
- **DR 0032** — Quote Approval temporal ordering. §14: combined conclusion
  (naming disambiguation §6; separation principles §5.2; no formal ordering
  between Approval decisions and Quote transitions). §16: cancel-and-replace
  temporal implications (items 1–7 — APPROVED items and DEFERRED items).

## 4. Scope of This Record

**This record establishes:**

1. The per-Approval-state consequence of Q1's CANCELLED transition for
   existing Approvals targeting Q1 (§7).
2. The Q1/Q2 identity separation principle and its consequences for
   Approval records (§5 — reaffirmed and extended).
3. Whether Q2 requires a new Approval record, and what "new" means in
   this context (§8).
4. The effect of Q1's cancellation on Required Approval obligations (§9).
5. The effect of Q1's APPROVED Approval on Required Approval satisfaction
   after Q1 is CANCELLED (§9).

**This record does NOT:**

- Establish any temporal ordering between Approval decision, Q1 CANCELLED,
  Q2 creation, or Q2 Approval creation (DEFERRED per DR 0032).
- Establish whether an Approval must be decided before Q1 can be CANCELLED.
- Establish any automatic lifecycle transition for any entity.
- Introduce new Quote states, Approval states, entities, roles, or
  permissions.
- Modify DR 0005, DR 0010, DR 0022, or any prior Decision Record.
- Design schema, migrations, or implementation artifacts.

## 5. Q1/Q2 Identity Separation — Reaffirmed and Extended

**APPROVED (from DR 0005 Boundary 5, DR 0023 §13, DR 0028 §7, DR 0030
§11 items 1–4):**

The following are established by prior records and reaffirmed here as
the structural foundation for §6–§9:

### 5.1 Q1 and Q2 Are Distinct Rows

Q1 (original Quote) and Q2 (replacement Quote) are distinct rows with
distinct UUID v7 identities (DR 0005 Boundary 5: "create a new Quote";
DR 0023 §13: new row with new identity). There is no identity continuity
from Q1 to Q2. Q2 is not a version, revision, or continuation of Q1.
Q2 is a new Quote row.

### 5.2 Q1's Row Content Is Fixed After CANCELLED

When Q1 transitions to CANCELLED (terminal), Q1's row content is
immutable. The commercial terms Q1 represents (pricing, scope, conditions)
are permanently recorded as of Q1's creation; they do not change when Q1
reaches CANCELLED. Q1's terminal state column reflects CANCELLED and
nothing else changes. (DR 0005 terminal states; DR 0023 §13.)

### 5.3 No Retroactive Retargeting

An Approval targeting Q1 cannot be retargeted to Q2 after the Approval
is created (DR 0030 §6 item 4: "An Approval targeting Quote row Q1 cannot
be re-targeted to replacement Quote row Q2 after the Approval is created.
Re-targeting would violate the immutable-reference principle (DR 0023
§13)"). This is APPROVED as an absolute prohibition, not a default.

### 5.4 Q2 Does Not Inherit Q1's Approval Records

**APPROVED (from DR 0030 §6 item 4, §11 item 1, DR 0023 §13):**

No Approval record targeting Q1 automatically becomes an Approval
record targeting Q2. There is no inheritance, transfer, migration, or
carry-forward of Approval records between Q1 and Q2. Each Approval
record targets exactly one row for its entire lifetime; that row cannot
be changed.

### 5.5 Q2 Does Not Inherit Q1's Required Approval Satisfaction

**APPROVED (derived from DR 0022 §7, §12, §14 and DR 0023 §13):**

Satisfaction of a Required Approval by an Approval record is determined
by the satisfaction reference carried by that specific Approval record
(DR 0022 §7). An Approval record targeting Q1 carries its own satisfaction
reference at the time of creation. Q2 — as a new row with new identity —
cannot automatically inherit the satisfaction that Q1's Approval records
have accumulated toward any Required Approval. Any Approval on Q2 that
intends to satisfy a Required Approval must carry the appropriate
satisfaction reference in that new Approval record (§9).

## 6. Q1 CANCELLED Transition — What Is Established

**APPROVED (from DR 0030 §13, DR 0010 Historical Integrity):**

When Q1 transitions to CANCELLED:

1. **Q1's row is terminal.** CANCELLED is a terminal Quote state (DR 0005).
   No further Quote transitions from Q1 are possible. Q1's content is
   immutable.

2. **All existing Approval records targeting Q1 continue to reference Q1.**
   The target reference in any Approval record is not altered by Q1's
   lifecycle state changes (DR 0030 §13): "Once an Approval record is
   created referencing a specific Asset or Quote row, the target's
   subsequent lifecycle state transitions do not alter the Approval's
   target reference." The Approval continues to reference Q1 regardless
   of Q1's CANCELLED state.

3. **No automatic state transition is imposed on any Approval targeting Q1.**
   Approval does not own the lifecycle of the target it decides on
   (DR 0010 Target Boundary). Q1's CANCELLED transition does not cause,
   require, or imply any transition in an Approval targeting Q1. Whether
   such automatic transitions should exist is an orchestration design
   question — **DEFERRED** (§13 item 1).

4. **Q1's historical meaning is preserved.** Q1's commercial terms, as
   recorded in Q1's row, remain the permanent reference for any Approval
   that targeted Q1. Any Approval's historical record — "a formal decision
   was made on this specific commercial proposal (Q1)" — is preserved
   regardless of Q1's later CANCELLED state (DR 0010 Historical Integrity,
   DR 0023 §16, DR 0030 §13).

## 7. Existing Approvals on Q1 — Per-State Analysis

For each Approval state at the moment Q1 transitions to CANCELLED:

### 7.1 PENDING Approval Targeting Q1

**State:** the Approval record exists, has no terminal decision, and
awaits a formal decision (DR 0010 PENDING Definition).

**APPROVED:**

1. The PENDING Approval's target reference continues to point to Q1
   (DR 0030 §13; §6 item 2 of this record). Q1's CANCELLED transition
   does not alter this reference.
2. The PENDING Approval is not automatically decided (APPROVED, REJECTED,
   CANCELLED, or EXPIRED) by Q1's CANCELLED transition. No prior record
   establishes such an automatic response (DR 0010 Target Boundary;
   DR 0032 §12.4a — carried forward here).
3. The PENDING Approval does not automatically satisfy any Required
   Approval. DR 0022 §12: "PENDING never satisfies (non-terminal)."

**DEFERRED:**

4. Whether an actor must decide the PENDING Approval before Q1 can be
   CANCELLED (a gate) — **DEFERRED** (§13 item 2).
5. Whether Q1's CANCELLED transition must or should automatically
   transition the PENDING Approval to CANCELLED — **DEFERRED** (§13
   item 1; DR 0032 §12.4a).
6. Whether Q1's CANCELLED transition must or should automatically
   transition the PENDING Approval to EXPIRED — **DEFERRED** (§13 item 1).
7. Whether a PENDING Approval on a now-CANCELLED Q1 can still receive a
   valid decision — **DEFERRED** (§13 item 3; DR 0032 §12.4c).

**Summary:** a PENDING Approval on Q1 survives Q1's CANCELLED transition
as a valid record still pointing to Q1, still awaiting a decision, with
no automatic resolution. What the system must do about this configuration
is DEFERRED.

### 7.2 APPROVED Approval Targeting Q1

**State:** the Approval record has reached the APPROVED terminal state.
Its decision is historically recorded and permanent (DR 0010 Historical
Integrity, DR 0023 §16).

**APPROVED:**

1. The APPROVED Approval's terminal state is immutable. Q1's CANCELLED
   transition does not alter or override the APPROVED terminal state
   (DR 0010 Historical Integrity; DR 0023 §16: "terminal Approval records
   are never overwritten").
2. The APPROVED Approval's target reference (pointing to Q1) is permanently
   fixed (DR 0030 §6 item 3). Q1's CANCELLED transition does not alter
   this reference.
3. The historical record stands permanently: "this specific commercial
   proposal (Q1) was formally approved." Q1's CANCELLED state does not
   invalidate this historical record (DR 0030 §13, §21).
4. **The APPROVED Approval continues to satisfy its Required Approval
   after Q1 is CANCELLED** (derived from DR 0022 §7, §12; DR 0030 §13;
   DR 0010 Historical Integrity): satisfaction is determined by the
   Approval record's terminal APPROVED state and the satisfaction
   reference it carries (DR 0022 §7). Q1's subsequent CANCELLED transition
   does not alter the Approval record's state or its satisfaction reference.
   Therefore, an APPROVED Approval that correctly references a Required
   Approval identity continues to satisfy that Required Approval even
   after Q1 reaches CANCELLED. The satisfaction is historically recorded
   and not undone by target lifecycle changes (DR 0030 §15: "satisfaction
   of a Required Approval uses a reference to the Required Approval's own
   identity — independent of the Approval record's target type, target
   state, or temporal position").

**Summary:** a terminal APPROVED Approval on Q1 is fully preserved by
Q1's CANCELLED transition — state, target reference, and Required Approval
satisfaction all remain intact. Nothing about the APPROVED record changes.

### 7.3 REJECTED Approval Targeting Q1

**State:** the Approval record has reached the REJECTED terminal state
(DR 0010). The formal decision was a rejection.

**APPROVED:**

1. The REJECTED Approval's terminal state is immutable. Q1's CANCELLED
   transition does not alter or override it (DR 0010 Historical Integrity,
   DR 0023 §16).
2. The target reference (pointing to Q1) is permanently fixed (DR 0030
   §6 item 3).
3. The historical record stands: "this specific commercial proposal (Q1)
   was formally rejected." Q1's CANCELLED state does not invalidate this.
4. A REJECTED Approval does not satisfy any Required Approval. DR 0022
   §12: satisfaction requires APPROVED terminal state. REJECTED is not
   APPROVED. Q1's CANCELLED transition does not change this.
5. The REJECTED Approval remains as historical evidence that a formal
   decision cycle was completed on Q1. Future Approval cycles (on Q1 or
   on Q2) are not blocked by this historical record — DR 0022 §12:
   "Earlier unsuccessful records neither block nor need reconciliation
   with a later valid APPROVED record."

**Summary:** a REJECTED Approval on Q1 survives Q1's CANCELLED transition
with all records intact. No Required Approval is satisfied. The historical
record of rejection is preserved.

### 7.4 CANCELLED Approval Targeting Q1

**State:** the Approval record has reached the CANCELLED terminal state
(DR 0010). The approval request was intentionally cancelled before a
decision was reached.

**APPROVED:**

1. The CANCELLED Approval's terminal state is immutable. Q1's CANCELLED
   transition does not alter it (DR 0010 Historical Integrity, DR 0023 §16).
2. The target reference (pointing to Q1) is permanently fixed.
3. The historical record stands: "this specific commercial proposal (Q1)
   was the subject of an intentionally cancelled approval request."
4. A CANCELLED Approval does not satisfy any Required Approval. DR 0022
   §12: satisfaction requires APPROVED terminal state. CANCELLED is not
   APPROVED.
5. As with REJECTED (§7.3 item 5), earlier CANCELLED records do not block
   later APPROVED records on the same Required Approval (DR 0022 §12).

**Naming note:** the coincidence of CANCELLED states in both the Approval
and Quote entities does not imply causal relationship. Quote CANCELLED and
Approval CANCELLED are independent states in independent entities (DR 0032
§6). The fact that both Q1 and an Approval on Q1 happen to reach CANCELLED
does not create any special relationship between them.

**Summary:** a CANCELLED Approval on Q1 survives Q1's CANCELLED transition
with all records intact. No Required Approval is satisfied. Historical
record preserved.

### 7.5 EXPIRED Approval Targeting Q1

**State:** the Approval record has reached the EXPIRED terminal state
(DR 0010). The Approval request reached its expiration condition without
a final decision.

**APPROVED:**

1. The EXPIRED Approval's terminal state is immutable. Q1's CANCELLED
   transition does not alter it (DR 0010 Historical Integrity, DR 0023 §16).
2. The target reference (pointing to Q1) is permanently fixed.
3. The historical record stands: "this specific commercial proposal (Q1)
   was the subject of an approval request that expired without a decision."
4. An EXPIRED Approval does not satisfy any Required Approval. DR 0022
   §12: satisfaction requires APPROVED terminal state. EXPIRED is not
   APPROVED.
5. Earlier EXPIRED records do not block later APPROVED records on the
   same Required Approval (DR 0022 §12).

**Naming note:** the coincidence of EXPIRED states in both entities does
not imply causal relationship (DR 0032 §6, carried forward).

**Summary:** an EXPIRED Approval on Q1 survives Q1's CANCELLED transition
with all records intact. No Required Approval is satisfied. Historical
record preserved.

### 7.6 Per-State Summary Table

| Approval State on Q1 | Effect of Q1 CANCELLED | Target Reference | Required Approval Satisfaction | Historical Record |
|---|---|---|---|---|
| PENDING | None (automatic) — DEFERRED (§7.1) | Unchanged (Q1) | Not satisfied (non-terminal) | Preserved |
| APPROVED | None | Unchanged (Q1) | Continues — APPROVED survives Q1 CANCELLED | Preserved |
| REJECTED | None | Unchanged (Q1) | Not satisfied | Preserved |
| CANCELLED | None | Unchanged (Q1) | Not satisfied | Preserved |
| EXPIRED | None | Unchanged (Q1) | Not satisfied | Preserved |

**Key insight:** for all four terminal Approval states (APPROVED,
REJECTED, CANCELLED, EXPIRED), Q1's CANCELLED transition has zero effect
on the Approval record or its historical meaning. For the PENDING state,
Q1's CANCELLED transition has no automatic effect — the PENDING Approval
continues unresolved — but the orchestration question (what the system
must do) is DEFERRED.

## 8. Q2 and New Approval Records

### 8.1 What Is Established

**APPROVED (from DR 0030 §11 item 2, DR 0023 §13, DR 0010 Revision
Separation):**

If Q2 requires a formal Approval (a question of Order requirements, not
decided here), that Approval must be a **new Approval record** — one
with its own UUID v7 identity, its own PENDING initiation, and its own
progression through the Approval state machine (DR 0010). The new
Approval record targets Q2's UUID exclusively.

This follows necessarily from:
- DR 0023 §13: the immutable-reference principle requires a reference to
  a historically-fixed row. Q2 is a new row, distinct from Q1.
- DR 0030 §6 item 4: an existing Approval targeting Q1 cannot be retargeted
  to Q2.
- DR 0010 Revision Separation / Historical Integrity: a new Approval
  decision cycle creates a new Approval record; no existing Approval
  record is reopened or retargeted.

### 8.2 "New" Defined

**APPROVED:**

A "new Approval record" for Q2 means:

1. A new UUID v7 identity for the Approval record — distinct from any
   Approval record that targeted Q1.
2. A new PENDING initiation — the Approval starts fresh in the PENDING
   state.
3. The target type = Quote and target identity = Q2's UUID — not Q1's UUID.
4. The Approval's own lifecycle is governed by DR 0010 independently.
5. The new Approval record is a distinct historical record from any
   Approval that targeted Q1.

### 8.3 Whether Q2 *Must* Have an Approval

**DEFERRED:** whether Q2 *must* be the subject of a new Approval record
depends on the Order's Required Approval obligations and the satisfaction
mechanics (DR 0015–DR 0022). This record establishes that *if* an
Approval is needed for Q2, it must be a new record. It does not establish
that Q2 *always* requires an Approval. That question is an Order
requirements question — not resolved by this record.

### 8.4 No Inheritance Mechanism

**APPROVED (from DR 0030 §6 item 4, §11 item 1):**

There is no mechanism by which an Approval record targeting Q1 is
converted, transferred, or inherited by Q2. The prohibition on retargeting
(DR 0030 §6 item 4) is absolute and derives from the immutable-reference
principle (DR 0023 §13), not from a default that can be overridden. Any
future Q2 Approval record must be independently created, initiated,
and decided.

## 9. Required Approval Analysis

### 9.1 Required Approval Identity Is Fixed

**APPROVED (from DR 0022 §4, §14, §15):**

A Required Approval obligation in an Order is identified by an opaque,
per-Order-unique identifier fixed at Order creation (DR 0022 §4, §15).
Q1's CANCELLED transition and Q2's creation occur after Order creation.
They do not alter the Required Approval's identity.

**APPROVED (from DR 0022 §14):** "a later change to any of those must
never silently redefine an existing Required Approval." Q1's cancellation
is a later change to an upstream object (Quote Q1). This change must not
silently redefine any Required Approval in the Order. The Required
Approval identity and its description slot (if any) are fixed at the
Order creation boundary and are not retroactively altered by Quote
replacement.

### 9.2 Q1 CANCELLED Does Not Alter Required Approval Obligations

**APPROVED (derived from DR 0022 §14, §15, DR 0010 Target Boundary):**

Q1 transitioning to CANCELLED does not remove, modify, or satisfy any
Required Approval in the Order. The Required Approval obligations are
Order-scoped (fixed at Order creation) and are not driven by the lifecycle
of any specific Quote row. The Order's Required Approval collection is not
automatically modified when Q1 is CANCELLED. Whether the Order's Required
Approval obligations should be modified in a cancel-and-replace scenario
is an orchestration and amendment question — **DEFERRED** (§13 item 4).

### 9.3 APPROVED Approval on Q1 — Satisfaction After Q1 CANCELLED

**APPROVED (derived from DR 0022 §7, §12; DR 0030 §13, §15;
DR 0010 Historical Integrity):**

An Approval record that has already reached the APPROVED terminal state
while targeting Q1, and which carries a satisfaction reference to a
Required Approval R1, continues to satisfy R1 even after Q1 transitions
to CANCELLED. The derivation:

1. Satisfaction requires: (a) APPROVED terminal state, and (b) a
   satisfaction reference pointing to R1 (DR 0022 §7).
2. The APPROVED terminal state is immutable — Q1's CANCELLED transition
   does not alter it (DR 0010 Historical Integrity, DR 0023 §16) (§7.2
   item 1).
3. The satisfaction reference is part of the APPROVED Approval record
   and is not altered by Q1's lifecycle changes (DR 0030 §13).
4. Satisfaction uses the Required Approval's own identity — "independent
   of the Approval record's target type, target state, or temporal
   position" (DR 0030 §15).
5. Therefore: conditions (a) and (b) both persist after Q1 CANCELLED →
   satisfaction of R1 persists.

This conclusion follows necessarily from the combination of the
immutable-reference principle, the Historical Integrity rule, and
DR 0030 §15's satisfaction-independence principle. No new rule is
invented; the derivation is made explicit here.

### 9.4 Q2 Approval and Required Approval R1

**DEFERRED:**

Whether an Approval targeting Q2 may, should, or must be directed at the
same Required Approval R1 that Q1's Approval was directed at is not
established by any record in DR 0001–0032. The mechanics governing this:

a. **If Q1's Approval was APPROVED:** Q1's Approval already satisfied R1
   (§9.3). Whether Q2's Approval is also directed at R1, or at a different
   Required Approval, or at no Required Approval (if Q2 has no Required
   Approval obligation in this Order context), is not established.

b. **If Q1's Approval was not APPROVED (REJECTED, CANCELLED, EXPIRED, or
   PENDING at the time Q1 is CANCELLED):** R1 remains unsatisfied. Whether
   Q2's Approval must be directed at R1 to satisfy it, or whether the
   Order amendment mechanism (DEFERRED, DR 0022 §22 item 5) would alter
   the obligations, is not established.

c. **Logically permissible:** DR 0022 §12 establishes that multiple
   Approval records may be directed at the same Required Approval R1 over
   time. There is no prohibition in any record against a new Approval
   (targeting Q2) carrying a satisfaction reference to R1. Whether this
   is *required* or *sufficient* in any specific orchestration is not
   established.

**What is APPROVED (from DR 0022 §12):** the existential satisfaction
model permits a new Approval on Q2 to satisfy R1 if that new Approval
carries the correct satisfaction reference and reaches APPROVED. Prior
unsuccessful records (REJECTED, CANCELLED, EXPIRED) on Q1 for R1 do not
block a new APPROVED Approval on Q2 from satisfying R1 — "Earlier
unsuccessful records neither block nor need reconciliation with a later
valid APPROVED record."

**What is DEFERRED:** whether the system requires, recommends, or
automatically routes Q2's Approval to satisfy R1, and the orchestration
mechanism for this (§13 item 5).

### 9.5 PENDING Approval on Q1 and Required Approval Satisfaction

**APPROVED (from DR 0022 §12):** a PENDING Approval never satisfies a
Required Approval. If Q1's PENDING Approval is the only Approval directed
at R1, and Q1 is CANCELLED while that Approval is still PENDING, then R1
remains unsatisfied. This follows directly from DR 0022 §12's rule
without requiring any new reasoning.

**DEFERRED:** what the system must do to address R1's unsatisfied state
in this configuration — whether a new Approval on Q2 is automatically
required, whether an actor must create one, or whether the Order
amendment mechanism is triggered (§13 items 2, 5).

## 10. Combined Conclusion

**APPROVED (the evidentiary verdict this record establishes):**

### 10.1 Q1/Q2 Separation Principles (Reaffirmed, Not Re-Decided)

1. Q1 and Q2 are distinct rows — no identity continuity (§5.1).
2. No Approval targeting Q1 can be retargeted to Q2 (§5.3).
3. Q2 does not inherit Q1's Approval records (§5.4).
4. Q2 does not inherit Q1's Required Approval satisfaction (§5.5).

### 10.2 Effect of Q1 CANCELLED on Existing Approvals

5. For all terminal Approval states (APPROVED, REJECTED, CANCELLED,
   EXPIRED) targeting Q1: Q1's CANCELLED transition has zero effect on the
   Approval record, its target reference, or its historical meaning (§7.2–
   §7.5).
6. For a PENDING Approval targeting Q1: Q1's CANCELLED transition does not
   automatically resolve the Approval — it continues to reference Q1 and
   awaits a decision. Orchestration of this configuration is DEFERRED
   (§7.1).
7. An APPROVED Approval on Q1 continues to satisfy its Required Approval
   after Q1 is CANCELLED (§9.3).

### 10.3 Q2 and New Approval Records

8. Any Approval for Q2 must be a new Approval record with a new UUID
   identity, new PENDING initiation, and Q2's UUID as the target (§8.1–
   §8.2). This is an absolute structural requirement, not a default.
9. Whether Q2 *must* have an Approval at all is DEFERRED (§8.3).
10. No inheritance mechanism exists for Approval records between Q1 and
    Q2 (§8.4).

### 10.4 Required Approval Obligations

11. Q1's CANCELLED transition does not modify any Required Approval
    obligation in the Order (§9.2).
12. Q1's CANCELLED transition does not un-satisfy any Required Approval
    that was already satisfied by an APPROVED Approval on Q1 (§9.3).
13. A new Approval on Q2 is logically permitted (but not required by
    existing records) to carry a satisfaction reference to the same
    Required Approval that Q1's Approval targeted (§9.4).
14. Earlier unsuccessful Approval records on Q1 do not block a new
    APPROVED Approval on Q2 from satisfying the same Required Approval
    (§9.4; DR 0022 §12).

### 10.5 What Cannot Be Established

**DEFERRED (no formal rule can be established):**

- Whether Q1's CANCELLED transition automatically resolves any PENDING
  Approval on Q1 (§13 item 1).
- Whether an Approval must be decided before Q1 can be CANCELLED (§13
  item 2).
- Temporal ordering between Q1 CANCELLED, Q2 creation, and any related
  Approval events (DR 0032 — preserved, not reopened).
- Whether Q2's Approval must be directed at the same Required Approval
  that Q1's Approval targeted (§13 item 5).
- The amendment/versioning mechanism for Required Approvals after Quote
  replacement (§13 item 4; DR 0022 §22 item 5).

## 11. What Would Resolve These Deferrals

**PROPOSAL — framing for Owner decision:**

**On PENDING Approval response to Q1 CANCELLED (§13 item 1):**

A. "When Q1 is CANCELLED, any PENDING Approval targeting Q1 is
   automatically [CANCELLED / EXPIRED] by the system." — This would
   establish the automatic resolution.

B. "When Q1 is CANCELLED, any PENDING Approval targeting Q1 may remain
   PENDING and must be explicitly decided by an authorized actor." — This
   would confirm that no automatic response occurs.

**On gate before Q1 CANCELLED (§13 item 2):**

C. "Q1 may not be CANCELLED while any Approval targeting Q1 is PENDING."
   — This would establish a gate protecting in-flight Approvals.

D. "Q1 may be CANCELLED regardless of the state of any Approval
   targeting Q1." — This would confirm the absence of a gate.

**On Q2 Approval routing (§13 item 5):**

E. "Any Approval for Q2 in the context of a cancel-and-replace must be
   directed at the same Required Approval that Q1's Approval targeted."
   — This would establish automatic routing.

F. "The actor creating the Approval for Q2 designates which Required
   Approval it should satisfy." — This would leave routing to the actor.

**On Required Approval amendment (§13 item 4):**

G. "A cancel-and-replace of a Quote does not alter the Order's Required
   Approval obligations." — This would establish static obligations.

H. "A cancel-and-replace of a Quote may trigger an amendment to the
   Order's Required Approval obligations through the controlled amendment
   mechanism (when defined)." — This would permit dynamic obligations.

**This record does not make any of these decisions.** Owner approval of
this record does not itself constitute decisions A–H; those decisions
remain separately DEFERRED.

## 12. Interactions

### 12.1 DR 0005 (Quote State Machine)

**Consistent. No change.** DR 0005's six states, transitions, cancel-and-
replace Boundary 5, and CANCELLED terminal state are all preserved. This
record reads Boundary 5 as the approved mechanism for Quote replacement
and derives consequences from it without modifying the state machine.

### 12.2 DR 0010 (Approval State Machine)

**Consistent. No change.** DR 0010's five states, four terminal states,
Target Boundary, Historical Integrity, and Revision Separation are all
preserved. §7 of this record applies Historical Integrity and the Target
Boundary without re-deciding them. No Approval state, transition, or
principle is modified.

### 12.3 DR 0022 (Required Approval Identity)

**Consistent. No change.** DR 0022 §4 (identity), §7 (satisfaction
reference), §12 (existential satisfaction; PENDING never satisfies;
earlier records don't block later APPROVED), §14 (historical stability
— upstream changes don't silently redefine), §15 (Order creation
boundary) are all applied in §9 without modification. DR 0022 §22
(deferred items) is not changed. No Required Approval rule is modified.

### 12.4 DR 0023 (Target Model Boundary)

**Consistent. No change.** §13 (immutable-reference principle) and §16
(historical integrity of terminal Approval records) are reaffirmed in
§5.3, §7, and §8.4. Model A (target type + target identity) is not
modified.

### 12.5 DR 0028 (Asset and Quote Designation)

**Consistent. No change.** §8 items 7–8 (three-events principle;
Approval APPROVED ≠ Quote state) are preserved. §17 (historical integrity
of target reference) is reaffirmed. No designation is changed.

### 12.6 DR 0029 (Role Authority Mapping)

**Consistent. No change.** Role authority for Approval creation and
decisions is orthogonal to the replacement scenario boundary established
here. Who may create a new Approval for Q2 is governed by DR 0029's
per-type role authority matrix — unchanged by this record.

### 12.7 DR 0030 (Target-State and Temporal Boundary)

**Consistent and extending.** §11 items 1–4 (cancel-and-replace
implications — APPROVED) are directly applied and extended in §5 and §7
of this record. §11 item 5 (temporal relationship between Approval
decision and Q1 CANCELLED — DEFERRED) is preserved and not reopened.
§13 (lifecycle independence) is reaffirmed. §15 (satisfaction independence
from target state) is applied in §9.3. §20 item 7 (orchestration
mechanism for Quote replacement) is addressed by this record: this record
establishes the structural boundary and explicitly preserves the
orchestration deferrals.

### 12.8 DR 0031 (Target-State Precondition)

**Consistent. No change.** The evidentiary standard from DR 0031 §2.2
is applied throughout. Target-state precondition questions (DEFERRED
per DR 0031) are not addressed by this record.

### 12.9 DR 0032 (Quote Approval Temporal Ordering)

**Consistent. Temporal deferrals preserved unchanged.** DR 0032's
conclusion that no formal temporal ordering between Approval decisions
and Quote state transitions is established (§14.2) is preserved. §16
(cancel-and-replace temporal implications) DEFERRED items (5–7) are
carried forward as §13 items 1–3 of this record. This record does not
reopen or narrow the temporal ordering deferrals.

### 12.10 DR 0015–0021

**Consistent and orthogonal.** The Requirements Snapshot architecture
(DR 0015–0018), cardinality (DR 0018–0020), and Required Delivery shape
(DR 0021) are unchanged. §9 of this record draws on DR 0022's logical
shape without modifying any earlier record. No snapshot amendment
mechanism is designed or implemented.

## 13. Remaining Deferred Items After This Record

**Addressed by this record but still DEFERRED (confirmed, not promoted):**

1. **Automatic response to Q1 CANCELLED when Approval is PENDING** —
   whether Q1's CANCELLED transition must automatically CANCEL or EXPIRE
   an in-flight PENDING Approval on Q1 (DR 0032 §12.4a, carried forward;
   §7.1 items 4–7 of this record). See §11 decisions A–B.

2. **Gate before Q1 CANCELLED** — whether Q1 may be CANCELLED while an
   Approval targeting Q1 is in PENDING state (a sequencing gate) (DR 0032
   §12.4b, carried forward). See §11 decisions C–D.

3. **Temporal ordering between Approval decision and Q1 CANCELLED** —
   whether the Approval decision must precede, or follows, or is
   independent of Q1's CANCELLED transition (DR 0032 §18 items 1–7;
   preserved unchanged from DR 0032 — not reopened by this record).

4. **Required Approval amendment after Quote replacement** — whether Q1's
   cancellation may, should, or must trigger an amendment to the Order's
   Required Approval obligations (DR 0022 §22 item 5 — controlled
   amendment mechanism, DEFERRED). See §11 decisions G–H.

5. **Q2 Approval routing to Required Approval** — whether an Approval for
   Q2 must, should, or may be directed at the same Required Approval R1
   that Q1's Approval targeted, and the mechanism for this (§9.4;
   §11 decisions E–F).

**Not in scope of this record (still DEFERRED, unchanged):**

6. **Quote target-state precondition** — which Quote lifecycle state an
   Approval may target (DR 0031 §13 items 3, 11).

7. **Asset target-state precondition** — not in scope (DR 0031 §13
   items 1, 10).

8. **Approval ↔ Delivery orchestration** (DR 0010 Deferred Item 12;
   DR 0030 §20 item 8).

9. **Expiration policy per target type** (DR 0010 Deferred Items 7–8;
   DR 0030 §20 item 9).

10. **Order ACTIVE → COMPLETED guard finalization** (DR 0010 Deferred
    Item 13).

11. **Cancellation authorization for Approval** (DR 0010 Deferred Item 9).

12. **Idempotency implementation** (DR 0010 Deferred Item 17).

13. **Physical schema, FK, and CHECK constraints** for Approval–Quote
    target reference (DR 0010 Deferred Items 2–3; DR 0002 D6).

14. **Tenant/RLS implementation** (DR 0010 Deferred Item 16; DR 0002 D1).

## 14. Historical Integrity

**Reaffirmed, unchanged from DR 0014 §14 through DR 0032 §19:**

Terminal Approval records are never overwritten (DR 0010). Q1's CANCELLED
transition does not constitute an event that re-enters, overrides, or
alters any terminal Approval record that references Q1. An APPROVED
Approval on Q1 remains APPROVED. A REJECTED Approval on Q1 remains
REJECTED. A CANCELLED Approval on Q1 remains CANCELLED. An EXPIRED
Approval on Q1 remains EXPIRED. Each record's historical meaning is
preserved permanently, regardless of Q1's later CANCELLED state.

A PENDING Approval on Q1 is also preserved — it continues to reference
Q1 and remains in PENDING state. It has not yet accumulated a historical
decision; its eventual resolution creates the historical record.

## 15. Security / Tenancy

**APPROVED principle, unchanged from DR 0023 §19 through DR 0032 §20:**

Q1 and Q2 must belong to the same organization. Any Approval targeting
Q1 or Q2 must belong to the same organization. Any Required Approval
obligation and its satisfaction must be within the same Order's tenant
context (DR 0002 D1 composite-FK pattern). Cross-tenant references are
never permitted. The cancel-and-replace boundary established in this
record operates within this tenant isolation constraint. Enforcement
mechanism remains **DEFERRED**.

## 16. Financial Separation

Unchanged from every prior record. Q1's CANCELLED transition and Q2's
creation do not imply, trigger, or are inferred from any Payment, Revenue,
Expense, Profit, Refund, or Owner Settlement event. An Approval APPROVED
on Q1 or Q2 has no direct financial consequence per the architecture.
Whether the cancel-and-replace pattern triggers a financial event (e.g.,
a refund trigger or a new Quote-based pricing event) is governed by the
financial architecture — independent of and not established by this record.

## 17. Rejected Alternatives

- **Establishing that Q1 CANCELLED automatically CANCELS a PENDING
  Approval on Q1** — rejected as an APPROVED rule. No record in
  DR 0001–0032 establishes this automatic cascade. DR 0010 Target
  Boundary explicitly states Approval does not own the lifecycle of
  the target. Manufacturing this rule would exceed the evidentiary
  standard (§2.2). Remains DEFERRED (§13 item 1).

- **Establishing that Q1 CANCELLED un-satisfies a previously APPROVED
  Approval on Q1** — rejected. DR 0010 Historical Integrity, DR 0023 §16,
  and DR 0030 §13 collectively establish that terminal Approval records
  are immutable and target lifecycle changes do not alter them. DR 0030
  §15's satisfaction-independence principle confirms that satisfaction
  is independent of the target's later lifecycle state. An APPROVED record
  remains APPROVED and its satisfaction effect remains. There is no record
  supporting retroactive un-satisfaction.

- **Establishing that Q2 automatically inherits Q1's APPROVED status or
  Q1's satisfaction effect** — rejected. DR 0030 §6 item 4 and §11 item 1
  prohibit retargeting and inheritance as structural absolutes. Q2 is a
  new row; it cannot inherit any Approval record's status from Q1.

- **Establishing that the PENDING Approval on Q1 must be decided before
  Q1 can be CANCELLED** — rejected as a formal APPROVED rule. No record
  establishes this gate. DR 0010 Target Boundary (Approval does not own
  target lifecycle) is contrary to a gate controlled by the Approval
  entity. The gate question is an orchestration design choice — DEFERRED
  (§13 item 2; §11 decisions C–D).

- **Establishing that Q1's Required Approval R1 is automatically removed
  from the Order when Q1 is CANCELLED** — rejected. DR 0022 §14 establishes
  that upstream changes must not silently redefine existing Required
  Approvals. DR 0022 §15 fixes Required Approval identity at the Order
  creation boundary. Quote cancellation is a post-creation-boundary event
  and cannot silently alter the Required Approval.

- **Establishing that Q2's Approval must reference the same Required
  Approval R1 as Q1's Approval** — rejected as a formal APPROVED rule.
  DR 0022 §12 permits multiple Approval records to reference the same
  Required Approval over time, but does not mandate that Q2's Approval
  must do so. The routing is an orchestration question — DEFERRED
  (§13 item 5; §11 decisions E–F).

## Consistency with Decision Records 0001–0032

- **Consistent with 0001/0002:** UUID identity, tenant scoping, TEXT+CHECK
  state representation, archive pattern — all unchanged. No schema,
  migration, or code is created by this record.
- **Consistent with 0003–0004 (Campaign/Brief):** not in scope.
- **Consistent with 0005 (Quote):** six states, cancel-and-replace
  Boundary 5, CANCELLED terminal state, and all other Boundaries
  preserved. No Quote state, transition, or boundary is modified.
- **Consistent with 0006 (Asset):** not in scope for this record.
- **Consistent with 0007 (Order):** Order state machine unchanged.
- **Consistent with 0008–0009 (Production Job, AI Generation):** not
  in scope.
- **Consistent with 0010 (Approval):** five states, Target Boundary,
  Historical Integrity, Revision Separation — all unchanged. This record
  applies Historical Integrity and Target Boundary without modifying them.
- **Consistent with 0011–0014:** not modified; foundational architecture
  unchanged.
- **Consistent with 0015–0021 (Requirements):** snapshot content, Required
  Approval qualification/satisfaction, cardinality, and Required Delivery
  all unchanged. §9 of this record applies DR 0022's shape without
  modifying DR 0015–0021.
- **Consistent with 0022 (Required Approval Identity):** §4, §7, §12,
  §13, §14, §15 all applied faithfully without modification. §22 deferred
  items unchanged.
- **Consistent with 0023 (Target Model):** immutable-reference principle
  and §13, §16 reaffirmed; Model A unchanged.
- **Consistent with 0024 (Actor Authority):** role/actor authority is
  orthogonal to this record's boundary.
- **Consistent with 0025–0027 (Designation Framework):** target-type set
  unchanged; no new designation.
- **Consistent with 0028 (Asset and Quote Designation):** §8 items 7–8,
  §17 preserved.
- **Consistent with 0029 (Role Authority Mapping):** orthogonal; role
  authority matrices unchanged.
- **Consistent with 0030 (Target-State and Temporal Boundary):** §11
  items 1–4 applied, item 5 preserved DEFERRED. §13 and §15 applied.
  §20 item 7 addressed: structural boundary established; orchestration
  deferrals preserved.
- **Consistent with 0031 (Target-State Precondition):** evidentiary
  standard applied; target-state preconditions not addressed.
- **Consistent with 0032 (Quote Approval Temporal Ordering):** temporal
  deferrals from §18 items 1–7 preserved unchanged. §16 DEFERRED items
  5–7 carried forward as §13 items 1–3 of this record. No temporal
  ordering established by this record.
- No Decision Record 0001–0032 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume Q1's CANCELLED transition automatically cancels, expires,
  or otherwise resolves any PENDING Approval targeting Q1.
- Do not assume an APPROVED Approval on Q1 is un-satisfied or overridden
  when Q1 reaches CANCELLED.
- Do not assume Q2 inherits any Approval record, Approval state, or
  Required Approval satisfaction from Q1.
- Do not assume an Approval targeting Q1 is retargeted to Q2 at any point.
- Do not assume Q1's CANCELLED transition modifies any Required Approval
  obligation in the Order.
- Do not assume Q1 CANCELLED requires or implies Q2 creation — the
  cancel-and-replace is the approved direction if a change is needed;
  cancellation without replacement is not prohibited.
- Do not assume Q2 must have an Approval at all — that depends on Order
  requirements not established by this record.
- Do not assume that if Q2 requires an Approval, it must be directed at
  the same Required Approval that Q1's Approval targeted.
- Do not assume that any temporal ordering between Approval decision and
  Q1 CANCELLED has been established — see DR 0032.
- Do not assume that Owner approval of this record constitutes decisions
  A–H in §11 — those decisions remain separately DEFERRED.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0032 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
