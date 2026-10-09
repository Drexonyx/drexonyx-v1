# OPERATIONAL READINESS CHECK
## MDA Client Acquisition — Outreach Workflow
**Date: 2026-10-09 | Scope: Read-only audit — no infrastructure modified**

---

## RESULT SUMMARY

| Check | Status |
|-------|--------|
| Outreach workflow documented | CONFIRMED |
| Cron routes exist and correct | CONFIRMED |
| `delegateOutreachDrafting()` invocation path clear | CONFIRMED |
| Send status / reply recording mechanism confirmed | CONFIRMED |
| Required env vars present in this session | **NOT PRESENT** |
| DB connected in this session | **NOT CONNECTED** |
| Emails sendable from this session | **NO** |
| Emails sendable from Vercel production deployment | YES — once env vars confirmed |

---

## 1. HOW THE DREXONYX SERVER IS STARTED

The application is a Next.js 16.3.4 server (package.json `scripts`):

| Context | Command |
|---------|---------|
| Local development | `npm run dev` (runs `next dev`) |
| Local production | `npm run build && npm run start` |
| Hosted production | Vercel deployment — started automatically on push to `main` |

The orchestration runtime is not a separate process. It runs inside the Next.js
server as Vercel Cron Jobs — HTTP GET routes under `/api/internal/` that Vercel
calls on schedule, authenticated with `Authorization: Bearer {CRON_SECRET}`.

**The server is the runtime.** There is no separate orchestration daemon to start.

---

## 2. ENVIRONMENT CONFIGURATION — REQUIRED VARIABLES

All of the following must be set before the outreach workflow can execute.
Source: `.env.example` (committed to the repository). No real values are
stored here; they are read from the platform environment at runtime.

### Core requirements (all mandatory)

| Variable | Purpose | Where to set |
|----------|---------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Vercel → Settings → Environment Variables |
| `DREXONYX_ORG_ID` | Organization UUID scoping all DB writes | Vercel → Settings → Environment Variables |
| `RESEND_API_KEY` | Resend transport auth (`re_...` prefix) | Vercel → Settings → Environment Variables |
| `RESEND_FROM_ADDRESS` | Sender address (`Name <email@domain.com>`) | Vercel → Settings → Environment Variables |
| `CRON_SECRET` | Bearer token for all `/api/internal/*` routes | Vercel → Settings → Environment Variables |
| `SALES_OUTREACH_TEST_MODE` | Safety gate — `true` = redirect to Irenfold@gmail.com; `false`/absent = send to real prospects | Vercel → Settings → Environment Variables |

### Reply detection (required for automated reply tracking)

| Variable | Purpose |
|----------|---------|
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token |

Reply detection (`/api/internal/sales-reply-poll`) returns gracefully when
these three are absent — it does not block the send workflow; replies would
simply not be detected automatically and would need manual checking.

### Checked in this session

The session environment contains **none** of the above variables. The
`printenv` check returned empty for all relevant prefixes (`RESEND`, `DATABASE`,
`DREXONYX`, `CRON`, `SALES`, `GMAIL`). This is expected — this is a remote
Claude Code session, not the production Vercel environment.

---

## 3. EXACT PROCEDURE TO ACTIVATE THE OUTREACH WORKFLOW

### Prerequisite: Database

The orchestration DB must be connected and migrated. If not already done:

```bash
# From the project root, with DATABASE_URL set in the local environment:
npm run db:migrate
```

This runs Drizzle Kit migrations. The `agentTasks`, `salesLeads`,
`outreachMessages`, `followUps`, and `auditEvents` tables must exist.

### Step 1 — Confirm environment variables are set on Vercel

In the Vercel dashboard:
- Project → Settings → Environment Variables
- Confirm: `DATABASE_URL`, `DREXONYX_ORG_ID`, `RESEND_API_KEY`,
  `RESEND_FROM_ADDRESS`, `CRON_SECRET`, `SALES_OUTREACH_TEST_MODE`
- **During first run, set `SALES_OUTREACH_TEST_MODE=true`** so all sends
  are redirected to Irenfold@gmail.com (the test recipient). This is the
  safety gate documented in `.env.example` as SAFETY-CRITICAL.

### Step 2 — Validate the Resend transport (test mode)

With `SALES_OUTREACH_TEST_MODE=true` set, trigger the test-send endpoint
once to confirm Resend is configured correctly:

```
GET /api/internal/sales-test-send
Authorization: Bearer {CRON_SECRET}
```

Expected result when working:
```json
{
  "ok": true,
  "testMode": true,
  "recipient": "Irenfold@gmail.com",
  "resendAccepted": true,
  "noRealProspectContacted": true
}
```

This endpoint creates a synthetic lead, sends a test email to Irenfold@gmail.com,
verifies the DB side-effects, then removes the synthetic records.

### Step 3 — Prepare leads (per the 19 research prospects)

For each of the 19 prospects in `PROSPECTS.csv`, the following three delegate
calls must be made (from a server action, API route, or admin interface
with `initiatorRole: 'OWNER'`):

#### 3a — Discover lead
```typescript
import { delegateLeadDiscovery } from '@/lib/agents/sales-discovery-specialist';

await delegateLeadDiscovery({
  parentTaskId: null,
  organizationId: process.env.DREXONYX_ORG_ID!,
  initiatedByUserId: '<owner-user-id>',
  initiatorRole: 'OWNER',
  rawData: '<company name, sector, location, website, contact>',
  primarySourcePlatform: '<e.g. "propertyfinder.ae" or "dxbmarket.ae">',
  primarySourceUrl: '<source URL from PROSPECTS.csv>',
  sourceType: 'directory',          // or 'website' where verified on own site
  dedupIdentifier: '<company name>',
});
```

This writes an `agentTask` with `intent_type: 'DISCOVER_SALES_LEAD'` and
`status: 'PLAN_READY'` into the DB. It does NOT send anything.

#### 3b — Qualify lead
```typescript
import { delegateLeadQualification } from '@/lib/agents/sales-discovery-specialist';

await delegateLeadQualification({
  parentTaskId: null,
  organizationId: process.env.DREXONYX_ORG_ID!,
  initiatedByUserId: '<owner-user-id>',
  initiatorRole: 'OWNER',
  leadId: '<lead UUID returned by discover task>',
  businessName: '<company name>',
  primarySourceUrl: '<source URL>',
  website: '<company website if any>',
  publicEmail: '<email from PROSPECTS.csv if available>',
  notes: '<opportunity note from LEAD_LIST.md>',
});
```

#### 3c — Draft outreach
```typescript
import { delegateOutreachDrafting } from '@/lib/agents/sales-discovery-specialist';

await delegateOutreachDrafting({
  parentTaskId: null,
  organizationId: process.env.DREXONYX_ORG_ID!,
  initiatedByUserId: '<owner-user-id>',
  initiatorRole: 'OWNER',
  leadId: '<lead UUID>',
  businessName: '<company name>',
  channel: 'email',
  messageType: 'cold_outreach',
  opportunity: '<opportunity from LEAD_LIST.md>',
  notes: '<personalized draft from LEAD_LIST.md>',
  sourcePlatform: '<source platform>',
  sourceUrl: '<source URL>',
});
```

Standard cold email `messageType: 'cold_outreach'` carries `approval_status: NOT_REQUIRED`
(per DR 0128) — no human approval gate is inserted into the plan. The outreach
record is written to the DB as `status: 'DRAFT'`, ready for the send cron.

### Step 4 — Advance discovery tasks (cron or manual trigger)

The `/api/internal/sales-discovery` route advances all `PLAN_READY`
`DISCOVER_SALES_LEAD` tasks in batches of 20:

```
GET /api/internal/sales-discovery
Authorization: Bearer {CRON_SECRET}
```

Scheduled: daily at 06:00 UTC (`vercel.json` cron: `"0 6 * * *"`).
Can be triggered manually by calling the URL with the correct `Authorization` header.

### Step 5 — Send outreach (cron or manual trigger)

The `/api/internal/sales-outreach-send` route sends all DRAFT outreach
messages whose `approval_status` is `NOT_REQUIRED` or `APPROVED`:

```
GET /api/internal/sales-outreach-send
Authorization: Bearer {CRON_SECRET}
```

Scheduled: daily at 09:00 UTC (`vercel.json` cron: `"0 9 * * *"`).
Can be triggered manually the same way. Batch limit: 20 per invocation.

**When `SALES_OUTREACH_TEST_MODE=true`:** every send is redirected to
`Irenfold@gmail.com`. No real prospect email is contacted.

**When `SALES_OUTREACH_TEST_MODE=false` or absent:** sends go to the real
prospect email address. Only activate this after the test-mode validation
in Step 2 confirms delivery works.

---

## 4. HOW SEND STATUS AND REPLIES ARE RECORDED

### Send status flow

The status lifecycle for a lead and its outreach message is:

```
salesLeads status:         NEW → REVIEWING → QUALIFIED → OUTREACH_SENT → REPLIED → WON
outreachMessages status:   DRAFT → SENT (or FAILED)
outreachMessages approval: NOT_REQUIRED (cold email — auto-sends)
```

When `sendOutreachEmail()` succeeds, it writes:
- `outreachMessages.status = 'SENT'`
- `outreachMessages.sent_at = <timestamp>`
- `outreachMessages.external_message_id = <Resend message ID>`
- `outreachMessages.external_thread_id = <Resend message ID>`
- `salesLeads.status = 'OUTREACH_SENT'` (only if currently `QUALIFIED`)
- An `auditEvents` row with `action: 'OUTREACH_SENT'` and payload including
  the Resend message ID, channel, message type, redirect flag, and test mode flag

### Reply detection flow

The `/api/internal/sales-reply-poll` cron runs at 12:00 UTC daily.
It calls `detectReplies()` in `lib/sales/reply-detector.ts`, which:
1. Fetches SENT outreach messages that have a `external_thread_id`
2. For each, polls the Gmail API for subsequent messages in that thread
3. On a detected reply, writes:
   - `outreachMessages.reply_received_at = <timestamp>`
   - `salesLeads.status = 'REPLIED'` (if currently `OUTREACH_SENT`)
   - An `auditEvents` row with `action: 'REPLY_RECEIVED'`

**Dependency:** requires `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and
`GMAIL_REFRESH_TOKEN` in the environment. If these are absent, the cron
returns `{ configured: false }` without error and no reply detection runs.
Replies would then need to be recorded manually by updating lead status
in the admin interface or via a direct DB update.

### Daily report to irenfold@gmail.com

`/api/internal/sales-daily-report` runs at 07:00 UTC daily.
It calls `buildSalesDailyReport()` from `lib/sales/queries.ts` which reads:
- New leads (last 7 days), qualified leads, hot/warm counts, emails sent,
  replies received, follow-ups due, pending approvals, won clients
- Top 10 opportunities with recommended actions
- Pipeline issues (e.g. overdue follow-ups, stale leads)

Sends the HTML report to `Irenfold@gmail.com` via Resend.
Idempotent: only one report per calendar day (enforced via `idempotencyKeys` table).

---

## 5. WHAT IS MISSING TO START THE WORKFLOW FOR THE 19 PROSPECTS

In order of dependency:

| Step | What is missing | How to resolve |
|------|-----------------|---------------|
| 1 | `DATABASE_URL` — not set in this session | Set in Vercel project env vars |
| 2 | `DREXONYX_ORG_ID` — not set | Set in Vercel project env vars |
| 3 | `RESEND_API_KEY` — not set | Set in Vercel project env vars |
| 4 | `RESEND_FROM_ADDRESS` — not set | Set in Vercel project env vars |
| 5 | `CRON_SECRET` — not set | Set in Vercel project env vars |
| 6 | `SALES_OUTREACH_TEST_MODE` — not set | Set to `true` initially; switch to `false` after validated test delivery |
| 7 | Lead records not in DB — 19 prospects only exist in `PROSPECTS.csv` | Call `delegateLeadDiscovery()` + `delegateLeadQualification()` + `delegateOutreachDrafting()` per lead (see Section 3) |
| 8 | Outreach records not in DB — drafts exist only in `LEAD_LIST.md` | Created by Step 7 above |
| 9 | Send cron not yet triggered for this batch | Trigger `/api/internal/sales-outreach-send` manually (or wait for 09:00 UTC) |
| 10 | Gmail OAuth not configured (reply detection) | Optional: set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`; without these, replies tracked manually |

### Minimum viable path (test mode first)

1. Confirm env vars 1–6 are set on Vercel production deployment
2. Confirm DB is connected and migrated
3. Trigger `GET /api/internal/sales-test-send` — confirm Resend delivers to Irenfold@gmail.com
4. Build and deploy a small server action or admin script calling the three `delegate*` functions for each of the 19 leads in `PROSPECTS.csv` (Tier 1 HIGH priority first — 9 companies)
5. Trigger `GET /api/internal/sales-discovery` (advances discovery tasks)
6. Trigger `GET /api/internal/sales-outreach-send` (sends queued drafts — in test mode, all go to Irenfold@gmail.com)
7. Verify receipt at Irenfold@gmail.com; confirm subject, body, and unsubscribe link render correctly
8. Set `SALES_OUTREACH_TEST_MODE=false` in Vercel env vars to enable real prospect delivery
9. Re-trigger `GET /api/internal/sales-outreach-send` — sends to real prospect email addresses

---

## 6. WHAT THIS SESSION CANNOT DO

| Action | Reason |
|--------|--------|
| Call `delegateOutreachDrafting()` directly | Requires live DB; `DATABASE_URL` not set in this session |
| Write lead records to the DB | Same |
| Trigger cron routes | `CRON_SECRET` not set; `NEXT_PUBLIC_APP_URL` not resolvable from this session |
| Confirm whether env vars are set on Vercel | Vercel dashboard access required; `gh api` and `mcp__Vercel__*` tools would be needed |
| Modify the outreach workflow, Resend code, or DB schema | Hard constraint: "Do NOT touch: Sales, Outreach, Resend, Database" (CLAUDE.md) |

---

## 7. ALTERNATIVE: MANUAL SEND WITHOUT SERVER (OPTION B)

If activating the server-side workflow is not immediately possible, the
19 outreach drafts in `LEAD_LIST.md` can be sent manually:

1. Open `PROSPECTS.csv` — sort by `Priority = HIGH` (9 companies)
2. For companies with `Verification Status = VERIFIED` or a direct email in the `Email` column,
   copy the draft from `LEAD_LIST.md` and send from drexonyx.studio@gmail.com
3. Record send date, Resend/Gmail message ID (or thread URL), and any replies
   directly in `PROSPECTS.csv` by adding columns: `SentDate`, `MessageID`, `ReplyDate`, `SalesStage`
4. Update `SalesStage` through: `CONTACTED → REPLIED → MEETING → PROPOSAL → CLOSED`

Directly contactable by email right now (VERIFIED or own-website contact):
- **DXB Market** — info@dxbmarket.ae (VERIFIED)
- **Al-Falah Accounting** — info@al-falah-group.com (DIRECTORY LISTING)
- **Creative Shelf LLC** — creativeshelf21@gmail.com (own website — lower confidence, Gmail)

Directly contactable by phone right now:
- **The Smile Studio Dental Clinic** — +971 56 488 8466
- **Art of Teeth** — +971-58-593-3422
- **DXB Market** — +971 585740057

---

*Generated: 2026-10-09 | Operational Readiness Check | Read-only audit*
*No infrastructure modified | No emails sent | No env vars changed*
