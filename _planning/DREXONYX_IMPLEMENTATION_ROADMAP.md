# DREXONYX — Implementation Roadmap

**Document type:** Phased Build Plan — AWAITING CEO APPROVAL  
**Prepared by:** Claude Code  
**Date:** 2026-11-21  
**Status:** DRAFT — Do not begin any phase without CEO approval of that phase

---

## Guiding Principle

Build the smallest version that is immediately useful to the CEO, then expand. Each phase delivers a working, deployable increment. No phase is a "setup only" phase — every phase has a usable output.

The roadmap is sequential per domain but parallel within a phase where possible. Phases are defined by business value, not by technical complexity.

---

## Phase 0 — Foundation & Legacy Protection
**Duration:** 3–5 days  
**Goal:** New repository exists, is deployable, and the legacy repository is protected.

### Deliverables
- [ ] `drexonyx-platform` GitHub repository created (name subject to CEO approval)
- [ ] `v1-legacy-snapshot` tag created on `drexonyx-v1/main`
- [ ] Branch protection enabled on `drexonyx-v1/main`
- [ ] New project scaffolded: Next.js 16+, TypeScript, NextAuth v5, Drizzle + Neon, ESLint, Vitest
- [ ] `db/schema/system.ts` — `audit_events` + `idempotency_keys` tables
- [ ] `db/schema/identity.ts` — `users` table
- [ ] Authentication working: login page → platform shell → redirect to `/command`
- [ ] Empty platform shell with module navigation sidebar
- [ ] GitHub Actions CI: lint + typecheck + test + build
- [ ] Vercel project created (staging deployment)
- [ ] `.env.example` with full variable inventory
- [ ] `ARCHITECTURE.md` and `CLAUDE.md` committed

### Success Criteria
- Developer (Claude Code) can log in to the new platform at the staging URL
- CI passes on every push
- `drexonyx-v1` remains completely untouched

### CEO Approvals Required Before Starting
- Confirm repository name `drexonyx-platform`
- Confirm Vercel account is available for a second project
- Confirm Neon account can support a second database (or second schema on same instance)

---

## Phase 1 — CEO Command Center (Skeleton)
**Duration:** 5–7 days  
**Goal:** The CEO has a working home screen that shows company state at a glance.

### Deliverables
- [ ] `/command` dashboard — empty-state design that makes the KPI tiles obvious
- [ ] `db/schema/command.ts` — `kpis`, `alerts`, `daily_briefs` tables
- [ ] Manual KPI entry: CEO can add/update company KPIs (revenue, active leads, tasks open)
- [ ] Alert system: CEO can create and dismiss alerts
- [ ] Platform sidebar navigation: all 11 module links, active state indicator
- [ ] Responsive design: works on desktop and mobile
- [ ] 50+ tests covering auth, command domain logic, audit logging

### Success Criteria
- CEO can log in, see the command dashboard, and manually track 3–5 key company metrics
- All navigation links render (even if modules are placeholder "coming soon" pages)
- Zero unhandled errors in Vercel logs

---

## Phase 2 — Human Approval & Security Controls
**Duration:** 4–5 days  
**Goal:** The approval and audit infrastructure is live before any agent or automation does anything.

**Rationale:** Build the security layer before the workforce layer. Approvals and audit logging must be rock-solid before agents start producing outputs.

### Deliverables
- [ ] `db/schema/agents.ts` — `agent_definitions`, `agent_tasks`, `agent_outputs` tables
- [ ] `db/schema/system.ts` expanded — settings table
- [ ] `/security/approvals` — list of pending approvals (empty initially)
- [ ] `/security/audit` — paginated audit log viewer
- [ ] `/security/access` — user management (CEO can add users, assign roles)
- [ ] Approval gate engine: `domain/security/approval-gate.ts`
- [ ] Every subsequent agent action routes through this gate
- [ ] 30+ tests covering approval policies, audit log immutability

### Success Criteria
- CEO can view the full audit log
- An agent output placed in `STAGED` state appears in the approval queue
- An approval cannot be bypassed — test confirms staged output requires human action

---

## Phase 3 — AI Agent Workforce (Core Infrastructure)
**Duration:** 7–10 days  
**Goal:** The agent execution engine is live and can run a real task.

### Deliverables
- [ ] Agent definition registry: `domain/agents/definitions/`
- [ ] Agent executor: `domain/agents/executor.ts` — input validation → AI call → output staging
- [ ] Anthropic Claude provider: `infrastructure/ai/anthropic.ts`
- [ ] Google Gemini fallback: `infrastructure/ai/gemini.ts`
- [ ] Task queue system: dispatch → running → staged → approved/rejected
- [ ] `/agents` dashboard — task queue with status, output preview, approve/reject buttons
- [ ] `/agents/tasks/:id` — task detail with full input, output, and audit trail
- [ ] First live agent: **Daily Brief Generator** — summarizes yesterday's activity across all modules into a paragraph for the CEO Command Center
- [ ] Test: 40+ tests covering executor, approval policies, AI provider mock

### Success Criteria
- CEO can trigger a "Generate Daily Brief" task
- The brief appears in the approval queue
- CEO approves it → it appears on the Command Center dashboard
- Rejecting a brief → it is discarded, logged, nothing is applied

---

## Phase 4 — Sales & Customer Acquisition
**Duration:** 10–14 days  
**Goal:** The full sales pipeline is operational. The CEO can track leads from discovery to conversion.

**Rationale:** Sales is the highest business priority — it generates revenue. Build it early.

### Deliverables
- [ ] `db/schema/sales.ts` — leads, lead_sources, outreach_messages, proposals, opt_outs, opt_out_tokens
- [ ] Lead pipeline: NEW → REVIEWING → QUALIFIED → OUTREACH_SENT → REPLIED → FOLLOW_UP → WON / REJECTED / ARCHIVED
- [ ] Migrate existing `LEAD_TRACKER.csv` data as seed
- [ ] Migrate existing `FLASH_DELIVERY_DUBAI_LEADS` prospects as leads
- [ ] AI Skills (ported from V1): `sales.lead.discover`, `sales.lead.qualify`, `sales.lead.score`
- [ ] AI Skill (ported from V1): `sales.outreach.draft`
- [ ] Outreach approval policy: proposals/pricing/non-email → `PENDING` (human must approve); standard cold outreach → `NOT_REQUIRED`
- [ ] Resend email integration: `infrastructure/email/resend.ts`
- [ ] Opt-out/unsubscribe system: `/api/unsubscribe` route
- [ ] Outreach sender with `SALES_OUTREACH_TEST_MODE` guard
- [ ] `/sales/pipeline` — Kanban board
- [ ] `/sales/leads/:id` — full lead profile with outreach history
- [ ] `/sales/outreach` — messages awaiting approval
- [ ] 60+ tests covering lead state machine, outreach approval, opt-out enforcement

### Success Criteria
- CEO can add a new lead, run discovery agent, see qualified lead with draft outreach
- Outreach draft appears in approval queue — CEO approves → email sends (test mode)
- Opting out removes an address from future sends, confirmed by test
- `SALES_OUTREACH_TEST_MODE=true` by default; no live emails until CEO explicitly sets it false

---

## Phase 5 — Knowledge Base
**Duration:** 7–10 days  
**Goal:** All company knowledge is structured, searchable, and maintained in one place.

### Deliverables
- [ ] `db/schema/knowledge.ts` — articles, documents, research_items, decisions, processes
- [ ] Seed from V1 business documents:
  - MDA Source of Truth → Knowledge article
  - MDA Demo Production Standard (T1–T13) → Process playbook
  - MDA Company Profile Production Standard → Process playbook
  - Approved pricing table → Products reference article
- [ ] AI-assisted article creation agent
- [ ] Natural language search across articles
- [ ] `/knowledge` search interface
- [ ] `/knowledge/articles/:id` — article detail with version history
- [ ] `/knowledge/decisions` — architecture decisions log (new series from decision #0001)
- [ ] `/knowledge/processes` — SOPs viewer

### Success Criteria
- CEO can search "MDA pricing" and find the approved service catalog
- CEO can search "demo QC" and find the demo production standard
- A new decision can be recorded in 2 minutes

---

## Phase 6 — Product Portfolio Management
**Duration:** 5–7 days  
**Goal:** The service catalog and demo library are managed in the platform.

### Deliverables
- [ ] `db/schema/products.ts` — service_catalog, pricing_tiers, demos, delivery_standards
- [ ] Seed MDA service catalog from approved pricing (all CEO-approved prices)
- [ ] Demo library: register the five live demo sites with metadata
- [ ] `/products/catalog` — full service catalog with pricing
- [ ] `/products/demos` — demo library with preview links and industry tags
- [ ] `/products/standards` — delivery standards per product (QC checklists)
- [ ] Agent: **Demo Availability Checker** — verifies the five demo URLs are still accessible

### Success Criteria
- CEO can see the full approved service catalog with correct prices
- All five demo sites are listed with preview links
- Clicking a demo opens the live Vercel URL

---

## Phase 7 — Finance & Business Reporting
**Duration:** 7–10 days  
**Goal:** The CEO has a clear financial view of the company without leaving the platform.

**Note:** This is a reporting and tracking layer, not a bookkeeping replacement.

### Deliverables
- [ ] `db/schema/finance.ts` — invoices, payments, expenses, financial_snapshots
- [ ] Manual invoice creation and tracking
- [ ] Payment status tracking (integrate Ziina webhook for automatic payment confirmation)
- [ ] Manual expense entry
- [ ] `/finance` — P&L summary (current month, YTD)
- [ ] `/finance/invoices` — invoice list with status
- [ ] `/finance/expenses` — expense log
- [ ] AI agent: **Monthly Financial Brief** — summarizes revenue and expenses for the month
- [ ] 30+ tests covering financial state machine, payment webhook

### Success Criteria
- CEO can record a payment and see it in the revenue total
- Ziina webhook arrival (simulated) correctly marks an invoice as paid
- Monthly brief agent produces a readable summary

---

## Phase 8 — Marketing Operations
**Duration:** 7–10 days  
**Goal:** Marketing content is planned, produced, reviewed, and published from one place.

### Deliverables
- [ ] `db/schema/marketing.ts` — campaigns, content_items, publishing_queue, analytics_snapshots
- [ ] Content calendar: schedule posts by platform and date
- [ ] Publishing queue: content stages for human review before any publish
- [ ] Facebook publish integration (ported from V1 `lib/skills/facebook-publish.ts`) with HUMAN_GATE
- [ ] AI agent: **Social Caption Writer** — generates post captions from briefing
- [ ] AI agent: **Content Calendar Planner** — suggests weekly content themes
- [ ] `/marketing/calendar` — visual content calendar
- [ ] `/marketing/queue` — content awaiting approval

### Success Criteria
- CEO can brief an agent on a topic, receive a draft caption, approve it, and have it queued for Facebook
- No post is ever published without CEO approval (HUMAN_GATE confirmed by test)

---

## Phase 9 — Task Management & Workflow Orchestration
**Duration:** 7–10 days  
**Goal:** All company tasks and recurring workflows are tracked in the platform.

### Deliverables
- [ ] `db/schema/tasks.ts` — tasks, workflows, workflow_steps, automation_rules
- [ ] Manual task creation with priority, deadline, owner, domain link
- [ ] Workflow templates: multi-step repeatable processes
- [ ] Automation rules: trigger → condition → action
- [ ] GitHub Actions cron integration for scheduled platform jobs
- [ ] `/tasks` — task board (Kanban)
- [ ] `/tasks/workflows` — workflow template library
- [ ] `/tasks/automations` — active automation rules

### Success Criteria
- CEO can create a task, link it to a lead, assign it a deadline
- A workflow template can be triggered and tracked step by step
- An automation rule fires correctly on its schedule

---

## Phase 10 — Software Development Operations
**Duration:** 5–7 days  
**Goal:** The CEO has visibility into all DREXONYX software project health without leaving the platform.

### Deliverables
- [ ] GitHub API integration (read-only token) `infrastructure/github/client.ts`
- [ ] Repository registry: list all DREXONYX repos with current CI status
- [ ] Deployment tracker: Vercel deployments with status and URL
- [ ] Technical debt register: manual entries for known issues
- [ ] `/devops` — project health overview
- [ ] `/devops/deployments` — recent deployments across all projects

### Success Criteria
- CEO can see the CI status of `drexonyx-v1` and `drexonyx-platform` on one screen
- Last deployment of `drexonyx.com` shows the commit, time, and status

---

## Phase 11 — Command Center Intelligence (Advanced)
**Duration:** Ongoing  
**Goal:** The Command Center becomes proactively intelligent — surfacing insights the CEO did not specifically request.

### Deliverables
- [ ] AI agent: **Command Center Briefer** — daily brief summarizing all module activity
- [ ] KPI trend analysis: week-over-week change indicators on all metrics
- [ ] Smart alerts: anomaly detection (no outreach sent in 7 days, revenue stalled, etc.)
- [ ] Natural language query interface for the CEO to ask questions about company state

---

## Milestone Summary

| Milestone | Phase | Key Output |
|---|---|---|
| M0 — Live skeleton | Phase 0 | New repo deployed, authentication working |
| M1 — CEO has a home | Phase 1 | Command dashboard with manual KPIs |
| M2 — Nothing runs without approval | Phase 2 | Approval gate + audit log live |
| M3 — First agent works | Phase 3 | Daily brief agent end-to-end |
| **M4 — First sale possible** | **Phase 4** | **Full sales pipeline + outreach approval** |
| M5 — All knowledge in one place | Phase 5 | Knowledge base seeded and searchable |
| M6 — Full product catalog | Phase 6 | Demos and pricing live in platform |
| M7 — Financial visibility | Phase 7 | Revenue and expense tracking |
| M8 — Marketing pipeline | Phase 8 | Content staging and social publishing |
| M9 — All tasks tracked | Phase 9 | Task board and workflow templates |
| M10 — Devops visibility | Phase 10 | All project health on one screen |

---

## Dependencies and Blockers

| Item | Blocks | Action Required By |
|---|---|---|
| CEO approves architecture + structure documents | Phase 0 start | CEO |
| CEO confirms repository name | Phase 0 | CEO |
| CEO confirms Neon can support a second DB (or new project) | Phase 0 | CEO |
| CEO confirms Vercel can host a second project | Phase 0 | CEO |
| CEO explicitly approves `SALES_OUTREACH_TEST_MODE=false` | Phase 4 go-live | CEO (after testing) |
| CEO explicitly approves `ZIINA_TEST_MODE=false` | Phase 7 go-live | CEO (after legal clearance) |
| Facebook Page Access Token confirmed available | Phase 8 | CEO |

---

## What is Explicitly Out of Scope in This Roadmap

| Item | Reason |
|---|---|
| Public customer-facing portal | Internal platform only in this roadmap |
| Android app | Separate product roadmap |
| Fleet Tracker | Separate product roadmap |
| Rebuilding V1 video production pipeline | Only if explicitly requested after platform is live |
| WhatsApp outbound sending | Not approved in V1; not in Phase 1–10 |
| Multi-tenant (multiple companies) | DREXONYX is single-tenant |

---

*End of Document 4 — DREXONYX_IMPLEMENTATION_ROADMAP.md*
