# Decision Record 0021 — Phase 02 Round 02B: Required Delivery Logical Description & Shape

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the architectural/logical level only. No
  field, table, migration, or business-content taxonomy is approved by
  this record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0020. All remain authoritative and unchanged. This record closes
  the "exact conceptual shape" dependency that Decision Records 0015 §7,
  0016 §6, 0017 §14, 0018, and 0020 §9 each named but left open.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service and
Package remain **UNVERIFIED** as entities, unchanged from 0013–0020, and
are not introduced here; nor are SKU, product type, asset/file type
taxonomy, channel, platform, campaign objective, quantity, format,
resolution, deadline, or acceptance-criteria concepts — none is supported
by any Decision Record 0001–0020.

## 1. Context

Every record since 0015 has referred to a Required Delivery's "exact
conceptual shape" or "description" as an open dependency without stating
what minimum information such a shape must actually contain. Decision
Record 0020 §9 named this precisely as the blocking prerequisite for its
own deepest open question. This record supplies the minimum logical
shape — not by inventing business content, but by separating what the
architecture *needs* (identity, and a reference mechanism) from what it
*cannot yet supply* (descriptive business content).

## 2. Problem

Two Required Deliveries in the same Order must be distinguishable from
each other, and an actual Delivery record must be able to prove which
one it addresses (0017 §6) — without relying on any business category
(Service, Package, SKU, deliverable type, quantity, etc.) that no
Decision Record has approved. This record must state the minimum
information that makes this possible, and separately state what
information would be useful but is not yet available.

## 3. Approved Inputs

- **0015 §7:** a Required Delivery needs *some* conceptual identity; its
  exact shape DEFERRED.
- **0016 §6:** qualification is snapshot membership; a Required Delivery
  exists independently of any Delivery record.
- **0017 §6, §10:** satisfaction requires a reference that resolves to
  **exactly one** requirement; descriptive-attribute matching (Model D)
  was already rejected as ambiguous.
- **0018 §9:** one actual Delivery record satisfies exactly one
  requirement by default.
- **0020 §5, §7, §9:** Order→Required Delivery is 1:N; Delivery→Required
  Delivery is N:1; partial delivery is not modeled; the "internally
  divisible obligation" question is blocked precisely on this record's
  subject matter.
- **0002 D2:** UUID v7, generated application-side, already approved as
  the general identity-generation convention for entities in this
  architecture — relevant as precedent, not as a decision that Required
  Delivery is itself a physical entity/table (§7).

## 4. Requirement Identity

**APPROVED:** *requirement identity* answers "what makes this obligation
a distinct, addressable thing?" — and nothing more. Given that no
business category is approved to hang identity on (Governance Note), the
only information the architecture can rely on is an **opaque, unique
identifier** per Required Delivery, unique at minimum within its Order's
Required Delivery collection (consistent with 0020 §5's 1:N Order
relationship). Two Required Deliveries are distinct **purely because**
they carry distinct identifiers — never because of any assumed content
difference (directly answering §10's requirement not to assume differing
business categories).

## 5. Requirement Description

**Distinguished from identity, per instruction.** A *description*
answers "what human-readable information explains this obligation?" —
and is **not** used for satisfaction matching (§6). **The architecture
may logically reserve a slot for such a description**, but **its actual
content is UNVERIFIED/DEFERRED**, because every candidate source of that
content — Quote content (0013 §7/0014 §7), Service, Package (both
UNVERIFIED throughout 0013–0020), or any structured attribute (quantity,
deliverable type, format, resolution, deadline, acceptance criteria) — is
either unapproved as an entity or unapproved as content on an approved
entity. This record does **not** invent that content. A description slot
existing in principle, with its content resolved only once upstream
commercial scope is separately approved, is the most this record can
respons­ibly state.

## 6. Satisfaction Reference

**APPROVED, directly following from §4 and 0017 §6/§10:** the
satisfaction reference an actual Delivery record must carry is **the
Required Delivery's own identity** (§4) — nothing else. This is
deliberate: identity-based reference is unambiguous by construction
(one identifier resolves to exactly one requirement), whereas
description-based matching was already rejected (0017 Model D) precisely
because descriptive content can coincide, change, or remain undefined.
`D1 → "some delivery for this Order"` is explicitly **insufficient** —
the reference must resolve to `D1 → R1`'s specific identity, combined
with the same-Order precondition already established (0017 §7.1).

## 7. Minimum Logical Shape

**APPROVED — the shape this record exists to fix:**

```
Required Delivery :=
  { identity              (opaque, unique per Order — MANDATORY, §4)
  , description            (OPTIONAL logical slot; content DEFERRED, §5)
  }

Satisfaction reference (carried by an actual Delivery record) :=
  { order_reference        (same-Order precondition, per 0017 §7.1)
  , required_delivery_reference  (= the Required Delivery's identity, §6)
  }
```

This is a **logical** shape, not a schema: no table, column, type, or
physical identifier scheme is decided here (§9, §19). The eventual
physical identity mechanism, if and when Required Delivery needs one,
would naturally draw on the already-approved UUID v7 convention (0002
D2) for consistency — noted as precedent, not decided here.

## 8. Candidate Models

- **A. Opaque requirement identifier only.** **Evidence:** sufficient,
  alone, for identity (§4) and satisfaction reference (§6); requires no
  unresolved commercial content. **Contradictions:** none.
  **False-completion risk:** lowest possible — reference is maximally
  precise. **Historical stability:** highest — nothing to redefine, since
  there is no content to change. **Dependency on unresolved commercial
  scope:** none. **Implementation implications:** minimal — a stable
  unique identifier only. **Classification: APPROVED**, as the mandatory
  floor.
- **B. Identifier + human-readable description.** **Evidence:** adds
  operational usability without weakening A, since description never
  participates in matching (§6). **Contradictions:** none for the slot's
  *existence*; the slot's *content* is unsupported by any approved
  entity. **False-completion risk:** none additional — description is
  documentary only. **Historical stability:** conditional — safe only if
  description content, once captured, is never silently re-derived from
  a later-changing upstream source (§11). **Dependency:** description
  *content* fully depends on still-unresolved upstream commercial scope
  (0013 §6). **Implementation implications:** would need some content
  field, physically undesigned. **Classification: PROPOSAL** for the
  slot's existence (adopted at the logical level, §9); **UNVERIFIED /
  DEFERRED** for its content.
- **C. Identifier + structured obligation attributes** (quantity,
  deliverable type, format, etc.). **Evidence:** none — this is exactly
  the business taxonomy the task instructs not to invent.
  **Contradictions:** directly conflicts with the Governance Note and
  with 0013–0020's consistent refusal to invent commercial-scope content.
  **Classification: REJECTED**, not evaluated further on risk grounds —
  rejected on process grounds (no authority to invent it).
- **D. Reference directly to an upstream commercial object** (e.g., a
  Quote line item). **Evidence:** conceptually appealing but Quote has no
  approved content to reference (0013 §7/0014 §7/0015 §10); a *live*
  reference was already rejected in 0014 §7 for stability reasons
  (upstream objects can change or be superseded). **Contradictions:**
  conflicts with 0014's captured-snapshot-not-live-derivation principle
  if implemented as a live link. **False-completion risk:** N/A directly,
  but a live link would reintroduce the exact instability 0014/0015 were
  built to prevent. **Classification: REJECTED as a live reference**; a
  non-live, historical citation ("this obligation originated from Quote
  X") is conceivable *within* a future description's content (§5) but is
  speculative and equally blocked on Quote content approval —
  **PROPOSAL/DEFERRED**, not adopted now.
- **E. Another model supported by approved architecture.** **None
  found.**

## 9. Selected Model / Unresolved Model

**APPROVED: Model A is the mandatory, sufficient minimum** — a Required
Delivery's identity alone is enough to satisfy every requirement this
record was asked to resolve (distinguishing R1 from R2, §10; enabling a
correct satisfaction reference, §6). **Model B's descriptive slot is
adopted at the logical level only** — a Required Delivery *may* carry a
description once one is available — **without inventing, approving, or
requiring any specific content for it now.** Models C and D are not
adopted. **Genuinely unresolved:** the actual content of any future
description (§5, §19), and by extension the deeper 0020 §9 question of
whether a single, internally-divisible obligation can be partially
transmitted and still satisfy — that question remains blocked exactly
where 0020 left it, because this record deliberately does not invent the
descriptive content that would be needed to define "the whole" for such
an obligation.

## 10. Distinguishing Multiple Requirements

**APPROVED, directly demonstrating the model's sufficiency:** for any
two Required Deliveries R1 and R2 belonging to the same Order,
`R1 ≠ R2` holds **if and only if their identities differ** (§4) —
regardless of whether they would ever have the same, different, absent,
or as-yet-undefined descriptions (§5). This is a deliberate design
property: distinctness never depends on business-category difference,
which is exactly why Model A alone is sufficient and Model C's
structured attributes are unnecessary for this purpose.

## 11. Historical Stability

**APPROVED (extending 0014 §14/0015 §16 to this record's shape):** at
minimum, a Required Delivery's **identity** must be captured once, at the
Order creation boundary (§12), and never reassigned or reused afterward
— this is what makes the satisfaction reference (§6) stable over the
Order's life. If a description (§5, §9) is ever populated, it must be
**captured as of that same moment**, not live-linked to Campaign, Brief,
Asset, Brand DNA, or pricing/configuration — a later change to any of
those must never silently alter what an existing Required Delivery's
description says, mirroring the same historical-integrity principle
already governing the snapshot as a whole (0014 §14, 0015 §16, 0016 §10,
0018 §16, 0020 §13). This record does not design the versioning or
amendment mechanism that would govern a deliberate, authorized change —
that remains **FUTURE/DEFERRED**, unchanged from 0015 §17-B/0016 §12.

## 12. Order Creation Boundary

**Reaffirmed, unchanged from 0015 §9/0016 §9/0017/0020:** whatever
identity (and, if present, description) a Required Delivery carries is
fixed at the same Order-creation capture point as the rest of the
snapshot's content. No new temporal rule is introduced by this record.

## 13. Partial-Delivery Boundary

**Reaffirmed, unchanged from 0020 §8–§9 — no reintroduction of anything
0020 rejected:** this record's shape does not create partial credit, does
not enable joint/multi-record satisfaction, and does not add any new
Delivery state. If a future description (§5, §9) ever states something
like a quantity, that content would not itself grant the architecture a
partial-completion capability — consistent with 0020 §9's conclusion,
the correct modeling response to a divisible commercial scope is
**multiple separate Required Delivery obligations** (each with its own
identity, per §4), not a partial-completion state on one. `Delivery.
COMPLETED` continues to mean exactly what 0011 and 0020 §4 already say —
this record does not redefine it.

## 14. Order Completion Interaction

**No contradiction found; Decision Record 0012 is not modified.** This
record makes explicit exactly what "correctly references" already meant
implicitly in 0017 §6/0018 §12's formula: a Delivery record's reference
resolves to a Required Delivery's identity (§6). This is a clarification
of vocabulary already in use, not a new condition on the guard.

## 15. Zero-Requirement Boundary

**Not resolved here — Decision Record 0019 is unchanged and not
re-litigated.** The shape defined in §7 remains structurally valid
whether an Order's Required Delivery collection is empty, has one
member, or has many: an empty collection is simply a collection with no
identity-bearing members, which introduces no conflict with §4–§10. This
record states only that structural validity — it does not address
whether emptiness is ever a legitimate business state (0019, unchanged).

## 16. Security Boundary

Unchanged from 0014 §20/0015 §23/0016 §17/0017 §17/0018 §18/0019 §13/0020
§14: a Required Delivery's identity and any future description remain
within the Order's own tenant context, inheriting `organization_id`/
composite-FK scoping (0002 D1) once physically represented. No RLS or
authorization mechanism is designed or implemented by this record.

## 17. Financial Separation

Unchanged from every prior record in this chain: a Required Delivery's
identity or description does not represent, and must not be used to
infer, Payment, Revenue, Expense, Profit, Refund, or Owner Settlement.

## 18. Rejected Alternatives

- Model C (structured obligation attributes: quantity, deliverable type,
  format, resolution, deadline, acceptance criteria) — rejected outright
  (§8); would invent unapproved business taxonomy, directly against this
  task's explicit instruction and the whole chain's discipline.
- Model D as a live reference to an upstream commercial object —
  rejected (§8); reintroduces the stability problem 0014 §7 already
  resolved against.
- Using description content for satisfaction matching — rejected (§6);
  already foreclosed by 0017's rejection of descriptive-attribute
  matching.
- Assuming two Required Deliveries must differ in business category to
  be distinct — rejected (§10); identity alone suffices.
- Inventing description content now to "finish" the model — rejected
  (§5, §9); content remains explicitly UNVERIFIED/DEFERRED.
- Treating a future description's content (e.g., a quantity) as
  authorizing partial completion — rejected (§13); consistent with 0020.

## 19. Deferred Decisions

1. The actual content of a Required Delivery's description, once
   upstream commercial scope (Quote/Service/Package) is separately
   approved (§5, §9) — unchanged dependency from 0013 §6/0015 §6.
2. Whether a non-live, historical citation to an upstream commercial
   object could ever appear within that description (§8, Model D).
3. The physical identifier mechanism for Required Delivery, including
   whether it reuses the UUID v7 convention (0002 D2) noted as precedent
   (§7).
4. The controlled amendment/versioning mechanism governing a deliberate,
   authorized change to an existing Required Delivery's identity or
   description (§11) — unchanged from 0015/0016.
5. Whether a single, internally-divisible obligation can ever be
   partially transmitted and still satisfy (0020 §9, unchanged — still
   blocked, now specifically on item 1 above).
6. Any physical database representation of the shape in §7.
7. Exact tenant/RLS implementation (§16).

## 20. Final Recommendation

The minimum logical shape of a Required Delivery is an opaque, per-Order-
unique **identity** (mandatory, §4) plus an optional, content-deferred
**description slot** (§5, §9) — never the reverse emphasis. Two Required
Deliveries are distinguished purely by identity, never by assumed
business category (§10). The satisfaction reference an actual Delivery
record must carry is exactly that identity, combined with the existing
same-Order precondition (§6) — resolving, precisely, what "correctly
references" has meant throughout 0017/0018/0020 without changing their
conclusions. This shape requires no unapproved business taxonomy, does
not reintroduce partial or joint satisfaction (§13), does not modify
Decision Record 0012 (§14), and remains structurally valid independent of
whether the Required Delivery collection is ever empty (§15, deferring to
0019). What remains open is exactly, and only, the descriptive content
this record deliberately declines to invent — gated on upstream
commercial-scope approval that no Decision Record has yet supplied.

## Consistency with Decision Records 0001–0020

- Consistent with 0001/0002: introduces no schema; notes UUID v7 (D2) as
  precedent only, not as a decision that Required Delivery is a physical
  entity.
- Consistent with 0003–0009: none is read by, or a source for, this
  record's shape.
- Consistent with 0010 (Approval): out of scope, per explicit
  instruction; not touched.
- Consistent with 0011 (Delivery): `Delivery.COMPLETED`'s meaning (0011,
  reaffirmed 0020 §4) is not redefined.
- Consistent with 0012 (Completion Guard): unmodified (§14).
- Consistent with 0013/0014 (Requirements gap, source of truth): reuses,
  without contradicting, their finding that Quote/Service/Package lack
  approved content (§5, §8).
- Consistent with 0015 (Snapshot content): supplies exactly the shape
  that record's §7 left open, without inventing description content it
  also left open.
- Consistent with 0016 (Qualification): identity-based distinctness
  (§10) is fully compatible with membership-based qualification.
- Consistent with 0017 (Satisfaction): reaffirms and sharpens its
  rejection of descriptive-attribute matching (§6, §8).
- Consistent with 0018 (Cardinality/Completion Semantics): the identity-
  based reference is exactly what "correctly references" in its formula
  already presumed (§14).
- Consistent with 0019 (Zero-Requirement Semantics): unaffected; §15
  confirms structural compatibility without resolving legitimacy.
- Consistent with 0020 (Delivery Cardinality/Partial Semantics): directly
  closes the dependency its §9 named, without contradicting its Model D
  conclusion (§13).
- No Decision Record 0001–0020 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume Service, Package, SKU, product type, asset/file type
  taxonomy, channel, platform, campaign objective, quantity, format,
  resolution, deadline, or acceptance criteria have been approved as
  Required Delivery content (Governance Note, §5, §8).
- Do not assume a Required Delivery's description has any approved
  content — only that a logical slot for one may exist (§5, §9, §19).
- Do not assume distinctness between two Required Deliveries requires a
  business-category difference (§10).
- Do not assume descriptive content is, or may be, used for satisfaction
  matching (§6).
- Do not assume a live reference to Quote or any upstream commercial
  object has been adopted (§8).
- Do not assume this record authorizes partial credit, joint
  satisfaction, or a new Delivery state (§13).
- Do not assume Decision Record 0012 has been modified (§14).
- Do not assume the zero-requirement legitimacy question (0019) has been
  resolved (§15).
- Do not assume any physical identifier mechanism, schema, or table has
  been decided (§7, §19).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0020 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
