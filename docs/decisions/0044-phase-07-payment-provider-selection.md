# Decision Record 0044 — Phase 07: Payment Provider Selection

- **Decision Round:** Phase 07
- **Phase:** 07 — Payments & Orders
- **Status:** APPROVED — Owner approved 2026-09-04. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 07 PLAN blocker: "DR 0044 — Payment Provider Selection
  (CRITICAL — all implementation depends on this)."
- **Relationship to prior records:** Does not modify Decision Records 0001–0043.
  All remain authoritative and unchanged. This record resolves the Phase 07 PLAN
  blocker identified as the critical-path dependency for all subsequent payment
  implementation decisions. DR 0045 (Checkout Architecture), DR 0047 (Payment
  Status Model), DR 0048 (Payment Retry Behavior), and DR 0052 (Financial Ledger
  Entry Types) all depend on this record's resolution.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0043. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (Phase 07 PLAN, verified schema):** The `financial.payments` table exists
in the current schema but does not contain any payment-provider-specific fields
(e.g., provider name, provider payment ID, provider event ID). All such fields
are identified Phase 07 schema gap items pending Owner Decision.

**FACT (Phase 07 PLAN):** No payment provider has been selected in any Decision
Record 0001–0043. DR 0005 establishes the Quote state machine through which
client acceptance triggers the payment workflow, but does not name a provider.
DR 0007 establishes the Order state machine and explicitly rejects payment state
on Orders, but does not name a provider.

**FACT (Phase 07 PLAN):** Payment provider selection is the critical-path
dependency for Phase 07. All downstream decisions — checkout architecture,
webhook handling, payment status model, retry behavior, and financial ledger
entry types — are conditioned on the chosen provider's capabilities, API
contracts, and webhook event vocabulary.

**FACT (DR 0001 §6, DR 0043 §15):** The approved financial architecture
preserves the following separations:
- Payment ≠ Revenue
- Provider Credit ≠ Cash/Profit
- Order Budget ≠ Profit
- Profit ≠ Owner Settlement

This record does not alter those separations.

**FACT (ARCHITECTURE.md):** External provider secrets must be server-side only.
No provider API key, webhook secret, or credential may be exposed to the
client-side application.

---

## 2. Problem

Phase 07 BUILD cannot safely proceed without a named payment provider. The
following depend on the provider's identity:

1. Which Checkout architecture is available (hosted redirect, embedded,
   custom card fields, etc.) — DR 0045.
2. Which webhook event vocabulary is authoritative for payment status
   transitions — DR 0047.
3. Which retry and idempotency mechanisms the provider offers — DR 0048.
4. What provider-specific fields must be added to `financial.payments` — Phase
   07 schema migrations.
5. What PSP-side libraries, SDKs, or API clients are required — dependency
   selection.
6. What webhook signature verification mechanism is used — security requirement.

Proceeding without resolution would require implementation decisions to be made
by assumption — a violation of CLAUDE.md's prohibition on guessing.

---

## 3. Decision

**PROPOSED (Owner instruction, Phase 07 pre-BUILD):**

### 3.1 Selected Payment Provider

**PROPOSED:** Stripe is the selected payment provider for DREXONYX V1.

This decision applies to all V1 payment processing, checkout, webhook
integration, and provider-specific field naming unless explicitly superseded
by a future Decision Record.

### 3.2 Provider-Agnostic Internal Field Names

**PROPOSED:** Where internal schema fields and application logic can reasonably
use provider-agnostic terminology without loss of meaning, they should do so.
Provider-agnostic naming improves maintainability and reduces coupling between
the DREXONYX domain model and any single provider's vocabulary.

Examples of the principle (not implementation instructions):
- Internal field `provider_payment_id` rather than `stripe_payment_intent_id`
- Internal field `provider_event_id` rather than `stripe_event_id`
- Internal constant `provider_name` with value `'stripe'` (data, not schema shape)

**PROPOSED:** The Stripe-specific terminology for the fields named above — and
for any other provider-bound identifiers — belongs to the implementation phase.
This record does not mandate field names or their exact definition; it
establishes the naming principle that implementation must follow.

### 3.3 Stripe-Specific Implementation Details Are Deferred

**PROPOSED:** The following Stripe-specific implementation details are not
decided by this record and belong to the Phase 07 BUILD phase, conditioned
on BUILD authorization:

- Stripe API version selection
- Stripe SDK version selection
- Stripe product/price object model vs. Payment Intent vs. Checkout Session
- Stripe metadata field usage
- Specific Stripe dashboard configuration
- Stripe webhook endpoint registration
- Stripe test mode vs. live mode configuration strategy
- Stripe radar/fraud rules
- Stripe Connect or platform feature usage (not in V1 scope)

None of the above may be assumed or implemented without BUILD authorization.

### 3.4 Security Principle — Stripe Credentials

**PROPOSED (reaffirming ARCHITECTURE.md):**

Stripe API keys (publishable key and secret key) and Stripe webhook signing
secrets must be managed as server-side environment secrets only:

- The Stripe secret key must never appear in client-side code, build outputs,
  or source control.
- The Stripe publishable key may be exposed to the client-side only where
  required by the chosen checkout architecture (e.g., Stripe.js initialization).
  This is acceptable per Stripe's own security model for publishable keys.
- The Stripe webhook signing secret must be server-side only and used to verify
  every inbound webhook payload before any database state mutation occurs.

The specific environment variable naming and secrets management mechanism are
implementation details belonging to the BUILD phase.

---

## 4. Schema Implications

**PROPOSED (not authorizing schema changes):**

This decision implies that `financial.payments` will require provider-specific
fields in Phase 07. Identified gap fields (from Phase 07 PLAN) include:
- `provider_name` — identifies Stripe as the processing provider for this record
- `provider_payment_id` — Stripe's internal identifier for the payment
- `provider_event_id` — Stripe webhook event ID used for idempotency
- `payment_method_type` — the Stripe payment method type (e.g., card)
- `failure_reason` — provider-supplied failure description
- `paid_at` — timestamp when payment reached PAID state
- `refunded_at` — timestamp when payment reached REFUNDED state
- `metadata` — JSONB for provider-supplied event context

**PROPOSED:** All field names above use provider-agnostic naming per §3.2.
The exact column names, types, constraints, and default values are determined
at schema migration time, conditioned on BUILD authorization.

**PROPOSED:** No schema change is authorized by this record. Schema migrations
require separate authorization per the source-of-truth hierarchy in CLAUDE.md.

---

## 5. Financial Boundary

**APPROVED (reaffirming DR 0001 §6, DR 0043 §15):**

Selection of Stripe as payment provider does not alter the financial architecture:

- Payment ≠ Revenue: a Stripe payment reaching PAID creates a `CLIENT_PAYMENT`
  Financial Ledger entry; it does not constitute revenue recognition.
- Provider Credit ≠ Cash/Profit: Stripe's provider credits (if applicable in a
  future phase) are not cash or profit.
- Order Budget ≠ Profit: Order Budget tracks planned/estimated/actual spend;
  it is not a profit ledger.
- Profit ≠ Owner Settlement: profit and settlement remain post-production
  computed values.

---

## 6. Deferred Items

1. **Stripe-specific implementation details** — see §3.3. All belong to BUILD.
2. **Alternative provider consideration for V2** — out of scope. This record
   governs V1 only.
3. **Multi-provider support** — not in V1 scope. DEFERRED.
4. **Stripe Connect / platform features** — not in V1 scope. DEFERRED.
5. **All deferred items from DR 0001–0043 not addressed here** remain open.

---

## 7. Compatibility with Decision Records 0001–0043

- **DR 0001 §6 (Financial architecture):** Provider selection does not alter
  the financial separation model. Consistent.
- **DR 0002 D4 (Idempotency):** Stripe webhook idempotency will use
  `system.idempotency_keys` per the existing mechanism. Consistent.
- **DR 0005 (Quote state machine):** Unchanged. Payment processing begins after
  SENT→ACCEPTED (DR 0046). Consistent.
- **DR 0007 (Order state machine):** Payment state does not appear on Order.
  Consistent.
- **DR 0043 §15 (Financial boundary):** Financial separations preserved. Consistent.
- **ARCHITECTURE.md (secrets):** Stripe secrets are server-side only. Consistent.
- No Decision Record 0001–0043 is modified, reinterpreted, or superseded.

---

## 8. Explicitly Prohibited Assumptions

- Do not assume Stripe-specific field names on schema objects — field names use
  provider-agnostic terminology per §3.2.
- Do not assume any Stripe SDK, API version, or product selection — these are
  BUILD-phase decisions.
- Do not assume the Stripe publishable key is a secret — it is not, per Stripe's
  security model; but the secret key and webhook secret are.
- Do not assume any alternative provider is in scope for V1 — Stripe is the V1
  selection.
- Do not assume this record authorizes schema changes, migrations, code changes,
  dependency installation, commits, or pushes.
- Do not assume Decision Records 0001–0043 have been altered, reinterpreted,
  or superseded.

---

## 9. Owner Approval

**This record is PROPOSED and requires explicit Owner approval before any
implementation may proceed.**

No schema migration, dependency installation, code change, or BUILD work may
begin based on this record until the Owner approves it.

**No implementation is authorized by approval of this record alone.**
Phase 07 BUILD authorization is a separate, subsequent decision.
