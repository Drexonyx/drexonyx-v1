# DR 0126 — Facebook Organic Page Publishing (DREXONYX Brand Pages)

**Status:** ACCEPTED  
**Date:** 2026-09-17  
**Resolves:** DR 0124 blocker B2 (Meta API credentials / publishing integration)  
**Mission context:** DREXONYX organic growth — brand awareness and sales conversion toward the 1 → 1,000,000 goal via consistent, human-approved, zero-spend Facebook content.

---

## Decision

Authorize real Facebook Graph API publishing for organic posts — text, images, and
videos — to two explicitly allowlisted DREXONYX brand Pages, as the final step in the
existing `COORDINATE_MARKETING_CAMPAIGN` workflow.

The mandatory HUMAN_GATE from DR 0124 is preserved unchanged and is the sole authority
boundary. No post is published without explicit OWNER or ADMIN_OPERATIONS approval.
After approval, the orchestration runner executes the publish step automatically.

Scope is limited to **organic Page publishing only**:

- **In scope:** text posts, image posts, video posts; immediate and scheduled
  publishing; recurring posts via existing Routines infrastructure
- **Out of scope (zero exceptions):** paid ads, boosted posts, campaign spend,
  Ads Manager API, Marketing API, Lead Ads API, dynamic ads, audience targeting,
  budget creation or modification of any kind

---

## What This Resolves

| DR 0124 Blocker | Resolution |
|---|---|
| **B2 (Meta API credentials)** | Resolved — `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID_1`, `META_PAGE_ID_2` provisioned server-side; new `facebook.page.publish` skill calls Graph API |

**DR 0124 blockers remaining open (unchanged):**

- **B6 (Content schema):** No new DB tables. Campaign context in existing `agent_tasks.context` jsonb.
- **B7 (IntentType):** `COORDINATE_MARKETING_CAMPAIGN` already in DB constraint and TypeScript union.

---

## Required Meta App Configuration (External Prerequisites)

| # | Prerequisite | Owner Action |
|---|---|---|
| P1 | Meta App in Live mode | Meta App Dashboard → switch Development → Live |
| P2 | `pages_manage_posts` permission | Request App Review; required to publish to Page |
| P3 | `pages_read_engagement` permission | Request App Review; recommended to confirm post created |
| P4 | `pages_show_list` permission | Request App Review; required to verify Page access |
| P5 | System User created in Business Manager | Business Manager → System Users → Add System User (Admin role) |
| P6 | System User granted access to BOTH Pages | Assign System User to each Page with Content Creator role |
| P7 | System User Token generated | Token scoped to `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` |
| P8 | Page IDs obtained for both Pages | From each Page's About section, or `GET /me/accounts` on the Graph API |
| P9 | Scheduled post eligibility confirmed | Verify each Page meets Meta's eligibility in Page settings |

---

## Required Environment Variables

All server-side only. Never prefix with `NEXT_PUBLIC_`.

```bash
# ─── Facebook Graph API — Organic Publishing (DR 0126) ─────────────────────────
# All server-side only. Never prefix with NEXT_PUBLIC_.

# System User Token from Meta Business Manager.
# Scoped to: pages_manage_posts, pages_read_engagement, pages_show_list.
# Must have access to BOTH pages below. System User Tokens do not expire.
META_PAGE_ACCESS_TOKEN=

# First authorized DREXONYX Facebook Page ID (numeric).
META_PAGE_ID_1=

# Second authorized DREXONYX Facebook Page ID (numeric).
META_PAGE_ID_2=
```

---

## Token Lifecycle

**Required token type: System User Token (non-expiring)**

System User Tokens do not expire and are not tied to any individual employee account.
Regular User Access Tokens and short-lived Page Access Tokens are not acceptable for
this integration.

**Token rotation procedure:**

1. Business Manager → System Users → Generate New Token (same permissions as P7)
2. Replace `META_PAGE_ACCESS_TOKEN` in Vercel Production env vars (no code deploy needed)
3. Revoke old token: Business Manager → System Users → Token History → Revoke

**Compromise response:** Revoke immediately in Business Manager, then rotate per
procedure above. No code deploy required.

---

## Two-Page Allowlist

Only `META_PAGE_ID_1` and `META_PAGE_ID_2` are authorized publishing targets. The
allowlist is enforced in the `facebook.page.publish` skill at runtime: the skill reads
both env vars, constructs the allowed set, and rejects any `pageId` not in it — even
if the System User Token technically has access to other Pages. Campaign initiators
specify `pageTarget: 'PAGE_1' | 'PAGE_2'`. Unauthorized page targets trigger
`UNAUTHORIZED_PAGE` failure and `auditBoundaryViolation`.

---

## New Skill: `facebook.page.publish`

| Property | Value |
|---|---|
| **Skill ID** | `facebook.page.publish` |
| **Family** | `SOCIAL` (new family added to `SkillFamily` union) |
| **AI calls** | Zero — Graph API calls only |
| **External API** | `https://graph.facebook.com/v21.0/` |
| **Auth** | `Authorization: Bearer {META_PAGE_ACCESS_TOKEN}` |
| **AGENT_ALLOWLIST** | Added — executes post-HUMAN_GATE-approval only (DR 0126 authority) |
| **HUMAN_SKILL_AUTHORITY** | `OWNER`, `ADMIN_OPERATIONS` |

### Skill Input

```typescript
{
  pageTarget: 'PAGE_1' | 'PAGE_2';
  contentType: 'TEXT' | 'IMAGE' | 'VIDEO';
  message: string;
  mediaUrl?: string;        // R2 URL only; required for IMAGE and VIDEO
  publishMode: 'IMMEDIATE' | 'SCHEDULED';
  scheduledAt?: string;     // ISO 8601; required when publishMode = 'SCHEDULED'
  campaignId: string;
}
```

### Graph API Endpoints

| Content Type | Endpoint | Key Params |
|---|---|---|
| TEXT | `POST /{pageId}/feed` | `message`, `published` |
| IMAGE | `POST /{pageId}/photos` | `url` (R2), `caption`, `published` |
| VIDEO | `POST /{pageId}/videos` | `file_url` (R2), `description`, `published` |

Scheduled: `published: false` + `scheduled_publish_time: <unix_timestamp>`.

### Scheduling Constraints

- `scheduledAt` must be at least **10 minutes** in the future
- `scheduledAt` must be no more than **75 days** in the future

### Media URL Validation

`mediaUrl` must originate from the project's configured R2 storage (derived from
`R2_ENDPOINT` or `R2_ACCOUNT_ID`). Any external domain is rejected before any API
call. `META_PAGE_ACCESS_TOKEN` is never logged, returned, or included in any payload.

---

## Updated Workflow (Six Steps, Fixed Plan)

Supersedes the five-step plan from DR 0124.

| Step | Type | Skill / Gate | Notes |
|---|---|---|---|
| 0 | SKILL | `qc.script.review` | Caption quality check (AI) |
| 1 | SKILL | `qc.brand.alignment` | Brand voice compliance (AI) |
| 2 | SKILL | `qc.facebook_policy.check` | Platform policy (deterministic) |
| 3 | HUMAN_GATE | `CAMPAIGN_PUBLISH_APPROVAL` | **OWNER or ADMIN_OPERATIONS mandatory** |
| 4 | SKILL | `facebook.page.publish` | Graph API — runs only after GATE_APPROVED |
| 5 | NOTIFICATION | — | Completion or failure alert |

**Known limitation:** On GATE_REJECTED, step 5 (NOTIFICATION) does not fire because
the runner treats `GATE_REJECTED` as a fail status. Observable via `GATE_RESOLVED`
audit event.

---

## Updated `delegateMarketingCampaign` Parameters

New optional fields added to `MarketingCampaignDelegationParams`:

```typescript
pageTarget?: 'PAGE_1' | 'PAGE_2';          // Defaults to 'PAGE_1'
contentType?: 'TEXT' | 'IMAGE' | 'VIDEO';  // Defaults to 'TEXT'
mediaUrl?: string;                           // Required when contentType is IMAGE or VIDEO
publishMode?: 'IMMEDIATE' | 'SCHEDULED';    // Defaults to 'IMMEDIATE'
scheduledAt?: string;                        // ISO 8601; required when publishMode = 'SCHEDULED'
```

Delegation-time validation (before task creation):

- `contentType` is IMAGE or VIDEO → `mediaUrl` must be provided
- `publishMode` is SCHEDULED → `scheduledAt` must be provided
- `scheduledAt` must be a valid date string

---

## Failure Handling

| Failure | Behavior |
|---|---|
| Missing `META_PAGE_ACCESS_TOKEN` | `MISSING_CREDENTIAL`; task FAILED |
| Both page ID env vars absent | `MISSING_CREDENTIAL`; task FAILED |
| `pageTarget` not in allowlist | `UNAUTHORIZED_PAGE`; task FAILED; `auditBoundaryViolation` fired |
| `mediaUrl` not from R2 domain | `MEDIA_URL_DOMAIN_REJECTED`; task FAILED |
| `scheduledAt` outside valid window | `SCHEDULE_WINDOW_VIOLATED`; task FAILED |
| Graph API 4xx | `GRAPH_API_ERROR` + error code; task FAILED; `isTransient: false` |
| Graph API 5xx / network error | `GRAPH_API_ERROR`; task FAILED; `isTransient: true` |

No automatic retry in this DR.

---

## Audit Events

Two new `event_type` values added to `auditEvents`:

- **`FACEBOOK_POST_PUBLISHED`** — `postId`, `pageId`, `contentType`, `publishMode`, `scheduledAt?`
- **`FACEBOOK_PUBLISH_FAILED`** — `reason`, `errorCode?`, `errorMessage` (never contains token)

Both writers added to `lib/orchestration/audit.ts` for runner integration.

---

## Absolute Constraints

- No paid ad creation (`campaigns`, `adsets`, `ads` Graph API endpoints forbidden)
- No post boosting (`promotions` endpoint forbidden)
- No Ads Manager API calls (`act_{ad_account_id}` path prefix forbidden)
- No spending of any amount — zero
- No image or video generation at publish time (media sourced from R2 only)
- No scheduling beyond 75 days
- No bulk publishing (one task = one post)
- `facebook.page.publish` is never callable from any HTTP route directly
- No publishing to any Page not in `{META_PAGE_ID_1, META_PAGE_ID_2}`

---

## Files Created / Modified

| File | Change |
|---|---|
| `docs/decisions/0126-facebook-organic-publishing.md` | This file |
| `.env.example` | Add `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID_1`, `META_PAGE_ID_2` |
| `lib/skills/interface.ts` | Add `'SOCIAL'` to `SkillFamily`; add `'facebook.page.publish'` to `SkillId` |
| `lib/skills/authority.ts` | Add `facebook.page.publish` to `HUMAN_SKILL_AUTHORITY` and `AGENT_ALLOWLIST` |
| `lib/skills/facebook/page-publish.ts` | New skill |
| `lib/skills/registry.ts` | Register `facebook.page.publish` |
| `lib/orchestration/planner.ts` | Update `COORDINATE_MARKETING_CAMPAIGN` template: 5 → 6 steps |
| `lib/orchestration/audit.ts` | Add `auditFacebookPostPublished` and `auditFacebookPublishFailed` |
| `lib/agents/marketing-campaign-specialist.ts` | Expand params; update plan to 6 steps; remove stub publishNote |
| `lib/__tests__/facebook-page-publish.test.ts` | New skill unit tests |
| `lib/__tests__/marketing-campaign-specialist.test.ts` | Update for 6-step plan and new params |
