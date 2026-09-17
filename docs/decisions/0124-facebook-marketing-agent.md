# DR 0124 — Facebook Marketing Campaign Agent (Minimum Safe Implementation)

**Status:** ACCEPTED  
**Date:** 2026-09-17  
**Supersedes:** DR 0112 (partial resolution of blockers B1–B5)

## Decision

Authorize the minimum safe implementation of the Facebook Marketing Campaign Agent:
a deterministic multi-step workflow covering content intake, policy validation,
mandatory human approval, notification, and full audit/idempotency/org isolation.

## Scope

This DR resolves the following DR 0112 blockers:

- **B1 (Platform):** Facebook selected. Workflow is internal-only until B2 is
  externally resolved (no Meta API credentials in environment).
- **B3 (TOS compliance):** No autonomous publishing; every campaign post MUST pass
  a mandatory HUMAN_GATE (OWNER or ADMIN_OPERATIONS) before any publish action.
- **B4/B5 (AGENT_ALLOWLIST):** One new deterministic skill added:
  `qc.facebook_policy.check` (no AI calls; rule-based only).

**DR 0112 blockers still open (not resolved here):**

- **B2 (Meta API credentials):** No Meta/Facebook API credentials exist in the
  production environment. Publishing step is a stub — the HUMAN_GATE approver
  performs the actual publish via native Meta tooling until credentials are
  provisioned and a separate DR authorizes the API integration.
- **B6 (Content schema):** No new DB tables added; campaign context stored in
  existing `agent_tasks.context` jsonb.
- **B7 (IntentType):** `COORDINATE_MARKETING_CAMPAIGN` added to DB CHECK constraint
  via migration 0018 and to the TypeScript union in `lib/orchestration/types.ts`.

## New Skill: `qc.facebook_policy.check`

- **Family:** QC
- **AI calls:** Zero — deterministic rule evaluation only
- **Checks performed:**
  - Text length against Facebook's published per-placement limits
  - Prohibited term detection (hardcoded list of known Facebook policy violations)
  - Disclosure requirement detection (financial, health, political content flags)
  - Basic hashtag limit enforcement (≤ 30 per post)
- **Verdict:** `PASS` | `FAIL` with `findings[]` array
- **AGENT_ALLOWLIST:** Added (DR 0124 authority, OWNER-sanctioned via this DR)
- **HUMAN_SKILL_AUTHORITY:** OWNER, ADMIN_OPERATIONS, QC

## New IntentType: `COORDINATE_MARKETING_CAMPAIGN`

Added to the DB CHECK constraint via migration 0018 and to
`lib/orchestration/types.ts`.

## Workflow (Five Steps, Fixed Plan)

| Step | Type | Skill / Gate | Description |
|------|------|--------------|-------------|
| 0 | SKILL | `qc.script.review` | Content quality check (AI) |
| 1 | SKILL | `qc.brand.alignment` | Brand compliance (AI) |
| 2 | SKILL | `qc.facebook_policy.check` | Platform policy (deterministic) |
| 3 | HUMAN_GATE | OWNER or ADMIN_OPERATIONS | Mandatory publish approval |
| 4 | NOTIFICATION | — | Completion / failure notification |

## Authority and Initiator Roles

- Initiator: `OWNER` or `ADMIN_OPERATIONS` only
- HUMAN_GATE approver: `OWNER` or `ADMIN_OPERATIONS` only
- No CLIENT access to this workflow

## Constraints

- No autonomous publishing without HUMAN_GATE approval (step 3)
- No Meta API calls in this implementation — human performs publish
- No financial mutations of any kind
- No content fabrication, no invented metrics, no testimonials
- No AGENT_ALLOWLIST expansion beyond `qc.facebook_policy.check`
- All steps org-scoped; no cross-org data access
- Full audit trail via existing `auditEvents` mechanism

## Files Created / Modified

- `docs/decisions/0124-facebook-marketing-agent.md` (this file)
- `db/migrations/0018_facebook_marketing_agent.sql` (new intent type constraint)
- `lib/skills/qc/facebook-policy-check.ts` (new deterministic skill)
- `lib/skills/interface.ts` (add `qc.facebook_policy.check` to SkillId)
- `lib/skills/authority.ts` (add to HUMAN_SKILL_AUTHORITY + AGENT_ALLOWLIST)
- `lib/skills/registry.ts` (register the new skill)
- `lib/orchestration/types.ts` (add `COORDINATE_MARKETING_CAMPAIGN` to IntentType)
- `lib/agents/marketing-campaign-specialist.ts` (delegation function)
- `lib/__tests__/facebook-policy-check.test.ts` (skill unit tests)
- `lib/__tests__/marketing-campaign-specialist.test.ts` (agent unit tests)
