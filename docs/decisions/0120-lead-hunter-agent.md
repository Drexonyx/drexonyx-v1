# DR 0120 — Lead Hunter Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** Lead Hunter Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `0f582ab`
**Relationship to prior records:** Extends DR 0071 (orchestration), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0119 (Communication Agent — notification reuse).
Reads from `commercial.inquiries` schema only. Does not modify Decision Records 0001–0119.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The `commercial.inquiries` table records public intake submissions from the
`/start-project` form. Status values: `NEW`, `REVIEWED`, `CONVERTED`, `DISMISSED`.
Fields: `id`, `status`, `brand_name`, `contact_email`, `website`, `campaign_objective`,
`target_audience`, `creative_types`, `platforms`, `additional_notes`, `submitted_at`,
`created_at`, `updated_at`.

**FACT:** The `commercial.inquiries` table has **no `organization_id` column** — inquiries
are pre-org records. The actor authorization check uses the admin's organization from
the server-side session (DR 0106 single-org constraint). The Lead Hunter reads all
inquiries for the DREXONYX production operator.

**FACT:** No automated lead intelligence or pipeline reporting exists. Admin staff
must manually review the inquiries dashboard to identify stale or actionable leads.

**FACT:** `VERIFY` and `NOTIFICATION` step types are existing orchestration step types.
A new IntentType `HUNT_LEADS` is required (blocker B1 — resolved by this record).

**FACT:** No external data source, scraping, LinkedIn, social-media automation,
cold outreach, or marketing automation exists or is authorized.

**FACT (standing PII constraint):** `contact_email` is personally identifiable
information. It MUST NOT appear in notification email bodies. The Lead Hunter report
surfaces brand_name, status, and pipeline counts — not contact details.

---

## 2. Decision

### 2.1 Purpose

Authorize design and implementation of a Lead Hunter Agent that provides read-only
operational lead intelligence for OWNER and ADMIN_OPERATIONS from first-party inquiry data.

Capabilities:
- New leads: inquiries with status `NEW` submitted within the reporting window
- Pending leads: inquiries with status `REVIEWED` awaiting conversion decision
- Stale leads: leads not actioned beyond configurable thresholds (deterministic only)
- Follow-up required: REVIEWED leads idle beyond the follow-up threshold
- Pipeline summary: counts by status, actionable flag

Thresholds (deterministic, configurable via parameters):
- Stale NEW: not reviewed within 3 days of submission
- Stale REVIEWED: not converted/dismissed within 7 days of last update

### 2.2 Hard Boundaries

- READ ONLY — no writes to any table
- No cold outreach, scraping, LinkedIn/social, email campaigns, WhatsApp
- No autonomous client communication
- `contact_email` NEVER appears in notification email bodies (PII boundary)
- No external API calls
- No invented lead scores or forecasts — completeness score is a deterministic
  count of non-null optional fields (0–5)
- No financial data, amounts, margins, or costs

### 2.3 Blockers (Resolved)

| # | Blocker | Resolution |
|---|---------|------------|
| B1 | IntentType `HUNT_LEADS` requires schema change | APPROVED by this record — migration provided |
| B2 | `lead-hunter` entry in `SPECIALIST_AGENT_REGISTRY` requires Owner approval | APPROVED by this record |

No AGENT_ALLOWLIST expansion. Uses existing `VERIFY + NOTIFICATION` step types only.

### 2.4 Module — `lib/leads/intelligence.ts`

New read-only module. Exports:
- `computeStaleDays(updatedAt, now)` — pure helper
- `computeCompletenessScore(inquiry)` — pure; 0–5 count of filled optional fields
- `classifyLeads(inquiries, now, opts)` — pure classification engine
- `buildLeadHunterReport(opts?)` — async; queries inquiries table, classifies, returns report

Report type `LeadHunterReport` contains: `generatedAt`, `windowDays`, `summary`,
`newLeads`, `pendingLeads`, `staleLeads`, `followUpRequired`, `hasActionableLeads`.

`LeadRecord` fields: `id`, `brand_name`, `campaign_objective`, `status`, `submitted_at`,
`updated_at`, `staleDays`, `completenessScore`. **No `contact_email`.**

### 2.5 Specialist Agent — `lib/agents/lead-hunter-specialist.ts`

`delegateLeadHunter()` creates a sub-task via `delegateSubTask()`.

**Plan:**
- Step 0: `VERIFY` — lead pipeline query and classification
- Step 1: `NOTIFICATION` — alert if actionable leads exist (`hasActionableLeads`)

**IntentType:** `HUNT_LEADS`

**Initiator roles:** OWNER, ADMIN_OPERATIONS only.

### 2.6 Authorization and PII

| Role | May initiate |
|------|-------------|
| OWNER | Yes |
| ADMIN_OPERATIONS | Yes |
| CREATIVE_PRODUCTION | No |
| QC | No |

`contact_email` is scoped to direct admin dashboard access only. The Lead Hunter
report and notification do not include `contact_email` or any other direct PII.
`brand_name` is a business identifier, not PII.

---

## 3. Impact

| File | Change |
|------|--------|
| `docs/decisions/0120-lead-hunter-agent.md` | New — this DR |
| `lib/leads/intelligence.ts` | New — lead classification and report |
| `lib/leads/__tests__/intelligence.test.ts` | New — unit tests |
| `lib/agents/lead-hunter-specialist.ts` | New — `delegateLeadHunter` |
| `lib/agents/__tests__/lead-hunter-specialist.test.ts` | New — unit tests |
| `lib/agents/registry.ts` | Modified — `lead-hunter` entry added |
| `lib/agents/index.ts` | Modified — exports added |
| `lib/orchestration/types.ts` | Modified — `HUNT_LEADS` added |
| `lib/orchestration/planner.ts` | Modified — plan template added |
| `lib/orchestration/ai-planner.ts` | Modified — allowlist + system prompt updated |
| `db/schema/orchestration.ts` | Modified — intent_type CHECK constraint updated |
| `db/migrations/0015_lead_hunter_agent.sql` | New — schema migration |
