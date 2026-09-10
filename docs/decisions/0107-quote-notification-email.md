# DR 0107 — Quote Notification Email

**Status:** APPROVED  
**Phase:** 21  
**Date:** 2026-09-10  

## 1. Context

`sendQuote` transitions a quote from DRAFT to SENT (DR 0041). As of Phase 20 no
outbound notification is dispatched when a quote is sent to a client. Clients
have no automated signal that a quote is awaiting their review on the portal.

DR 0099 §3 explicitly limits the existing delivery email module to delivery-only:
"Delivery email is delivery-only." No existing DR authorizes email notification
for the DRAFT→SENT transition. A new record is therefore required before
implementation may proceed.

## 2. Decision

Introduce outbound quote notification email at the DRAFT→SENT transition.

### 2.1 Module

New module `lib/email/quote.ts` exports `sendQuoteNotificationEmail`. It is
purpose-built for this event and does not replace or extend
`lib/email/delivery.ts`.

### 2.2 Provider

Resend (approved in DR 0099). Credentials: `RESEND_API_KEY` and
`RESEND_FROM_ADDRESS` — server-side only, never `NEXT_PUBLIC_`.

### 2.3 Trigger

`sendQuote` dispatches the notification after the atomic DRAFT→SENT transaction
commits successfully and the idempotency key is marked COMPLETED. Email is not
dispatched in the QUOTE_NOT_DRAFT race-recovery path (early return from catch).

### 2.4 Recipient Resolution

Recipients are resolved server-side from
`identity.org_memberships JOIN identity.users`:
active (non-archived) CLIENT-role members of `quote.organization_id`.

No recipient address is accepted from client-controlled input.

### 2.5 Failure Semantics

Email notification is **best-effort**. The quote remains SENT if the email
dispatch throws. No compensating state rollback is performed.

Rationale: the DRAFT→SENT decision is an authoritative business act (DR 0041).
Unwinding it for an infrastructure failure would be commercially incorrect.
Contrast with delivery email (DR 0099 §2.3) where a rollback to PREPARING is
appropriate because the client has not yet received assets — a distinction that
does not apply once a quote decision has been committed.

### 2.6 Audit

A `QUOTE_NOTIFICATION_DISPATCHED` audit event is inserted after a successful
email call. On email failure the best-effort catch block swallows the error; no
audit event is written for failed notifications, consistent with best-effort
semantics.

### 2.7 Idempotency

No additional idempotency key for the notification. The `DRAFT_TO_SENT`
idempotency key guards re-entry: a re-call after COMPLETED returns early from
the fast-path check before reaching the notification path.

### 2.8 Email content

The email includes: quote reference (first 8 chars of quoteId), organization
name, total amount, currency, and a portal link to `/portal/quotes`. No
`estimated_cost`, margin data, or internal cost fields appear in the email.

## 3. Non-Goals

- This record does not introduce a general notification system.
- Quote notification is quote-only; DR 0099 delivery email remains delivery-only.
- No SMS, webhook, or push channel is introduced.
- No notification is sent for ACCEPTED, REJECTED, EXPIRED, or CANCELLED
  status transitions.
- No retry or re-delivery mechanism for failed quote emails is introduced.

## 4. Security

- `RESEND_API_KEY` is validated server-side before Resend instantiation; throws
  if missing.
- Quote `total_amount` and `currency` are included in email content. These are
  not secrets — the recipient is an authorized CLIENT member of the organization.
- No internal cost, margin rate, or `estimated_cost` values appear in the email.
- Recipients are resolved exclusively from `org_memberships` on the server;
  no client-supplied recipient address is used.

## 5. Impact

| File | Change |
|------|--------|
| `lib/email/quote.ts` | New — `sendQuoteNotificationEmail` |
| `lib/admin/send-quote.ts` | Modified — post-transaction notification dispatch |
| `lib/__tests__/quote-email.test.ts` | New — email module unit tests |
| `lib/__tests__/send-quote.test.ts` | New — sendQuote integration tests incl. notification |
