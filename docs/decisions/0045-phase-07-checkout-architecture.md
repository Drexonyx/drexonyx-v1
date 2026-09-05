# Decision Record 0045 — Phase 07: Checkout Architecture

- **Decision Round:** Phase 07
- **Phase:** 07 — Payments & Orders
- **Status:** APPROVED — Owner approved 2026-09-04. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 07 PLAN blocker: "DR 0045 — Checkout Architecture (hosted
  vs. embedded; determines portal UI shape)."
- **Relationship to prior records:** Does not modify Decision Records 0001–0044.
  All remain authoritative and unchanged. Depends on DR 0044 (Payment Provider
  Selection — Stripe). This record resolves the checkout architecture choice and
  establishes the security boundary that governs portal checkout UI design,
  payment state authority, and the treatment of provider redirect results.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0044. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0044):** Stripe is the selected payment provider for DREXONYX V1.

**FACT (ARCHITECTURE.md):** DREXONYX must not receive or store raw payment
card data. External provider secrets must be server-side only. Frontend
visibility is never authorization.

**FACT (Phase 07 PLAN, verified schema):** No checkout UI or checkout flow
currently exists in the codebase. The portal Payments page (`app/portal/payments/page.tsx`)
is read-only. The portal Orders page (`app/portal/orders/page.tsx`) is read-only.
No server action for initiating payment exists.

**FACT (DR 0005, DR 0007):** The payment flow begins after Quote acceptance
(SENT→ACCEPTED transition, DR 0046) creates an ACTIVE Order. Payment is
associated with an Order, not a Quote directly.

**FACT (Phase 07 PLAN):** Stripe offers multiple integration options:
Stripe-hosted Checkout (redirect), Stripe Embedded Checkout (iframe), and
Stripe Elements (custom card fields rendered in the DREXONYX portal).

---

## 2. Problem

Phase 07 BUILD requires a decision on which Stripe checkout integration model
to use. The choice determines:

1. Whether DREXONYX's portal renders card input fields (card data in browser
   context) or redirects the user to Stripe's hosted environment.
2. What PCI compliance scope applies to DREXONYX.
3. What client-side code, server actions, and webhook handling are required.
4. What the portal UI flow looks like (inline payment form vs. redirect and
   return).

Implementing a checkout flow without this decision would require architectural
assumptions — a violation of CLAUDE.md's prohibition on guessing.

---

## 3. Decision

**PROPOSED (Owner instruction, Phase 07 pre-BUILD):**

### 3.1 Checkout Architecture: Stripe-Hosted Checkout (Redirect)

**PROPOSED:** DREXONYX V1 uses Stripe-hosted Checkout with client redirect.

The checkout flow is:

```
Portal Client clicks "Pay Now" on an Order
  → Server action creates a Stripe Checkout Session
  → Server action returns the Stripe Checkout Session URL
  → Client is redirected to Stripe's hosted checkout environment
  → Client completes payment on Stripe's hosted page
  → Stripe redirects client back to DREXONYX portal (success or cancel URL)
  → DREXONYX receives authoritative payment result via Stripe webhook
  → Webhook handler verifies signature, updates payment state in database
  → Portal client sees updated payment state on return to portal
```

### 3.2 DREXONYX Must Not Receive or Store Raw Card Data

**PROPOSED (reaffirming ARCHITECTURE.md):**

DREXONYX must not receive, process, transmit, or store raw payment card data
(card numbers, CVCs, expiry dates, or any equivalent). This is a hard
architectural constraint for V1.

The Stripe-hosted Checkout architecture satisfies this constraint: all card
data entry occurs on Stripe's hosted page, within Stripe's PCI-compliant
environment. DREXONYX never receives card data.

This constraint must not be relaxed by any implementation decision without a
new Decision Record explicitly approved by the Owner.

### 3.3 PSP Redirect Results Are Informational Only

**PROPOSED:** When Stripe redirects the client back to the DREXONYX portal
after the hosted checkout flow (either to the success URL or the cancel URL):

- The redirect URL parameters (including any status query parameters) are
  informational only.
- They must not be used to mutate database payment state.
- They must not be used to trigger financial ledger entries.
- They must not be used as proof of payment.

**PROPOSED:** The authoritative source of payment state is the database
record, updated only by verified server-side webhook events from Stripe.
A client arriving at the success URL has not yet constituted a confirmed
payment — confirmation requires a verified Stripe webhook event.

**PROPOSED:** The portal UI may display a pending/processing state upon
return from Stripe redirect, but must not display a final PAID confirmation
until the database record reflects `payments.status = 'PAID'` as set by the
webhook handler.

### 3.4 Webhook Is the Authoritative Payment Event Source

**PROPOSED:** All authoritative payment state transitions — PENDING→PROCESSING,
PROCESSING→PAID, PROCESSING→FAILED, PAID→REFUNDED, PAID→CHARGEBACK — must be
triggered by verified Stripe webhook events received and processed server-side.

**PROPOSED:** Webhook signature verification (Stripe's HMAC-based webhook
signature) must be performed on every inbound webhook delivery before any
database state mutation occurs. An unverified or malformed webhook payload
must be rejected without any database write.

**PROPOSED:** Webhook handling is idempotent. Processing the same Stripe
event ID twice must produce the same outcome as processing it once, with no
duplicate financial ledger entries and no duplicate payment status mutations.
The `system.idempotency_keys` mechanism (DR 0002 D4) applies.

---

## 4. Portal UI Implications

**PROPOSED (decisions only, not implementation instructions):**

The checkout architecture establishes the following portal UI requirements:

1. **"Pay Now" trigger:** An authorized portal user (CLIENT or authorized
   role — authority per DR 0046) initiates checkout via a server action.
   No checkout UI is rendered inline in the portal.

2. **Redirect:** The server action creates a Stripe Checkout Session and
   returns the hosted URL. The portal client is redirected to that URL.

3. **Return URLs:** The Stripe Checkout Session must be configured with:
   - A success return URL pointing to a DREXONYX portal page.
   - A cancel return URL pointing to a DREXONYX portal page.
   Both URLs are server-constructed. No client-controlled URL parameters may
   determine payment outcome.

4. **Post-return state display:** Upon return from Stripe, the portal should
   display the current database payment state, which may be PROCESSING while
   the webhook has not yet been received and processed. A final PAID
   confirmation is shown only when the database reflects `payments.status = 'PAID'`.

5. **No inline card form:** DREXONYX V1 does not render a card input form,
   Stripe Elements, or Stripe Embedded Checkout in the portal. These are
   explicitly excluded in V1 (§6).

---

## 5. Security Requirements

**PROPOSED (reaffirming ARCHITECTURE.md and DR 0044 §3.4):**

1. **Stripe secret key:** used only server-side to create Checkout Sessions
   and to verify webhook signatures. Never exposed to the client.
2. **Stripe publishable key:** may be exposed to the client-side if required
   for Stripe.js (not required for the pure hosted redirect model in V1, but
   permissible per Stripe's security model if needed for future use).
3. **Webhook signature verification:** mandatory on every inbound webhook.
   Uses the Stripe webhook signing secret (server-side only).
4. **Return URL authority:** success and cancel URLs are server-constructed.
   No payment state is determined from client-controlled input.
5. **Server-side organizationId:** the organization context for any Checkout
   Session creation is sourced from the server-side session JWT, never from
   client-controlled input (ARCHITECTURE.md, DR 0002 D1).

---

## 6. Explicit V1 Exclusions

**PROPOSED:** The following checkout models are explicitly excluded from V1:

- Stripe Embedded Checkout (iframe rendering in DREXONYX portal)
- Stripe Elements / custom card input fields in the DREXONYX portal
- Stripe Payment Links (URL-only payment, no DREXONYX session context)
- Any checkout model where DREXONYX receives or processes raw card data

These exclusions hold unless explicitly reversed by a future Owner-approved
Decision Record.

---

## 7. Deferred Items

1. **Stripe Checkout Session configuration details** — line item format, product
   description, currency, Stripe metadata fields. BUILD-phase decisions.
2. **Success and cancel URL path conventions** — BUILD-phase decisions.
3. **Portal state polling vs. webhook-pushed state display** — if the portal
   should poll for payment state after redirect return, or rely on database
   state on page load. BUILD-phase decision.
4. **Email confirmation on payment** — not in Phase 07 scope. DEFERRED.
5. **All deferred items from DR 0001–0044 not addressed here** remain open.

---

## 8. Compatibility with Decision Records 0001–0044

- **DR 0001 §6 (Financial architecture):** Redirect results do not create
  Financial Ledger entries; only verified webhooks do. Consistent.
- **DR 0002 D1 (Tenant isolation):** organizationId sourced from server-side
  session for all Checkout Session creation. Consistent.
- **DR 0002 D4 (Idempotency):** Webhook handling is idempotent via
  `system.idempotency_keys`. Consistent.
- **DR 0007 (Order state machine):** Payment state is not reflected on Order.
  Checkout architecture does not change Order state. Consistent.
- **DR 0044 (Payment Provider):** Stripe-hosted Checkout is a Stripe-provided
  integration model. Consistent.
- **ARCHITECTURE.md:** No raw card data received; no client-controlled input
  determines payment state; secrets are server-side only. Consistent.
- No Decision Record 0001–0044 is modified, reinterpreted, or superseded.

---

## 9. Explicitly Prohibited Assumptions

- Do not assume a portal card input form is part of V1 — it is explicitly
  excluded (§6).
- Do not assume redirect return parameters constitute proof of payment — they
  are informational only (§3.3).
- Do not assume any payment state transition is valid without a verified
  server-side webhook event (§3.4).
- Do not assume Stripe Embedded Checkout or Stripe Elements are in V1 scope — they
  are excluded (§6).
- Do not assume DREXONYX may receive or process raw card data — this is
  prohibited (§3.2).
- Do not assume this record authorizes schema changes, migrations, code changes,
  dependency installation, commits, or pushes.
- Do not assume Decision Records 0001–0044 have been altered, reinterpreted,
  or superseded.

---

## 10. Owner Approval

**This record is PROPOSED and requires explicit Owner approval before any
implementation may proceed.**

No checkout UI, server action, webhook handler, Stripe SDK installation, or
any other implementation work may begin based on this record until the Owner
approves it.

**No implementation is authorized by approval of this record alone.**
Phase 07 BUILD authorization is a separate, subsequent decision.
