# DR 0106 — Single Production Organization / Client Brand Isolation

**Phase**: 19  
**Status**: APPROVED  
**Date**: 2026-09-10

## Decision

All DREXONYX V1 production entities (Campaigns, Quotes, Orders, Assets, Deliveries,
Approvals, QC Reviews, Production Jobs, Payments, Financial Ledger, Expenses, and
related audit events and idempotency keys) are stored under **DREXONYX's own
organization ID** — the single production workspace.

Each provisioned client **also** receives a CLIENT-role membership in the DREXONYX
production organization (in addition to their own brand isolation org created by
`provisionClient`). Portal authentication resolves the client's session
`organizationId` to the DREXONYX production org, enabling full access to production
records without any admin-query refactoring.

## Rationale

1. **All existing admin services** (`sendQuote`, `createDelivery`, `sendDelivery`,
   `completeOrder`, etc.) scope data by `session.user.organizationId` from the admin's
   JWT — which is the DREXONYX org. Changing them would require touching every
   committed service and breaking committed test contracts.
2. **Portal queries** (`acceptQuote`, `getQuotes`, `getOrders`, etc.) scope by the
   client's session `organizationId`. If client sessions resolve to the DREXONYX org,
   these queries find the admin-created records correctly.
3. **Delivery email recipients** are resolved by querying `org_memberships` for
   CLIENT-role members of the delivery's organization (= DREXONYX org). This requires
   CLIENT-role members to exist in the DREXONYX org.

## Rules

1. DREXONYX's organization is the **single production data organization**.
2. All operational records carry `organization_id = DREXONYX_ORG_ID`.
3. `provisionClient` (DR 0105) creates both:
   - A new brand-isolation org + CLIENT membership for the client's own org
   - A CLIENT membership for the client user in the DREXONYX production org
     (`organization_id = actorOrganizationId`)
4. The portal auth provider preferentially resolves to the DREXONYX production org
   membership when `DREXONYX_ORG_ID` env var is set; falls back to any CLIENT
   membership when not set (development mode).
5. CLIENT role does not change. Clients cannot access admin routes.
6. RBAC boundaries are unchanged.
7. DR 0042 admin multi-org fail-closed rule is unchanged.
8. Financial Island rules (DR 0052 et al.) are unchanged.
9. Brand DNA (`core.brand_dna`) remains org-scoped. In V1, with the production-org
   model, Brand DNA for a client must be stored under the DREXONYX production org.
   Admin sets Brand DNA for the production org; all portal clients see the same record.
   Per-client Brand DNA isolation is a post-V1 enhancement.

## Environment Variable

`DREXONYX_ORG_ID` — the UUID of the DREXONYX production organization.  
- Required in staging and production for correct client portal resolution.  
- Server-side only. Never prefix with `NEXT_PUBLIC_`.  
- Absent in development: portal falls back to any active CLIENT membership (backward
  compat).

## Implementation Points

- `lib/admin/provisioning.ts`: adds second `orgMemberships` insert using
  `actorOrganizationId` as the production org, inside the existing atomic transaction.
  Adds `CLIENT_PRODUCTION_ORG_MEMBERSHIP_CREATED` audit event.
- `auth.ts` portal Credentials provider: fetches all active CLIENT memberships,
  prefers the one matching `DREXONYX_ORG_ID` when set.
- `.env.example`: documents `DREXONYX_ORG_ID`.
- `lib/admin/create-campaign.ts`: new service; OWNER/ADMIN_OPERATIONS; writes to
  DREXONYX org.
- `lib/admin/create-quote.ts`: new service; OWNER/ADMIN_OPERATIONS; writes to DREXONYX
  org; campaign must exist in same org.

## Immutability

This decision record must not be modified after merge. Supersedes the gap identified
in Phase 19 inspection regarding `organization_id` scoping inconsistency between
`sendQuote` (admin org) and `acceptQuote` (client org).
