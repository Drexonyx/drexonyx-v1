# Decision Record 0055 — Phase 09: Agent Runtime Service Authentication

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 09 pre-BUILD blocker: how the Agent Runtime authenticates
  to internal service endpoints. Establishes the authentication boundary for
  the runtime process: not a human session, not a JWT, not an AGENT org_membership.
- **Relationship to prior records:** Does not modify Decision Records 0001–0054.
  All remain authoritative and unchanged. Depends on DR 0053 (ProductionJob and
  AiGeneration entities), DR 0054 (asset file storage model). DR 0065 resolves
  the open token format/validation question identified in §2.7. DR 0064 resolves
  the open audit actor identity question identified in §2.9.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0054. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0053 §10.8):** AGENT is a defined role in the schema (`identity.org_memberships`
role CHECK constraint). No authentication pathway for AGENT exists in V1. DR 0053
§10.8 explicitly prohibits AGENT from creating ProductionJobs. The AGENT role exists
as a schema-level designation only.

**FACT (DR 0042, verified Auth.js v5 configuration):** Auth.js v5 provides two
Credentials providers: one for CLIENT-only portal authentication, one for admin
staff roles. AGENT is excluded from both providers. There is no Auth.js session
pathway for a runtime process.

**FACT (Phase 09 PLAN):** The Agent Runtime must invoke internal service functions
to perform its authorized transitions (DR 0056). These service functions require
an authenticated caller identity to write audit events (DR 0064) and enforce
tenant isolation.

**FACT (Phase 09 PLAN gap analysis):** The Agent Runtime is not a human user
and holds no `org_membership` row. It cannot authenticate via Auth.js session.
A separate, internal authentication mechanism is required.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 The Agent Runtime Is an Internal Platform Service

**PROPOSED:** The Agent Runtime is an internal platform service process. It is
not a human user, not a CLIENT, not an admin staff member, and not an AGENT
role holder via `org_membership`. It operates on behalf of the platform to
execute authorized production job transitions.

### 2.2 No Auth.js Session for the Runtime

**PROPOSED:** The Agent Runtime does not authenticate via Auth.js v5. It holds
no JWT, no session cookie, and no session token of the type issued to human users
by the portal or admin authentication flows.

### 2.3 Authentication via Scoped Service Token

**PROPOSED:** The Agent Runtime authenticates to internal service endpoints via
a Scoped Service Token. The token is:
- Issued by the platform server at the time a ProductionJob is initiated.
- Scoped to a specific `organization_id` and `production_job_id`.
- Validated server-side on every service call.
- Not accessible to browser clients or portal users.

### 2.4 Scope Enforced Server-Side

**PROPOSED:** The token's scope (`organization_id`, `production_job_id`) is
determined exclusively by the server at issuance time. No caller-supplied scope
is accepted. The server validates scope on every request — token possession alone
is not sufficient for authorization.

### 2.5 No AGENT org_membership Required

**PROPOSED:** The Agent Runtime does not require an `org_membership` row with
role = 'AGENT'. The authentication mechanism (Scoped Service Token) is independent
of the `identity.org_memberships` table. The AGENT role designation in the schema
remains a label only, with no authentication pathway.

### 2.6 Internal Service Boundary Only

**PROPOSED:** The Scoped Service Token is valid only for internal service-to-service
calls within the platform. It is never:
- Included in any response to a browser client.
- Usable to access portal or admin endpoints.
- Transmitted over any external network.

### 2.7 Open Item — Token Format and Validation (Resolved by DR 0065)

**PROPOSED:** The exact format, storage, and validation mechanism of the Scoped
Service Token is specified in DR 0065. DR 0065 establishes: opaque token (not JWT),
minimum 256-bit CSPRNG entropy, hash-only storage (raw token never persisted),
hash-compare validation, constant-time comparison, server-to-server only.

### 2.8 AGENT Role Does Not Gain an Authentication Pathway

**PROPOSED:** Approving this record does not create an authentication pathway for
the AGENT role via Auth.js or any other mechanism. The runtime's Scoped Service
Token is a platform-internal credential, not an AGENT role credential.

### 2.9 Open Item — Audit Actor Identity (Resolved by DR 0064)

**PROPOSED:** The audit actor identity used by the runtime when writing
`system.audit_events` is specified in DR 0064. DR 0064 establishes:
`actor_role = 'AGENT'`, `actor_id = production_job_id` (the UUIDv7 of the
ProductionJob being executed). NULL `actor_id` is prohibited.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume the Agent Runtime authenticates via Auth.js session — it does
  not (§2.2).
- Do not assume a JWT is used — the Scoped Service Token is opaque (§2.3, DR 0065).
- Do not assume an AGENT org_membership row is required — it is not (§2.5).
- Do not assume token possession is sufficient for authorization — scope validation
  is required (§2.4).
- Do not assume the token is accessible to browser clients — it is not (§2.6).
- Do not assume AGENT role gains an Auth.js authentication pathway — it does
  not (§2.8).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0054 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
