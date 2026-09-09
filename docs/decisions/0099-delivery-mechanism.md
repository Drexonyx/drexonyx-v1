# Decision Record 0099 — Phase 16: Delivery Mechanism

- **Decision Round:** Phase 16
- **Phase:** 16 — Client Approval, Delivery, Revision & Test Coverage
- **Status:** APPROVED — Owner approved as part of Phase 16 build. No schema,
  migration, or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-09
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation) + Phase 15 BUILD
- **Implements:** PORTAL DOWNLOAD + TRANSACTIONAL EMAIL, as explicitly approved
  by Owner. The portal remains the primary client-facing delivery surface. Email
  is a transactional notification and secure access mechanism. DREXONYX remains
  the source of truth. Secure signed URLs only. Provider/CDN canonical URLs are
  never exposed.
- **Relationship to prior records:** Does not modify Decision Records 0001–0098.
  All remain authoritative and unchanged. Depends on DR 0011 (Delivery state
  machine), DR 0034 Phase 08 (Delivery creation gate), DR 0035 Phase 08
  (Delivery actor authority), DR 0037 Phase 08 (Delivery completion criteria),
  DR 0086 (signed URL generation, 3600s TTL).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0098. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (lib/admin/deliveries.ts, Phase 16 inspection):** The admin delivery
lifecycle is fully implemented: `createDelivery`, `sendDelivery`,
`completeDelivery`, `failDelivery`, `cancelDelivery`. The `sendDelivery`
function transitions a Delivery from `PREPARING` to `SENDING`. The
`completeDelivery` function transitions from `SENDING` to `COMPLETED`. No email
dispatch is triggered by any of these functions in Phases 1–15.

**FACT (app/portal/deliveries/page.tsx, Phase 16 inspection):** The portal
deliveries page exists. It displays delivery status (`PREPARING`, `SENDING`,
`COMPLETED`, `FAILED`, `CANCELLED`) but provides no mechanism for the client to
download or access delivered asset content. No "View Asset" or "Download" link
is present.

**FACT (Phase 16 inspection):** No email infrastructure (provider, service
module, environment configuration) exists in the codebase in Phases 1–15. No
`sendEmail`, `emailDelivery`, or equivalent function is defined in any lib file.

**FACT (DR 0086 §2.1–§2.4):** `GET /api/assets/[assetId]/url` generates a
presigned R2 URL with a 3600-second TTL. Signed URLs are never persisted
(DR 0086 §2.8). Each request generates a fresh URL.

**FACT (DR 0037 Phase 08 §2):** A Delivery references one or more Assets via
the `production.delivery_assets` join table. `completeDelivery` enforces that
at least one `delivery_assets` row exists before transitioning to `COMPLETED`.

**FACT (DR 0086 §2.5):** R2 credentials are server-side environment variables
only. They are never surfaced to clients or embedded in client-accessible
configuration.

**OWNER DECISION (explicit, 2026-09-09):** The approved delivery mechanism for
Phase 16 is PORTAL DOWNLOAD + TRANSACTIONAL EMAIL. The portal is the primary
delivery surface. Email is a transactional notification and secure access
mechanism. DREXONYX is the source of truth. Signed URLs only.
Provider/CDN canonical URLs are never exposed. No general notification or
email-marketing system.

---

## 2. Decision

### 2.1 Approved Delivery Mechanism

**APPROVED:** Phase 16 delivery implements two complementary surfaces:

1. **Portal Download** — The primary client-facing delivery surface. The portal
   deliveries page is enhanced to allow the client to access asset content
   directly from their authenticated portal session via signed URLs.

2. **Transactional Email** — A notification and secure access mechanism.
   When a delivery transitions to `SENDING`, a transactional email is dispatched
   to the client organization's contact email address containing per-asset signed
   URL download links. The email is sent once per delivery, at the
   `PREPARING → SENDING` transition. It is not re-sent on subsequent events.

### 2.2 Portal Download: Deliveries Page Enhancement

**PROPOSED:** The portal deliveries page (`app/portal/deliveries/page.tsx`)
must be updated to:

1. For deliveries with `status = 'COMPLETED'` (or `'SENDING'`), fetch the list
   of associated asset IDs from the `delivery_assets` join table.
2. For each asset, provide a "Download" link that triggers a call to
   `GET /api/assets/[assetId]/url`, returning a signed URL.
3. The signed URL is opened in a new tab or triggers a browser download.
4. The URL is not cached beyond its `expiresAt`.

**PROPOSED:** The portal deliveries page query (`lib/portal/queries.ts`) must
be extended to return the associated asset IDs for each delivery, via a join
on `production.delivery_assets`.

### 2.3 Transactional Email: Dispatch Point

**PROPOSED:** Transactional email is dispatched at the `PREPARING → SENDING`
transition within `sendDelivery` (`lib/admin/deliveries.ts`), after the CAS
update succeeds and before writing the `DELIVERY_SENT` audit event.

The dispatch sequence within `sendDelivery`:

1. CAS: `UPDATE deliveries SET status = 'SENDING' WHERE id = :id AND status = 'PREPARING'`.
   If zero rows returned: throw `CONCURRENT_MODIFICATION`.
2. Fetch delivery assets: query `delivery_assets` for this delivery's `asset_id`
   values.
3. For each asset: call `generateSignedUrl(asset.file_key, DELIVERY_EMAIL_URL_EXPIRY_SECONDS)`
   to obtain a signed URL.
4. Call `sendDeliveryEmail({ to: organizationEmail, deliveryId, assetLinks })`.
5. Write `DELIVERY_SENT` audit event.

If `sendDeliveryEmail` throws, `sendDelivery` returns `ok: false` with
`reason: 'email_dispatch_failed'`. The Delivery status is rolled back to
`PREPARING` via a compensating UPDATE. The idempotency key for `sendDelivery`
is not consumed on email dispatch failure.

### 2.4 Email URL Expiry: DELIVERY_EMAIL_URL_EXPIRY_SECONDS

**PROPOSED:** Signed URLs embedded in transactional delivery emails use a longer
TTL than the standard 3600-second interactive TTL (DR 0086 §2.4). The default
value is:

```
DELIVERY_EMAIL_URL_EXPIRY_SECONDS = 604800  (7 days)
```

This constant is defined in `lib/admin/deliveries.ts` alongside the existing
delivery service logic. Callers must not cache the URL beyond its `expiresAt`.

**REQUIRES OWNER DECISION:** The 7-day default is proposed based on typical
client review timelines. The Owner must confirm or override this value before
Phase 16 BUILD proceeds. Approved value: ______.

### 2.5 Email Provider and sendDeliveryEmail

**PROPOSED:** `sendDeliveryEmail` is implemented in `lib/email/delivery.ts`.
It is a server-side-only module. The function signature:

```typescript
export async function sendDeliveryEmail(params: {
  to: string;
  deliveryId: string;
  assetLinks: Array<{ assetId: string; url: string; expiresAt: string }>;
}): Promise<void>
```

The function throws on failure; the caller (`sendDelivery`) handles the error
and compensates.

**REQUIRES OWNER DECISION:** The email provider (e.g., Resend, SendGrid,
AWS SES, Postmark) must be selected before Phase 16 BUILD proceeds. The
selection determines: the provider SDK installed, the environment variable names
for the API key, and the sending domain configuration. Provider credentials are
server-side environment variables only; they are never surfaced in any
`NEXT_PUBLIC_` variable or client response.

Proposed provider for Phase 16: **Resend** — rationale: TypeScript-native SDK,
simple API, minimal configuration, strong deliverability. Owner confirmation
required.

Approved provider: ______.

### 2.6 Organization Email Address for Delivery

**PROPOSED:** The recipient email address for the transactional delivery email
is the organization's contact email. This value must be resolved server-side
from the organization record in `core.organizations` (or equivalent), not from
any client-supplied input.

**REQUIRES OWNER DECISION:** The `organizations` schema must contain a contact
email column, or a mechanism must exist to resolve it. Phase 16 BUILD must
confirm that `core.organizations` includes a suitable `email` or
`contact_email` column, or this column must be added via migration before BUILD
proceeds.

### 2.7 Email Content

**PROPOSED:** The transactional delivery email contains:

- Organization name (from server-side organization record).
- Delivery ID (short reference).
- A list of per-asset download links: one signed URL per asset in the delivery,
  each labeled with the asset name (from `assets.name` if set, otherwise the
  asset ID).
- `expiresAt` for each link, displayed in human-readable format.
- A link to the DREXONYX client portal deliveries page.

The email does not contain: R2 credentials, R2 bucket names, provider-internal
URLs, Higgsfield CDN URLs, or any URL that bypasses the signed URL mechanism.

### 2.8 No Persistent URL Storage

**APPROVED (DR 0086 §2.8):** Signed URLs embedded in email are generated
on-demand at dispatch time and are never stored in the database. Each call to
`sendDelivery` generates fresh URLs. The URLs are not logged or written to any
storage layer.

### 2.9 Delivery State Machine Unchanged

**APPROVED (existing behavior, DR 0011):** The delivery state machine is
unchanged. PREPARING → SENDING → COMPLETED | FAILED | CANCELLED. No new states
are introduced. The email dispatch is an internal side effect of the
PREPARING → SENDING transition.

### 2.10 No General Notification System

**APPROVED (Owner decision):** This record does not introduce a general
notification system, email marketing system, or subscription management layer.
`sendDeliveryEmail` is purpose-built for delivery notification only and is not
a general-purpose email service. No unsubscribe management, bounce handling, or
mailing list infrastructure is introduced.

### 2.11 Tenant Isolation

**PROPOSED:** All queries in §2.2 and §2.3 must include
`organization_id = :organizationId` where `:organizationId` comes from the
server-side JWT session (portal) or the authenticated admin actor (admin).
No `organization_id` from client request input is used.

### 2.12 MANAGE_ROLES for Delivery Operations

**APPROVED (existing behavior, DR 0035 Phase 08):** Delivery creation and
status transitions require the actor's role to be in `MANAGE_ROLES`:
`['OWNER', 'ADMIN_OPERATIONS']`. This constraint is unchanged.

---

## 3. Non-Goals

- This record does not introduce email notifications for QC reviews, approvals,
  or revision initiation. Delivery email is delivery-only.
- This record does not introduce a client-facing upload path.
- This record does not modify the admin delivery lifecycle beyond the addition
  of `sendDeliveryEmail` within `sendDelivery`.
- This record does not authorize a CDN public URL to be included in any email
  or portal surface.

---

## 4. Audit Requirements

**PROPOSED:** No new audit action names are introduced by this record. The
existing `DELIVERY_SENT` audit event covers the sending transition. The payload
of `DELIVERY_SENT` must include `emailDispatched: true` to confirm that the
email was sent successfully alongside the status transition.

---

## 5. Failure and Idempotency

**PROPOSED:** If `sendDeliveryEmail` fails:
- The Delivery status is reverted to `PREPARING` via a compensating UPDATE.
- The idempotency key for `sendDelivery` is not consumed (the operation is
  retryable by the admin).
- `sendDelivery` returns `ok: false, reason: 'email_dispatch_failed'`.

**PROPOSED:** If the Delivery is already in `SENDING` when `sendDelivery` is
called (idempotency key already consumed), the function returns
`ok: true` without re-sending the email. Duplicate emails are not sent for a
single delivery.

---

## 6. Dependencies

- DR 0086 (signed URL generation, R2 credentials boundary).
- DR 0034 Phase 08 (Delivery creation gate: Order ACTIVE + ≥1 Approval + all APPROVED).
- DR 0037 Phase 08 (delivery_assets join table).
- Unresolved: email provider selection (§2.5).
- Unresolved: organization email column confirmation (§2.6).
- Unresolved: DELIVERY_EMAIL_URL_EXPIRY_SECONDS Owner confirmation (§2.4).

---

## 7. Explicitly Prohibited Assumptions

- Do not assume Higgsfield CDN URLs or provider-internal URLs may be included
  in email or portal download links — prohibited (§2.1, DR 0086 §2.3).
- Do not assume R2 credentials may be surfaced in any email, client response,
  or `NEXT_PUBLIC_` variable — prohibited (DR 0086 §2.5).
- Do not assume signed URLs may be persisted to the database or cache —
  prohibited (§2.8, DR 0086 §2.8).
- Do not assume a general notification or email-marketing system is authorized
  — prohibited (§2.10).
- Do not assume `organizationId` or the recipient email address may come from
  client input — server-side only (§2.11).
- Do not assume the email provider is selected — REQUIRES OWNER DECISION (§2.5).
- Do not assume BUILD may proceed without Owner confirmation of §2.4, §2.5,
  and §2.6.
- Do not assume this record modifies Decision Records 0001–0098 — it does not.
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.

---

## 8. Owner Approval

Owner approved as part of Phase 16 build authorization.

**No BUILD is authorized by approval of this record alone.**
Phase 16 BUILD authorization is a separate, explicit instruction.

**Three Owner decisions must be confirmed before Phase 16 BUILD proceeds:**
1. `DELIVERY_EMAIL_URL_EXPIRY_SECONDS` — proposed 604800 (7 days). Approved value: ______.
2. Email provider — proposed Resend. Approved provider: ______.
3. Organization contact email column — confirm `core.organizations` has a
   suitable email field, or authorize the migration to add one.
