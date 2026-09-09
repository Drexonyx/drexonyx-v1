# Decision Record 0042 — Phase 06 Admin Authentication Strategy

- **Decision Round:** 06A
- **Phase:** 06 — Admin Command Center
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214` + uncommitted Phase 05 work
- **Resolves:** Phase 06 BLOCKER 1 (admin authentication strategy undefined)
- **Relationship to prior records:** Does not modify Decision Records 0001–0041.
  All prior records remain authoritative and unchanged. This record supplements
  Decision Record 0039 (Phase 05 Authentication) with admin-surface decisions.
  Decision Record 0039 remains the sole authority for portal authentication;
  this record extends it.

---

## Scope

This record resolves the admin authentication strategy for Phase 06: how
internal staff (OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION, QC) authenticate
to the `/admin/*` surface, how the proxy protects both surfaces, and what the
implementation must preserve from the existing portal authentication (DR 0039,
`auth.ts`).

Nothing in this record authorizes implementing admin screens, admin API routes,
admin business logic, admin UI components, or any Phase 06 feature beyond the
authentication layer itself. No source code is changed, no schema is changed,
no migration is created, no dependency is installed, and nothing is committed or
pushed as a result of this record.

---

## Context — Existing Authentication State (DR 0039, verified in auth.ts)

The following facts are VERIFIED against the repository at the state named
above. They are constraints that this decision must preserve.

**FACT 1 — Single NextAuth instance.** One `auth.ts` file at the repository
root exports `{ handlers, auth, signIn, signOut }`. There is no second NextAuth
instance anywhere in the codebase.

**FACT 2 — CLIENT-only Credentials provider.** The single Credentials provider
in `auth.ts` enforces a CLIENT-only gate: the `authorize` callback returns
`null` for any user who does not have an active (non-archived) `CLIENT`
membership in `identity.org_memberships`.

**FACT 3 — JWT session strategy.** `session: { strategy: 'jwt' }` is set.
All session data is stored in a signed JWT. No database sessions table exists
or is planned.

**FACT 4 — JWT payload shape.** The JWT contains exactly: `userId`,
`organizationId`, `role`. Written via bracket notation in the `jwt` callback
(`token['userId']`, `token['organizationId']`, `token['role']`). The session
callback maps these to `session.user.userId`, `session.user.organizationId`,
`session.user.role`.

**FACT 5 — Proxy matcher scope.** `proxy.ts` currently matches only
`/portal/:path*`. The `/admin/:path*` surface is unprotected in the proxy.

**FACT 6 — Portal sign-in page.** `pages: { signIn: '/portal/login' }` is set.
The `authorized` callback explicitly allows `/portal/login` as a public path and
requires a valid session for all other `/portal/*` paths.

**FACT 7 — password_hash server-side only.** `password_hash` is fetched only
inside the `authorize` callback; it is never returned to the client and never
appears in session data or query results visible to the client.

**FACT 8 — AUTH_SECRET server-side only.** AUTH_SECRET is an environment
variable used by NextAuth internally for JWT signing. It must never carry the
`NEXT_PUBLIC_` prefix.

**FACT 9 — No OAuth, no self-registration, no password reset.** DR 0039
explicitly prohibits all of these. This record does not change that prohibition.

**FACT 10 — Existing portal Credentials provider has no explicit `id` field.**
Verified in `auth.ts` line 26: `Credentials({` is declared with `credentials`
and `authorize` only — no `id` property. NextAuth v5 assigns the default id
`"credentials"` to it. This id must not be changed by Phase 06 implementation.
Assigning `id: 'portal'` to the existing provider would rename it and is
prohibited; it would also break any in-flight sessions or sign-in flows that
reference the existing provider id.

---

## APPROVED Decision — Option A: Single NextAuth Instance, Two Credentials Providers

### The Decision

Extend the existing single NextAuth instance in `auth.ts` to include a second
Credentials provider dedicated to admin staff. The two providers operate within
one NextAuth configuration, share the JWT/session callback chain, and produce
the same JWT payload shape. Route protection for both surfaces is handled in the
single `authorized` callback and the single `proxy.ts` matcher.

### Provider Identity Assignment

The existing portal Credentials provider MUST NOT be assigned an explicit `id`
field by Phase 06 implementation. Its effective NextAuth v5 default id is
`"credentials"` (FACT 10). Renaming it would break regression compatibility
with the existing Phase 05 portal authentication and is prohibited.

The new admin Credentials provider MUST carry an explicit `id: 'admin'` field.
This id does not conflict with the existing provider's effective default id
`"credentials"`.

- **Portal provider:** no explicit `id` field — existing behavior, effective id
  `"credentials"`, CLIENT-only, UNCHANGED
- **Admin provider:** `id: 'admin'` — new, OWNER/ADMIN_OPERATIONS/
  CREATIVE_PRODUCTION/QC only

The admin sign-in page uses `signIn('admin', credentials)`. The portal sign-in
page uses `signIn(credentials)` or `signIn('credentials', credentials)` — the
existing call convention is UNCHANGED.

### Admin Provider — Authorized Roles

The admin Credentials provider's `authorize` callback MUST authenticate exactly
the following roles and no others:

| Role                  | Admin provider outcome  |
|-----------------------|-------------------------|
| OWNER                 | AUTHORIZED              |
| ADMIN_OPERATIONS      | AUTHORIZED              |
| CREATIVE_PRODUCTION   | AUTHORIZED              |
| QC                    | AUTHORIZED              |
| CLIENT                | NOT AUTHORIZED — return null |
| AGENT                 | NOT AUTHORIZED — return null |

The admin provider MUST enforce:
1. User exists in `identity.users`
2. User `archived_at` is NULL
3. User `password_hash` is not NULL
4. bcrypt comparison passes
5. Multi-organization membership check — see subsection below

If any check fails, the `authorize` callback MUST return `null`.

The admin provider MUST NOT return a user if their only active membership has
role CLIENT or AGENT, even if the password check passes.

### Admin Provider — Multi-Organization Membership Rule (V1)

The architecture permits one user to hold memberships in multiple organizations
(UNIQUE(organization_id, user_id) on `identity.org_memberships` — one role per
user per org, but multiple orgs are permitted). An admin session requires exactly
one effective `(userId, organizationId, role)`. The following V1 rule governs
the admin provider's membership resolution and is a binding implementation
constraint:

**Rule:** After verifying the user's credentials, the admin provider MUST query
ALL active (non-archived) memberships for that user whose role is in
{OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION, QC}. The query MUST NOT use
`.limit(1)` or any row-limiting mechanism that discards results before counting.

| Result count | Outcome                                                   |
|--------------|-----------------------------------------------------------|
| 0 eligible   | Authentication fails — return `null`                      |
| Exactly 1    | Use that membership's `organization_id` and `role`        |
| 2 or more    | Authentication fails — return `null` (fail closed)        |

**Prohibited behaviors:**
- Selecting the first database row and ignoring additional rows
- Non-deterministic organization selection
- Accepting `organizationId` from the credentials payload, URL, query string,
  request body, or any other client-controlled input
- Any "pick the highest-priority org" heuristic

**Rationale:** A user with staff memberships in two or more organizations cannot
have their organization determined safely by the system at login time without an
explicit selection mechanism. Failing closed is the only safe V1 behavior.
Nondeterministic selection would violate tenant isolation (DR 0001).

**Future:** An organization-selection or organization-switching mechanism for
multi-org staff users is DEFERRED and requires a separate approved decision
record before implementation. This V1 rule does not create super-admin access,
cross-organization access, or organization switching. It only makes current V1
Admin authentication deterministic and fail-closed.

### Portal Provider — Preserved Behavior

The portal Credentials provider's behavior is UNCHANGED from DR 0039 and the
current `auth.ts` implementation:

1. User exists, not archived, has password_hash
2. bcrypt comparison passes
3. User has an active membership with role CLIENT

If any check fails, return null. CLIENT-only. No other roles permitted.

### JWT and Session Callbacks — Unchanged

Both providers produce the same return shape from `authorize`:
`{ id, email, name, organizationId, role }`.

The `jwt` and `session` callbacks are UNCHANGED. The JWT payload contains
`userId`, `organizationId`, `role` regardless of which provider authenticated
the user. The callbacks do not need to be modified.

### Admin Sign-In Page

A dedicated admin sign-in page MUST exist at `/admin/login`. This page invokes
NextAuth sign-in with the admin provider id (`'admin'`).

The existing portal sign-in page at `/portal/login` is UNCHANGED. The portal
sign-in call convention is UNCHANGED from Phase 05.

`pages: { signIn: '/portal/login' }` remains the NextAuth-level default sign-in
redirect. Route-level redirects in the `authorized` callback (below) handle
the distinction between portal and admin sign-in destinations.

### authorized Callback — Extended for Both Surfaces

The `authorized` callback in `auth.ts` MUST be extended to cover both surfaces.
The following routing logic defines the approved behavior:

```
/portal/login          → public (no session required)
/admin/login           → public (no session required)
/portal/:path*         → session required; role must be CLIENT;
                         redirect unauthorized to /portal/login
/admin/:path*          → session required; role must be in
                         {OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION, QC};
                         redirect unauthorized to /admin/login
all other paths        → pass through (no restriction)
```

The `authorized` callback for `/admin/:path*` MUST:
1. Reject requests with no session → redirect to `/admin/login`
2. Reject requests where `session.user.role` is CLIENT or AGENT → redirect to
   `/admin/login`
3. Allow requests where `session.user.role` is OWNER, ADMIN_OPERATIONS,
   CREATIVE_PRODUCTION, or QC

The `authorized` callback for `/portal/:path*` is UNCHANGED in behavior:
require a valid session. The existing CLIENT gate is enforced at the portal
provider's `authorize` step; a CLIENT user can never hold an admin-origin
session, and an admin user can never hold a portal-origin session, because each
provider returns `null` for out-of-scope roles.

### proxy.ts Matcher — Extended

`proxy.ts` MUST add `/admin/:path*` to the `config.matcher` array:

```
matcher: ['/portal/:path*', '/admin/:path*']
```

No other change to `proxy.ts` is required or permitted by this record.

### Session Isolation Between Surfaces

A user authenticated via the admin provider holds a JWT with a staff role
(OWNER/ADMIN_OPS/CREATIVE_PROD/QC). That session cannot satisfy the portal
provider's authorize step. A user authenticated via the portal provider holds
a JWT with role CLIENT. That session cannot satisfy the admin `authorized`
callback's role check. The two surfaces are mutually exclusive by construction.

A user who holds both a CLIENT membership and a staff role membership in the
same organization cannot simultaneously be logged into both surfaces in the same
browser session. NextAuth issues one session per authentication. To access the
other surface, the user must authenticate with the appropriate provider on the
appropriate sign-in page.

### Password Hashing — Unchanged

bcryptjs (`bcryptjs@^3.0.3`) is used by both providers. No new hashing
dependency is introduced.

### No Session Duration Change

Session duration and JWT expiry are not changed by this record. DR 0039 governs
session lifetime and any future changes to it.

---

## Alternatives Considered

### Option B — Separate NextAuth Instance for Admin

A second, independent NextAuth instance would be created for the admin surface
(e.g., `auth-admin.ts`), with its own `AUTH_SECRET_ADMIN` or the same
`AUTH_SECRET`. The admin instance would export a separate `{ handlers, auth,
signIn, signOut }` set, registered at a different API route prefix.

**Reasons Option B was not selected:**

1. **Operational complexity.** Two NextAuth instances require two separate
   configuration surfaces to keep in sync: session strategy, JWT callbacks,
   secret management, and session duration. Divergence becomes a maintenance
   risk with no compensating benefit in this codebase.

2. **No architectural requirement.** The portal and admin surfaces share the
   same PostgreSQL database, the same identity schema, and the same role
   taxonomy. There is no cross-service boundary that would justify independent
   auth instances.

3. **JWT payload shape is identical.** Both surfaces require the same
   `{ userId, organizationId, role }` payload. A shared instance with shared
   callbacks produces this more simply than two instances that must independently
   maintain the same payload structure.

4. **Secret management is simpler.** One `AUTH_SECRET` governs one JWT signing
   key. Two instances would require either a shared secret (giving no isolation
   benefit) or two secrets (adding operational surface).

5. **NextAuth v5 supports multiple Credentials providers.** The framework
   explicitly supports multiple providers within one instance, each with an
   explicit id. This is the intended mechanism for the use case at hand.

---

## Risks and Mitigations

**Risk 1 — Provider id collision.** If the new admin Credentials provider is
declared without an explicit `id` field, NextAuth assigns it the same default id
`"credentials"` already held by the existing portal provider, silently shadowing
one. **Mitigation:** This record mandates `id: 'admin'` on the admin provider
only. The portal provider retains no explicit id (effective default
`"credentials"`), unchanged from Phase 05. Assigning `id: 'portal'` to the
existing provider is prohibited — it would rename it and break Phase 05
regression compatibility.

**Risk 2 — Cross-surface session use.** A valid admin session is presented at
a portal route, or vice versa. **Mitigation:** The `authorized` callback checks
role explicitly for both surfaces; the CLIENT check on `/portal/*` and the
admin-role check on `/admin/*` are enforced by the callback before any handler
runs.

**Risk 3 — /admin/login left unprotected.** The admin sign-in page must be
publicly accessible (otherwise unauthenticated users cannot authenticate).
**Mitigation:** `/admin/login` is explicitly listed as a public path in the
`authorized` callback. Its presence in the proxy matcher is required to ensure
the `authorized` callback runs for it; listing it as public there is correct.

**Risk 4 — password_hash exposure.** The admin provider's `authorize` callback
fetches `password_hash` from the database. **Mitigation:** `password_hash` must
not appear in the returned user object, in any query result surfaced to the
client, or in any log. The admin provider follows the same server-side-only
discipline as the portal provider (DR 0039 §security).

**Risk 5 — AUTH_SECRET prefix.** If `AUTH_SECRET` is accidentally prefixed with
`NEXT_PUBLIC_`, it becomes a client-accessible environment variable and the JWT
signing key is compromised. **Mitigation:** DR 0039 explicitly prohibits the
`NEXT_PUBLIC_` prefix. This record reinforces that prohibition.

**Risk 6 — organizationId from client input.** Admin API routes must enforce
tenant isolation using `organizationId` from `session.user.organizationId` (the
server-side JWT), not from query parameters or request body fields controlled
by the client. **Mitigation:** This constraint is carried from DR 0001 and
DR 0039 and applies equally to all admin API routes implemented in Phase 06.

---

## Architectural Consequences

- `auth.ts` will contain two Credentials providers: the existing portal provider
  (no explicit id, effective default `"credentials"`, CLIENT-only, UNCHANGED)
  and a new admin provider (`id: 'admin'`, staff roles only).
- The `authorized` callback in `auth.ts` will handle four distinct path classes:
  `/portal/login`, `/admin/login`, `/portal/:path*`, `/admin/:path*`.
- `proxy.ts` matcher will include both `/portal/:path*` and `/admin/:path*`.
- The JWT payload shape (`userId`, `organizationId`, `role`) is unchanged and
  shared across both providers.
- `pages: { signIn: '/portal/login' }` remains unchanged; the admin sign-in
  destination is managed by the `authorized` callback's explicit redirect.
- A new page at `/admin/login` is required by Phase 06 implementation. Its
  existence is a consequence of this record; its implementation is not
  authorized by this record.
- No new npm dependency is introduced by this strategy.
- No new database table, column, migration, or PostgreSQL function is introduced
  by this strategy.
- Admin-surface API routes implemented in Phase 06 must use
  `lib/auth/authorization.ts` (`assertRole`, `hasAnyRole`) for fine-grained
  RBAC checks within the authenticated session, consistent with the existing
  authorization layer.

---

## Deferred / Explicitly Unresolved Items

The following are NOT decided by this record:

- Fine-grained RBAC rules for specific admin screens or actions within
  Phase 06 (governed by the Phase 06 plan and subsequent decision records).
- Admin session duration (DR 0039 governs; no change approved).
- Organization-selection and organization-switching for staff users who hold
  active memberships in more than one organization. The V1 fail-closed rule
  (zero or 2+ eligible memberships → authentication fails) is DECIDED by this
  record. A future mechanism permitting such users to select or switch
  organizations at login or mid-session is DEFERRED and requires a separate
  approved decision record before implementation.
- Admin password reset, admin self-registration, admin account provisioning
  flows. These remain explicitly out of scope per DR 0039 and this record.
- Whether `/admin/login` displays differently for different admin roles; page
  content is Phase 06 UI implementation, not authentication strategy.
- Any OAuth, SSO, or SAML integration for admin staff. Not approved, not
  planned.

---

## Explicitly Prohibited Assumptions

- Do not assume this record authorizes implementation, source code changes,
  schema changes, migration creation, dependency installation, or any git
  operation.
- Do not assume any admin screen, admin API route, or admin UI component is
  authorized by this record.
- Do not assume the multi-organization ownership boundary for OWNER role is
  resolved by this record.
- Do not assume that adding the admin provider to auth.ts is a Phase 06
  implementation step authorized without further explicit instruction.
- Do not assume the `/admin/login` page content, layout, or form behavior is
  decided by this record.
- Do not assume Decision Records 0001–0041 have been altered, reinterpreted,
  or superseded — all remain authoritative and unchanged.

---

## Owner Approval

To approve this record, state:

> "Approve DR 0042 as written."
