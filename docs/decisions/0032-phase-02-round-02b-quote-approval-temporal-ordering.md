# Decision Record 0032 — Phase 02 Round 02B: Quote–Approval Temporal Ordering

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner approval. If the Owner
  approves this record, the evidentiary conclusions in §7–§13 become
  authoritative: (1) no formal temporal ordering between any Approval
  decision and any Quote state transition can be established from existing
  evidence; (2) the separation principles in §7 (Approval decisions do not
  cause Quote transitions; Quote transitions do not alter Approval records)
  are confirmed as APPROVED from prior records; (3) all causal-ordering and
  orchestration questions in §§8–12 remain DEFERRED. No schema, migration,
  or implementation is authorized.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0031. All remain authoritative and unchanged. This record directly
  addresses DR 0030 §20 item 6 ("Temporal ordering of Approval decision and
  Quote state transition") and DR 0028 §10 item 9 (same item, as deferred
  there), evaluating whether any formal ordering between Approval decisions
  and Quote lifecycle transitions can be established from existing Decision
  Records 0001–0031. It also addresses DR 0031 §13 item 5 (the same item
  carried forward). It concludes that no formal ordering can be established
  from existing evidence and explains the evidentiary gap for each
  transition pairing.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from
0013–0031. This record does not claim Owner approval; it proposes
Owner approval of the evidentiary conclusions in §7–§13.

## 1. Context

Decision Record 0028 §10 item 9 explicitly deferred: "Temporal ordering
of Approval decision and Quote state transition: whether the Approval's
APPROVED/REJECTED decision triggers the Quote's ACCEPTED/REJECTED
transition, and how that is enforced (DEFERRED)." This item was carried
forward as DR 0030 §20 item 6 and as DR 0031 §13 item 5, each time
remaining explicitly DEFERRED.

Decision Records 0030 and 0031 established the following as APPROVED:
Approval decisions do not directly cause Quote state transitions
(DR 0030 §12.2); Approval APPROVED ≠ Quote ACCEPTED (DR 0030 §12.2);
Quote ACCEPTED, an Approval record targeting that Quote, and Order
creation are three separate events (DR 0028 §8 item 7).

What remains unresolved is whether any *formal ordering* — a required
sequencing constraint — governs the relationship between an Approval
decision and a Quote state transition. The separation principle
(Approval does not drive Quote) is established; the sequencing question
(which must happen first, and who or what enforces it) is not.

This record evaluates every relevant pairing — Approval creation, Approval
decision (in any terminal state), and each of the six Quote transitions —
and determines whether a formal ordering is supportable from existing
evidence.

## 2. Objective and Evidentiary Standard

### 2.1 Objective

For each pairing of an Approval state event and a Quote lifecycle
transition, determine whether Decision Records 0001–0031 supply
sufficient evidence to establish a formal temporal ordering constraint:
a rule of the form "event A must precede event B," "event A may not
occur after event B," or "event A causes event B."

Where evidence reaches the constraint-grade threshold, the ordering is
labeled APPROVED. Where it does not, the ordering remains DEFERRED,
with the specific evidentiary gap documented.

### 2.2 Evidentiary Standard

**APPROVED classification requires** a direct statement in an
authoritative Decision Record 0001–0031 that establishes a rule about
temporal ordering between an Approval event and a Quote event. Forms
include:

- An explicit ordering rule: "The Approval decision must occur before
  the Quote transitions to ACCEPTED."
- An explicit causal rule: "An Approval APPROVED decision causes (or
  triggers) the Quote's ACCEPTED transition."
- A structural consequence that necessarily entails such an ordering
  rule — not merely a description of natural workflow sequence.

**INFERENCE classification applies to** evidence that describes the
natural or expected sequence without establishing a formal gate or causal
rule. A description of how the commercial workflow usually proceeds is
inference-grade even when strongly supported.

**DEFERRED applies** when no constraint-grade evidence exists and no
structural consequence entails the ordering as a necessary rule. The
task instruction is explicit: "If authoritative evidence is insufficient
to establish temporal ordering, keep the issue DEFERRED rather than
manufacturing a rule."

### 2.3 Key Constraint from Prior Records

**APPROVED (from DR 0030 §12.2, DR 0028 §8 items 7–8, DR 0010):**

Three separation principles are already established and are not reopened
by this record:

1. **Approval decisions do not directly cause any Quote state
   transition.** The Quote's own state machine (DR 0005) governs Quote
   transitions. Approval does not write to the Quote's `status` column
   (DR 0010 Target Boundary; DR 0030 §12.2).
2. **Approval APPROVED ≠ Quote ACCEPTED.** These are independent events
   in independent entities (DR 0030 §12.2, DR 0028 §8 item 8).
3. **Quote transitions do not retroactively alter the Approval's target
   reference.** The Approval's target reference is fixed at Approval
   creation (DR 0030 §6, §13).

What this record evaluates is the distinct question of *temporal ordering*:
even granting full separation, must one event precede another? Must they
be coordinated? Do any of the DR 0001–0031 sources establish such a rule?

## 3. Governing Sources

**APPROVED sources used in this record:**

- **DR 0005** — Quote state machine. Six states, transitions, commercial
  guards, Boundary 3 (Quote ACCEPTED, Client Approval, Order creation are
  distinct events), Boundary 5 (cancel-and-replace pattern), Boundary 9
  ("No Approval states are created by this record"). Architectural
  Consequence: "Any future Order-creation logic must treat Quote ACCEPTED,
  a Client Approval record, and Order creation as three separate
  events/records, not one."
- **DR 0010** — Approval state machine. Target Boundary: "Approval does
  not own the lifecycle of the target it decides on." Revision Separation.
  Historical Integrity: terminal Approval records are never overwritten.
- **DR 0023** — Approval target model. §13: immutable-reference principle;
  target must be a historically-fixed row. §16: historical integrity
  of terminal Approval records.
- **DR 0028** — Asset and Quote designation. §8 item 7: "Quote ACCEPTED,
  an Approval record targeting that Quote, and Order creation are three
  separate events." §8 item 8: "An Approval record's terminal state of
  APPROVED is not a Quote state." §10 item 9: temporal ordering explicitly
  DEFERRED. §21 item 5: same item in the deferred list.
- **DR 0029** — Role authority mapping. §8.2: CLIENT decision authority
  APPROVED for Quote-targeting Approvals (pending Owner approval of
  DR 0029). No temporal sequencing established.
- **DR 0030** — Target-state and temporal boundary. §7: combined ordering
  (target row creation → Approval creation → Approval decision). §11 item 5:
  "Whether the Approval's REJECTED decision must precede, or causes, the
  Quote's CANCELLED transition — DEFERRED." §12.2: Approval decisions do not
  directly cause Quote state transitions; Approval APPROVED ≠ Quote ACCEPTED.
  §20 item 6: temporal ordering of Approval decision and Quote state
  transition — DEFERRED.
- **DR 0031** — Target-state precondition. §13 item 5: temporal ordering of
  Approval decision and Quote state transition — DEFERRED (carried forward).

## 4. Scope of This Record

**This record establishes:**

1. The evidentiary verdict on whether any formal ordering between Approval
   decisions and Quote state transitions can be derived from DR 0001–0031.
2. A systematic per-pairing analysis of Approval creation, Approval
   APPROVED, Approval REJECTED, Approval CANCELLED, Approval EXPIRED, and
   each relevant Quote state transition (SENT → ACCEPTED, SENT → REJECTED,
   SENT → EXPIRED, SENT → CANCELLED).
3. An explicit DEFERRED determination for every pairing that lacks
   constraint-grade evidence.
4. The framing of what explicit Owner decisions would close these deferrals
   (§14).

**This record does NOT:**

- Establish a formal Quote target-state precondition (DEFERRED from
  DR 0031; not addressed by this record).
- Establish a formal Asset target-state precondition (not in scope).
- Establish any orchestration mechanism (not authorized).
- Introduce new Quote states, Approval states, entities, roles, or
  permissions.
- Modify DR 0005, DR 0010, or any prior Decision Record.
- Design any schema, migration, or implementation artifact.
- Invent rules not supported by DR 0001–0031.

## 5. Baseline: What Is Already Established

**APPROVED (from prior records; reaffirmed here, not re-decided):**

### 5.1 Minimum Temporal Structure (from DR 0030 §7)

For any Quote-targeting Approval:

```
Quote row creation → Approval creation (PENDING) → Approval decision (terminal)
```

This three-event ordering is established (DR 0030 §7 items 1–3). It
does not fix the gap between events — the gap may be arbitrarily short
or long. It does not constrain the Quote's lifecycle state at Approval
creation time (DEFERRED, DR 0031). It does not constrain any Quote
lifecycle transition relative to the Approval decision.

### 5.2 State Machine Separation (from DR 0010, DR 0005, DR 0028, DR 0030)

Two state machines operate independently:

- **Quote state machine (DR 0005):** DRAFT → SENT → {ACCEPTED,
  REJECTED, EXPIRED, CANCELLED}. Governed by DR 0005. No Approval states.
- **Approval state machine (DR 0010):** PENDING → {APPROVED, REJECTED,
  CANCELLED, EXPIRED}. Governed by DR 0010. No Quote states.

**APPROVED (DR 0005 Boundary 1):** "Quote state is separate from
Campaign state, Order state, Payment state, and Approval state."

**APPROVED (DR 0005 Boundary 9):** "No Approval states are created by
this record."

**APPROVED (DR 0028 §8 item 8):** "An Approval record's terminal state
of APPROVED is not a Quote state."

**APPROVED (DR 0010, Target Boundary):** "Approval does not own the
lifecycle of the target it decides on."

These separation boundaries are fixed and are not reopened by this record.

### 5.3 No Direct Causation (from DR 0030 §12.2)

**APPROVED (from DR 0030 §12.2, DR 0028 §6 item 8, DR 0010):**

An Approval decision — regardless of outcome (APPROVED, REJECTED,
CANCELLED, EXPIRED) — does not directly cause any Quote state transition
and does not write to the Quote row's `status` column. This is already
established. The causation question (whether Approval decision may
*trigger* a Quote transition as part of an orchestrated workflow) is a
separate question — DEFERRED (§8–§12 below).

### 5.4 Three-Events Principle (from DR 0028 §8 item 7, DR 0005)

**APPROVED:** "Quote ACCEPTED, an Approval record targeting that Quote,
and Order creation are three separate events." These three events do not
collapse into one; they are distinct records in distinct entities.
This principle confirms the separation but does not establish ordering —
which of the three events occurs first is not determined by this principle
alone.

### 5.5 Target Reference Survives Quote Transitions (from DR 0030 §13)

**APPROVED (from DR 0030 §13, DR 0023 §13):** After an Approval record
is created targeting Quote Q1, any subsequent lifecycle state transition
of Q1 (SENT → ACCEPTED, SENT → REJECTED, SENT → EXPIRED, or SENT →
CANCELLED) does not alter the Approval's target reference. The Approval
continues to reference Q1 regardless of Q1's later lifecycle state. The
historical record of "a formal decision was made on this specific
commercial proposal" is preserved permanently.

## 6. Naming Disambiguation

Throughout this record, the following same-word states belong to different
entities and are kept distinct:

| Word | Approval entity state | Quote entity state |
|---|---|---|
| REJECTED | Approval was formally rejected (decision) | Client declined the Quote |
| EXPIRED | Approval reached expiration without decision | Quote's validity period elapsed |
| CANCELLED | Approval intentionally cancelled before decision | Company withdrew the Quote |

**APPROVED (from DR 0005, DR 0010):** These are coincidentally named
states in independent state machines. A Quote being in REJECTED state
does not cause or imply any Approval state, and vice versa. No record
in DR 0001–0031 conflates them.

## 7. Approval Creation vs. Quote State

**APPROVED minimum constraint:**

The Quote row must exist before the Approval record is created
(DR 0030 §6 item 2). This is the only formally established constraint
relating Approval creation to Quote existence. The Quote's lifecycle
state at that moment of Approval creation is DEFERRED (DR 0031).

**Therefore, Approval creation can coincide in time with any Quote
lifecycle state, subject only to the existence constraint.** The
inference that SENT is the natural state at Approval creation time is
documented in DR 0030 §9.3 and DR 0031 §9 as INFERENCE — not as a
formal constraint.

**DEFERRED: whether Approval creation is formally constrained to occur
only while the Quote is in SENT state, or any other specific state.**
This is DR 0031's deferred item 3 (formal Quote state precondition) and
is not resolved by this record.

## 8. Approval Decision vs. Quote ACCEPTED

### 8.1 Evidence Inventory

**FACT (DR 0005, ACCEPTED Definition):** "`ACCEPTED` — Client has
accepted the Quote's terms."

**FACT (DR 0005, Transition):** `SENT` → `ACCEPTED` is an approved Quote
transition. It is a terminal transition for Quote.

**FACT (DR 0028 §8 item 7):** "Quote ACCEPTED, an Approval record
targeting that Quote, and Order creation are three separate events."

**FACT (DR 0028 §8 item 8):** "An Approval record's terminal state of
APPROVED is not a Quote state."

**FACT (DR 0028 §10 item 9):** "Temporal ordering of Approval decision
and Quote state transition: whether the Approval's APPROVED/REJECTED
decision triggers the Quote's ACCEPTED/REJECTED transition, and how that
is enforced (DEFERRED)."

**FACT (DR 0030 §12.2):** Approval APPROVED ≠ Quote ACCEPTED. These are
two separate state transitions in two separate entities. "An Approval
reaching APPROVED does not imply Quote is ACCEPTED, and Quote reaching
ACCEPTED does not imply any Approval exists or has been decided."

**FACT (DR 0005 Architectural Consequence):** "Any future Order-creation
logic must treat Quote ACCEPTED, a Client Approval record (if Quote is
later approved as an Approval target type), and Order creation as three
separate events/records, not one."

### 8.2 Analysis

The three-events principle (§5.4) establishes that Approval APPROVED
and Quote ACCEPTED are distinct events that do not collapse. It does not
establish which occurs first, or whether one causes the other.

DR 0028 §10 item 9 explicitly deferred whether Approval APPROVED triggers
Quote ACCEPTED. No record in DR 0001–0031 contains a statement of the
form "the Approval's APPROVED decision must precede Quote ACCEPTED" or
"Quote ACCEPTED must precede the Approval decision" or "Approval APPROVED
causes Quote ACCEPTED."

DR 0030 §12.2 establishes that Approval APPROVED does not *directly*
cause a Quote state transition. This is the separation principle — it
forecloses one specific causal pattern (direct write to Quote status by
the Approval decision) but leaves open the orchestration question: could
an Approval APPROVED decision *signal* an orchestration process that
then causes Quote ACCEPTED? That mechanism is not established; DR 0028
§10 item 9 explicitly deferred it.

### 8.3 Verdict

**DEFERRED: no formal ordering between Approval APPROVED and Quote
ACCEPTED can be established from existing evidence.**

The following sub-questions are each individually DEFERRED:

a. **Does Approval APPROVED cause or trigger Quote ACCEPTED?**
   DEFERRED (DR 0028 §10 item 9). The separation principle (§2.3) rules
   out *direct* causation; orchestrated causation is unresolved.

b. **Must Approval APPROVED precede Quote ACCEPTED?**
   DEFERRED. No record establishes this ordering constraint.

c. **Must Quote ACCEPTED precede Approval APPROVED?**
   DEFERRED. No record establishes this ordering constraint.

d. **May Approval reach APPROVED while Quote is still in SENT?**
   DEFERRED. No record prohibits or permits this configuration.

e. **May Quote reach ACCEPTED while Approval is still PENDING?**
   DEFERRED. No record prohibits or permits this configuration.

**What is APPROVED:** Approval APPROVED ≠ Quote ACCEPTED (the states
are in different entities); they are three separate events (DR 0028 §8
item 7); Approval APPROVED does not directly write to Quote status
(DR 0030 §12.2). These are the established separation facts. Ordering
is not established.

## 9. Approval Decision vs. Quote REJECTED

### 9.1 Evidence Inventory

**FACT (DR 0005, REJECTED Definition):** "`REJECTED` — Client has
declined the Quote."

**FACT (DR 0010, REJECTED Definition):** "`REJECTED` — The approval
request has been formally rejected."

**FACT (DR 0005, Transition):** `SENT` → `REJECTED` is an approved
Quote transition. It is a terminal transition for Quote.

**FACT (DR 0028 §10 item 9):** temporal ordering between Approval decision
and Quote state transition — DEFERRED.

**FACT (DR 0030 §12.2):** Approval decisions do not directly cause any
Quote state transition.

### 9.2 Analysis

The Approval entity's REJECTED state (a formal rejection of the approval
request by the authorized actor — DR 0010) and the Quote entity's
REJECTED state (a client declining the Quote's commercial terms — DR 0005)
are coincidentally named states in independent state machines. A client
declining a Quote (Quote REJECTED) is a commercial decision. A formal
Approval rejection (Approval REJECTED) is a governance decision on a
previously-created Approval record. These are conceptually distinct
events.

No record in DR 0001–0031 establishes:
- "Approval REJECTED causes Quote REJECTED"
- "Approval REJECTED must precede Quote REJECTED"
- "Quote REJECTED must precede Approval REJECTED"
- "Approval REJECTED must occur in conjunction with Quote REJECTED"

DR 0030 §12.2 (Approval decisions do not directly cause Quote state
transitions) forecloses direct causation. The orchestration question is
not addressed by any record.

### 9.3 Verdict

**DEFERRED: no formal ordering between Approval REJECTED and Quote REJECTED
can be established from existing evidence.**

The sub-questions:

a. **Does Approval REJECTED cause or trigger Quote REJECTED?**
   DEFERRED. Direct causation ruled out by DR 0030 §12.2; orchestrated
   causation not established.

b. **Must Approval REJECTED precede Quote REJECTED?**
   DEFERRED. No record establishes this ordering.

c. **Must Quote REJECTED precede Approval REJECTED?**
   DEFERRED. No record establishes this ordering.

d. **May these two events occur independently (different actors, different
   times, no enforced relationship)?**
   DEFERRED. No record prohibits or requires a relationship.

**What is APPROVED:** the two REJECTED states are in different entities
with different semantic meanings; neither implies the other (DR 0005,
DR 0010, naming disambiguation §6 of this record); Approval REJECTED
does not directly write to Quote status (DR 0030 §12.2).

## 10. Approval Decision vs. Quote EXPIRED

### 10.1 Evidence Inventory

**FACT (DR 0005, EXPIRED Definition):** "`EXPIRED` — The Quote's validity
period has elapsed without acceptance."

**FACT (DR 0005, Transition):** `SENT` → `EXPIRED` is an approved Quote
transition. It is terminal for Quote.

**FACT (DR 0005, Expiry section):** "The implementation mechanism for
determining or persisting expiration (scheduled job, evaluated-on-read,
lazy transition-on-touch, or any other mechanism) is DEFERRED."

**FACT (DR 0010, EXPIRED Definition):** "`EXPIRED` — The approval request
reached its expiration condition without receiving a final decision."

**FACT (DR 0010, Expiration section):** "`EXPIRED` is an approved Approval
state. The following remain DEFERRED: expiration duration, who defines
expiration, automatic expiration mechanism…"

**FACT (DR 0028 §10 item 9):** temporal ordering between Approval decision
and Quote state transition — DEFERRED.

### 10.2 Analysis

Quote EXPIRED is time-driven: the Quote's validity period elapses
without acceptance (DR 0005). Approval EXPIRED is expiration-condition-
driven: the Approval request reaches its expiration condition without a
final decision (DR 0010). Both expiration mechanisms are independently
DEFERRED (DR 0005 Expiry; DR 0010 Expiration).

An interesting configuration arises: what if a Quote expires (SENT →
EXPIRED) while an Approval targeting that Quote is still PENDING? No
record in DR 0001–0031 addresses this. The Approval's target reference
continues to point to the now-EXPIRED Quote row (DR 0030 §13 — the
Approval's target reference is not altered by Quote's lifecycle changes).
Whether the Quote's EXPIRED transition causes, triggers, or requires a
response from any in-flight Approval is an orchestration question —
not established by any record.

Similarly, whether an Approval EXPIRED decision implies or precedes
or follows a Quote EXPIRED transition is not established. The two
expirations are time-based events in independent systems with
independently DEFERRED expiration mechanisms.

### 10.3 Verdict

**DEFERRED: no formal ordering between any Approval decision and Quote
EXPIRED can be established from existing evidence.**

The sub-questions:

a. **Does Quote EXPIRED cause or require the Approval to transition to
   CANCELLED or EXPIRED?**
   DEFERRED. No record establishes this causal link.

b. **Does Approval EXPIRED cause or require the Quote to transition to
   EXPIRED or CANCELLED?**
   DEFERRED. No record establishes this causal link.

c. **If Quote is EXPIRED and an Approval is PENDING, what happens?**
   DEFERRED. The Approval's target reference remains (DR 0030 §13).
   Whether the system must cancel, expire, or otherwise handle the
   in-flight Approval is an orchestration question not established by
   any record.

d. **Must one expiration event precede the other?**
   DEFERRED. No record establishes any ordering.

**What is APPROVED:** the two EXPIRED states are in different entities
with independently DEFERRED expiration mechanisms; the Approval's target
reference to the Quote row persists even after the Quote reaches EXPIRED
(DR 0030 §13); Approval does not own Quote lifecycle (DR 0010).

## 11. Approval Decision vs. Quote CANCELLED

### 11.1 Evidence Inventory

**FACT (DR 0005, CANCELLED Definition):** "`CANCELLED` — The company has
withdrawn the Quote before client acceptance."

**FACT (DR 0005, Boundary 5):** "If a sent Quote must be changed, the
approved direction is: cancel the existing Quote, create a new Quote."

**FACT (DR 0010, CANCELLED Definition):** "`CANCELLED` — The approval
request was intentionally cancelled before completion."

**FACT (DR 0030 §11 item 5):** "The temporal relationship between
Approval decision and Quote CANCELLED transition is DEFERRED. Whether
the Approval's REJECTED decision must precede, or causes, the Quote's
CANCELLED transition, and whether an Approval may be in PENDING while
the Quote is SENT, ACCEPTED, REJECTED, EXPIRED, or CANCELLED — all of
these sequencing constraints are DEFERRED (DR 0028 §10 item 9; §20 item 3
of this record)."

**FACT (DR 0030 §20 item 7):** "Orchestration mechanism for Quote
replacement — whether an Approval REJECTED decision on Q1 automatically
triggers Q1's CANCELLED transition before Q2 is created, or whether
these are separately coordinated events."

### 11.2 Analysis

DR 0030 §11 item 5 addressed this pairing directly and explicitly held
it DEFERRED. This record confirms that finding unchanged.

A replace-scenario configuration: an Approval REJECTED decision is issued
on Q1 (SENT); Q1 is then CANCELLED and Q2 is created. Whether Approval
REJECTED *causes* Q1 CANCELLED, *must precede* Q1 CANCELLED, or is
simply a conceptually prior event in a separately coordinated workflow —
all remain DEFERRED (DR 0030 §20 item 7).

A second configuration: Q1 is CANCELLED (company withdraws the Quote)
while an Approval on Q1 is still PENDING. Whether the Quote's CANCELLED
state causes, requires, or implies anything about the in-flight Approval
is not established by any record. The Approval's target reference
continues to point to the now-CANCELLED Q1 (DR 0030 §13). Whether the
system must automatically cancel or expire the in-flight Approval is an
orchestration question — not established.

### 11.3 Verdict

**DEFERRED: no formal ordering between any Approval decision and Quote
CANCELLED can be established from existing evidence.**

The sub-questions:

a. **Does Approval REJECTED cause or must it precede Quote CANCELLED?**
   DEFERRED (DR 0030 §20 item 7; DR 0028 §10 item 9).

b. **Does Quote CANCELLED cause or require Approval to transition to
   CANCELLED or EXPIRED?**
   DEFERRED. No record establishes this causal link.

c. **If Quote is CANCELLED while Approval is PENDING, what happens?**
   DEFERRED. The Approval's target reference remains (DR 0030 §13).
   Orchestration response is not established.

d. **Must Approval reach a terminal state before Q1 can be CANCELLED
   in a cancel-and-replace scenario?**
   DEFERRED (DR 0030 §20 item 7).

**What is APPROVED:** the two CANCELLED states are in different entities
with different semantic meanings (§6); the Approval's target reference
persists even after the Quote reaches CANCELLED (DR 0030 §13); Approval
does not own Quote lifecycle (DR 0010); any replacement Quote Q2 is a
distinct row and requires a new Approval record (DR 0030 §11 items 1–4).

## 12. Quote Terminal Transition While Approval Is PENDING

### 12.1 Problem

A configuration exists in which a Quote-targeting Approval is in PENDING
state while the targeted Quote row reaches one of its terminal states:
ACCEPTED, REJECTED, EXPIRED, or CANCELLED. This is not a hypothetical
edge case — if Quote can reach terminal states independently of Approval
decisions (which is established: §2.3 item 1, §5.2), then an in-flight
Approval may encounter a terminal-state Quote.

Whether this configuration is permitted, and what the system must do
when it occurs, are orchestration questions not established by any record
in DR 0001–0031.

### 12.2 Evidence

**FACT (DR 0030 §13):** "Once an Approval record is created referencing
a specific Asset or Quote row, the target's subsequent lifecycle state
transitions do not alter the Approval's target reference."

**FACT (DR 0030 §12.2):** "Approval APPROVED ≠ Quote ACCEPTED. These are
two separate state transitions in two separate entities."

**FACT (DR 0010, Target Boundary):** Approval does not own the lifecycle
of the target it decides on.

**FACT (DR 0028 §10 item 9):** temporal ordering DEFERRED.

### 12.3 What Is Established

**APPROVED:** the Approval's target reference is not altered when the
Quote reaches a terminal state (DR 0030 §13). The Approval record
continues to reference Q1 even if Q1 is now ACCEPTED, REJECTED, EXPIRED,
or CANCELLED.

**APPROVED:** the Approval does not own Quote lifecycle (DR 0010 Target
Boundary), so the Quote's terminal transition is not governed by the
Approval entity.

### 12.4 What Remains DEFERRED

**DEFERRED:**

a. **Whether an in-flight Approval (PENDING) is automatically cancelled
   or expired when the targeted Quote reaches any terminal state.**
   No record establishes this automatic response.

b. **Whether the system must prevent a Quote from reaching a terminal
   state while an Approval on that Quote is PENDING.**
   No record establishes this guard.

c. **Whether a PENDING Approval on a now-terminal Quote can still
   receive a valid decision (APPROVED, REJECTED, CANCELLED).**
   No record establishes whether this is permitted or prohibited.

d. **Whether Quote ACCEPTED while Approval PENDING is a valid
   configuration, and if so what the system does.**
   DEFERRED.

**Summary:** the Approval record survives the Quote's terminal transition
as a valid historical record (DR 0030 §13); what the system must do
about an in-flight Approval in that configuration is entirely
DEFERRED.

## 13. Approval CANCELLED or EXPIRED and Quote State

### 13.1 Approval CANCELLED

**FACT (DR 0010, CANCELLED Definition):** Approval CANCELLED = "The
approval request was intentionally cancelled before completion." This is
a terminal Approval state.

**FACT (DR 0010, Cancellation section):** "Not invented by this record:
automatic cancellation cascades, who can cancel, cancellation side
effects, automatic Order cancellation, automatic refund, automatic
financial reversal, or automatic production cancellation."

**DEFERRED:** whether Approval CANCELLED causes, requires, or implies
any Quote state transition. No record in DR 0001–0031 establishes any
relationship.

### 13.2 Approval EXPIRED

**FACT (DR 0010, Expiration section):** expiration mechanism is DEFERRED.

**DEFERRED:** whether Approval EXPIRED causes, requires, or implies any
Quote state transition. No record in DR 0001–0031 establishes any
relationship.

### 13.3 Summary

**APPROVED (from DR 0010):** Approval CANCELLED and Approval EXPIRED are
terminal Approval states. The Approval record is historically preserved
(DR 0010 Historical Integrity, DR 0023 §16). The target reference remains
fixed (DR 0030 §6, §13). The Quote's lifecycle is not altered by either
of these Approval terminal states (DR 0010 Target Boundary, DR 0030
§12.2).

**DEFERRED:** all orchestration questions about what the system does in
response to Approval CANCELLED or Approval EXPIRED with respect to the
targeted Quote.

## 14. Combined Conclusion

**APPROVED (the evidentiary verdict this record establishes):**

### 14.1 What Is Formally Established

From prior Decision Records (reaffirmed, not re-decided):

1. **State machine separation is complete:** Quote state and Approval
   state are in independent state machines with no overlapping values
   (§5.2). This is APPROVED from DR 0005 Boundary 1, DR 0005 Boundary 9,
   DR 0028 §8 item 8, DR 0010 Target Boundary.

2. **No direct causation in either direction:**
   - Approval decisions do not directly cause Quote state transitions
     (APPROVED from DR 0030 §12.2, DR 0028 §6 item 8, DR 0010).
   - Quote state transitions do not alter the Approval's target reference
     (APPROVED from DR 0030 §13, DR 0023 §13).

3. **Minimum structural ordering established:**
   ```
   Quote row creation → Approval creation (PENDING) → Approval decision
   ```
   (APPROVED from DR 0030 §7.)

4. **Three-events principle:** Quote ACCEPTED, Approval on that Quote,
   Order creation are three separate events (APPROVED from DR 0028 §8
   item 7).

5. **Naming disambiguation:** the coincidentally named states (REJECTED,
   EXPIRED, CANCELLED) in the two state machines are independent events
   with independent semantics. One does not imply, cause, or require the
   other (APPROVED from DR 0005, DR 0010, §6 of this record).

### 14.2 What Cannot Be Formally Established

**No formal temporal ordering between any Approval decision and any Quote
state transition can be established from Decision Records 0001–0031.**

Specifically, none of the following can be established:

| Pairing | APPROVED ordering | Status |
|---|---|---|
| Approval APPROVED vs. Quote ACCEPTED | None | DEFERRED (§8) |
| Approval APPROVED vs. Quote REJECTED | None | DEFERRED (§9) |
| Approval APPROVED vs. Quote EXPIRED | None | DEFERRED (§10) |
| Approval APPROVED vs. Quote CANCELLED | None | DEFERRED (§11) |
| Approval REJECTED vs. Quote ACCEPTED | None | DEFERRED (§8, §9) |
| Approval REJECTED vs. Quote REJECTED | None | DEFERRED (§9) |
| Approval REJECTED vs. Quote CANCELLED | None | DEFERRED (§11) |
| Approval CANCELLED vs. any Quote transition | None | DEFERRED (§13.1) |
| Approval EXPIRED vs. any Quote transition | None | DEFERRED (§13.2) |
| Quote terminal transition while Approval PENDING | None | DEFERRED (§12) |

The underlying reason for every DEFERRED entry is the same: DR 0028
§10 item 9 explicitly deferred the temporal ordering question, and no
subsequent record (DR 0029–0031) has supplied constraint-grade evidence
that would close it.

### 14.3 INFERENCE (not APPROVED)

**INFERENCE:** the natural commercial workflow suggests an expected
sequence — an Approval on a SENT Quote is decided (APPROVED or REJECTED),
and the Quote subsequently transitions to ACCEPTED or REJECTED or CANCELLED
based on the outcome. This is the sequence implied by DR 0005's SENT
definition ("awaits the client's decision") and DR 0029's CLIENT decision
authority for Quote-targeting Approvals.

**This is INFERENCE, not an APPROVED ordering constraint.** The
characterization of SENT as "awaiting decision" describes the purpose
of the state; it does not establish a formal sequencing rule. The same
evidentiary standard applied in DR 0031 (§2.2) applies here: the gap
between "this is the natural sequence" and "this sequence is formally
required" is not bridged by DR 0001–0031.

## 15. What Would Resolve These Deferrals

**PROPOSAL — framing for Owner decision:**

An explicit Owner decision on the following questions would close the
outstanding deferrals:

**On causal relationship (orchestration):**

A. "When an Approval targeting a Quote is decided APPROVED, the system
   [shall/shall not] automatically trigger the Quote's ACCEPTED
   transition." — This would establish or deny orchestrated causation.

B. "When an Approval targeting a Quote is decided REJECTED, the system
   [shall/shall not] automatically trigger the Quote's CANCELLED transition
   before Q2 can be created." — This would establish or deny the
   cancel-and-replace causal link.

C. "When a targeted Quote reaches a terminal state while an Approval is
   PENDING, the Approval [shall automatically be CANCELLED / shall
   automatically be EXPIRED / may remain PENDING / shall be decided
   by the system]." — This would establish the in-flight response.

**On ordering constraints (sequencing without causation):**

D. "The Approval decision must precede the Quote's ACCEPTED transition."
   — This would establish a sequencing constraint without requiring
   direct causation.

E. "The Quote's ACCEPTED transition may occur independently of and before
   any Approval decision on that Quote." — This would explicitly permit
   independent ordering.

**This record does not make any of these decisions.** It frames them
as the explicit Owner choices needed. Owner approval of this record
does not itself constitute decisions A–E; those decisions remain
separately DEFERRED.

## 16. Quote Cancel-and-Replace — Temporal Implications

**APPROVED (from DR 0005 Boundary 5, DR 0030 §11, DR 0023 §13):**

The cancel-and-replace pattern (Q1 CANCELLED → Q2 created) and the
immutable-target-reference principle (DR 0030 §6) together establish
the following structural ordering for a replacement scenario:

```
Q1 created → Approval #A created (targeting Q1) → [events TBD] →
Q1 CANCELLED → Q2 created → Approval #B created (targeting Q2) →
[events TBD]
```

**What is APPROVED:**

1. Q2 must exist before Approval #B can be created (DR 0030 §6 item 2).
2. Approval #A targets Q1 exclusively; Approval #B targets Q2 exclusively.
   They cannot be re-targeted (DR 0030 §6 item 4).
3. Q2 is a distinct row (distinct UUID) from Q1 (DR 0005 Boundary 5).
4. Approval #A's terminal state (whatever it is) remains a permanent
   historical record on Q1's commercial terms (DR 0010 Historical
   Integrity, DR 0023 §16).

**What is DEFERRED:**

5. Whether Q1 must be CANCELLED before, simultaneously with, or after
   Approval #A reaches a terminal state (DR 0030 §20 item 7 — carried
   forward unchanged by this record).
6. Whether Approval #A must reach a terminal state before Q1 can be
   CANCELLED (orchestration gate — not established).
7. The mechanism by which the cancel-and-replace scenario is initiated
   and coordinated.

## 17. Interactions

### 17.1 DR 0005 (Quote State Machine)

**Consistent. No change.** DR 0005's six states, transitions, commercial
guards, and Boundary 3 (distinct events), Boundary 5 (cancel-and-replace),
and Architectural Consequence (three separate events) are unchanged. This
record reads DR 0005 as evidence only. No Quote state, transition, or
boundary is modified.

### 17.2 DR 0010 (Approval State Machine)

**Consistent. No change.** DR 0010's five states, four terminal states,
Target Boundary, Revision Separation, Historical Integrity, and all
Deferred Items are unchanged. This record reaffirms the Target Boundary
and Historical Integrity in §5.2 and §14.1 without re-deciding them.
No Approval state, transition, or principle is modified.

### 17.3 DR 0023 (Target Model)

**Consistent. No change.** The immutable-reference principle (§13) is
reaffirmed in §5.5 and §16. DR 0023 §16 (historical integrity of terminal
records) is reaffirmed in §13.3. Model A (target type + target identity)
is not modified.

### 17.4 DR 0028 (Asset and Quote Designation)

**Consistent. §10 item 9 / §21 item 5 addressed by this record.**

DR 0028 §10 item 9 ("Temporal ordering of Approval decision and Quote
state transition: whether the Approval's APPROVED/REJECTED decision
triggers the Quote's ACCEPTED/REJECTED transition, and how that is
enforced — DEFERRED") is the primary deferred item this record addresses.
The conclusion is that no formal ordering can be established from existing
evidence. The item remains DEFERRED; this record explains why and frames
what would close it (§15).

DR 0028 §21 item 5 is correspondingly addressed and remains DEFERRED.

DR 0028 §8 items 7–8 are reaffirmed (§5.4, §8.1, §14.1). No section of
DR 0028 is modified.

### 17.5 DR 0029 (Role Authority Mapping)

**Consistent. No change.** DR 0029's per-type role authority matrices
govern who may create and decide Approvals. Temporal ordering (this record)
and actor authority (DR 0029) are independent dimensions: the question of
whether ADMIN/OPS must decide the Approval before or after the Quote
reaches a particular state is a question of sequencing, not of authority.
DR 0029 is not modified and does not establish any sequencing constraint.

### 17.6 DR 0030 (Target-State and Temporal Boundary)

**Consistent and extending.** DR 0030 §12.2 (separation principles) is
reaffirmed in §2.3 and §5.3. DR 0030 §11 item 5 (Approval REJECTED vs.
Quote CANCELLED — DEFERRED) is confirmed DEFERRED in §11.3. DR 0030 §20
item 6 (temporal ordering — DEFERRED) is addressed in §14.2 and confirmed
DEFERRED. DR 0030 §20 item 7 (replacement orchestration — DEFERRED) is
confirmed in §16. No section of DR 0030 is modified.

### 17.7 DR 0031 (Target-State Precondition)

**Consistent. No change.** DR 0031 §13 item 5 (temporal ordering of
Approval decision and Quote state transition — DEFERRED) is addressed by
this record and confirmed DEFERRED. This record does not address DR 0031's
other deferred items (target-state preconditions for Asset and Quote, §13
items 1–4 and 10–11). No section of DR 0031 is modified.

### 17.8 DR 0017–0022 (Requirement Satisfaction)

**Consistent and orthogonal.** Required Approval satisfaction (DR 0022 §7,
DR 0018 §12) depends on the Approval record's terminal state (APPROVED)
and its Required Approval identity reference — not on the temporal
relationship between the Approval decision and any Quote state transition.
Temporal ordering of Quote transitions does not affect satisfaction
semantics. AND-semantics, one-to-one default, and Required Approval
identity are unchanged.

### 17.9 DR 0012 (Order Completion Guard)

**Consistent. No change.** The Order ACTIVE → COMPLETED guard evaluates
Required Approval satisfaction (DR 0022 §7), which is independent of the
temporal relationship between Approval decision and Quote state. No guard
logic is established or modified by this record.

## 18. Remaining Deferred Items After This Record

**After this record, the following items remain explicitly DEFERRED:**

**Addressed by this record but still DEFERRED (confirmed):**

1. **Whether Approval APPROVED causes or triggers Quote ACCEPTED**
   (DR 0028 §10 item 9 — the causal sub-question). §8.3a.

2. **Whether Approval APPROVED must precede or must follow Quote
   ACCEPTED** (DR 0028 §10 item 9 — the sequencing sub-question). §8.3b–c.

3. **Whether Approval REJECTED causes, must precede, or must follow
   Quote REJECTED or Quote CANCELLED** (DR 0028 §10 item 9; DR 0030 §20
   items 6–7). §9.3, §11.3a.

4. **Whether Quote CANCELLED while Approval PENDING requires automatic
   Approval response** (DR 0030 §11 item 5; carried forward). §11.3b.

5. **Whether Quote EXPIRED while Approval PENDING requires automatic
   Approval response** (DR 0028 §10 item 9). §10.3c.

6. **Whether a PENDING Approval may remain PENDING while the targeted
   Quote is in a terminal state** (all terminal states: ACCEPTED,
   REJECTED, EXPIRED, CANCELLED). §12.4c.

7. **Quote replacement orchestration** — whether Approval #A must reach
   a terminal state before Q1 can be CANCELLED in a replace scenario
   (DR 0030 §20 item 7). §16 item 6.

**Not in scope of this record (still DEFERRED, unchanged):**

8. **Formal Quote state precondition at Approval creation time**
   (DR 0031 §13 item 3; DR 0028 §10 item 7).

9. **Formal Asset state precondition at Approval creation time**
   (DR 0031 §13 item 1; DR 0028 §10 item 2).

10. **Asset revision orchestration** (DR 0031 §13 item 5; DR 0030 §20
    item 3; DR 0010 Deferred Item 11).

11. **Approval ↔ Delivery orchestration** (DR 0030 §20 item 8;
    DR 0010 Deferred Item 12).

12. **Expiration policy per target type** (DR 0030 §20 item 9;
    DR 0010 Deferred Items 7–8).

13. **Order ACTIVE → COMPLETED guard finalization** (DR 0010 Deferred
    Item 13; DR 0012).

14. **Cancellation authorization and side effects for Approval**
    (DR 0010 Deferred Item 9).

15. **Idempotency implementation** (DR 0010 Deferred Item 17).

**New framing introduced by this record (§15):**

16. **Owner decision on Approval↔Quote causal relationship** — whether
    the system shall or shall not trigger Quote transitions from Approval
    decisions (§15 decisions A–B).

17. **Owner decision on in-flight Approval response to Quote terminal
    transition** — what the system must do when a targeted Quote reaches
    a terminal state while an Approval is PENDING (§15 decision C).

18. **Owner decision on formal ordering constraint** — whether Approval
    decision must formally precede or follow any Quote transition (§15
    decisions D–E).

## 19. Historical Integrity

**Reaffirmed, unchanged from DR 0014 §14 through DR 0031 §14:**

Terminal Approval records preserve the target reference permanently.
The targeted Quote row's subsequent lifecycle state changes — including
reaching a terminal state — do not alter the historical record of the
Approval event. Whether Q1 is in SENT, ACCEPTED, REJECTED, EXPIRED, or
CANCELLED at the time the Approval reaches its terminal state, the
Approval's permanent record is: "a formal decision was made on this
specific commercial proposal (Q1)." That record is not overwritten,
re-targeted, or invalidated by Q1's later state (DR 0010 Historical
Integrity, DR 0023 §16, DR 0030 §21).

## 20. Security / Tenancy

**APPROVED principle, unchanged from DR 0023 §19 through DR 0031 §15:**

The targeted Quote row must belong to the same organization as the
Approval record. Cross-tenant references are never permitted. Temporal
ordering (this record) operates within this tenant boundary: any
sequencing or orchestration between Approval and Quote applies only
within the same organization's records. Enforcement mechanism remains
**DEFERRED** (DR 0030 §22; carried forward).

## 21. Financial Separation

Unchanged from every prior record. No temporal ordering, causal linkage,
or orchestration established by this record implies, triggers, or is
inferred from Payment, Revenue, Expense, Profit, Refund, or Owner
Settlement. An Approval APPROVED on a Quote row has no direct financial
consequence per the architecture. The financial consequence of Quote
ACCEPTED (if any) is governed by the financial architecture — independent
of and not established by this record.

## 22. Rejected Alternatives

- **Establishing "Approval APPROVED causes Quote ACCEPTED"** — rejected.
  DR 0030 §12.2 establishes direct causation is not present; orchestrated
  causation is not established by any record; DR 0028 §10 item 9 explicitly
  deferred this question. Manufacturing a causal rule would violate the
  evidentiary standard (§2.2) and the governing task instruction: "do not
  infer workflow merely from the meaning of SENT."

- **Establishing "Approval APPROVED must precede Quote ACCEPTED"** —
  rejected. No record in DR 0001–0031 establishes this ordering constraint.
  DR 0005 Architectural Consequence ("three separate events, not one")
  establishes non-collapse but not sequence. Promoting a workflow
  description to an ordering constraint would be inference-to-APPROVED
  promotion without constraint-grade evidence.

- **Establishing "Quote ACCEPTED must precede Approval APPROVED"** —
  rejected on the same grounds. The three-events principle does not
  establish sequence; it establishes separateness.

- **Establishing that Approval REJECTED implies Quote REJECTED** —
  rejected. DR 0010's REJECTED and DR 0005's REJECTED are independently
  defined states in independent entities (§6). No record establishes a
  causal or implication relationship between them.

- **Using DR 0005's SENT definition to establish an ordering** — rejected.
  SENT = "awaits the client's decision" describes the state's commercial
  purpose; it does not establish a rule about when the Approval decision
  must occur relative to the Quote transition. DR 0031 §2.2 established
  this evidentiary standard for the pre-condition question; the same
  standard applies here for the ordering question.

- **Inferring from DR 0029's CLIENT decision authority that the client
  decides both events in sequence** — rejected. CLIENT authority for
  Quote-targeting Approvals (DR 0029 §8.2) does not establish that the
  CLIENT's approval decision must happen before or after the Quote's
  ACCEPTED transition. The authority question (who may decide) and the
  ordering question (when the decision occurs relative to Quote transitions)
  are independent dimensions.

## Consistency with Decision Records 0001–0031

- **Consistent with 0001/0002:** UUID identity, tenant scoping, TEXT+CHECK
  state representation, archive pattern — all unchanged. No schema,
  migration, or code is created.
- **Consistent with 0003/0004 (Campaign/Brief):** not touched; no Campaign
  or Brief state is created or modified.
- **Consistent with 0005 (Quote):** Quote's six states, transitions, and
  all Boundaries preserved. Boundary 1 (Quote state separate from Approval
  state), Boundary 3 (distinct events), Boundary 5 (cancel-and-replace),
  and Boundary 9 (no Approval states) are reaffirmed without modification.
- **Consistent with 0006 (Asset):** not directly in scope. Asset state
  machine unchanged.
- **Consistent with 0007 (Order):** Order state machine unchanged. Order
  completion guard not modified.
- **Consistent with 0008 (Production Job), 0009 (AI Generation):**
  not touched.
- **Consistent with 0010 (Approval):** five states, four transitions,
  Target Boundary, Historical Integrity — all unchanged. Deferred items
  not resolved by this record remain DEFERRED.
- **Consistent with 0011–0016:** not directly touched.
- **Consistent with 0017–0022 (Requirements):** satisfaction mechanics
  are orthogonal to temporal ordering (§17.8); no change.
- **Consistent with 0023 (Target Model):** immutable-reference principle
  and §13 reaffirmed; Model A unchanged.
- **Consistent with 0024 (Actor Authority):** role-authority boundaries
  are orthogonal to temporal ordering; no change.
- **Consistent with 0025–0027 (Designation Boundary/Framework):** not
  touched; target-type set unchanged.
- **Consistent with 0028 (Asset and Quote Designation):** §10 item 9 /
  §21 item 5 addressed; conclusion is DEFERRED (§17.4). §8 items 7–8
  reaffirmed.
- **Consistent with 0029 (Role Authority Mapping):** orthogonal (§17.5);
  no change.
- **Consistent with 0030 (Target-State and Temporal Boundary):** separation
  principles and DEFERRED items confirmed; §12.2, §13, §20 item 6 all
  addressed consistently (§17.6).
- **Consistent with 0031 (Target-State Precondition):** §13 item 5
  confirmed DEFERRED; no other DR 0031 conclusions modified (§17.7).
- No Decision Record 0001–0031 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any formal ordering between an Approval decision and any
  Quote state transition has been established by this record.
- Do not assume Approval APPROVED causes, implies, or must precede or
  follow Quote ACCEPTED.
- Do not assume Approval REJECTED causes, implies, or must precede or
  follow Quote REJECTED.
- Do not assume Approval REJECTED causes, implies, or must precede or
  follow Quote CANCELLED.
- Do not assume the coincidentally named REJECTED, EXPIRED, or CANCELLED
  states in the two state machines represent the same event or imply each
  other.
- Do not assume Quote EXPIRED while an Approval is PENDING has any
  automatic effect on the Approval.
- Do not assume Quote CANCELLED while an Approval is PENDING has any
  automatic effect on the Approval.
- Do not assume a PENDING Approval on a terminal-state Quote is
  automatically handled in any specific way.
- Do not assume DR 0005 Boundary 3 ("distinct events") establishes a
  sequencing constraint — it establishes separateness, not ordering.
- Do not assume the SENT definition ("awaits the client's decision")
  constitutes a formal ordering constraint.
- Do not assume the three-events principle (DR 0028 §8 item 7) establishes
  which event occurs first.
- Do not assume DR 0029's CLIENT decision authority establishes any
  temporal constraint on Approval decision timing.
- Do not assume owner approval of this record constitutes decisions A–E
  in §15 — those decisions remain separately DEFERRED.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0031 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
