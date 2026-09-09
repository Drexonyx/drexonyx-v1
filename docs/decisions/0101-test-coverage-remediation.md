# Decision Record 0101 — Phase 16: Test Coverage Remediation

- **Decision Round:** Phase 16
- **Phase:** 16 — Client Approval, Delivery, Revision & Test Coverage
- **Status:** APPROVED — Owner approved as part of Phase 16 build. No
  implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-09
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation) + Phase 15 BUILD
- **Scope:** Identifies pre-existing test gaps and defines the required test
  additions for Phase 16 new service functions. Does not authorize architectural
  changes, schema changes, or changes to application behavior.
- **Relationship to prior records:** Does not modify Decision Records 0001–0100.
  All remain authoritative and unchanged.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0100. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context: Current Test Suite State

**FACT (lib/__tests__/, Phase 16 inspection):** The test suite contains 36 test
files covering the following areas (non-exhaustive):

| Area | Test file |
|------|-----------|
| Admin approval lifecycle | `approvals.test.ts` |
| Portal approval decision | `approvals.test.ts` (`decideApproval`) |
| Admin delivery lifecycle | `deliveries.test.ts` |
| Asset URL route | `asset-url-route.test.ts` |
| Asset upload route | `asset-upload-route.test.ts` |
| Portal queries | `portal-queries.test.ts` |
| QC reviews | `qc.test.ts` |
| Revision initiation (admin) | `revision-initiation.test.ts` |
| Production jobs | `production-jobs.test.ts` |
| Skills (authority, registry, route, output, AI adapter) | multiple |
| Agent (driver, webhook, materialization, cost, polling, etc.) | multiple |
| Authorization / roles | `authorization.test.ts`, `roles.test.ts` |
| Webhook (Higgsfield) | `webhook.test.ts` |
| Manual upload | `manual-upload.test.ts`, `manual-upload-asset-creation.test.ts` |
| Object storage | `object-storage.test.ts` |
| Accept quote / create payment | `accept-quote.test.ts`, `create-payment.test.ts` |

**FACT (Phase 16 inspection — pre-existing gaps):** The following items have
no test coverage in Phases 1–15:

1. **Stripe webhook route** (`app/api/webhooks/stripe/route.ts`) — no
   route-level test for Stripe signature verification, payload parsing, or
   handler dispatch.

2. **`ApprovalDecide` client component** (`app/portal/approvals/ApprovalDecide.tsx`)
   — no component test for the APPROVED/REJECTED button interactions or inline
   error display.

**FACT (Phase 16 new deliverables):** The following new service functions and
actions introduced in Phase 16 (DRs 0098–0100) have no tests at the time of
drafting, as they do not yet exist:

3. **`sendDeliveryEmail`** (`lib/email/delivery.ts`, DR 0099 §2.5) — new email
   dispatch function.

4. **Portal delivery download query extension** — extension to
   `lib/portal/queries.ts` to return `delivery_assets` join data for the portal
   deliveries page (DR 0099 §2.2).

5. **`requestRevision`** (`lib/portal/revisions.ts`, DR 0100 §2.4) — new portal
   revision request service function.

6. **`actionRequestRevision`** (`app/portal/revisions/actions.ts`, DR 0100 §2.5)
   — new portal revision request server action (unit-tested via service mock).

---

## 2. Decision: Required Test Additions

### 2.1 Stripe Webhook Route Test

**PROPOSED:** A new test file `lib/__tests__/stripe-webhook.test.ts` must be
created covering the Stripe webhook route (`app/api/webhooks/stripe/route.ts`).

Required test cases:

1. **Signature verification — valid signature:** A request with a valid Stripe
   signature header is accepted and the handler dispatches to the correct event
   handler.
2. **Signature verification — missing signature:** A request with no
   `Stripe-Signature` header returns HTTP 400 (or 401).
3. **Signature verification — invalid signature:** A request with a malformed or
   incorrect `Stripe-Signature` header returns HTTP 400 (or 401); the handler
   body is not executed.
4. **Unhandled event type:** A valid signed request with an unhandled event type
   returns HTTP 200 (acknowledged without action).
5. **Handled event type — success:** A valid signed request with a handled event
   type invokes the correct handler and returns HTTP 200.

The test must mock Stripe SDK signature verification (`stripe.webhooks.constructEvent`
or equivalent) to avoid requiring a real Stripe secret. The Stripe secret key
is a server-side environment variable only; it must not appear in test code.

### 2.2 ApprovalDecide Component Test

**PROPOSED:** A new test file `app/portal/approvals/ApprovalDecide.test.tsx`
(or placed in `lib/__tests__/approval-decide.test.ts` following the project's
test location convention) must be created covering `ApprovalDecide`.

Required test cases:

1. **Approve button — success:** Clicking "Approve" calls `actionDecideApproval`
   with `('approvalId', 'APPROVED')` and does not show an error.
2. **Reject button — success:** Clicking "Reject" calls `actionDecideApproval`
   with `('approvalId', 'REJECTED')` and does not show an error.
3. **Failure — error displayed:** When `actionDecideApproval` returns
   `{ ok: false, reason: 'not_pending' }`, the inline error text is rendered.
4. **Pending state — buttons disabled:** During the transition, both buttons
   are disabled.

The test mocks `actionDecideApproval` as a server action mock. No real DB or
session interaction is required.

### 2.3 sendDeliveryEmail Tests

**PROPOSED:** A new test file `lib/__tests__/delivery-email.test.ts` must be
created covering `sendDeliveryEmail` (`lib/email/delivery.ts`, DR 0099 §2.5).

Required test cases:

1. **Success:** When the email provider SDK returns success, `sendDeliveryEmail`
   resolves without throwing.
2. **Provider error — throws:** When the email provider SDK throws or returns
   an error response, `sendDeliveryEmail` throws, allowing the caller
   (`sendDelivery`) to compensate.
3. **Payload shape:** The email is sent `to` the specified address with at least
   one asset link containing `assetId`, `url`, and `expiresAt`.
4. **No URL persistence:** The function does not write to any database table
   (mock DB is not called during email dispatch).

The test must mock the email provider SDK. Real provider credentials must not
appear in test code.

### 2.4 sendDelivery Email Integration Tests

**PROPOSED:** `lib/__tests__/deliveries.test.ts` must be extended with test
cases covering the `sendDelivery` function's new email dispatch behavior
(DR 0099 §2.3).

Required additional test cases:

1. **sendDelivery — success with email dispatch:** After CAS update to SENDING,
   `sendDeliveryEmail` is called; audit event `DELIVERY_SENT` written with
   `emailDispatched: true`.
2. **sendDelivery — email dispatch failure — status compensated:** When
   `sendDeliveryEmail` throws, the Delivery status is reverted to `PREPARING`
   and `sendDelivery` returns `ok: false, reason: 'email_dispatch_failed'`.
3. **sendDelivery — idempotency — email not re-sent:** When the idempotency key
   is already consumed, `sendDeliveryEmail` is not called a second time.

### 2.5 requestRevision Tests

**PROPOSED:** A new test file `lib/__tests__/portal-revision-request.test.ts`
must be created covering `requestRevision` (`lib/portal/revisions.ts`,
DR 0100 §2.4).

Required test cases:

1. **Success:** Asset is `REVISION_REQUIRED`, org matches, idempotency key
   not yet consumed → audit event `REVISION_REQUESTED` written, returns `ok: true`.
2. **Not found:** Asset query returns no row → returns
   `ok: false, reason: 'not_found'`.
3. **Wrong status:** Asset has `status = 'READY_FOR_QC'` → returns
   `ok: false, reason: 'not_revision_required'`.
4. **Idempotent:** Idempotency key already consumed → returns `ok: true`
   without writing a second audit event.
5. **Tenant isolation:** Query includes `organization_id = actorOrgId`; an
   asset from a different organization is not returned.

### 2.6 Portal Delivery Download Query Tests

**PROPOSED:** `lib/__tests__/portal-queries.test.ts` must be extended to cover
the new delivery + asset join query introduced in DR 0099 §2.2.

Required additional test cases:

1. **Returns asset IDs for COMPLETED delivery:** The extended `getDeliveries`
   query (or new `getDeliveryAssets`) returns the associated `asset_id` values
   for a delivery.
2. **Tenant isolation:** Only assets matching the session `organizationId` are
   returned.

---

## 3. Test Location Convention

**FACT (lib/__tests__/, Phase 16 inspection):** All service-layer unit tests
are located in `lib/__tests__/`. Component tests for server actions may also
be placed in this directory using mock-based approaches (no DOM testing library
is required for server action tests). React component tests (requiring DOM) may
be placed in `app/portal/approvals/` adjacent to the component.

**PROPOSED:** Phase 16 test files follow the existing project convention:
service tests in `lib/__tests__/`, using Vitest and `vi.mock`/`vi.hoisted`
patterns consistent with the existing suite.

---

## 4. Non-Goals

- This record does not authorize end-to-end (E2E) or browser tests.
- This record does not require 100% line coverage for any file; it defines
  the minimum set of behavioral cases required.
- This record does not modify any existing test file's test cases, only extends
  `deliveries.test.ts` and `portal-queries.test.ts`.
- This record does not authorize test infrastructure changes (test runner
  configuration, CI configuration).

---

## 5. Priority Order

**PROPOSED:** Test additions are implemented in this order during Phase 16 BUILD:

1. `requestRevision` tests (§2.5) — covers new DR 0100 service.
2. `sendDeliveryEmail` tests (§2.3) — covers new DR 0099 service.
3. `sendDelivery` email integration tests (§2.4) — extends existing test file.
4. Portal delivery download query tests (§2.6) — extends existing test file.
5. Stripe webhook route test (§2.1) — covers pre-existing gap.
6. `ApprovalDecide` component test (§2.2) — covers pre-existing gap.

---

## 6. Explicitly Prohibited Assumptions

- Do not assume the Stripe webhook route has existing test coverage — it does not
  (§1, pre-existing gap).
- Do not assume any Phase 16 new service functions are pre-tested — they do not
  exist at DR drafting time (§1).
- Do not assume E2E or browser tests are authorized — they are not (§4).
- Do not assume test additions authorize schema or application behavior changes —
  they do not.
- Do not assume this record modifies Decision Records 0001–0100 — it does not.
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.

---

## 7. Owner Approval

Owner approved as part of Phase 16 build authorization.

**No BUILD is authorized by approval of this record alone.**
Phase 16 BUILD authorization is a separate, explicit instruction.
