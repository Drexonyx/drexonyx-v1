# DREXONYX — New Platform Architecture

**Document version:** 2.0 (revised 2026-11-21)  
**Previous version:** 1.0 (MDA-agency framing, no AI permission levels)  
**Prepared by:** Claude Code  
**Status:** DRAFT — AWAITING CEO REVIEW AND APPROVAL  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v1.0

---

## 1. Vision and Absolute Fresh Start

**DREXONYX is an AI-Native Technology Company.** The company's business scope spans 10 domains: Software Products, Custom Software Solutions, AI Solutions, Business Automation, Enterprise Systems, CRM and Management Systems, Web Applications, E-commerce and Digital Platforms, Technology Integration, and Future Technology. MDA (Master Digital Agency) is a sub-brand, not the company's identity.

DREXONYX is building an **AI-Native Company Operating System** — a single internal platform through which the Founder/CEO commands and observes the entire company. Every business domain — sales, production, marketing, finance, knowledge, task orchestration, product portfolio — is a module within this platform. AI agents act as the company's digital workforce; humans retain authority over all consequential decisions.

**Absolute Fresh Start Requirement (CEO Decision 2026-11-21):**
The new platform is a genuinely new creation. This means:
- New GitHub repository (no code carried from `drexonyx-v1`)
- New database project (no connection to V1 Neon databases)
- New authentication system (not shared with V1)
- New environment configuration (separate API keys per platform)
- Patterns from V1 are referenced and rebuilt fresh — never copied

This is not a migration, reorganization, or refactor of V1. It is a new platform.

This platform is not a customer-facing SaaS product. It is the internal nervous system of DREXONYX itself.

---

## 2. Design Principles

| # | Principle | What it means in practice |
|---|---|---|
| P1 | **CEO-first** | Every screen, every report, every queue answers one question: "What does the CEO need to decide or know right now?" |
| P2 | **AI agents as workforce, humans as authority** | Agents research, draft, produce, and propose. Humans approve, reject, and override. No agent takes a consequential external action without approval. |
| P3 | **Single source of truth** | All company knowledge, decisions, and business data live in one structured system. No document scatter across chat threads, Google Docs, and spreadsheets. |
| P4 | **Audit everything** | Every action — human or agent — is logged. The platform is always explainable and reversible. |
| P5 | **Zero unnecessary subscriptions** | Prefer existing infrastructure (GitHub, Vercel, Neon, Cloudflare). Pay only for what delivers clear business value. |
| P6 | **Clean architecture from day one** | No scope creep, no technical debt inheritance from V1. Each module is independently buildable and testable. |
| P7 | **Security by default** | Server-side authorization on every request. No client-trusted data. Secrets never in source code or browser. |

---

## 3. Platform Modules

The platform is organized into 11 domains. Each domain is a fully owned module with its own database schema, API routes, UI pages, and agent integrations.

```
┌─────────────────────────────────────────────────────────┐
│                  CEO COMMAND CENTER                     │
│         (Unified view — decisions, KPIs, alerts)        │
└──────┬──────────────────────────────────────────┬───────┘
       │                                          │
       ▼                                          ▼
┌──────────────┐                        ┌──────────────────┐
│  AI AGENT    │                        │  HUMAN APPROVAL  │
│  WORKFORCE   │                        │  & SECURITY      │
│  (Dispatch,  │◄──── Approval ────────►│  CONTROLS        │
│   Monitor,   │      Gates             │  (Approval queue,│
│   Review)    │                        │   Audit log,     │
└──────┬───────┘                        │   Access ctrl)   │
       │ Tasks feed into                └──────────────────┘
       ▼
┌──────────────────────────────────────────────────────────┐
│                   BUSINESS DOMAINS                       │
├─────────────┬──────────────┬──────────────┬─────────────┤
│  COMPANY    │   KNOWLEDGE  │   PRODUCT    │   DEVOPS    │
│  MANAGEMENT │   BASE       │   PORTFOLIO  │             │
├─────────────┼──────────────┼──────────────┼─────────────┤
│    SALES &  │  MARKETING   │   FINANCE &  │    TASK     │
│  CUSTOMER   │  OPERATIONS  │  REPORTING   │  MANAGEMENT │
│ ACQUISITION │              │              │             │
└─────────────┴──────────────┴──────────────┴─────────────┘
```

### 3.1 CEO Command Center
**Purpose:** The first screen the CEO sees. Real-time company health, pending decisions, today's priorities.

**Core views:**
- Company Health Dashboard — KPIs across all domains (revenue pipeline, active leads, tasks due, agent queue)
- Decisions Pending — approval queue surfaced from all modules
- Daily Brief — AI-generated summary of overnight activity, top priorities, alerts
- Company Alerts — anomalies, blockers, urgent items from any module

### 3.2 AI Agent Workforce
**Purpose:** Define, dispatch, monitor, and review the work of AI agents across all business domains.

**Core views:**
- Agent Registry — all defined agents, their capabilities, and current status
- Task Queue — dispatched tasks with status (queued / running / awaiting review / completed)
- Agent Outputs — results staged for review before any external action
- Performance — agent success rate, average task time, error patterns

**Key design rule:** An agent's output is never automatically published, sent, or applied. It enters a "staged" state and requires human review before proceeding.

### 3.3 Company Management
**Purpose:** Official company records, settings, team, and documents.

**Core views:**
- Company profile (name, brand, domains, contacts, legal identity)
- Team directory (users, roles, permissions)
- Official documents (contracts, registrations, certificates)
- Brand assets (logos, fonts, colors, templates)

### 3.4 Company Knowledge Base
**Purpose:** Structured, queryable repository of everything DREXONYX knows — about its market, products, customers, processes, and competitors.

**Core views:**
- Articles / documents — categorized knowledge entries
- Research library — market research, competitor analysis, pricing studies
- Process playbooks — SOPs for every repeatable operation
- Decisions log — why each major decision was made and by whom
- AI-searchable interface — natural language queries against the knowledge base

### 3.5 Product Portfolio Management
**Purpose:** Manage all DREXONYX software products and services — from development status through licensing, customers, and support.

**Initial software products (CEO-confirmed 2026-11-21):**
1. **CBMS** — Commercial Brokerage Management System
2. **RMS** — Retail Management System
3. **Auto Workshop Management System**
4. **DREXONYX International Trade System**

**Core views:**
- Software product catalog — all 4 initial products with version history, development status, pricing tiers
- License registry — licenses issued per product, expiry tracking
- Customer registry — clients using each product
- Support tickets — per-product support management
- Demo library — the five website demo sites and future demos (organized by industry)
- Delivery standards — per-service QC checklists and production standards
- MDA service catalog — if MDA operations continue (pending CEO Decision D10)

### 3.6 Software Development Operations
**Purpose:** Track the health of all DREXONYX software projects, deployments, and technical work.

**Core views:**
- Project registry — all repos, branches, deployment status
- Build & deployment status — Vercel deployments, CI results
- Technical debt register — known issues, deferred items
- Test suite health — test coverage, failure trends

### 3.7 Sales & Customer Acquisition
**Purpose:** Manage the full sales funnel from lead discovery through conversion.

**Core views:**
- Lead pipeline — Kanban from NEW through WON/REJECTED
- Outreach queue — drafted messages awaiting review and send
- Proposals — pending and sent proposals with payment status
- Conversion tracking — funnel metrics, channel performance
- Opt-out registry — email opt-outs, compliance records

### 3.8 Marketing Operations
**Purpose:** Plan, produce, and publish marketing content. Track campaign performance.

**Core views:**
- Content calendar — scheduled posts and campaigns
- Asset library — approved marketing materials
- Publishing queue — content staged for social/web publishing
- Campaign tracker — active campaigns, spend, results
- Social analytics — engagement, reach, follower trends

### 3.9 Finance & Business Reporting
**Purpose:** Track company revenue, costs, and financial health. No bookkeeping replacement — reporting and visibility only in Phase 1.

**Core views:**
- Revenue tracker — invoices, payments received, payment links
- Expense register — costs by category
- P&L summary — month-to-date, year-to-date
- Cash flow view — upcoming inflows/outflows
- Financial reports — weekly/monthly snapshots

### 3.10 Task Management & Workflow Orchestration
**Purpose:** Assign, track, and automate tasks. Connect tasks to agents and approvals.

**Core views:**
- Task board — all active tasks by domain and owner
- Workflow templates — repeatable multi-step processes
- Automation rules — trigger-condition-action definitions
- Scheduled jobs — recurring automations with execution history

### 3.11 Human Approval & Security Controls
**Purpose:** Central registry of all pending approvals and security controls. The human override layer for every AI and automated action.

**Core views:**
- Approval queue — consolidated list of everything awaiting human decision
- Audit log — append-only record of every action taken in the platform
- Security rules — which actions require approval, by whom
- API key management — external credentials catalog (names only, never values)
- Access control — user roles and permission assignments

---

## 4. Architecture Layers

The platform follows a strict layered dependency model. Inner layers never depend on outer layers.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRESENTATION                                                        │
│  Next.js App Router — Server Components, Client Components,          │
│  Server Actions, Dynamic Routes per domain                           │
├─────────────────────────────────────────────────────────────────────┤
│  APPLICATION                                                         │
│  API Routes (/api/**), Server Actions — orchestrate use cases        │
│  No business rules here. Coordinate Domain + Services.               │
├─────────────────────────────────────────────────────────────────────┤
│  DOMAIN / BUSINESS RULES                                             │
│  One module per platform domain. Framework-agnostic TypeScript.      │
│  State machines, invariants, approval policies, agent definitions.   │
├─────────────────────────────────────────────────────────────────────┤
│  SERVICES                                                            │
│  Typed interfaces for all external capabilities:                     │
│  IEmailService, IAIProvider, IStorageService, IPaymentService, etc. │
├─────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                                      │
│  Concrete implementations: Drizzle/Neon, Cloudflare R2,             │
│  Resend, Anthropic SDK, Higgsfield, Ziina, GitHub API               │
├─────────────────────────────────────────────────────────────────────┤
│  EXTERNAL PROVIDERS                                                  │
│  Neon · Cloudflare · Anthropic · Resend · Vercel · GitHub · Ziina   │
└─────────────────────────────────────────────────────────────────────┘
```

**Rules (non-negotiable):**
- Dependencies point inward only: Presentation → Application → Domain → Services → Infrastructure → External
- No browser-to-database calls. All data access is server-side.
- No business logic in API routes. Routes coordinate; domain modules decide.
- Secrets are injected by the platform (Vercel env vars). Never in source code.

---

## 5. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Proven, existing team familiarity, Vercel-native |
| Auth | NextAuth v5 | Already integrated, battle-tested in V1 |
| Database ORM | Drizzle ORM | Type-safe, migration-based, proven in V1 |
| Database | Neon PostgreSQL | Serverless, free tier, existing account |
| File Storage | Cloudflare R2 | S3-compatible, free tier, existing account |
| AI Provider | Anthropic API (Claude models) | Best-in-class reasoning, existing API key |
| AI Fallback | Google Gemini API | Secondary provider for cost optimization |
| Email | Resend | Existing account, transactional + outreach |
| Payments | Ziina | UAE-first, AED, existing integration |
| Deployment | Vercel | Existing account, GitHub integration |
| Version Control | GitHub | Existing organization and repo |
| CI/CD | GitHub Actions | Free, proven workflow in V1 |
| Testing | Vitest | Existing, fast, TypeScript-native |

**Not introduced for the new platform (unless CEO approves):**
- No new SaaS subscriptions
- No paid CRM, Notion, Jira, Slack (use built-in modules)
- No separate database services
- No containerized infrastructure (Vercel serverless handles this)

---

## 6. Authentication & Authorization Model

The new platform is an **internal tool**. There is no public registration.

**User types:**
| Role | Access | Description |
|---|---|---|
| `ceo` | All modules, all actions | Founder/CEO — no restrictions |
| `staff` | Assigned modules only | Future team members, limited scope |
| `agent` | Programmatic write-access to task queue and outputs only | AI agents acting on behalf of the platform |

**Rules:**
- NextAuth v5, Credentials provider (email + password, bcrypt hashed)
- Session carries `role`, `userId` — never trusted from client payload
- All routes under `/` require authentication (no public portal)
- Every consequential action checks role server-side before executing
- Agent actions use a separate API key mechanism, not user sessions

---

## 7. AI Agent Architecture

### 7.1 Three Permission Levels (CEO-Confirmed 2026-11-21)

Every agent action is classified into exactly one of three permission levels. No agent may change its own permission level.

**AUTONOMOUS** — Executes and applies without human review
- Generating draft text, reports, summaries for internal review
- Analyzing data and producing structured output
- Discovering and enriching prospect data from public sources
- Scoring and classifying leads
- Generating daily/weekly company briefs
- Running status checks and QC reports

**POLICY-BOUND** — Executes within defined policies; applies if within policy limits
- Drafting outreach messages (within approved templates, within daily volume limits)
- Scheduling tasks and reminders
- Updating project status records
- Queuing content for publishing (not publishing itself)

**CEO-ONLY** — Never executes without an explicit human approval record. Any agent action in this category that proceeds without an approval record in `security.approvals` is a code defect — not a configuration choice.
- Sending any external communication (email, social, any channel)
- Publishing any content to external platforms
- Creating, modifying, or deleting financial records
- Issuing invoices or processing payments
- Making any change to external service configuration
- Deleting any record from the system (soft or hard)
- Making strategic, legal, or ownership decisions

### 7.2 Emergency Stop

A `agent_emergency_stop` boolean in `system.settings` controls all agent dispatch. When `true`:
- No new tasks are dispatched
- Running tasks complete their current step and halt before the next
- The CEO toggles this in `/security`
- All emergency stop events are logged to `audit_events` with timestamp and actor

### 7.3 Agent Contract

Agents are typed TypeScript modules following a defined contract:

```typescript
interface AgentDefinition<TInput, TOutput> {
  id: string                             // e.g. "sales.lead.discover"
  name: string
  domain: PlatformDomain
  permissionLevel: 'AUTONOMOUS' | 'POLICY_BOUND' | 'CEO_ONLY'
  inputSchema: ZodSchema<TInput>
  outputSchema: ZodSchema<TOutput>
  policyCheck?: (output: TOutput, policy: AgentPolicy) => boolean  // for POLICY_BOUND
  execute: (input: TInput, context: AgentContext) => Promise<TOutput>
}
```

**Execution model:**
1. Executor checks `agent_emergency_stop` flag — if true, task is not dispatched
2. Task is queued with input, metadata, and permission level recorded
3. Agent executes — calls AI API, processes results
4. Output is written to `agent_outputs` table with status `STAGED`
5. AUTONOMOUS: auto-applies if output passes content safety check
6. POLICY_BOUND: applies if output is within policy limits; otherwise surfaces for review
7. CEO_ONLY: always surfaces in CEO Command Center and Approval queue — never auto-applies
8. Human approves/rejects → action executes or is discarded
9. All steps written to audit log

---

## 8. Database Architecture

One PostgreSQL instance (Neon), multiple schemas:

| Schema | Tables | Owner module |
|---|---|---|
| `identity` | users, sessions, roles | Auth |
| `command` | kpis, alerts, daily_briefs | CEO Command Center |
| `knowledge` | articles, documents, research_items, decisions | Knowledge Base |
| `products` | service_catalog, pricing_tiers, demos, delivery_standards | Products |
| `sales` | leads, lead_sources, outreach_messages, proposals, opt_outs | Sales |
| `marketing` | campaigns, content_items, publishing_queue, analytics_snapshots | Marketing |
| `finance` | invoices, payments, expenses, financial_snapshots | Finance |
| `tasks` | tasks, workflows, workflow_steps, automation_rules | Tasks |
| `agents` | agent_definitions, agent_tasks, agent_outputs | Agents |
| `system` | idempotency_keys, audit_events, settings | System-wide |

**Design patterns (inherited from V1, proven):**
- CAS (Compare-And-Swap) state transitions with `WHERE status = 'EXPECTED'`
- Idempotency keys on all external operations and webhooks
- Append-only audit_events table — never updated, never deleted
- All foreign keys reference `identity.users.id` or domain-local records

---

## 9. Security Baseline

These rules apply to all code, all modules, forever:

1. **No server-side logic in browser code.** `NEXT_PUBLIC_` variables contain no secrets.
2. **Server-side authorization on every request.** UI hiding is never authorization.
3. **Webhook handlers verify HMAC signatures before processing.**
4. **Idempotency keys guard all external mutations.**
5. **Audit log is append-only.** No delete or update operations on `audit_events`. Ever.
6. **Approval gates cannot be bypassed programmatically.** Only a human approval record in `security.approvals` advances a CEO-ONLY action.
7. **CEO-ONLY agent outputs are always staged.** Auto-apply is a code defect for this permission level.
8. **Test mode flags are `true` by default.** (`SALES_OUTREACH_TEST_MODE=true`, `ZIINA_TEST_MODE=true`). Changing either to `false` requires explicit CEO authorization.
9. **Emergency stop is enforced before every task dispatch.** If `system.settings.agent_emergency_stop = true`, no task is dispatched regardless of permission level.
10. **No secrets in Git history.** `.env.local` is gitignored. Never commit credentials.
11. **Financial records are created by domain logic, never by agents directly.**
12. **No database credentials shared between the new platform and V1.**
13. **No API keys shared between the new platform and V1.** Separate keys per platform.

---

## 10. What Requires CEO Approval Before Implementation Begins

See DREXONYX_MASTER_BLUEPRINT.md, Part XI for the complete list of 14 CEO decisions (D1–D14).

The minimum approvals required before Phase 1 begins:

| Decision | Item | Proposal |
|---|---|---|
| D1 | Repository name | `drexonyx-platform` |
| D2 | Platform subdomain | `app.drexonyx.com` |
| D3 | Neon database strategy | Option A: second free Neon account |
| D5 | Stripe | Confirm if Stripe account needed in new platform |
| D10 | MDA sub-brand | Confirm if MDA operations continue |
| D11 | Technology stack | Next.js, Drizzle, Neon, Vercel, Auth.js |
| D13 | Public website | Keep V1 at drexonyx.com during Phases 1–5 |
| D14 | Phase 1 start | CEO approves all planning documents |

---

*Document version: 2.0 — Revised 2026-11-21 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v1.0*  
*Supersedes: v1.0 (2026-11-21, MDA-agency framing, no AI permission levels)*
