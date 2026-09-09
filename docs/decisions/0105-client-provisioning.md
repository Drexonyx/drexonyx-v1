# Decision Record 0105 — Phase 18: Client Provisioning

- **Decision Round:** Phase 18
- **Phase:** 18 — Production Hardening (Minimum Viable Ops)
- **Status:** PROPOSED — Awaiting Owner approval. No schema, migration,
  application-code change, or dependency is authorized by this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-09
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Head commit `a866ee9` (Phase 16 complete)
- **Resolves:** Phase 17 finding H-2 — No organization/user/membership
  provisioning flow exists. Every new client engagement requires direct
  database access (INSERT into `core.organizations`, `identity.users`, and
  `identity.org_memberships`). This is unsustainable beyond a single manually-
  seeded client and blocks operator independence.
- **Relationship to prior records:** Does not modify Decision Records 0001–0104.
  All remain authoritative and unchanged. Directly builds on DR 0039 (user
  authentication, `password_hash` column, bcrypt, JWT session model),
  DR 0002 (tenant isolation and audit event patterns), DR 0001 (financial
  architecture — this record makes no financial changes). References
  `db/schema/identity.ts` (users, org_memberships), `db/schema/core.ts`
  (organizations). Does not modify any existing schema.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0104. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or verified source code.

---

## 1. Context

### 1.1 Current State

**FACT (Phase 17 inspection, `db/schema/core.ts`):** The `core.organizations`
table exists with columns: `id` (UUIDv7 PK), `name` (text NOT NULL),
`slug` (text NOT NULL, UNIQUE), `archived_at`, `created_at`, `updated_at`.
No service function creates organizations through the application.

**FACT (Phase 17 inspection, `db/schema/identity.ts`):** The `identity.users`
table exists with columns: `id` (UUIDv7 PK), `email` (text NOT NULL, UNIQUE),
`display_name` (text NOT NULL), `password_hash` (text NULL per DR 0039),
`archived_at`, `created_at`, `updated_at`. No provisioning service function
creates users through the application.

**FACT (Phase 17 inspection, `db/schema/identity.ts`):** The
`identity.org_memberships` table exists with columns: `id` (UUIDv7 PK),
`organization_id`, `user_id`, `role` (CHECK: `OWNER`, `ADMIN_OPERATIONS`,
`CREATIVE_PRODUCTION`, `QC`, `CLIENT`, `AGENT`), `archived_at`,
`created_at`, `updated_at`. A UNIQUE constraint exists on
`(organization_id, user_id)`. No provisioning service creates memberships.

**FACT (DR 0039 §3.6 and §7 item 7):** "CLIENT-role users do not self-register
in Phase 05. A self-registration flow is not in Phase 05 scope." Owner
explicitly approved: "Self-registration is OUT OF SCOPE for Phase 05."

**FACT (DR 0039 §3.1):** Authentication uses email/password via NextAuth v5
Credentials provider. bcryptjs hashes passwords. Users with `password_hash
IS NULL` cannot authenticate.

**FACT (`auth.ts`, verified):** The portal Credentials provider queries
`identity.users` and `identity.org_memberships` WHERE `role = 'CLIENT'`.
An archived user (`archived_at IS NOT NULL`) or a user with no active CLIENT
membership cannot log into the portal.

### 1.2 Problem

Onboarding a new client currently requires:
1. Direct `INSERT` into `core.organizations`
2. Direct `INSERT` into `identity.users` with a bcrypt-hashed password
3. Direct `INSERT` into `identity.org_memberships` with `role = 'CLIENT'`

This is a database-level operation requiring developer/DBA access. It cannot
be performed by an OWNER or ADMIN_OPERATIONS role user through the application.
This blocks operational independence for any new client beyond the initial seed.

---

## 2. Decision

**What is being decided:**

1. Who may provision a new client (organization + user + membership).
2. The provisioning workflow and atomicity requirements.
3. Password handling during provisioning.
4. Duplicate organization, user, and membership handling.
5. Tenant isolation during provisioning.
6. Audit events.
7. Admin UI surface.
8. What is NOT included (scope boundary).

---

## 3. Proposed Decisions

### 3.1 Actor Authority

**PROPOSED:** Client provisioning may only be performed by users with role
`OWNER`.

**Rationale:** Creating an organization is a commercial decision with financial
and system-wide implications. `ADMIN_OPERATIONS` manages within an existing
organization's scope; creating a new organization — which may incur platform
costs, implies a business relationship, and affects the organization's
billing scope — is an Owner-level action.

**REQUIRES OWNER DECISION:** Owner must confirm whether `ADMIN_OPERATIONS`
should also be authorized to create new organizations and provision new
clients. This record proposes `OWNER` only for Phase 18.

### 3.2 Provisioning Scope

**PROPOSED:** A single provisioning operation atomically creates:
1. One `core.organizations` record (the client organization).
2. One `identity.users` record (the initial CLIENT user for that organization).
3. One `identity.org_memberships` record linking the user to the organization
   with `role = 'CLIENT'`.

The organization, user, and membership are created in a single database
transaction. If any step fails, the entire transaction is rolled back.

**PROPOSED:** This is the minimum viable provisioning unit. Multiple users
per organization and multiple organizations per user are valid per the schema
(the UNIQUE constraint is on `(organization_id, user_id)`, not `organization_id`
alone). Adding additional users to an existing organization is DEFERRED.

### 3.3 Input Parameters

**PROPOSED:** The provisioning service (`provisionClient`) accepts:

| Parameter | Type | Validation |
|---|---|---|
| `organizationName` | string | Required, 1–255 characters |
| `organizationSlug` | string | Required, 1–100 characters, lowercase alphanumeric + hyphens only, globally UNIQUE |
| `userEmail` | string | Required, valid email format, globally UNIQUE in `identity.users` |
| `userDisplayName` | string | Required, 1–255 characters |
| `temporaryPassword` | string | Required, minimum 12 characters |
| `actorId` | string | From server-side OWNER JWT session |
| `actorOrganizationId` | string | From server-side OWNER JWT session |

**PROPOSED:** `organizationSlug` is validated by the service against the
pattern `^[a-z0-9-]+$`. Slug uniqueness is enforced by the existing UNIQUE
constraint on `core.organizations.slug`.

**PROPOSED:** `actorId` and `actorOrganizationId` are sourced from the
admin JWT session exclusively. They are not caller-supplied through any
client-accessible path.

### 3.4 Password Handling

**PROPOSED (consistent with DR 0039):** The `temporaryPassword` parameter is:
1. Validated server-side (minimum 12 characters) before hashing.
2. Hashed with bcryptjs at cost factor 12 (per DR 0039 §6).
3. Stored as `password_hash` in `identity.users`.
4. Never logged, returned in any response, or written to the audit event.
5. Never stored in plaintext anywhere in the application.

**PROPOSED:** The provisioning service does not send the temporary password
by email and does not generate a password reset token in Phase 18. The
OWNER communicates the temporary password to the new client through an
out-of-band channel (e.g., direct communication). Password reset is DEFERRED
per DR 0039 §3.4.

**PROPOSED:** The admin UI form that collects the temporary password must:
- Use `<input type="password">` to prevent browser autofill from capturing
  the field as a URL or username.
- Not display the entered password value after form submission.
- Transmit the password exclusively via a server action (`'use server'`);
  the plain password must never appear in a client-side state value, URL,
  or log.

**REQUIRES OWNER DECISION:** Owner must decide whether the admin UI should
generate a random temporary password on behalf of the OWNER (server-side
generation, displayed once in the UI) rather than accepting a caller-supplied
password. This record proposes caller-supplied for simplicity. Either approach
is safe if the above constraints are respected.

### 3.5 Duplicate Handling

**PROPOSED:**

- **Duplicate organization slug:** The service catches a UNIQUE constraint
  violation on `core.organizations.slug` and returns
  `{ok: false, reason: 'SLUG_TAKEN'}`.
- **Duplicate user email:** The service catches a UNIQUE constraint violation
  on `identity.users.email` and returns `{ok: false, reason: 'EMAIL_TAKEN'}`.
- **Duplicate membership:** The UNIQUE constraint on
  `(organization_id, user_id)` in `identity.org_memberships` prevents
  duplicate memberships. Since the user and organization are created in the
  same transaction, this constraint is unlikely to trigger in normal operation;
  the service must handle it defensively and return
  `{ok: false, reason: 'MEMBERSHIP_EXISTS'}`.

**PROPOSED:** The service does not silently update an existing user's
password or organization. All duplicates are hard errors. The OWNER is
expected to investigate before retrying.

### 3.6 Idempotency

**PROPOSED:** `provisionClient` is NOT idempotent via the `system.idempotency_keys`
table. Client provisioning is a rare, deliberate operation — not a high-
frequency or retry-prone event. Duplicate attempts are caught by the UNIQUE
constraints described in §3.5. Adding idempotency key infrastructure would
add complexity without corresponding benefit.

**REQUIRES OWNER DECISION:** Owner may request idempotency key support if
the deployment context involves automated provisioning scripts that may retry
on transient failures. This record proposes no idempotency table entry for
Phase 18.

### 3.7 Audit Events

**PROPOSED:** On successful provisioning, two audit events are written within
the same transaction:

**Event 1 — Organization created:**
```
entity_type:    'organization'
entity_id:      <new organizationId>
organization_id: <new organizationId>
actor_id:       <actorId>
actor_role:     'OWNER'
action:         'ORGANIZATION_PROVISIONED'
payload:
  organization_id:   <id>
  organization_name: <name>
  organization_slug: <slug>
  actor_organization_id: <actorOrganizationId>
```

**Event 2 — Client user provisioned:**
```
entity_type:    'user'
entity_id:      <new userId>
organization_id: <new organizationId>
actor_id:       <actorId>
actor_role:     'OWNER'
action:         'CLIENT_USER_PROVISIONED'
payload:
  user_id:        <id>
  user_email:     <email>
  membership_id:  <membershipId>
  role:           'CLIENT'
  actor_organization_id: <actorOrganizationId>
```

**PROPOSED:** `password_hash` is never included in the audit event payload.
`temporaryPassword` is never included in the audit event payload.

### 3.8 Tenant Isolation

**PROPOSED:**

1. The provisioning operation creates a new organization tenant. It does not
   grant the new organization any access to the OWNER's organization's data.
2. The new organization's `organization_id` is a fresh UUIDv7 generated
   server-side. It is not supplied by the caller.
3. The `actorId` and `actorOrganizationId` from the OWNER's JWT session are
   recorded in the audit event for accountability but do not create any
   data-level linkage between the OWNER's organization and the new organization.
4. After provisioning, the new CLIENT user can only see data scoped to their
   own `organization_id` in the portal, per the existing tenant isolation
   architecture.

### 3.9 Admin UI Surface

**PROPOSED:** A new page or modal at `/admin/clients/new` (or equivalent)
accessible only to OWNER-role sessions. The form collects:
- Organization name
- Organization slug (with format hint and uniqueness note)
- Client user email
- Client user display name
- Temporary password (type="password")

The exact URL and layout are DEFERRED to the Phase 18 BUILD step.

**PROPOSED:** On success, the UI displays:
- The new organization ID (for reference)
- Confirmation that the client user has been created

**PROPOSED:** On failure (SLUG_TAKEN, EMAIL_TAKEN, validation error), the
UI displays a clear error message with the specific conflict. No partial state
is left in the database (the transaction rolled back).

### 3.10 What Is NOT Included in This Record

**EXPLICITLY OUT OF SCOPE for Phase 18:**

- Self-registration by CLIENT users — prohibited per DR 0039 §7 item 7.
- Public signup — not approved at any phase.
- Invitation-by-email flow — DEFERRED (requires email integration beyond
  delivery email; password reset is DEFERRED per DR 0039 §3.4).
- Adding additional users to an existing organization — DEFERRED.
- Provisioning non-CLIENT memberships (OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION,
  QC, AGENT) via this flow — DEFERRED; those are internal staff roles.
- Organization archival via the admin UI — DEFERRED.
- User archival / membership revocation via the admin UI — DEFERRED.
- Pricing config creation for the new organization — DEFERRED; a separate admin
  operation is expected.
- Brand DNA creation for the new organization — DEFERRED; populated separately.
- Any modification to the financial architecture — this record creates no
  financial records and does not modify `financial.*` tables.
- Any modification to existing DR 0039 authentication behavior — the portal
  Credentials provider is unchanged.

---

## 4. Dependency on Existing Schema

**FACT:** No schema changes are required by this record. All three tables
(`core.organizations`, `identity.users`, `identity.org_memberships`) already
exist with the correct columns and constraints. The `password_hash` column
was added in Phase 05 per DR 0039 and is already present.

**FACT:** The only new code required is:
1. `lib/admin/provisioning.ts` — the `provisionClient` service function.
2. `app/admin/clients/` — the admin action and UI page.

No migration, no schema change, no new dependency is required.

---

## 5. Deferred Items

1. Adding additional users to an existing organization — DEFERRED.
2. Email-based invitation flow — DEFERRED.
3. Password reset for CLIENT users — DEFERRED per DR 0039.
4. Organization archival via admin UI — DEFERRED.
5. User archival / membership revocation via admin UI — DEFERRED.
6. Pricing config and Brand DNA creation as part of provisioning — DEFERRED.
7. Admin URL and exact page layout — DEFERRED to BUILD.
8. Server-generated temporary password option — DEFERRED pending Owner decision.
9. Idempotency key support for retry scenarios — DEFERRED pending Owner decision.
10. Non-CLIENT membership provisioning (staff roles) — DEFERRED.

---

## 6. Explicitly Prohibited Assumptions

- Do not assume self-registration is available to CLIENT users at any point.
- Do not assume the provisioning flow sends the temporary password by email.
  Password reset is DEFERRED per DR 0039.
- Do not assume `password_hash` or `temporaryPassword` may appear in any
  audit event payload, API response, log, or client-side state.
- Do not assume `ADMIN_OPERATIONS` role is authorized to provision new
  organizations until Owner explicitly confirms.
- Do not assume this record authorizes schema changes, migrations, new
  dependencies, or `.env.example` modifications.
- Do not assume Decision Records 0001–0104 are altered by this record.
- Do not assume any financial record, pricing config, or Brand DNA record
  is created by `provisionClient`.
- Do not assume the new organization has any access to the OWNER's
  organization's data after provisioning.
