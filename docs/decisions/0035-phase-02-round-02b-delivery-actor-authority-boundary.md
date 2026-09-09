# Decision Record 0035 — Phase 02 Round 02B: Delivery Actor Authority Boundary

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner approval. If the Owner
  approves this record, the role authority conclusions in §6–§8 and the
  consolidated matrix in §9 become the governing authority for which RBAC
  roles hold creation and state-transition authority over Delivery records.
  No schema, migration, or implementation is authorized by approval of
  this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at decision:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Primary deferred items addressed:** DR 0011 §22 item 12 ("Cancellation
  authorization" for Delivery — analysis supplied though item remains
  DEFERRED); DR 0034 §14 item 15 ("Delivery cancellation authorization
  and side effects — DR 0011 §22 items 12–13" — partially addressed by
  providing the per-role analysis though the item remains DEFERRED);
  DR 0034 §13 decision A ("actor authority governs which actor may
  initiate Delivery creation") and decision B ("actor authority governs
  which actor may transition Delivery to SENDING") — both resolved where
  authoritative evidence permits.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**, consistent
with the evidentiary standard established in DR 0031 §2.2 and applied
throughout DR 0032–0034. No statement is promoted above INFERENCE unless
a direct, constraint-grade statement in an authoritative record supports
it. Workflow intuition — e.g., "production teams naturally manage delivery"
or "only staff would initiate a delivery" — is INFERENCE-grade and cannot
be promoted to APPROVED by this record.

Service and Package remain **UNVERIFIED** as entities, unchanged from
DR 0013–0034.

## 1. Context

Decision Record 0011 established Delivery's state machine:
`PREPARING → SENDING → COMPLETED / FAILED / CANCELLED` and
`PREPARING → CANCELLED`. It explicitly deferred cancellation authorization
as Deferred Item 12 and did not address creation authority or the authority
to transition PREPARING → SENDING. Decision Record 0034 established that
Delivery and Approval are independent satisfaction tracks (Model C),
combined only through AND semantics at the Order completion guard, and
framed two questions about Delivery actor authority as decisions A and B
for future Owner resolution (DR 0034 §13).

This record supplies the Delivery actor-authority analysis analogous to
what DR 0024 (Approval Actor & Authority Boundary) and DR 0029 (Approval
Target Role Authority Mapping) supplied for Approval. It applies the same
Gate 0 RBAC foundation and the same evidentiary standard, using the
authoritative records as its evidence base, without inventing roles,
workflow rules, or permissions not established by prior decisions.

## 2. Problem

Delivery's state machine (DR 0011) defines five states and six allowed
transitions. No prior Decision Record 0001–0034 specifies which RBAC role
may create a Delivery record (initiating PREPARING) or which role may
execute PREPARING → SENDING. Three authority questions must be kept
separate and analyzed independently:

1. **Creation authority** — which role(s) may create a Delivery record,
   causing a new row to enter `PREPARING`.
2. **SENDING-initiation authority** — which role(s) may execute the
   `PREPARING → SENDING` transition, causing the delivery mechanism to
   begin actively making content available.
3. **Terminal-transition authority** — which role(s) may execute
   `SENDING → COMPLETED`, `SENDING → FAILED`, `PREPARING → CANCELLED`,
   and `SENDING → CANCELLED`.

These three authority questions need not be answered by the same role.
Conflating them would obscure the distinct concerns each represents:
creation is an administrative initiation; SENDING initiation is triggering
an execution mechanism; terminal transitions may be system-driven or
require a different authority class. This record analyzes each separately.

## 3. Governing Sources

**APPROVED sources used in this record:**

- **Gate 0 RBAC foundation** (recorded as authoritative input in DR 0024
  §3): defines the six roles, their hierarchy, and their operational
  scopes. The specific Gate 0 text is reproduced in DR 0024 §3 and
  constitutes the constraint-grade input for all role characterizations
  in this record. No role beyond those six is invented here.

  Key Gate 0 facts (FACT, from DR 0024 §3):
  - **OWNER:** "highest authority; governs critical financial, system,
    and security decisions."
  - **ADMIN/OPERATIONS:** "operational authority — client/brand/campaign/
    order/production/**delivery**/notifications/reports; no automatic
    money withdrawal or payment bypass."
  - **CREATIVE/PRODUCTION:** "produces deliverable work."
  - **QC:** "quality control verdicts."
  - **CLIENT:** "external client participant."
  - **AGENT:** "least privilege — explicitly cannot: withdraw money
    unrestrictedly, refund without limit, change pricing, override payment
    or security controls, change permissions, bypass QC, disable audit, or
    spend beyond approved limits."
  - **Hierarchy:** OWNER > ADMIN/OPERATIONS > operational roles
    (CREATIVE/PRODUCTION, QC, CLIENT) > AGENT.

- **DR 0011** — Delivery State Machine. Authoritative for all five states,
  six transitions, and separation principles (§7 QC separation, §8
  Approval separation). §13: cancellation authorization DEFERRED. §19:
  tenant isolation inherited via composite-FK pattern. §22: full deferred
  items list. No Delivery state or transition is modified by this record.

- **DR 0012** — Order Completion Guard. §3/§8: conjunctive AND guard
  requiring both Required Delivery satisfaction and Required Approval
  satisfaction. §9: conjunction rationale (independent concerns). §11: no
  automatic cascade from Delivery or Approval terminal-failure states.
  This record must not alter the guard.

- **DR 0024** — Approval Actor & Authority Boundary. Establishes the
  analytical framework (creation vs. decision authority separation, §4;
  creator/decision-maker separation principle, §5) and the Role Authority
  Matrix for Approval (§13). Gate 0 text is sourced from this record.
  AGENT's exclusion from all Approval actor roles is an APPROVED boundary
  that informs the parallel analysis for Delivery (§10 below).

- **DR 0029** — Approval Target Role Authority Mapping. Per-type role
  authority applied to Approval records. Confirms that ADMIN/OPERATIONS'
  operational scope includes "delivery" management (DR 0024 §6, applied
  in this record directly to Delivery).

- **DR 0034** — Approval ↔ Delivery Orchestration Boundary. Model C
  (PROPOSED): Approval and Delivery are independent satisfaction tracks.
  §13 decisions A and B frame Delivery actor-authority questions that this
  record resolves. §14 item 15: Delivery cancellation authorization —
  carried as a deferred item that this record partially addresses.

- **DR 0008** — Production Job State Machine. Structural parallel:
  Production Job uses the same initial→active→terminal shape
  (`QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED`). Production Job's
  deferred items include "Authorized cancellation actors" (§ Deferred
  Items), confirming that actor authority for terminal transitions is not
  automatically derivable from the state machine itself.

- **DR 0002** — D1 (cross-tenant FK enforcement) and DR 0011 §19 (tenant
  isolation for Delivery via composite-FK pattern): any actor exercising
  authority over a Delivery record must belong to the same organization
  as that record.

## 4. Authority-Question Framework

**APPROVED analytical distinction (applied from DR 0024 §4, adapted for
Delivery):**

Three Delivery authority questions are analyzed separately in §6–§8:

1. **Creation authority (→ PREPARING):** which role(s) may initiate a
   Delivery record, causing a new row to enter `PREPARING`. Creation does
   not begin the delivery mechanism; it only establishes that a delivery
   attempt is being prepared.

2. **PREPARING → SENDING transition authority:** which role(s) may trigger
   the transition from preparation to active execution, causing the
   delivery mechanism to begin actively making content available to the
   client. This is the more consequential of the two actor-initiated
   questions: it starts the client-facing execution step.

3. **Terminal-transition authority:** which role(s) may execute
   `SENDING → COMPLETED`, `SENDING → FAILED`, `PREPARING → CANCELLED`,
   and `SENDING → CANCELLED`. These transitions are analyzed separately
   because: (a) COMPLETED and FAILED may be system-driven rather than
   actor-initiated (§5); (b) CANCELLED's authorization is explicitly
   deferred in DR 0011 §22 item 12; (c) their effects are irreversible.

## 5. COMPLETED and FAILED — System-Driven Characterization

**INFERENCE (strong, from DR 0011 §4, §12):**

DR 0011 §4 defines COMPLETED as: "The delivery mechanism successfully
made the content available." DR 0011 §4 defines FAILED as: "The delivery
mechanism itself technically failed (e.g., a transmission/publishing
error)." DR 0011 §12 confirms FAILED is "a technical/execution failure
only."

This language consistently frames COMPLETED and FAILED as outcomes
reported *by the delivery mechanism itself* — not as decisions an actor
makes. The natural reading is that these transitions are mechanism-driven
(analogous to `PENDING → EXPIRED` in Approval, which is system-driven
and requires no actor authorization check — DR 0024 §10).

**However, this characterization is INFERENCE-grade, not
constraint-grade.** DR 0011 does not use the phrase "system-driven" or
explicitly say "no actor executes this transition" for COMPLETED or FAILED
as it does (by analogy) for other lifecycle outcomes. No prior Decision
Record 0001–0034 establishes COMPLETED and FAILED as explicitly actor-free
transitions.

**Classification of COMPLETED and FAILED actor authority: DEFERRED.**
Whether these transitions require an actor authorization check (e.g., an
ADMIN/OPERATIONS actor confirming completion), are fully system-driven
(no actor), or use a hybrid mechanism (system-reported outcome confirmed
by an authorized actor) has not been established. This record notes the
INFERENCE of system-driven behavior from DR 0011's language but does not
promote it to APPROVED.

**No role — including OWNER — is established as holding explicit actor
authority over SENDING → COMPLETED or SENDING → FAILED in DR 0001–0034.**
All roles remain DEFERRED for those two transitions.

## 6. Delivery Creation Authority (→ PREPARING) — Per Role

**Who may create a Delivery record, causing a new row to enter PREPARING:**

### 6.1 OWNER — APPROVED

**Basis:** Gate 0 (DR 0024 §3): "OWNER: highest authority; governs
critical financial, system, and security decisions." The "highest
authority" characterization establishes unrestricted authority over
operational actions absent explicit prohibitions. No record in DR 0001–0034
prohibits OWNER from creating Delivery records. Initiating a Delivery
record is within OWNER's unrestricted operational scope.

**Classification: APPROVED.** No restriction on Delivery record creation.

### 6.2 ADMIN/OPERATIONS — APPROVED

**Basis:** Gate 0 (DR 0024 §3): "ADMIN/OPERATIONS: operational authority
— client/brand/campaign/order/production/**delivery**/notifications/
reports." The word "delivery" appears explicitly in ADMIN/OPERATIONS'
enumerated operational scope per Gate 0. This is the most direct,
constraint-grade statement that ADMIN/OPERATIONS holds authority over
delivery operations.

DR 0024 §6 already recognized this scope in the Approval context:
"ADMIN/OPERATIONS — APPROVED. Operational scope explicitly includes
campaign/order/production/**delivery** management." That recognition is
equally applicable here: if managing delivery is within ADMIN/OPERATIONS'
operational authority, initiating a Delivery record is a core delivery-
management action.

**Restriction:** No automatic money withdrawal or payment bypass, per
Gate 0 (DR 0024 §3). Creating a Delivery record carries no financial
consequence on its own (DR 0011 §18), so this restriction does not limit
ADMIN/OPERATIONS' Delivery creation authority.

**Tenant scope:** DR 0002 D1; DR 0011 §19. ADMIN/OPERATIONS must belong
to the same organization as the Delivery record and its associated Order.

**Classification: APPROVED.** Subject to tenant scope (same organization).
No other restriction.

### 6.3 CREATIVE/PRODUCTION — DEFERRED

**Basis for consideration:** Gate 0 (DR 0024 §3): "CREATIVE/PRODUCTION:
produces deliverable work." CREATIVE/PRODUCTION actors generate the
creative content that Delivery ultimately makes available to the client.
A workflow-level reading suggests they might be natural initiators of the
delivery stage after production is complete.

**Why DEFERRED, not APPROVED:**

1. The Gate 0 characterization ("produces deliverable work") describes
   what CREATIVE/PRODUCTION does, not what administrative actions they
   may initiate. Delivery is the *handoff mechanism* — making content
   available to the client — which is operationally distinct from
   producing the content.
2. DR 0011 does not address which roles may create Delivery records.
   DR 0008 (Production Job) similarly does not address Delivery creation
   authority. No prior record supplies a constraint-grade statement that
   CREATIVE/PRODUCTION holds authority to initiate client-facing delivery.
3. Gate 0's enumerated scope for ADMIN/OPERATIONS explicitly names
   "delivery" — a specificity not present in CREATIVE/PRODUCTION's
   characterization ("produces deliverable work"). The contrast is
   meaningful: Gate 0 is more precise about ADMIN/OPERATIONS' delivery
   authority than about CREATIVE/PRODUCTION's.
4. The evidentiary standard (DR 0031 §2.2): "A characterization of
   typical workflow ... is INFERENCE-grade only." The inference that
   CREATIVE/PRODUCTION would initiate delivery is workflow-level intuition,
   not a constraint-grade authorization rule.

**Classification: DEFERRED.** Absent an explicit, constraint-grade
statement establishing CREATIVE/PRODUCTION's authority to create Delivery
records, creation authority for this role cannot be APPROVED. This is not
a closed APPROVED exclusion — future Owner decisions may grant it — but it
cannot be APPROVED from existing records alone.

### 6.4 QC — DEFERRED

**Basis for consideration:** Gate 0 (DR 0024 §3): "QC: quality control
verdicts." DR 0011 §7 ("Delivery vs. QC Separation"): "Delivery does not
own or reference QC verdicts. `QC_PASSED`, `QC_FAILED`, and any QC-derived
value are not created on Delivery. QC Review remains the sole authority
on quality outcomes; Delivery only concerns itself with whether the
handoff mechanism itself succeeded."

QC's defined Gate 0 scope is quality verdicts. Delivery creation is an
operational action, not a quality verdict. DR 0011 §7 establishes QC
separation from Delivery as a design principle. No record in DR 0001–0034
establishes that QC actors may create Delivery records.

In the Approval context (DR 0024 §6), QC was granted creation authority
as a handoff mechanism after a QC pass — because QC actors had a specific
post-QC-review role in routing work to the next decision stage. No
analogous role for QC in Delivery's lifecycle is established in DR 0001–0034.

**Classification: DEFERRED.** No constraint-grade statement establishes
QC creation authority for Delivery records. This is not a closed APPROVED
exclusion, but it cannot be APPROVED from existing records.

### 6.5 CLIENT — DEFERRED

**Basis for consideration:** Gate 0 (DR 0024 §3): "CLIENT: external
client participant." DR 0029 §6/§8: CLIENT holds formal decision authority
(PENDING → APPROVED/REJECTED) for client-facing Approvals within
contractual scope.

**Why DEFERRED:**

The task instruction is explicit: "Do not infer CLIENT authority merely
because clients can approve Assets/Quotes under DR 0029. Determine whether
existing records establish CLIENT authority over Delivery creation or
SENDING. If not established, mark DEFERRED."

No authoritative record in DR 0001–0034 establishes CLIENT authority to
create a Delivery record. CLIENT's decision authority in DR 0029 concerns
Approval records targeting Asset or Quote rows — a completely distinct
lifecycle from Delivery creation. The two authorities belong to different
entities with different state machines.

**INFERENCE (not promoted to APPROVED):** Delivery makes content available
*to* the client — the CLIENT is the recipient of a Delivery, not the
natural initiator of one. A structural reading suggests CLIENT initiates
Delivery is unlikely, but this is INFERENCE-grade workflow reasoning, not
a constraint-grade boundary. The question of whether a CLIENT actor can
ever initiate a Delivery record in any V1 workflow is not resolved by
DR 0001–0034.

**Classification: DEFERRED.** No constraint-grade statement establishes
or prohibits CLIENT Delivery creation authority. Future Owner decision
required.

### 6.6 AGENT — NOT APPROVED

**Basis:** Gate 0 (DR 0024 §3): "AGENT: least privilege — explicitly
cannot: withdraw money unrestrictedly, refund without limit, change pricing,
override payment or security controls, change permissions, bypass QC,
disable audit, or spend beyond approved limits."

Creating a Delivery record is an operational action that initiates the
formal handoff process leading (potentially) to Order completion (DR 0012,
DR 0018). A Delivery record in `COMPLETED` state contributes to satisfying
the Delivery-side condition of the Order completion guard. This influence
on Order completion is structurally analogous to creating an Approval
record (which influences Order completion's Approval-side condition) —
and AGENT's creation authority over Approval records is an APPROVED
exclusion (DR 0024 §6, §11).

The same reasoning applies here: AGENT's least-privilege boundary is
incompatible with initiating operational records that can influence Order
completion. Gate 0's explicit prohibitions — override payment or security
controls, change permissions, bypass QC — reflect a least-privilege posture
that extends naturally to any action in the Order-completion critical path.

**Classification: NOT APPROVED — closed APPROVED boundary, not a
deferral.** AGENT may not create Delivery records.

## 7. PREPARING → SENDING Transition Authority — Per Role

**Who may execute the PREPARING → SENDING transition:**

`PREPARING → SENDING` is the transition that causes the delivery mechanism
to begin actively making content available to the client (DR 0011 §4:
"SENDING — The delivery mechanism is actively making the content available
to the client (e.g., transmitting, publishing to an access point,
generating client-facing access)"). This is the transition that starts
client-facing delivery execution.

### 7.1 OWNER — APPROVED

**Basis:** Gate 0 "highest authority" characterization (DR 0024 §3).
Unrestricted operational authority over delivery actions. No record
prohibits OWNER from initiating the SENDING transition.

**Classification: APPROVED.** No restriction.

### 7.2 ADMIN/OPERATIONS — APPROVED

**Basis:** Gate 0 (DR 0024 §3): "delivery" is explicitly within
ADMIN/OPERATIONS' enumerated operational scope. The PREPARING → SENDING
transition — triggering the delivery mechanism to begin active execution
— is precisely the kind of operational delivery management action that
ADMIN/OPERATIONS' scope encompasses. Initiating the client-facing
execution step is not materially different in kind from creating the
Delivery record in PREPARING; both are operational delivery management
actions within ADMIN/OPERATIONS' defined scope.

**Restriction:** tenant scope (same organization, DR 0002 D1; DR 0011
§19). No financial restriction triggered (DR 0011 §18).

**Classification: APPROVED.** Subject to tenant scope.

### 7.3 CREATIVE/PRODUCTION — DEFERRED

**Basis:** Same analysis as §6.3. The PREPARING → SENDING transition
triggers the delivery execution mechanism, which is more squarely an
operational action than CREATIVE/PRODUCTION's "produces deliverable work"
characterization encompasses. No constraint-grade statement establishes
CREATIVE/PRODUCTION authority over this transition.

**Additional consideration:** even if CREATIVE/PRODUCTION were eventually
granted Delivery creation authority (§6.3), it would not follow
automatically that they also hold PREPARING → SENDING authority. The
two authorities are distinct (§4) and can be assigned to different roles.

**Classification: DEFERRED.** No constraint-grade statement establishes
this authority.

### 7.4 QC — DEFERRED

**Basis:** Same analysis as §6.4. QC's scope is quality verdicts
(Gate 0 §3; DR 0011 §7). No record establishes QC authority to trigger
the delivery execution mechanism. QC separation from Delivery (DR 0011
§7) is a governing design principle.

**Classification: DEFERRED.**

### 7.5 CLIENT — DEFERRED

**Basis:** Same analysis as §6.5. The task instruction: "Do not infer
CLIENT authority merely because clients can approve Assets/Quotes under
DR 0029. Determine whether existing records establish CLIENT authority
over Delivery creation or SENDING. If not established, mark DEFERRED."
No record establishes this.

**INFERENCE (not promoted):** it would be structurally unusual for a
CLIENT actor to trigger the delivery mechanism — SENDING is initiated
by the party making content available (the studio), not the party
receiving it. But this is INFERENCE-grade workflow reasoning.

**Classification: DEFERRED.**

### 7.6 AGENT — NOT APPROVED

**Basis:** Gate 0 least-privilege (DR 0024 §3). Triggering the
PREPARING → SENDING transition starts the client-facing execution step
and is part of the Order-completion critical path. The same least-privilege
reasoning that excludes AGENT from Delivery creation (§6.6) applies to
PREPARING → SENDING: this transition is a consequential operational action
inconsistent with AGENT's defined least-privilege boundary.

**Classification: NOT APPROVED — closed APPROVED boundary, not a
deferral.** AGENT may not execute PREPARING → SENDING.

## 8. Terminal Transition Authority — DEFERRED for All Roles

**Who may execute SENDING → COMPLETED, SENDING → FAILED,
PREPARING → CANCELLED, and SENDING → CANCELLED:**

### 8.1 SENDING → COMPLETED — DEFERRED for All Roles

**DEFERRED.** As established in §5, COMPLETED may be system-driven
(the delivery mechanism reports its own success). Whether SENDING →
COMPLETED requires an actor authorization check, is fully mechanism-driven,
or requires a hybrid approach is not established by DR 0001–0034. No role's
authority over this specific transition is established.

**Governing source:** DR 0011 §4 (state definition); no authoritative
record establishes actor authority for this transition.

### 8.2 SENDING → FAILED — DEFERRED for All Roles

**DEFERRED.** FAILED represents a technical/execution failure by the
delivery mechanism itself (DR 0011 §4, §12). Whether this transition is
reported by the mechanism, acknowledged by an actor, or initiated through
a separate failure-detection path is not established. No role's authority
over this transition is established.

**Governing source:** DR 0011 §4, §12; DR 0011 §22 item 14 ("Failure
recovery behavior" is deferred — the recovery question implies the
FAILED transition itself is not fully specified).

### 8.3 PREPARING → CANCELLED and SENDING → CANCELLED — DEFERRED for All Roles

**DEFERRED.** DR 0011 §13 explicitly: "CANCELLED represents an intentional
termination of the Delivery attempt/process. Not invented by this record:
... Authorization and side effects remain DEFERRED." DR 0011 §22 item 12:
"Cancellation authorization" is explicitly listed as a deferred decision.
This deferral applies to all roles including OWNER.

**INFERENCE (not promoted):** by analogy to DR 0024 §9, where OWNER and
ADMIN/OPERATIONS were granted Approval cancellation authority from their
operational scope, one could infer that the same roles hold Delivery
cancellation authority. However, DR 0011 §22 item 12 is an explicit
deferral from an APPROVED record, and the evidentiary standard (DR 0031
§2.2) requires constraint-grade evidence to promote INFERENCE to APPROVED.
Manufacturing cancellation authority by analogy when an APPROVED record
explicitly defers it would violate the evidentiary standard.

**Note:** This record supplies the analytical framework (§6–§7) that will
make future cancellation-authority resolution tractable — but it does not
resolve it.

### 8.4 Summary

All four terminal transitions have DEFERRED actor authority for all roles.
Two transitions (COMPLETED, FAILED) may be system-driven; two (CANCELLED
from both states) are intentional terminations with explicitly deferred
authorization. Future Owner decisions are required to resolve all four.

## 9. Role Authority Matrix

| Transition | OWNER | ADMIN/OPS | CREATIVE/PROD | QC | CLIENT | AGENT |
|---|---|---|---|---|---|---|
| Create (→ PREPARING) | APPROVED | APPROVED | DEFERRED | DEFERRED | DEFERRED | NOT APPROVED |
| PREPARING → SENDING | APPROVED | APPROVED | DEFERRED | DEFERRED | DEFERRED | NOT APPROVED |
| SENDING → COMPLETED | DEFERRED† | DEFERRED† | DEFERRED† | DEFERRED† | DEFERRED† | DEFERRED† |
| SENDING → FAILED | DEFERRED† | DEFERRED† | DEFERRED† | DEFERRED† | DEFERRED† | DEFERRED† |
| PREPARING → CANCELLED | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ |
| SENDING → CANCELLED | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ | DEFERRED‡ |

† COMPLETED and FAILED may be system-driven (delivery mechanism reports
its own outcome). The actor authority question — and whether any actor
authorization check applies at all — is DEFERRED (§5, §8.1–§8.2).

‡ Cancellation authorization explicitly DEFERRED in DR 0011 §22 item 12.
No constraint-grade statement establishes any role's cancellation authority
for Delivery. DEFERRED for all roles until an authoritative decision
resolves it (§8.3).

**Basis for APPROVED entries:**
- OWNER creation and SENDING authority: Gate 0 "highest authority"
  (DR 0024 §3), no prohibition in DR 0001–0034.
- ADMIN/OPERATIONS creation and SENDING authority: Gate 0 "delivery" in
  enumerated operational scope (DR 0024 §3).

**Basis for NOT APPROVED entries:**
- AGENT creation: Gate 0 least-privilege boundary + Order-completion
  influence (§6.6). Closed APPROVED boundary.
- AGENT SENDING: same reasoning (§7.6). Closed APPROVED boundary.

## 10. AGENT Authority — Consolidated

**APPROVED boundary — AGENT is excluded from all actor-initiated Delivery
transitions for which authority has been resolved:**

1. AGENT may not create Delivery records (→ PREPARING) — §6.6.
2. AGENT may not execute PREPARING → SENDING — §7.6.
3. AGENT authority over terminal transitions: DEFERRED — §8. (Even
   though AGENT's eventual exclusion from terminal transitions may be
   predictable from the same least-privilege reasoning, the terminal
   transitions are DEFERRED for all roles — no actor's authority over them
   has been established, so there is no closed boundary to state for AGENT
   specifically.)

**Basis:** Gate 0 least-privilege characterization (DR 0024 §3). Creating
a Delivery record and executing PREPARING → SENDING both contribute to the
Order-completion critical path (DR 0012, DR 0018). AGENT's explicit
prohibitions — override payment or security controls, change permissions,
bypass QC, disable audit — reflect a least-privilege posture incompatible
with initiating or escalating actions in the Order-completion critical
path.

**This is a closed APPROVED boundary, not a deferral**, for creation and
PREPARING → SENDING. It is consistent with the parallel AGENT exclusion
from all Approval actor roles (DR 0024 §11) — the same reasoning applies.
Target-type designation and workflow context do not open or qualify this
exclusion.

## 11. CLIENT Authority — Consolidated

**Summary of CLIENT conclusions:**

1. CLIENT creation authority for Delivery records: **DEFERRED** (§6.5).
2. CLIENT authority to execute PREPARING → SENDING: **DEFERRED** (§7.5).
3. CLIENT authority over any terminal transition: **DEFERRED** (§8).
4. The observation that CLIENT is structurally the *recipient* of Delivery
   rather than the *initiator* is **INFERENCE-grade only** — not promoted
   to APPROVED, not treated as a closed exclusion boundary.
5. CLIENT's decision authority over Approval records (DR 0029) does not
   establish or imply CLIENT authority over Delivery records — these are
   separate entities with independent lifecycles (DR 0034 Model C;
   DR 0011 §8).

No authority boundary for CLIENT over any Delivery transition is
APPROVED by this record. All CLIENT questions are DEFERRED to future
Owner decision.

## 12. Scope Boundary

**APPROVED (from DR 0002 D1, DR 0011 §19, DR 0024 §20):**

1. **Organization/tenant scope:** any actor exercising authority over a
   Delivery record must belong to the same organization as that Delivery
   record and its associated Order. Cross-tenant actor authority is never
   permitted. This follows from DR 0002 D1 (composite FK enforcement) and
   DR 0011 §19 ("Delivery belongs to the appropriate tenant context,
   inheriting `organization_id` via the composite-FK pattern").

2. **Server-side authorization required:** DR 0011 §19: "Client access
   must be server-authorized; frontend visibility is never authorization."
   This applies equally to actor authority over Delivery transitions —
   no Delivery creation or state transition may be authorized by frontend
   visibility alone.

3. **Narrower scope boundaries (production-scoped, QC-scoped, Order-
   scoped, etc.):** **DEFERRED.** Whether CREATIVE/PRODUCTION creation
   authority (if ever resolved) is bounded to deliveries for their own
   production scope; whether ADMIN/OPERATIONS' authority is further
   bounded by Order scope within a campaign — these are implementation-
   and workflow-level questions not yet established by any prior Decision
   Record 0001–0034.

**Classification of scope boundary:** organization/tenant scope and server-
side authorization requirement are APPROVED. Any narrower scope boundary
is DEFERRED.

## 13. DR 0034 Model C — Independence Preserved

**APPROVED (reaffirmed, not re-decided):**

DR 0034 Model C is preserved without modification:

1. Approval and Delivery are independent satisfaction tracks. Actor
   authority over Delivery does not modify the Approval lifecycle or the
   Approval role authority boundaries established in DR 0024 and DR 0029.

2. No Approval state — `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`,
   `EXPIRED` — is a precondition for any Delivery actor authority. An
   ADMIN/OPERATIONS actor may create a Delivery record or execute
   PREPARING → SENDING regardless of whether any Approval for the same
   Order exists or what state it is in. This confirms DR 0034 §13
   decision F: "Delivery records are created by a separate, authorized
   actor action, independent of Approval state."

3. No Delivery state — `PREPARING`, `SENDING`, `COMPLETED`, `FAILED`,
   `CANCELLED` — is a precondition for any Approval actor authority
   established in DR 0024 or DR 0029. An OWNER or ADMIN/OPERATIONS actor
   may execute PENDING → APPROVED on an Approval regardless of whether any
   Delivery exists or what state it is in. This confirms the direction of
   DR 0034 §13 decision D.

4. **This record does not resolve DR 0034 §13 decisions A, B, C, D, E,
   F, G, or H** as Owner decisions. Points 2 and 3 above express what
   DR 0024 and DR 0029 already imply about the absence of Delivery-state
   preconditions for Approval authority, and what this record establishes
   about Delivery authority being Approval-state-independent. They are not
   new Owner decisions; they are the natural consequence of Model C and
   the authority structures already established.

5. **DR 0034 remains PROPOSED.** This record does not re-decide DR 0034's
   conclusions; it applies the Model C structural baseline (as a PROPOSED
   conclusion) in the context of Delivery actor authority analysis.

## 14. Order Completion Guard — Interaction

**No change to DR 0012. APPROVED (reaffirmed from DR 0024 §17):**

The actor authority boundaries established here govern who may cause
Delivery state transitions. They do not modify the Order `ACTIVE` →
`COMPLETED` guard, which depends on whether Required Deliveries are
satisfied (DR 0017 §7, DR 0018 §12), not on which specific role caused
a Delivery to reach `COMPLETED`. The guard evaluates "is this Required
Delivery satisfied by a COMPLETED Delivery record?" — not "which role
executed the PREPARING → SENDING transition?"

Actor identity is orthogonal to guard evaluation. An ADMIN/OPERATIONS actor
and an (eventually authorized) CREATIVE/PRODUCTION actor creating the same
Delivery record would both satisfy the same Required Delivery obligation
once the record reaches `COMPLETED`. The guard does not distinguish between
them.

No Delivery actor authority established here creates, modifies, or waives
any Required Delivery obligation, any Required Approval obligation, or the
conjunction (`ACTIVE → COMPLETED`) guard logic.

## 15. Financial Separation

**Unchanged from every prior record (DR 0001–0034):**

No actor authority boundary established here implies, triggers, or is
inferred from any payment, revenue, expense, profit, refund, or Owner
Settlement event. DR 0011 §18: "Delivery state never itself implies
revenue, payment success, profit, owner settlement, refund, or financial
completion." This applies equally to Delivery actor authority: the act
of creating a Delivery record or executing any Delivery transition does
not grant the executing actor any financial authority.

ADMIN/OPERATIONS' lack of "automatic money withdrawal or payment bypass"
authority (Gate 0; DR 0024 §3) is fully consistent with their Delivery
creation and SENDING transition authority — Delivery is operationally
distinct from financial settlement.

No Delivery actor may gain authority over withdrawals, financial ledger
history, payment verification, pricing, reserves, or Owner settlement
as a consequence of their Delivery actor authority.

## 16. Historical Integrity

**Reaffirmed, unchanged from DR 0014 §14 through DR 0034 §15:**

Delivery records are non-revisable in the sense that terminal-state rows
are never reopened (DR 0011 §6). The identity of the actor who created a
Delivery record and the actor who executed each state transition are part
of that record's permanent, non-revisable history — they may not be altered
after the fact. The implementation mechanism for preserving actor identity
per transition remains **DEFERRED** (parallel to DR 0024 §23 item 7).

This principle requires that the actor authorization check for PREPARING →
SENDING be applied at transition time and the executing actor's identity
recorded with the transition. This is a statement of the requirement, not
an implementation decision.

## 17. Security / Tenancy

**APPROVED principle, consistent with DR 0002 D1, DR 0011 §19, DR 0024
§20:**

Any actor executing a transition on a Delivery record must belong to the
same organization as the Delivery record, the Order it serves, and any
Required Delivery obligations it will satisfy. Cross-tenant actor authority
over Delivery records is never permitted. The enforcement mechanism (session
scope, JWT claim, RLS policy, middleware) is **DEFERRED** and is not
implemented by this record.

## 18. Rejected Alternatives

- **Approving CREATIVE/PRODUCTION Delivery creation authority from workflow
  intuition** — rejected. Gate 0 characterizes CREATIVE/PRODUCTION as
  "produces deliverable work," not as an operational delivery-management
  role. DR 0031 §2.2 evidentiary standard prohibits promoting workflow
  intuition to APPROVED. The specific naming of "delivery" in
  ADMIN/OPERATIONS' scope (but not CREATIVE/PRODUCTION's) in Gate 0 is
  a meaningful distinction that this record cannot erase (§6.3).

- **Approving QC Delivery creation authority by analogy to QC Approval
  creation authority in DR 0024 §6** — rejected. QC's Approval creation
  authority was grounded in the explicit pattern of QC handoff after a
  QC pass (DR 0006's QC Boundary, DR 0024 §6). Delivery has no established
  QC handoff step — DR 0011 §7 explicitly separates Delivery from QC
  Review. The analogy fails at its foundation (§6.4).

- **Marking CLIENT NOT APPROVED (closed boundary) for Delivery creation**
  — rejected as premature. While structurally unusual (CLIENT as recipient,
  not initiator), the task instruction explicitly says to mark CLIENT
  DEFERRED if not established. No authoritative record supplies the
  constraint-grade statement needed for a closed exclusion (§6.5).

- **Resolving Delivery cancellation authorization from OWNER's "highest
  authority" characterization** — rejected. DR 0011 §22 item 12 is an
  explicit deferral of cancellation authorization in an APPROVED record.
  Overriding an explicit deferral in an APPROVED record by deriving from
  a role characterization would violate the source-of-truth hierarchy
  (CLAUDE.md §Source-of-Truth Hierarchy). The correct resolution requires
  an authoritative decision, not this record (§8.3).

- **Establishing ADMIN/OPERATIONS PREPARING → SENDING authority as
  scope-narrowed (e.g., limited to production scope)** — rejected. Gate 0
  does not impose scope narrowing on ADMIN/OPERATIONS' delivery authority.
  Manufacturing a scope boundary not present in the authoritative source
  would invent a constraint (§12).

- **Establishing COMPLETED and FAILED as explicitly system-driven based on
  DR 0011 §4's language** — rejected as an APPROVED conclusion. The
  language strongly implies system-driven behavior but does not use that
  phrase. The evidentiary standard requires constraint-grade statements,
  not implication. DEFERRED is the correct classification (§5).

- **Applying DR 0024's Approval creator/decision-maker separation
  principle (§5) to Delivery** — neither adopted nor rejected. DR 0024 §5
  is specific to Approval's formal-decision integrity: the separation
  prevents an actor who submitted work for approval from also formally
  approving it. Delivery has no analogous formal-decision structure where
  a creator/decision-maker conflict could arise in the same way. This
  principle does not translate to Delivery actor authority. If a future
  decision were to establish such a concern for Delivery, it would require
  its own reasoning and its own Decision Record.

- **Granting AGENT any actor authority over Delivery** — rejected for
  creation and PREPARING → SENDING (closed APPROVED boundaries, §6.6,
  §7.6, §10). DEFERRED for terminal transitions only because the terminal
  transition question is unresolved for all roles; once terminal transition
  authority is resolved, AGENT's exclusion would likely follow from the
  same least-privilege reasoning.

## 19. Remaining Deferred Items After This Record

**Items partially addressed by this record but still DEFERRED:**

1. **Delivery creation authority for CREATIVE/PRODUCTION** — DEFERRED in
   this record; requires a separate decision establishing that
   CREATIVE/PRODUCTION actors hold authority to initiate client-facing
   delivery records (§6.3).

2. **Delivery creation authority for QC** — DEFERRED in this record;
   requires a separate decision establishing a QC-to-Delivery handoff
   pattern analogous to QC-to-Approval (§6.4).

3. **Delivery creation authority for CLIENT** — DEFERRED in this record
   (§6.5).

4. **PREPARING → SENDING authority for CREATIVE/PRODUCTION** — DEFERRED
   (§7.3).

5. **PREPARING → SENDING authority for QC** — DEFERRED (§7.4).

6. **PREPARING → SENDING authority for CLIENT** — DEFERRED (§7.5).

7. **Whether SENDING → COMPLETED is system-driven or actor-initiated** —
   DEFERRED (§5, §8.1).

8. **Whether SENDING → FAILED is system-driven or actor-initiated** —
   DEFERRED (§5, §8.2).

9. **PREPARING → CANCELLED authority for all roles** — DEFERRED per
   DR 0011 §22 item 12 (§8.3). Includes OWNER and ADMIN/OPERATIONS,
   whose authority was not granted here due to the explicit deferral in an
   APPROVED record.

10. **SENDING → CANCELLED authority for all roles** — DEFERRED per
    DR 0011 §22 item 12 (§8.3).

11. **Scope narrowing within organization scope** — whether CREATIVE/
    PRODUCTION authority (once resolved) is bounded to their own production
    scope; whether ADMIN/OPERATIONS authority is bounded by Order scope
    within a campaign (§12).

12. **Actor attribution implementation mechanism for Delivery transitions**
    — DEFERRED (§16; parallel to DR 0024 §23 item 7).

13. **Tenant/RLS enforcement mechanism for Delivery actor authority** —
    DEFERRED (§17; parallel to DR 0024 §23 item 9).

14. **Delivery → Asset cardinality** (DR 0011 §22 item 1 — unchanged).

15. **Whether every Order requires a Delivery** (DR 0012 Deferred Item 4
    — unchanged).

16. **Delivery retry semantics** (DR 0011 §22 item 4 — unchanged).

17. **Cancellation side effects** (DR 0011 §22 item 13 — unchanged).

18. **DR 0034 §13 decisions A–H** (Owner decisions about sequencing and
    automatic triggers between Approval and Delivery — this record does not
    resolve them).

19. **All deferred items from DR 0001–0034 not addressed here** remain
    independently open and unchanged. This record resolves no deferred
    item from records other than the ones listed in the header.

## 20. Interactions

### 20.1 DR 0008 (Production Job State Machine)

**Consistent. No change.** DR 0008 establishes the structural parallel
(initial→active→terminal shape) and notes that Production Job cancellation
authorization is also deferred. This record does not modify Production Job's
lifecycle or actor authority (which remains unresolved for Production Job
separately).

### 20.2 DR 0011 (Delivery State Machine)

**Consistent. No change.** All five states and six transitions are
preserved exactly as established. §7 (QC separation), §8 (Approval
separation), §13 (CANCELLED semantics), §18 (financial separation), §19
(tenant isolation) are all reaffirmed and not modified. Deferred Item 12
(cancellation authorization) remains DEFERRED. This record adds the
per-role actor authority analysis for creation and PREPARING → SENDING;
it does not introduce new states, transitions, or terminal-state reopening
semantics.

### 20.3 DR 0012 (Order Completion Guard)

**Consistent. No change.** Conjunctive AND guard preserved (§14). Actor
identity is orthogonal to guard evaluation. Required Delivery satisfaction
mechanics unaffected. No new deferred items from DR 0012 are opened or
closed.

### 20.4 DR 0024 (Approval Actor & Authority Boundary)

**Consistent. No change.** Approval actor authority (creation and PENDING
→ APPROVED/REJECTED/CANCELLED/EXPIRED) is not modified. The Gate 0 text
recorded in DR 0024 §3 is used here as the authoritative source for role
characterizations — DR 0024 is not re-decided, only consulted. The AGENT
exclusion from Approval actor roles is preserved and the parallel Delivery
exclusion follows from the same Gate 0 reasoning (§6.6, §7.6, §10).

### 20.5 DR 0029 (Approval Target Role Authority Mapping)

**Consistent. No change.** Per-type Approval role authority is not
modified. CLIENT's Approval decision authority (PENDING → APPROVED/REJECTED
for client-facing Approvals within contractual scope) does not translate to
CLIENT Delivery authority — the two are independent (§11, §13).

### 20.6 DR 0034 (Approval ↔ Delivery Orchestration Boundary)

**Consistent. Model C structural baseline preserved (§13).** DR 0034
remains PROPOSED; this record does not modify its conclusions. Decisions
A–H from DR 0034 §13 remain open. DR 0034 §14 item 15 (Delivery
cancellation authorization) is partially addressed by this record's
deferred items analysis (§19 items 9–10) but the item itself remains
DEFERRED. DR 0034 §13 decisions A and B are resolved where authoritative
evidence permits (OWNER and ADMIN/OPERATIONS authority established;
others DEFERRED).

## 21. Consistency with Decision Records 0001–0034

- **Consistent with 0001/0002:** no schema, no new entity, no new role;
  D1 tenant-scope constraint preserved (§12, §17); D2 UUID identity
  unaffected; D8 TEXT+CHECK state representation unaffected.
- **Consistent with 0003–0007:** no Campaign, Brief, Quote, Asset, or
  Order lifecycle is modified. Delivery actor authority does not acquire
  authority over any other entity's state machine.
- **Consistent with 0008 (Production Job):** structural parallel noted;
  Production Job actor authority unmodified; cancellation-authorization
  deferral in Production Job analogous to Delivery's.
- **Consistent with 0009 (AI Generation):** not in scope; unmodified.
- **Consistent with 0010 (Approval):** Target Boundary preserved; Approval
  lifecycle unmodified. Delivery actor authority does not establish any
  Approval-lifecycle consequence.
- **Consistent with 0011 (Delivery):** state machine (all 5 states, 6
  transitions) preserved exactly. §7, §8, §13, §18, §19 separation
  principles reaffirmed.
- **Consistent with 0012 (Order Completion Guard):** conjunctive guard
  unaffected (§14). Deferred Items 1–2 not resolved.
- **Consistent with 0013–0022 (Requirements Framework):** qualification,
  satisfaction, cardinality, and identity all preserved. No cross-track
  dependency introduced.
- **Consistent with 0023–0029 (Approval Target and Authority):** Approval
  target type set {Asset, Quote} preserved; Delivery not designated;
  Approval role authority unchanged; DR 0024 and DR 0029 conclusions
  unmodified.
- **Consistent with 0030–0033 (Target-State and Temporal Boundaries):**
  evidentiary standard applied (DR 0031 §2.2); temporal and precondition
  deferrals unchanged.
- **Consistent with 0034 (Approval ↔ Delivery Orchestration):** Model C
  structural baseline preserved; decisions A–H remain open; item 15
  partially addressed (not resolved).
- No Decision Record 0001–0034 is modified, reinterpreted, or superseded
  by this record.

## 22. Explicitly Prohibited Assumptions

- Do not assume CREATIVE/PRODUCTION holds Delivery creation authority —
  DEFERRED (§6.3).
- Do not assume QC holds Delivery creation authority — DEFERRED (§6.4).
- Do not assume CLIENT holds Delivery creation authority — DEFERRED (§6.5).
- Do not assume AGENT holds any actor authority over any Delivery transition
  — NOT APPROVED for creation and PREPARING → SENDING; DEFERRED but not
  established for terminal transitions (§10).
- Do not assume CREATIVE/PRODUCTION may execute PREPARING → SENDING —
  DEFERRED (§7.3).
- Do not assume QC may execute PREPARING → SENDING — DEFERRED (§7.4).
- Do not assume CLIENT may execute PREPARING → SENDING — DEFERRED (§7.5).
- Do not assume OWNER or ADMIN/OPERATIONS hold Delivery cancellation
  authority — DEFERRED for all roles (§8.3; DR 0011 §22 item 12).
- Do not assume SENDING → COMPLETED or SENDING → FAILED require an actor
  authorization check — this is not established and may be system-driven
  (§5, §8.1–§8.2).
- Do not assume any Approval state (PENDING, APPROVED, REJECTED, CANCELLED,
  EXPIRED) is a precondition for any Delivery actor authority (§13;
  DR 0034 Model C).
- Do not assume any Delivery state is a precondition for any Approval actor
  authority established in DR 0024 or DR 0029 (§13; DR 0034 Model C).
- Do not assume CLIENT's Approval decision authority (DR 0029) establishes
  or implies CLIENT Delivery authority — separate entities, independent
  lifecycles (§11, §13).
- Do not assume the creator of a Delivery record and the actor who executes
  PREPARING → SENDING must be the same role or the same individual — the
  two authorities are analyzed separately and can be assigned to different
  roles (§4).
- Do not assume actor authority over Delivery implies any financial authority
  (§15).
- Do not assume this record resolves DR 0034 §13 decisions A–H (§13).
- Do not assume this record modifies or reopens DR 0011's state machine —
  all five states and six transitions are preserved exactly.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0034 have been altered, reinterpreted,
  or superseded — all remain authoritative and unchanged.
