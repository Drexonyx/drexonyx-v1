# DR 0122 — DREXONYX Website Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** DREXONYX Website Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `2aac8a5`
**Relationship to prior records:** Extends DR 0071 (orchestration), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0119 (Communication Agent — notification reuse).
Reads from static repository content files only (lib/portfolio.ts, lib/pricing.ts).
Does NOT modify DRs 0001–0121. Distinct from DR 0121 (Website Production Agent — client websites).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** DREXONYX's public website content is authored as static TypeScript data in
`lib/portfolio.ts` (PORTFOLIO_ITEMS) and `lib/pricing.ts` (MICRO_PACKAGES,
PRODUCTION_PACKAGES, CUSTOM_TIERS). Page-level constants live inline in
`app/*/page.tsx` files and are consumed directly at build time.

**FACT:** No automated content health monitoring exists. Staff must manually review
portfolio items for missing media references, pricing entries for completeness, and
other deterministically detectable content issues.

**FACT:** All required step types (VERIFY, HUMAN_GATE, NOTIFICATION) are already present.
No new step types, skills, or AGENT_ALLOWLIST entries are required.

**FACT (standing constraints):**
- No autonomous content publishing or deployment.
- Any proposed change must pass through a HUMAN_GATE before production state.
- No invented content — the agent must never fabricate client names, testimonials,
  ratings, results, statistics, awards, partnerships, capabilities, or contact details.
- Content inspection is strictly read-only against repository-committed data.

**FACT (separation from DR 0121):**
- DR 0121 (Website Production Agent) coordinates CLIENT website builds.
- DR 0122 (DREXONYX Website Agent) inspects DREXONYX's own public website content.
- These are distinct agents with distinct IntentTypes and distinct responsibilities.

---

## 2. Decision

### 2.1 Purpose

Authorize design and implementation of a DREXONYX Website Agent that provides
deterministic, read-only content health inspection of DREXONYX's own public website
for OWNER and ADMIN_OPERATIONS, and routes findings through a human approval gate.

Capabilities:
- Inspect portfolio items for missing media sources and thumbnail references.
- Inspect portfolio items marked `featured` with no media (degraded display risk).
- Inspect pricing packages for completeness (price, description, includes).
- Aggregate findings into a structured `WebsiteContentReport`.
- Route findings through a mandatory HUMAN_GATE before any proposed change reaches production.
- Send internal notification on audit completion via existing Communication infrastructure.

### 2.2 Hard Boundaries

- READ ONLY on all inputs — no writes to any file or table
- No autonomous publishing or deployment
- No content generation — agent NEVER invents, fabricates, or suggests invented content
- HUMAN_GATE mandatory before any change can become production state
- No external API calls
- No marketing campaigns, social publishing, WhatsApp
- No financial mutations, no pricing changes
- No access to client data or commercial schema tables
- No AGENT_ALLOWLIST expansion — uses existing VERIFY, HUMAN_GATE, NOTIFICATION only
- No modification of DREXONYX public website routes without authorized human action

### 2.3 What the Inspector Detects (Deterministic Rules)

**Portfolio (lib/portfolio.ts):**
- `src` missing on any item → severity based on mediaType (HIGH for featured, MEDIUM otherwise)
- `thumbnailSrc` missing on video items → MEDIUM
- `featured: true` with no `src` → HIGH (featured slot will render without media)
- Non-empty `description` required for all items → LOW if empty

**Pricing (lib/pricing.ts):**
- `price <= 0` on any Package → HIGH
- `includes.length === 0` on any Package → HIGH
- `description` empty → MEDIUM
- `ctaHref` missing or not a relative or absolute URL on CustomTier → MEDIUM

### 2.4 Blockers (Resolved)

| # | Blocker | Resolution |
|---|---------|------------|
| B1 | IntentType `AUDIT_WEBSITE_CONTENT` requires schema change | APPROVED by this record — migration provided |
| B2 | `site-audit` entry in `SPECIALIST_AGENT_REGISTRY` requires Owner approval | APPROVED by this record |

No AGENT_ALLOWLIST expansion.

### 2.5 Module — `lib/website/inspector.ts`

Pure, synchronous, no I/O. Exports:
- `inspectPortfolioItems(items)` — checks PORTFOLIO_ITEMS
- `inspectPricingPackages(packages)` — checks MICRO_PACKAGES + PRODUCTION_PACKAGES
- `inspectCustomTiers(tiers)` — checks CUSTOM_TIERS
- `buildWebsiteContentReport()` — aggregates all checks into a `WebsiteContentReport`

### 2.6 Specialist Agent — `lib/agents/site-audit-specialist.ts`

`delegateSiteAudit()` creates a sub-task via `delegateSubTask()`.

**Plan:**
- Step 0: `VERIFY` — content health inspection
- Step 1: `HUMAN_GATE` — OWNER/ADMIN_OPERATIONS reviews audit findings; no change proceeds without approval
- Step 2: `NOTIFICATION` — internal completion alert

**IntentType:** `AUDIT_WEBSITE_CONTENT`

**Initiator roles:** OWNER, ADMIN_OPERATIONS only.

### 2.7 Authorization

| Role | May initiate |
|------|-------------|
| OWNER | Yes |
| ADMIN_OPERATIONS | Yes |
| CREATIVE_PRODUCTION | No |
| QC | No |

---

## 3. Impact

| File | Change |
|------|--------|
| `docs/decisions/0122-drexonyx-website-agent.md` | New — this DR |
| `lib/website/inspector.ts` | New — deterministic content inspection |
| `lib/website/__tests__/inspector.test.ts` | New — unit tests |
| `lib/agents/site-audit-specialist.ts` | New — `delegateSiteAudit` |
| `lib/agents/__tests__/site-audit-specialist.test.ts` | New — unit tests |
| `lib/agents/registry.ts` | Modified — `site-audit` entry added |
| `lib/agents/index.ts` | Modified — exports added |
| `lib/orchestration/types.ts` | Modified — `AUDIT_WEBSITE_CONTENT` added |
| `lib/orchestration/planner.ts` | Modified — plan template added |
| `lib/orchestration/ai-planner.ts` | Modified — allowlist + system prompt updated |
| `db/schema/orchestration.ts` | Modified — intent_type CHECK constraint updated |
| `db/migrations/0017_drexonyx_website_agent.sql` | New — schema migration |
