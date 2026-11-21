# DREXONYX — Implementation Roadmap

**Document version:** 2.0 (revised 2026-11-21)  
**Previous version:** 1.0 (11 phases, MDA-agency framing)  
**Prepared by:** Claude Code  
**Status:** DRAFT — AWAITING CEO REVIEW AND APPROVAL  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v1.0

---

## Guiding Principle

Build the smallest version that is immediately useful to the CEO, then expand. Each phase delivers a working, deployable increment. No phase is "setup only" — every phase has a usable output the CEO can operate in.

The roadmap follows the 6-phase structure confirmed by the CEO.

---

## Phase 0 — Blueprint and Approval ← CURRENT PHASE
**Goal:** Complete planning documents. CEO reviews and approves everything before any code is written.

**What is happening now:**
- Master Blueprint created (`_planning/DREXONYX_MASTER_BLUEPRINT.md`)
- All 5 supporting planning documents updated

**CEO gates before Phase 1 begins:**
- [ ] CEO approves DREXONYX_MASTER_BLUEPRINT.md
- [ ] CEO confirms repository name (proposed: `drexonyx-platform`)
- [ ] CEO confirms platform subdomain (proposed: `app.drexonyx.com`)
- [ ] CEO confirms database strategy (proposed: second free Neon account)
- [ ] CEO approves proposed technology stack (Next.js, Drizzle, Neon, Vercel, Auth.js)
- [ ] CEO confirms V1 public site strategy (proposed: keep V1 at drexonyx.com during build)

**Nothing is built until every gate above is checked.**

---

## Phase 1 — Fresh Project Foundation
**Goal:** A deployable, authenticated shell exists. Database is fresh and completely isolated from V1.

### What is delivered
- New GitHub repository created: `drexonyx-platform` (or CEO-approved name)
- Next.js (App Router, TypeScript) scaffolded from scratch — zero V1 code imported
- NextAuth v5: single CEO login (email + password, bcrypt hashed)
- Database: **new Neon project**, isolated from V1 — first schemas:
  - `system` — `audit_events` (append-only), `idempotency_keys`, `settings` (including `agent_emergency_stop`)
  - `identity` — `users`, `sessions`, `roles`
- Empty platform shell: authenticated route `/`, sidebar with all future module links
- GitHub Actions CI: lint + typecheck + test + build (every push)
- Vercel project created: `app.drexonyx.com` staging deployment
- `.env.example` with complete variable inventory and security classifications
- `ARCHITECTURE.md` and `CLAUDE.md` committed to new repository
- 30+ tests: auth, audit log immutability, emergency stop flag behavior

**Success criteria:** CEO can log in at the staging URL. CI passes on every push. Zero connection to V1. Audit log records every login.

**Duration estimate:** 3–5 days

---

## Phase 2 — CEO Command Center MVP
**Goal:** The CEO has a usable home screen and all safety infrastructure (approval queue, audit log, emergency stop) is live before any AI agent runs.

**Rationale:** Build the security layer before the workforce layer. Approvals and audit logging must be rock-solid before agents start producing outputs.

### What is delivered

**New database schemas:**
- `command` — `kpis`, `alerts`, `daily_briefs`
- `agents` — `definitions`, `task_queue`, `outputs` (all statuses including STAGED)

**Platform modules:**
- `/command` dashboard: KPI tiles (manual entry), alerts, company health view
- `/security/approvals`: unified approval queue (empty initially, ready to receive)
- `/security/audit`: paginated, filterable audit log viewer
- `/security/access`: user management (add users, assign roles)
- Emergency stop toggle: one action in `/security` suspends all agent task dispatch

**Domain logic:**
- Approval gate engine: `domain/security/approval-gate.ts`
- KPI state management: `domain/command/kpis.ts`
- Alert lifecycle: `domain/command/alerts.ts`

**Tests:** 50+ tests covering approval gate, audit log immutability, emergency stop enforcement, role-based authorization on every route

**Success criteria:**
- CEO can log in and see the command dashboard
- CEO can manually add/update KPIs
- Approval queue is live and renderable
- Emergency stop toggle works — sets `system.settings.agent_emergency_stop = true`, verified by test that no task dispatches when flag is true
- An approval cannot be bypassed — test confirms staged output requires human action to advance

**Duration estimate:** 4–6 days

---

## Phase 3 — AI Agent Workforce
**Goal:** The agent execution engine is live and running real tasks. Three permission levels are enforced.

### What is delivered

**Agent infrastructure:**
- Agent definition registry: `domain/agents/definitions/`
- Agent executor: `domain/agents/executor.ts`
  - Checks `agent_emergency_stop` flag before every dispatch
  - Validates permission level before executing
  - Writes all steps to audit log
- Anthropic Claude provider: `infrastructure/ai/anthropic.ts`
- Google Gemini fallback: `infrastructure/ai/gemini.ts`
- Task queue: queued → running → staged → approved/rejected
- Three permission level enforcement (non-negotiable):
  - **AUTONOMOUS** — executes and applies without human review
  - **POLICY-BOUND** — executes within defined limits, applies if within policy
  - **CEO-ONLY** — always stages output, never applies without CEO approval record

**Platform modules:**
- `/agents` dashboard: active task queue, staged outputs, approve/reject UI
- `/agents/tasks/:id`: full task detail — input, output, audit trail
- `/agents/definitions`: registry of all defined agent modules

**First live agent: Daily Brief Generator**
- Input: today's date + summary of yesterday's activity across modules
- Permission level: POLICY-BOUND (generates; CEO approves whether to publish to Command Center)
- Output: structured daily brief saved to `command.daily_briefs`

**Tests:** 40+ tests covering executor, permission level enforcement, approval policies, AI provider mock, emergency stop block

**Success criteria:**
- CEO triggers "Generate Daily Brief" → agent runs → output staged → approval queue shows it
- CEO approves brief → it appears on Command Center dashboard
- Rejecting a brief → discarded, logged, nothing applied
- An agent with CEO-ONLY permission level cannot execute without an approval record — confirmed by test
- Emergency stop → no new tasks dispatch

**Duration estimate:** 7–10 days

---

## Phase 4 — Business Operations Core
**Goal:** Sales pipeline, Knowledge Base, and Product Portfolio are operational. The CEO can run DREXONYX's commercial engine from the platform.

### What is delivered

#### 4A — Sales Pipeline
**New schema:** `sales` — leads, outreach, proposals, opt_outs, opt_out_tokens

- Lead pipeline: NEW → REVIEWING → QUALIFIED → OUTREACH_DRAFT → OUTREACH_APPROVED → SENT → REPLIED → WON / REJECTED / ARCHIVED
- Outreach approval gate: ALL outreach requires CEO approval before sending (CEO-ONLY permission)
- Resend integration: `SALES_OUTREACH_TEST_MODE=true` by default; no live email until CEO explicitly authorizes
- Opt-out/unsubscribe system: `/api/unsubscribe` route, enforced before every send
- AI skills (written fresh — not imported from V1):
  - `sales.lead.discover` — research a lead from public sources (AUTONOMOUS)
  - `sales.lead.qualify` — assess fit against criteria (AUTONOMOUS)
  - `sales.lead.score` — 0–100 priority score (AUTONOMOUS)
  - `sales.outreach.draft` — draft cold outreach message (POLICY-BOUND → staged for CEO approval)
- Platform modules: `/sales/pipeline` (Kanban), `/sales/leads/:id`, `/sales/outreach` (approval queue)
- 60+ tests: lead state machine, outreach approval, opt-out enforcement

#### 4B — Knowledge Base
**New schema:** `knowledge` — articles, documents, research, decisions, processes

- Seed from V1 MDA business documents (manual review — reference only, not automated import):
  - MDA Source of Truth → Knowledge article
  - MDA Demo Production Standard (T1–T13) → Process playbook
  - MDA Company Profile Production Standard → Process playbook
  - CEO-approved pricing table → Products reference article
- AI-assisted article creation (AUTONOMOUS for drafts, CEO-ONLY for publishing)
- `/knowledge` search interface, `/knowledge/decisions`, `/knowledge/processes`

#### 4C — Product Portfolio
**New schema:** `products` — catalog, versions, licenses, customers, support_tickets

- Register all 4 initial DREXONYX software products:
  - CBMS — Commercial Brokerage Management System
  - RMS — Retail Management System
  - Auto Workshop Management System
  - DREXONYX International Trade System
- For each product: specification, version history, license registry, customer registry, development status
- Also register MDA website/digital services (if MDA operations continue — CEO to confirm in D10)
- Register the five demo sites with live Vercel URLs and industry tags
- `/products` management interface, `/products/catalog`, `/products/demos`

**Success criteria for Phase 4:**
- Lead-to-outreach workflow operational (test mode — no live emails)
- All 4 software products registered in catalog
- MDA knowledge seeded and searchable
- CEO can add a lead, run discovery agent, see qualified lead with draft outreach in approval queue

**Duration estimate:** 12–16 days

---

## Phase 5 — Expansion
**Goal:** All command center modules operational. Finance, Marketing, Tasks, and DevOps are live.

### What is delivered

#### 5A — Finance & Business Reporting
**New schema:** `finance` — invoices, payments, expenses, financial_snapshots

- Manual invoice creation and tracking
- Ziina webhook (new credentials): payment confirmation → invoice update
- Manual expense entry
- `/finance` — P&L summary (current month, YTD)
- AI agent: Monthly Financial Brief (POLICY-BOUND)
- `ZIINA_TEST_MODE=true` default; remains true until CEO authorizes with business/legal clearance

#### 5B — Marketing Operations
**New schema:** `marketing` — campaigns, content_items, publishing_queue, analytics_snapshots

- Content calendar: schedule posts by platform and date
- Publishing queue: content stages for CEO review before any publish (CEO-ONLY)
- Facebook organic publishing integration (if approved by CEO — PENDING CEO DECISION D10)
- AI agent: Social Caption Writer (POLICY-BOUND → staged)
- AI agent: Content Calendar Planner (AUTONOMOUS)

#### 5C — Task Management
**New schema:** `tasks` — tasks, workflows, workflow_steps, automation_rules

- Manual task creation with priority, deadline, owner, domain link
- Workflow templates: multi-step repeatable processes
- GitHub Actions cron integration for scheduled platform jobs
- `/tasks` board, `/tasks/workflows`

#### 5D — DevOps Visibility
- GitHub API integration (read-only token)
- Repository registry: all DREXONYX repos with CI status
- Deployment tracker: Vercel deployments
- `/devops` project health overview

**Duration estimate:** 14–20 days

---

## Phase 6 — Selective Legacy Cleanup
**Goal:** Remove approved obsolete V1 resources after verifying they are not needed. No action before this phase.

**Principle:** Each deletion item gets individual CEO approval. Nothing is deleted as a batch.

### What is in scope
- CEO reviews full cleanup inventory (Master Blueprint, Part VIII)
- Each deletion approved individually by CEO
- Specific candidates:
  - Root-level research dump files (25+) in `drexonyx-v1` → delete after backup confirmation
  - Old Vercel preview deployments → delete via Vercel dashboard
  - Unused Neon database branches (V1 dev branches) → delete via Neon dashboard
  - `android-apk/` debug builds → delete after CEO confirms
  - `test-projects/` directory → delete after CEO confirms
  - V1 public site → replace with new public DREXONYX website (if scoped by CEO in Phase 5+)

**Gate:** No item is deleted without written CEO sign-off on that specific item.

**Duration estimate:** Ongoing — not time-bounded

---

## Milestone Summary

| Milestone | Phase | Key Output |
|---|---|---|
| M0 — All planning approved | Phase 0 | CEO sign-off on 6 planning documents |
| M1 — Live foundation | Phase 1 | New repo deployed, authenticated, isolated DB |
| M2 — Command center live | Phase 2 | CEO home screen, approval queue, emergency stop |
| M3 — First agent runs | Phase 3 | Daily brief agent end-to-end, permission levels enforced |
| **M4 — Commercial engine live** | **Phase 4** | **Sales pipeline + Knowledge Base + all 4 products registered** |
| M5 — Full platform | Phase 5 | Finance, Marketing, Tasks, DevOps modules |
| M6 — Clean slate | Phase 6 | Legacy resources pruned (CEO-approved per item) |

---

## Explicit Out-of-Scope Items

| Item | Why Out of Scope |
|---|---|
| Public DREXONYX website rebuild | V1 continues at drexonyx.com during Phases 1–5; rebuild is a Phase 5+ decision |
| Client-facing customer portal | Internal-only platform |
| Android native apps | Separate product; separate timeline (PENDING CEO DECISION) |
| Fleet Tracker | Separate product; not part of new platform (PENDING CEO DECISION) |
| WhatsApp outbound sending | Not approved; not in Phase 1–5 |
| Multi-tenancy | DREXONYX is single-tenant |
| UGC video production pipeline (Higgsfield) | Only if explicitly approved after platform is live |
| SSB (Social Seller Bot) | V1-only feature; not rebuilt unless CEO requests |

---

## Safety Flags (Always True by Default)

| Flag | Default | Change requires |
|---|---|---|
| `SALES_OUTREACH_TEST_MODE` | `true` | Explicit CEO authorization |
| `ZIINA_TEST_MODE` | `true` | CEO authorization with business/legal clearance |
| `agent_emergency_stop` | `false` (agents active) | CEO toggle in `/security` |

**All three flags are enforced in code, tested in CI, and cannot be bypassed programmatically.**

---

*Document version: 2.0 — Revised 2026-11-21 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v1.0*  
*Supersedes: v1.0 (11-phase plan from 2026-11-21)*
