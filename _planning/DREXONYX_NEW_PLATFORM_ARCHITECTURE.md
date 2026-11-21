# DREXONYX — New Platform Architecture

**Document type:** Proposed Architecture — AWAITING CEO APPROVAL  
**Prepared by:** Claude Code  
**Date:** 2026-11-21  
**Status:** DRAFT — Do not implement without CEO sign-off

---

## 1. Vision

DREXONYX is building an **AI-Native Company Operating System** — a single internal platform through which the Founder/CEO commands and observes the entire company. Every business domain — sales, production, marketing, finance, knowledge, task orchestration — is a module within this platform. AI agents act as the company's digital workforce; humans retain authority over all consequential decisions.

This is not a customer-facing SaaS product. It is the internal nervous system of DREXONYX itself.

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
**Purpose:** Manage all DREXONYX and MDA products and services — catalog, pricing, demos, delivery standards.

**Core views:**
- Service catalog — MDA and DREXONYX products with approved pricing
- Demo library — the five demo sites and future demos, organized by industry
- Delivery standards — per-product QC checklists and production standards
- Portfolio showcase — categorized client work and agency concepts (correctly labeled)

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

Agents are typed TypeScript modules following a defined contract:

```typescript
interface AgentDefinition<TInput, TOutput> {
  id: string                           // e.g. "sales.lead.discover"
  name: string
  domain: PlatformDomain
  inputSchema: ZodSchema<TInput>
  outputSchema: ZodSchema<TOutput>
  requiresApproval: ApprovalPolicy     // NEVER | ALWAYS | CONDITIONAL
  approvalCondition?: (output: TOutput) => boolean
  execute: (input: TInput, context: AgentContext) => Promise<TOutput>
}
```

**Execution model:**
1. Task is queued with input and metadata
2. Agent executes — calls AI API, processes results
3. Output is written to `agent_outputs` table with status `STAGED`
4. If `requiresApproval = NEVER` and output is safe (checked by policy): auto-applies
5. If approval required: surfaces in CEO Command Center and Approval queue
6. Human approves/rejects/edits → action executes or is discarded
7. All steps written to audit log

**Approval policy defaults:**
- Sending any external message (email, social post): `ALWAYS`
- Creating or modifying financial records: `ALWAYS`
- Deleting any record: `ALWAYS`
- Drafting text for review: `NEVER`
- Analyzing data and producing a report: `NEVER`
- Discovering leads from public data: `NEVER`

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
5. **Audit log is append-only.** No delete or update operations on `audit_events`.
6. **Approval gates cannot be bypassed programmatically.** Only human action advances an approval.
7. **AI agent outputs are staged, not auto-applied, for consequential actions.**
8. **Test mode flags are `true` by default.** (`SALES_OUTREACH_TEST_MODE`, `ZIINA_TEST_MODE`)
9. **No secrets in Git history.** `.env.local` is gitignored.
10. **Financial records are created by domain logic, never by agents directly.**

---

## 10. What Requires CEO Approval Before Implementation Begins

The following decisions are proposed but not finalized:

| Item | Proposal | Decision Needed |
|---|---|---|
| New repository name | `drexonyx-platform` | Approve or change name |
| Authentication | Internal-only, no public access | Confirm — no client portal in Phase 1 |
| AI model default | Claude Sonnet (balanced cost/quality) | Confirm |
| Payment integration | Ziina only (Phase 1), Stripe optional (Phase 2+) | Confirm |
| Android continuity | Pause Android projects during new platform build | Confirm |
| Fleet Tracker | Treat as a separate product, not part of new platform | Confirm |
| Vercel plan | Hobby (free) unless team collaboration is needed | Confirm |
| Neon tier | Free (0.5 GB) initially, upgrade when data grows | Confirm |

---

*End of Document 1 — DREXONYX_NEW_PLATFORM_ARCHITECTURE.md*
