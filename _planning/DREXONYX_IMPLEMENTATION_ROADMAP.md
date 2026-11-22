# DREXONYX — Implementation Roadmap

**Document version:** 3.3 (revised 2026-11-22)  
**Previous version:** 3.2 (Phase 0 "What is complete" referenced Master Blueprint v3.1 and supporting documents v3.1; Phase 0 CEO gates still listed D1 as a pending gate despite CEO confirmation in Master Blueprint Parts II and XIII; Phase 4C MDA operations reference used D10 — D10 is Android, D2 is MDA sub-brand direction; Phase 5B Facebook publishing incorrectly cited D10; Phase 3 tests did not cover activation rejection or bypass prevention)  
**Prepared by:** Claude Code  
**Status:** PHASE 0 — DOCUMENTATION COMPLETE, CEO APPROVAL PENDING  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v3.3

---

## Guiding Principle

Build the smallest version that is immediately useful to the CEO, then expand. Each phase delivers a working, deployable increment. No phase is "setup only" — every phase has a usable output the CEO can operate in.

The roadmap follows the 6-phase structure confirmed by the CEO.

---

## Phase 0 — Blueprint and Approval ← CURRENT PHASE
**Status: DOCUMENTATION COMPLETE, CEO APPROVAL PENDING**

**Goal:** Deliver complete, coherent planning documents for CEO review. Phase 1 is blocked until the CEO explicitly approves the Master Blueprint and authorizes repository creation.

**What is complete:**
- Master Blueprint v3.2 (`_planning/DREXONYX_MASTER_BLUEPRINT.md`)
- All 5 supporting planning documents at v3.2
- Three-system separation documented (CEO Command Center / Public Website / Commercial Products)
- Authoritative CEO Decision Register established (D1–D11)

**CEO gates before Phase 1 begins:**

| Gate | Category | Blocks what? |
|---|---|---|
| Approve DREXONYX_MASTER_BLUEPRINT.md v3.2 | Strategic | Phase 1 System A — nothing starts without this |
| D1 — Company direction: DREXONYX is an AI-Native Technology Company | **CEO CONFIRMED (2026-11-21)** | No longer a pending gate — confirmed in Master Blueprint Part II and Part XIII |
| Decide D7 (Neon strategy: second free account vs. upgrade — requires account verification first) | Requires verification | Phase 1 System A — determines database setup |
| Confirm technology stack direction | Technical | Phase 1 System A — Claude has recommended; CEO confirms or redirects |
| Decide D4 (public website strategy: Option A, B, or C) | Strategic | **System B work only** — does NOT block CEO Command Center Phase 1 |
| Decide D2 (MDA sub-brand direction) | Strategic | **Phase 4 (Knowledge Base seeding)** — does NOT block Phase 1–3 |
| Decide D8 (Resend sender domain: verify before Phase 4 outreach) | Requires verification | **Phase 4 only** — does NOT block Phase 1–3 |

**CEO decisions deferred to Phase 4–6:** D3 (product priorities), D5 (lead data), D6 (Stripe), D9 (Fleet Tracker), D10 (Android), D11 (demo sites) — do not delay Phase 1 start for these.

**Phase 1 remains blocked until the CEO explicitly states: "Proceed to Phase 1 — create the repository."**

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
- Emergency stop toggle: one action in `/security` enables or disables all agent task dispatch
- **Initial state: agents disabled.** `system.settings.agent_emergency_stop` is seeded as `true`. No agents run until the CEO completes the activation checklist below.

**Domain logic:**
- Approval gate engine: `domain/security/approval-gate.ts`
- KPI state management: `domain/command/kpis.ts`
- Alert lifecycle: `domain/command/alerts.ts`

**Tests:** 50+ tests covering approval gate, audit log immutability, emergency stop enforcement, role-based authorization on every route

**Phase 2 success criteria:**
- CEO can log in and see the command dashboard
- CEO can manually add/update KPIs
- Approval queue is live and renderable
- Emergency stop mechanism verified end-to-end: set true → dispatch blocked; set false → dispatch resumes
- An approval cannot be bypassed — test confirms staged output requires human action to advance

**Agent activation gate (CEO completes before Phase 3 begins):**
- [ ] Agent permissions configured in `/security`
- [ ] At least one execution policy defined and reviewed
- [ ] Audit logging verified: test actions appear correctly in `audit_events`
- [ ] Emergency stop tested end-to-end (see success criteria above)
- [ ] CEO explicitly sets `agent_emergency_stop = false` via `/security` to enable agents

**Activation is enforced programmatically.** The server action that processes this request checks all prerequisites and rejects it if any are unmet. The CEO cannot enable agents by directly writing to the database — the check runs at the application layer.

**Agents remain disabled until every item above is checked.** Phase 3 begins only after CEO enables agents.

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

**Tests:** 40+ tests covering:
- **Unauthorized dispatch:** `agent_emergency_stop = true` → dispatch endpoint returns rejection; task record is not created
- **Policy-limit violation:** POLICY-BOUND task exceeds configured daily limit → task escalated to CEO-ONLY queue; not auto-applied; audit event written
- **Approval bypass:** CEO-ONLY task without an approval record in `security.approvals` → hard reject at executor; task enters error state; nothing is applied
- **Emergency-stop enforcement:** flag set to `true` while tasks are queued → no new dispatches; running task halts at next checkpoint and writes halt event to audit log
- **AI provider mock:** all Anthropic API calls mocked; executor tests do not make real API calls; output schema validation tested independently
- **Output staging:** AUTONOMOUS output passes content safety → auto-applied; POLICY-BOUND output within policy → applied; outside policy → staged for review; CEO-ONLY → always staged regardless of content
- **Activation rejected**: activation server action called with prerequisites unmet → action rejects; `agent_emergency_stop` remains `true`; rejection event written to `audit_events`
- **No bypass path**: all server actions and API routes touching `system.settings.agent_emergency_stop` enumerated in test; none set it to `false` without the prerequisite check running

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

- Lead pipeline: NEW → REVIEWING → QUALIFIED → OUTREACH_DRAFT → SENT *(POLICY-BOUND path: within policy)* or OUTREACH_PENDING_APPROVAL → OUTREACH_APPROVED → SENT *(CEO-ONLY escalation path: limit exceeded or no policy)* → REPLIED → WON / REJECTED / ARCHIVED
- Outreach execution model: **POLICY-BOUND** within approved templates, daily volume limits, and opted-in or verified prospect lists. When a POLICY-BOUND dispatch would exceed any policy limit, or when no policy applies, it escalates to **CEO-ONLY**. The outreach draft agent generates the message; execution follows the permission level for that action and policy context.
- Resend integration: `SALES_OUTREACH_TEST_MODE=true` by default. All outreach is redirected to the test address. No live email is sent until the CEO explicitly disables test mode and confirms outreach policies are set. Disabling test mode is a separate CEO action — it is not part of the Phase 2 agent activation checklist.
- Opt-out/unsubscribe system: `/api/unsubscribe` route, enforced before every send regardless of permission level
- AI skills (written fresh — not imported from V1):
  - `sales.lead.discover` — research a lead from public sources (AUTONOMOUS)
  - `sales.lead.qualify` — assess fit against criteria (AUTONOMOUS)
  - `sales.lead.score` — 0–100 priority score (AUTONOMOUS)
  - `sales.outreach.draft` — draft and prepare outreach for dispatch (POLICY-BOUND: executes within approved templates and daily limits; escalates to CEO-ONLY if no policy matches or any limit would be exceeded)
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
- Also register MDA website/digital services (if MDA operations continue — CEO to confirm in D2 — MDA sub-brand direction)
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
- Facebook organic publishing integration (if approved by CEO — PENDING CEO DECISION; not in D1–D11 register, requires explicit Phase 5 CEO approval)
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
| Public DREXONYX website rebuild | PENDING CEO DECISION (D4) — Options A/B/C defined in Master Blueprint Part VI.B; no assumption made |
| Client-facing customer portal | Internal-only platform |
| Android native apps | Separate product; separate timeline (PENDING CEO DECISION) |
| Fleet Tracker | Separate product; not part of new platform (PENDING CEO DECISION) |
| WhatsApp outbound sending | Not approved; not in Phase 1–5 |
| Multi-tenancy | DREXONYX is single-tenant |
| UGC video production pipeline (Higgsfield) | Only if explicitly approved after platform is live |
| SSB (Social Seller Bot) | V1-only feature; not rebuilt unless CEO requests |

---

## Safety Flags (Always True by Default)

| Flag | Initial value | Meaning | Change requires |
|---|---|---|---|
| `SALES_OUTREACH_TEST_MODE` | `true` | All outreach emails redirected to test address; no live sends | Explicit CEO authorization |
| `ZIINA_TEST_MODE` | `true` | Payment processing in test mode; no real transactions | CEO authorization with business/legal clearance |
| `agent_emergency_stop` | `true` (**agents disabled**) | All agent dispatch blocked; no tasks run | CEO sets to `false` after completing Phase 2 agent activation checklist |

**All three flags are enforced in code, tested in CI, and cannot be bypassed programmatically.**

**Important:** `agent_emergency_stop = true` is not a temporary setup state — it is the deliberate initial state. Agents do not run until the CEO explicitly enables them after completing the Phase 2 activation checklist. Having the emergency stop mechanism available does not mean agents are permitted to start.

---

*Document version: 3.3 — Revised 2026-11-22 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v3.3*  
*Supersedes: v3.2 (Phase 0 "What is complete" referenced v3.1 planning documents; Phase 0 CEO gates listed D1 as pending despite CEO confirmation; Phase 4C cited D10 for MDA sub-brand — D2 is correct; Phase 5B cited D10 for Facebook publishing — no D-number applies; Phase 3 tests lacked activation rejection and bypass prevention test cases)*
