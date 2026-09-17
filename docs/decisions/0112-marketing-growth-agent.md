# DR 0112 — Marketing & Growth Agent

**Status:** PROPOSED — Implementation blocked on §2.3 blockers. Design is authorized; no code may be written until all blockers are resolved.
**Phase:** Marketing Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `600f12b`
**Relationship to prior records:** Extends DR 0072 (skill architecture), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0111 (WhatsApp Agent). Does not modify
Decision Records 0001–0111.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The SKILL_REGISTRY (`lib/skills/registry.ts`) contains 18 skills across
seven namespaces. Content-generation skills relevant to marketing exist:
`script.social_caption.generate`, `script.ad.generate`, `hook.thumbnail_copy.generate`,
`hook.video.generate`, `strategy.campaign.develop`, `strategy.brand.positioning`,
`strategy.audience.segmentation`. QC skills exist: `qc.brand.alignment`,
`qc.script.review`.

**FACT:** The AGENT_ALLOWLIST (`lib/skills/authority.ts`) contains exactly two entries:
`utility.prompt.optimize` and `qc.asset.metadata`. All nine marketing-relevant skills
above are HUMAN_SKILL_AUTHORITY only — none are on the AGENT_ALLOWLIST.
DR 0075 §2.2 prohibits expansion without explicit Owner approval and a new/amended DR.

**FACT:** No social media platform API credentials exist in `.env.example` or any
committed file. No Instagram, TikTok, LinkedIn, YouTube, X (Twitter), or other
platform publishing integration exists in the codebase.

**FACT:** No content scheduling infrastructure (queue, calendar, content items table)
exists in the database schema. No `content.*` skill namespace exists in the SKILL_REGISTRY.

**FACT:** The SPECIALIST_AGENT_REGISTRY (DR 0108/0109) holds two agents.
No marketing or publishing specialist agent exists.

**FACT:** The orchestration schema `IntentType` CHECK constraint recognizes:
`ROUTE_APPROVAL`, `INSPECT_ASSET_METADATA`, `OPTIMIZE_BRIEF_PROMPTS`,
`COORDINATE_BATCH_OPERATION`. No marketing intent type is approved or in schema.

**FACT:** The portfolio page (`/portfolio`), pricing page (`/pricing`), and services
page (`/services`) are static Next.js pages. No CMS or programmatic content update
path exists for these pages via the agent runtime.

---

## 2. Decision

### 2.1 Purpose

Authorize the design of a Marketing & Growth Agent for DREXONYX that executes the
essential operational flow:

```
Create → QC → Policy Check → Schedule → Publish → Verify
```

The agent orchestrates existing content-generation skills, delegates QC to specialist
sub-agents, gates publishing on human approval, and verifies published state via
platform API. It does not replace human creative judgment; it automates the
repeatable operations between approved steps.

### 2.2 Operational Flow

#### Step 1 — Create

The agent delegates content creation to existing specialist skills as sub-tasks:

| Content type | Skill | Current AGENT_ALLOWLIST status |
|---|---|---|
| Social caption | `script.social_caption.generate` | NOT listed — expansion required |
| Ad script | `script.ad.generate` | NOT listed — expansion required |
| Hook copy | `hook.thumbnail_copy.generate` | NOT listed — expansion required |
| Campaign strategy | `strategy.campaign.develop` | NOT listed — expansion required |

Input for each sub-task is drawn from an approved campaign brief (org-scoped).
The agent does not invent campaign objectives, brand identity, or audience parameters —
it reads them from existing brief and campaign records.

#### Step 2 — QC

The agent delegates QC to existing QC skills as sub-tasks:

| QC type | Skill | Current AGENT_ALLOWLIST status |
|---|---|---|
| Brand alignment check | `qc.brand.alignment` | NOT listed — expansion required |
| Script review | `qc.script.review` | NOT listed — expansion required |

A QC FAIL on any content item causes the sub-task to FAIL and escalates to ADMIN_OPERATIONS
or OWNER. The agent does not self-approve failed QC. No content advances to Schedule
without a QC PASS verdict.

#### Step 3 — Policy Check

**PROPOSED — new skill required.**

A `qc.policy.check` skill (proposed, not yet in SKILL_REGISTRY) evaluates generated
content against:
- Platform-specific rules (character limits, prohibited content categories)
- DREXONYX brand policy (no internal cost/financial disclosure)
- Basic compliance constraints (no personal data, no unverified claims)

This skill does not exist. It must be designed and approved before implementation.
Until approved, the Policy Check step is a HUMAN_GATE delegated to ADMIN_OPERATIONS.

**No AGENT_ALLOWLIST entry for `qc.policy.check` is authorized by this record.**

#### Step 4 — Schedule

**PROPOSED — new infrastructure required.**

Content scheduling requires:
- A `content_items` table or equivalent (new schema, requires migration — not authorized by this record)
- A `content.schedule` skill (proposed, not yet in SKILL_REGISTRY)
- A scheduling queue or cron trigger mechanism

Until the schema and skill are approved and implemented, Scheduling is a manual
HUMAN_GATE step: ADMIN_OPERATIONS or OWNER sets the publish time and confirms readiness.

**No schema changes or new `content.*` skills are authorized by this record.**

#### Step 5 — Publish

**BLOCKED — external platform API required (see §2.3 B1–B3).**

Publishing requires authenticated API access to each social/distribution platform.
No platform credentials exist. Publish is a HUMAN_GATE until blockers B1–B3 are resolved.

When platform APIs are approved and credentialed, publishing executes via a new
`content.publish` skill (proposed, not yet in SKILL_REGISTRY), with a mandatory
HUMAN_GATE (`HUMAN_GATE` step) requiring OWNER or ADMIN_OPERATIONS approval
before any live publish to an external platform.

**The agent MUST NOT publish to any external platform without a resolved HUMAN_GATE approval.**

#### Step 6 — Verify

**BLOCKED — external platform API required (see §2.3 B1–B3).**

Verification reads published post status from the platform API and confirms the content
is live, correctly attributed, and free of platform-side errors. Maps to a proposed
`content.verify` skill.

On verification failure: escalate to ADMIN_OPERATIONS or OWNER. The agent does not
attempt autonomous retry of a failed publish without a new human approval gate.

### 2.3 Blockers (Implementation Gated)

The following items MUST be resolved by the Owner before any code may be written:

| # | Blocker | Required Decision |
|---|---------|-------------------|
| B1 | Social platform selection | Which platform(s) are authorized: Instagram, TikTok, LinkedIn, YouTube, X? |
| B2 | Platform API credentials | Provision and confirm API credentials for each approved platform; store as server-side env vars |
| B3 | Platform publishing rate limits and terms | Confirm DREXONYX complies with each platform's API TOS and rate limits |
| B4 | AGENT_ALLOWLIST expansion | Explicit Owner approval for each skill added: `script.social_caption.generate`, `script.ad.generate`, `hook.thumbnail_copy.generate`, `strategy.campaign.develop`, `qc.brand.alignment`, `qc.script.review` — requires new or amended DR per DR 0075 §2.2 |
| B5 | New skill approval | Explicit Owner approval for new skills: `qc.policy.check`, `content.schedule`, `content.publish`, `content.verify` |
| B6 | Content schema | Explicit Owner approval for content items schema and migration |
| B7 | IntentType addition | Explicit Owner approval for `COORDINATE_MARKETING_CAMPAIGN` IntentType and associated schema migration |

### 2.4 Complex Agent Delegation

The Marketing & Growth Agent is a new specialist agent in the SPECIALIST_AGENT_REGISTRY
(pattern established by DR 0108). Its delegation function is `delegateMarketingCampaign()`,
to be implemented in `lib/agents/marketing-campaign-specialist.ts`.

Delegation is triggered by:
- A `COORDINATE_MARKETING_CAMPAIGN` agent task (requires B7 resolved)
- Initiator roles: `OWNER`, `ADMIN_OPERATIONS` only (not `CREATIVE_PRODUCTION`, `QC`,
  `CLIENT`, or `AGENT`)

The specialist agent MAY:
- Delegate sub-tasks to approved content-generation and QC skills (gated on B4)
- Create HUMAN_GATE steps for Schedule and Publish approval
- Write standard orchestration audit events
- Escalate to ADMIN_OPERATIONS or OWNER on QC FAIL, Policy Check FAIL, or Publish failure

The specialist agent MAY NOT:
- Publish to any external platform without a resolved HUMAN_GATE
- Approve its own QC findings
- Create, update, or delete any financial record, order, quote, brief, or payment
- Spawn sub-tasks that exceed the approved AGENT_ALLOWLIST (gated on B4)
- Retry a failed publish without a new HUMAN_GATE
- Access `financial.*` tables or `commercial.order_budgets`

### 2.5 Required New Skills (PROPOSED — not authorized by this record)

| Proposed Skill ID | Namespace | Purpose |
|---|---|---|
| `qc.policy.check` | qc | Platform and brand policy compliance check |
| `content.schedule` | content | Write a scheduled content item to the content queue |
| `content.publish` | content | Post approved content to an authorized platform API |
| `content.verify` | content | Confirm published post status via platform API read |

**No AGENT_ALLOWLIST expansion is authorized by this record.**
**No new skill namespace (`content.*`) is authorized by this record.**

### 2.6 Permissions

- Initiator roles for Marketing tasks: `OWNER`, `ADMIN_OPERATIONS` only
- Sub-task initiator role: inherited from parent task (delegated-authority model, DR 0108/0109)
- `CLIENT` and `AGENT` roles may not initiate marketing tasks
- Platform API credentials are server-side only; no `NEXT_PUBLIC_` prefix
- Organization scope: all content is scoped to a single `organizationId` (DREXONYX_ORG_ID)
- Content generated may not be published under a different organization's identity

### 2.7 Financial and Security Boundaries

- Zero financial authority. The Marketing Agent reads no `financial.*` tables.
- No outbound content may contain internal production cost, estimated cost, margin,
  AI generation cost, gross profit, or any internal financial data.
- No autonomous pricing decisions, discount offers, or commercial commitments may
  appear in published content.
- No cross-client content. All content is scoped to the single DREXONYX organization.
- Platform API credentials must be treated identically to `ZIINA_API_KEY` and
  `RESEND_API_KEY`: server-side only, never committed, never logged.
- Inbound content from external platforms (comments, replies, DMs) is untrusted data;
  it must not be fed to AI skills without explicit sanitization and human review.

### 2.8 Human Approval Gates

| Step | Gate condition | Required approver |
|---|---|---|
| QC FAIL | Content fails brand alignment or script review | ADMIN_OPERATIONS or OWNER |
| Policy Check FAIL (until `qc.policy.check` approved) | Manual policy review | ADMIN_OPERATIONS or OWNER |
| Schedule confirmation | Content ready to schedule | ADMIN_OPERATIONS or OWNER |
| Publish approval | Before any live external publish | OWNER or ADMIN_OPERATIONS |
| Publish failure | Failed post status from platform | ADMIN_OPERATIONS or OWNER |

The agent does not advance past any HUMAN_GATE without a recorded `APPROVED` decision
in `orchestration.task_approvals`. A rejected gate transitions the task to FAILED and
escalates to the initiator.

### 2.9 Audit Requirements

All Marketing Agent events write to `system.audit_log`:

| Event | When |
|---|---|
| `MARKETING_TASK_CREATED` | Marketing campaign task is created |
| `MARKETING_CONTENT_GENERATED` | Create step sub-task succeeds |
| `MARKETING_QC_PASSED` | QC step returns PASS verdict |
| `MARKETING_QC_FAILED` | QC step returns FAIL verdict |
| `MARKETING_POLICY_CHECKED` | Policy check step completes |
| `MARKETING_SCHEDULED` | Content scheduled for publish |
| `MARKETING_PUBLISHED` | Publish step succeeds |
| `MARKETING_PUBLISH_FAILED` | Publish step fails |
| `MARKETING_VERIFIED` | Verify step confirms published state |

Standard orchestration events also apply (`TASK_CREATED`, `PLAN_GENERATED`,
`STEP_DISPATCHED`, `STEP_SUCCEEDED`, `STEP_FAILED`, `TASK_COMPLETED`, `TASK_FAILED`,
`TASK_ESCALATED`).

### 2.10 Retry and Escalation

- **Create sub-task transient failures:** retried up to 2 times (existing `MAX_STEP_RETRIES`);
  non-transient → FAILED → escalate
- **QC FAIL:** not retried; escalates immediately to ADMIN_OPERATIONS or OWNER
- **Policy Check FAIL:** not retried; escalates immediately
- **Publish failure:** not retried autonomously; requires a new HUMAN_GATE before re-attempt
- **Verify failure:** escalates to ADMIN_OPERATIONS or OWNER; no autonomous retry
- **Escalation path:** existing `escalateTask()` in `lib/orchestration/escalation.ts` +
  `sendEscalationEmail()` to OWNER via Resend

### 2.11 New Module Structure (PROPOSED — not implemented by this record)

```
lib/agents/
  marketing-campaign-specialist.ts   — specialist agent + delegation function
  __tests__/marketing-campaign-specialist.test.ts

lib/skills/
  content/                           — new namespace (blocked on B5–B6)
    schedule.ts
    publish.ts
    verify.ts
  qc/
    policy-check.ts                  — new skill (blocked on B5)
```

No file in this structure may be written until blockers B1–B7 are resolved.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume any social platform API endpoint, parameter, or capability not confirmed
  by the selected platform's official documentation.
- Do not assume platform credentials, rate limits, or TOS compliance without Owner confirmation.
- Do not assume `COORDINATE_MARKETING_CAMPAIGN` is an approved IntentType — it is PROPOSED.
- Do not assume the Marketing Agent may publish without a resolved HUMAN_GATE.
- Do not assume the Marketing Agent may approve its own QC findings.
- Do not assume the `content.*` skill namespace or any new skill is approved.
- Do not assume any schema migration is authorized by this record.
- Do not assume the agent has financial authority of any kind.
- Do not implement any code based on this DR until all blockers B1–B7 are resolved.
- Do not invent platform API endpoints, authentication patterns, or rate limit values.

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0112-marketing-growth-agent.md` | New — this DR |

No code changes. Implementation is blocked pending Owner decisions on §2.3.

---

## 5. Owner Approval

**Status: PENDING.**

Required Owner decisions before implementation may begin:
1. Select authorized social/distribution platform(s) (B1)
2. Confirm or provision platform API credentials (B2)
3. Confirm platform TOS compliance and rate limit acceptability (B3)
4. Explicitly approve AGENT_ALLOWLIST expansion for six existing skills (B4 — requires new/amended DR)
5. Explicitly approve four new skills: `qc.policy.check`, `content.schedule`, `content.publish`, `content.verify` (B5 — requires new/amended DR)
6. Explicitly approve content items schema and migration (B6)
7. Explicitly approve `COORDINATE_MARKETING_CAMPAIGN` IntentType and schema migration (B7)
