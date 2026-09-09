# Decision Record 0075 — Phase 10: Skill Invocation Authority

- **Decision Round:** Phase 10
- **Phase:** 10 — Skills
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration, or
  implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `c216622`
- **Resolves:** Phase 10 Planning open question on RBAC for skill invocation;
  establishes the CLIENT-role exclusion; approves Option B for AGENT-role
  authority with an explicit allowlist
- **Relationship to prior records:** Does not modify Decision Records
  0001–0069. All remain authoritative and unchanged. Depends on DR 0072
  (invocation path — route handler enforces authority per this record, step 3
  of §2.5), DR 0065 (Scoped Service Token — the mechanism used by the agent
  runtime under Option B).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0069. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (verified schema, `identity.org_memberships`):** The `role` column has
a CHECK constraint:

```sql
role IN ('OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC', 'CLIENT', 'AGENT')
```

**FACT (verified code, `lib/admin/types.ts`):**

```typescript
export const ADMIN_ROLES = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC'] as const;
```

`CLIENT` and `AGENT` are NOT `AdminRole`. `CLIENT` represents an external
client user. `AGENT` represents the automated agent runtime.

**FACT (DR 0065, approved):** The Phase 09 agent runtime is issued a Scoped
Service Token at dispatch time. The token scope is `(organization_id,
production_job_id)`. The token is 256-bit CSPRNG, base64url, stored as
SHA-256 hash only, and has a 4-hour lifetime.

---

## 2. Decision

### 2.1 CLIENT Role: No Skill Invocation in V1

**APPROVED:** The `CLIENT` role MUST NOT invoke any Phase 10 Skill directly.
Client-facing outputs are delivered through the Client Portal UI after internal
review; they are not produced by client-triggered skill invocations.

This constraint is firm for V1. No argument or architectural convenience
justifies client-side skill invocation without explicit Owner approval.

### 2.2 AGENT Role: Option B Approved

**APPROVED — Option B:** The Phase 09 agent runtime MAY invoke a constrained,
explicitly named subset of Phase 10 Skills. All of the following conditions
apply and are non-negotiable:

1. **Existing mechanism only.** The agent MUST present its Phase 09 Scoped
   Service Token (DR 0065) to the skill route handler. No new agent credential,
   authority grant, or authentication mechanism is created or used.

2. **Explicit allowlist — approved.** The agent may invoke ONLY the following
   skills:

   | Skill ID | Rationale |
   |---|---|
   | `utility.prompt.optimize` | Optimize dispatch prompts during generation |
   | `qc.asset.metadata` | Automated metadata check post-generation |

   All skills not listed above return 403 to an agent caller. The allowlist
   MUST NOT be expanded without explicit Owner approval and a new or amended
   decision record.

3. **No expansion of existing agent authority.** If implementation review
   finds that Option B requires expanding the agent's permissions, granting
   the agent new database access, or creating new authentication infrastructure
   beyond what DR 0065 already provides, implementation MUST fall back to
   Option A (human-only) without further deliberation or Owner consultation.
   The fallback is self-executing.

4. **Tenant isolation preserved.** Agent skill invocations are scoped to the
   `organization_id` from the Service Token. Cross-organization access is
   prohibited.

### 2.3 Human Role Invocation Authority Matrix

**APPROVED:** Per-skill invocation authority for human actors in Phase 10 V1:

| Skill ID | OWNER | ADMIN_OPERATIONS | CREATIVE_PRODUCTION | QC |
|---|---|---|---|---|
| `brief.analyze` | ✓ | ✓ | ✓ | ✗ |
| `brief.extract_requirements` | ✓ | ✓ | ✓ | ✗ |
| `script.ad.generate` | ✓ | ✓ | ✓ | ✗ |
| `script.social_caption.generate` | ✓ | ✓ | ✓ | ✗ |
| `script.voiceover.generate` | ✓ | ✓ | ✓ | ✗ |
| `script.scene_description.generate` | ✓ | ✓ | ✓ | ✗ |
| `hook.video.generate` | ✓ | ✓ | ✓ | ✗ |
| `hook.thumbnail_copy.generate` | ✓ | ✓ | ✓ | ✗ |
| `strategy.campaign.develop` | ✓ | ✓ | ✗ | ✗ |
| `strategy.brand.positioning` | ✓ | ✓ | ✗ | ✗ |
| `strategy.audience.segmentation` | ✓ | ✓ | ✗ | ✗ |
| `qc.script.review` | ✓ | ✓ | ✗ | ✓ |
| `qc.brand.alignment` | ✓ | ✓ | ✗ | ✓ |
| `qc.asset.metadata` | ✓ | ✓ | ✗ | ✓ |
| `utility.prompt.optimize` | ✓ | ✓ | ✓ | ✗ |
| `utility.output.format` | ✓ | ✓ | ✓ | ✗ |
| `utility.batch.coordinate` | ✓ | ✓ | ✗ | ✗ |

`CLIENT` is excluded from all rows (§2.1). `AGENT` access is governed
exclusively by the allowlist in §2.2 and is not represented in this matrix.
`utility.batch.coordinate` is restricted to OWNER + ADMIN_OPERATIONS only;
CREATIVE_PRODUCTION does not have access.

### 2.4 Enforcement Point

**APPROVED:** Invocation authority is enforced in the route handler before
`skill.execute()` is called (DR 0072 §2.5, step 3). The route handler:

- **For human callers:** resolves the caller's role from
  `identity.org_memberships` scoped by `organization_id`, then checks the
  authority matrix in §2.3. Returns 403 if the role is not authorized.
- **For agent callers (Option B):** validates the Service Token per DR 0065,
  resolves `organization_id` and `production_job_id` from the token scope,
  confirms the requested skill is in the approved allowlist in §2.2. Returns
  403 if the skill is not in the allowlist.

The skill module itself does not perform RBAC checks; authorization is fully
delegated to the route handler.

### 2.5 Organization Scoping

**APPROVED:** Invocation authority is scoped per-organization. A user's role
in Organization A does not grant skill invocation authority in Organization B.
An agent Service Token scoped to Organization A does not grant access to
Organization B.

### 2.6 No Role Elevation

**APPROVED:** Skills MUST NOT use, check, or act on actor role information
for authorization decisions. The `actorRole` in the `SkillContext` (DR 0072
§2.2) is provided for audit trail and output provenance purposes only. The
route handler has already enforced authorization before `execute()` is called.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume `CLIENT` role may invoke any skill in V1 — it may not (§2.1).
- Do not assume the AGENT allowlist may be expanded without explicit Owner
  approval — it may not (§2.2, condition 2).
- Do not assume Option B permits any agent skill invocation beyond the
  approved allowlist — skills outside the allowlist return 403 (§2.2).
- Do not assume Option B remains valid if implementation requires authority
  expansion — the self-executing fallback to Option A applies (§2.2,
  condition 3).
- Do not assume CREATIVE_PRODUCTION may invoke Strategy skills — they may
  not per §2.3.
- Do not assume QC may invoke CREATIVE_PRODUCTION skills — they may not
  per §2.3.
- Do not assume CREATIVE_PRODUCTION may invoke `utility.batch.coordinate` —
  they may not; it is restricted to OWNER + ADMIN_OPERATIONS (§2.3).
- Do not assume this record authorizes schema changes, migrations, code
  changes, commits, or pushes.
- Do not assume Decision Records 0001–0069 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

1. **AGENT authority — Option B** approved: the agent runtime may invoke
   `utility.prompt.optimize` and `qc.asset.metadata` only, via the existing
   Phase 09 Scoped Service Token (DR 0065). No new credential or authority
   mechanism. Self-executing fallback to Option A if authority expansion is
   required at implementation time.
2. **Agent allowlist** approved exactly as specified: `utility.prompt.optimize`
   and `qc.asset.metadata`. No other skills are agent-accessible.
3. **Human authority matrix** (§2.3) approved exactly as specified.
4. **`utility.batch.coordinate`** restricted to OWNER + ADMIN_OPERATIONS;
   CREATIVE_PRODUCTION access denied.
5. **CLIENT exclusion** (§2.1) approved; CLIENT may not invoke any skill in V1.

**No implementation is authorized by approval of this record alone.**
