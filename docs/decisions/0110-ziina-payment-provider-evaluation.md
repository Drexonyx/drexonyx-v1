# DR 0110 — Ziina Payment Provider Evaluation

**Status:** BLOCKED — Requires Owner decision before any implementation.
**Phase:** Financial Section — Second Payment Provider Consideration
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `dcee170`
**Relationship to prior records:** Depends on DR 0044 (Payment Provider Selection — Stripe as V1
sole provider). Does not modify Decision Records 0001–0109.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Inspection Findings

### 1.1 No Approved Ziina Architecture Exists

**FACT:** A full-codebase search (`grep -ri ziina`) returns zero matches across all
source files, test files, and Decision Records 0001–0109.

**FACT:** DR 0044 §3.1 selects **Stripe** as the sole V1 payment provider:
> "Stripe is the selected payment provider for DREXONYX V1. This decision applies
> to all V1 payment processing, checkout, webhook integration, and provider-specific
> field naming unless explicitly superseded by a future Decision Record."

**FACT:** DR 0044 §6 explicitly defers alternative provider consideration:
> "Alternative provider consideration for V2 — out of scope. This record governs V1 only."

**FACT:** No Decision Record 0001–0109 authorizes, mentions, or provides specifications
for Ziina integration.

### 1.2 Authoritative Ziina Documentation Unavailable

**FACT:** Both `docs.ziina.com` and `ziina.com/developers` are blocked by the
environment's network egress proxy. No authoritative Ziina API documentation,
webhook event vocabulary, authentication mechanism, supported payment methods,
refund model, or SDK was retrievable during this inspection.

**CONSEQUENCE:** Any Ziina integration implemented without verified authoritative
documentation would violate CLAUDE.md's prohibition on inventing API capabilities —
regardless of general knowledge about the provider.

### 1.3 Existing Payment Implementation Is Stripe-Specific

**FACT:** The following fully-implemented, tested, production-grade Stripe integration
exists on the current branch:

| File | What It Does |
|---|---|
| `lib/stripe.ts` | Stripe singleton client |
| `lib/portal/create-payment.ts` | Checkout session creation, PENDING→PROCESSING transition |
| `lib/portal/webhook.ts` | All 4 webhook handlers (completed, failed, refunded, disputed) |
| `app/api/webhooks/stripe/route.ts` | HMAC-verified Stripe webhook endpoint |
| `lib/orchestration/financial-guard.ts` | SERIALIZABLE financial guard |
| `lib/financial/production-funding.ts` | Production Funding Check (DR dcee170) |

**FACT:** The `financial.payments` schema uses provider-agnostic field names
(`provider_name`, `provider_payment_id`, `provider_event_id`) per DR 0044 §3.2.
A second provider could populate the same columns with its own identifiers.

---

## 2. What an Approved Ziina Integration Would Require

This section identifies — without implementing — the decisions and verifications
an Owner-approved Ziina integration would need before any code may be written.

### 2.1 Owner Decisions Required

**REQUIRES OWNER DECISION:**

1. **Provider scope:** Is Ziina an alternative to Stripe (replace) or an
   additional option (both supported simultaneously)? DR 0044 currently names
   Stripe as V1-only. A new/amended DR is required to authorize Ziina.

2. **Operational scope:** Which clients or payment flows use Ziina vs. Stripe?
   (e.g., AED-denominated orders only, UAE clients, specific campaigns.)

3. **Refund authority:** Ziina refund flow — if Ziina supports programmatic
   refunds, are autonomous refunds authorized? (Current architecture: NO
   autonomous refunds. Any change requires explicit Owner approval.)

4. **Settlement model:** Does Ziina settle to the DREXONYX bank account
   automatically, or is manual settlement required? Owner must confirm no
   autonomous settlement logic is introduced.

5. **Webhook security model:** DREXONYX requires HMAC signature verification
   before any DB mutation. Owner must confirm Ziina provides a verifiable
   webhook signature mechanism.

### 2.2 Technical Verifications Required From Authoritative Ziina Documentation

Before any implementation, the following must be verified from official Ziina
API documentation (not training knowledge):

1. **Authentication:** API key model? Bearer token? OAuth? How are credentials
   scoped and rotated?

2. **Payment creation endpoint:** Exact endpoint, required fields, response shape,
   payment link vs. hosted checkout vs. embedded.

3. **Payment confirmation model:** Does Ziina use a redirect flow (like Stripe
   Checkout)? A webhook-only confirmation? Both?

4. **Webhook event vocabulary:** Exact event type names for payment success,
   failure, refund, chargeback. These determine the `handleXxx` handlers needed.

5. **Webhook signature verification:** Header name, algorithm, secret management.
   Without this, no Ziina webhook endpoint may be built (security requirement).

6. **Idempotency:** Does Ziina support an idempotency key on payment creation?
   DREXONYX requires idempotent payment handling (DR 0048).

7. **Refund endpoint:** Does one exist? What status transitions does it trigger?

8. **Supported currencies:** AED assumed, but must be confirmed from documentation.

9. **SDK availability:** Is there an official Node.js/TypeScript SDK, or is raw
   HTTP required?

10. **Test mode:** How is Ziina test mode activated? What test card/wallet
    credentials exist?

### 2.3 Code Changes That Would Be Required (Implementation Scope — NOT Authorized)

For planning purposes only — none of the following may be implemented without
an approved DR:

| Component | Change Needed |
|---|---|
| `lib/ziina.ts` | New — Ziina API client (analogous to `lib/stripe.ts`) |
| `lib/portal/create-payment.ts` | Provider routing: Stripe vs. Ziina based on order context |
| `lib/portal/webhook.ts` | New Ziina handler functions |
| `app/api/webhooks/ziina/route.ts` | New HMAC-verified Ziina webhook endpoint |
| `lib/__tests__/` | Full test coverage for all new Ziina handlers |
| Environment variables | `ZIINA_API_KEY`, `ZIINA_WEBHOOK_SECRET` (server-side only) |
| Schema migration | None — existing `financial.payments` columns are provider-agnostic |

---

## 3. Blocked Items — What Must NOT Be Done Without Owner Approval

- **Do NOT add a Ziina API client** — no verified endpoint, authentication, or
  SDK to implement against.
- **Do NOT add a Ziina webhook route** — no verified webhook signature
  mechanism to implement HMAC verification against.
- **Do NOT add Ziina credentials** to any environment file or source control.
- **Do NOT invent Ziina payment flows** from general training knowledge.
- **Do NOT modify DR 0044** — Stripe remains the sole authorized V1 provider
  until Owner explicitly supersedes this with a new/amended DR.
- **Do NOT touch any existing Stripe implementation** — it is complete, tested,
  and correct.

---

## 4. Summary — Genuine Approval Blockers

The following must be resolved in order before any Ziina implementation:

1. **Owner Decision:** Authorize Ziina as an additional/alternative V1 payment
   provider via a new Decision Record (or amendment to DR 0044).
2. **Authoritative Documentation:** Official Ziina API docs must be accessible
   and reviewed to verify: endpoint contracts, webhook event vocabulary, signature
   verification, idempotency, refund model.
3. **Credentials:** Ziina test API key and webhook secret must be available in
   the environment (server-side only) before any integration test can be written.

Until all three are resolved, Ziina integration cannot proceed without
violating CLAUDE.md's prohibition on inventing API capabilities.

---

## 5. No Production Code Changed

**FACT:** This record creates no code changes. It is a specification/evaluation
document only. The existing Stripe integration and all other production code
are unchanged.

**FACT:** All 1301 previously-passing tests continue to pass. The 9 new tests
from DR dcee170 (Production Funding Check) are not affected by this record.

---

## 6. Next Step (Pending Owner Decision)

If the Owner wishes to proceed with Ziina:

1. Provide or enable access to authoritative Ziina API documentation.
2. Provide answers to the Owner Decisions in §2.1.
3. Approve a new Decision Record authorizing Ziina integration with the above
   questions answered.

Implementation begins only after (3) is complete.
