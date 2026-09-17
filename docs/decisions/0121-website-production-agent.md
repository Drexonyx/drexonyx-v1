# DR 0121 — Website Production Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** Website Production Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `b597994`
**Relationship to prior records:** Extends DR 0071 (orchestration), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0113 (Production Agent), DR 0114 (QC Agent).
Coordinates CLIENT WEBSITE production using existing production schema only.
Does NOT modify the DREXONYX public website. Does not modify DRs 0001–0120.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** CLIENT WEBSITE production is an order-based production workflow using
`commercial.campaigns`, `commercial.briefs`, `commercial.orders`, and
`production.production_jobs` (job_type `MANUAL_UPLOAD` — website deliverables are
not AI-generated assets; DR 0053 §2.1 prohibits autonomous AI generation for website
production at this phase).

**FACT:** No automated workflow exists to coordinate the complete end-to-end client
website production lifecycle: brief validation → budget check → production authorization
→ production job → QC → delivery approval → completion notification.

**FACT:** All step types required (`VERIFY`, `FINANCIAL_CHECK`, `HUMAN_GATE`,
`PRODUCTION_JOB`, `QC_GATE`, `NOTIFICATION`) are already present in the orchestration
schema task_steps_step_type_check constraint and in `lib/orchestration/types.ts`.

**FACT:** No new skills are required. No AGENT_ALLOWLIST expansion is authorized or needed.

**FACT (standing constraints):**
- No autonomous spending authority (DR 0071 §3.5 financial safety).
- QC_GATE is architecturally mandatory before client preview or delivery (DR 0090 §2.2).
- HUMAN_GATE before production job creation (DR 0080 §2.1).
- HUMAN_GATE before final delivery/publish (DR 0035).
- No autonomous client communication (DR 0029, DR 0111).

---

## 2. Decision

### 2.1 Purpose

Authorize design and implementation of a Website Production Agent that coordinates
the complete client website production workflow for OWNER and ADMIN_OPERATIONS.

Capabilities:
- Validate brief + order + campaign existence before production
- Confirm budget before incurring production cost
- Enforce mandatory human production-authorization gate
- Coordinate production job (MANUAL_UPLOAD job type — not AI generation)
- Enforce mandatory QC gate before preview/delivery
- Enforce mandatory human delivery-approval gate before publish
- Send internal completion notification

### 2.2 Hard Boundaries

- READ ONLY on client data — no writes to commercial schema tables
- No autonomous production spending; FINANCIAL_CHECK step required before production
- No bypassing QC_GATE or HUMAN_GATE
- No autonomous client approval or autonomous delivery/publish
- No access to another organization's data
- No DREXONYX public website modifications
- No Marketing/social/WhatsApp work
- No AGENT_ALLOWLIST expansion — uses pre-existing step types only
- No external API calls beyond existing approved production integrations
- No invented website requirements, assets, or client data

### 2.3 Blockers (Resolved)

| # | Blocker | Resolution |
|---|---------|------------|
| B1 | IntentType `COORDINATE_WEBSITE_PRODUCTION` requires schema change | APPROVED by this record — migration provided |
| B2 | `website-production` entry in `SPECIALIST_AGENT_REGISTRY` requires Owner approval | APPROVED by this record |

No AGENT_ALLOWLIST expansion. Uses existing step types only.

### 2.4 Workflow — `COORDINATE_WEBSITE_PRODUCTION`

Seven-step deterministic plan:

| Step | Type | Purpose |
|------|------|---------|
| 0 | VERIFY | Read-only validation — brief + order + campaign must exist and be in correct status |
| 1 | FINANCIAL_CHECK | Confirm order budget before any production cost is incurred |
| 2 | HUMAN_GATE | Production authorization — OWNER or ADMIN_OPERATIONS must approve before job starts |
| 3 | PRODUCTION_JOB | Run website production job (MANUAL_UPLOAD type, org-scoped) |
| 4 | QC_GATE | Mandatory QC verdict — OWNER, ADMIN_OPERATIONS, or QC must review (DR 0090 §2.2) |
| 5 | HUMAN_GATE | Delivery approval — OWNER or ADMIN_OPERATIONS must approve before publish/delivery |
| 6 | NOTIFICATION | Internal completion alert (REPORT_READY event via Communication Agent infrastructure) |

### 2.5 Module — `lib/agents/website-production-specialist.ts`

`delegateWebsiteProduction()` creates a sub-task via `delegateSubTask()`.

**IntentType:** `COORDINATE_WEBSITE_PRODUCTION`

**Required inputs:** `campaignId`, `orderId`, `briefId` (all must be non-empty strings).
All three are validated before delegation — if any are missing, returns `ok: false`.

**Initiator roles:** OWNER, ADMIN_OPERATIONS only.

### 2.6 Authorization

| Role | May initiate |
|------|-------------|
| OWNER | Yes |
| ADMIN_OPERATIONS | Yes |
| CREATIVE_PRODUCTION | No |
| QC | No |

Organization isolation enforced: `organizationId` always from server-side token
(delegateSubTask stores it on the agentTask row and all child rows inherit it).

---

## 3. Impact

| File | Change |
|------|--------|
| `docs/decisions/0121-website-production-agent.md` | New — this DR |
| `lib/agents/website-production-specialist.ts` | New — `delegateWebsiteProduction` |
| `lib/agents/__tests__/website-production-specialist.test.ts` | New — unit tests |
| `lib/agents/registry.ts` | Modified — `website-production` entry added |
| `lib/agents/index.ts` | Modified — exports added |
| `lib/orchestration/types.ts` | Modified — `COORDINATE_WEBSITE_PRODUCTION` added |
| `lib/orchestration/planner.ts` | Modified — plan template added |
| `lib/orchestration/ai-planner.ts` | Modified — allowlist + system prompt updated |
| `db/schema/orchestration.ts` | Modified — intent_type CHECK constraint updated |
| `db/migrations/0016_website_production_agent.sql` | New — schema migration |
