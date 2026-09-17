# DR 0125 — WhatsApp Agent Foundation (Provider-Independent)

**Status:** ACCEPTED  
**Date:** 2026-09-17  
**Supersedes:** DR 0111 (partial resolution — classification/routing layer only)

## Decision

Authorize the minimum provider-independent WhatsApp foundation:
deterministic message classification, inquiry routing to existing agent
workflows, and a webhook stub ready for provider credentials once provisioned.

## What DR 0111 Blockers This Resolves

| Blocker | Resolution |
|---------|------------|
| B1 (provider) | STILL OPEN — no provider selected; foundation is provider-agnostic |
| B2 (WABA) | STILL OPEN |
| B3 (phone number) | STILL OPEN |
| B4 (templates) | STILL OPEN — no outbound sending in this DR |
| B5 (webhook auth) | PARTIALLY RESOLVED — stub supports Meta Cloud API challenge/token pattern; actual signature verification gated on `WHATSAPP_APP_SECRET` env var |

**No outbound WhatsApp sending is implemented. No Meta API calls. No autonomous replies.**

## Scope

### Implemented

1. `communication.whatsapp.classify` — deterministic keyword-based classifier
   (zero AI calls, zero external API calls) added to AGENT_ALLOWLIST
2. `ROUTE_WHATSAPP_INQUIRY` IntentType + DB migration
3. `lib/agents/whatsapp-inquiry-specialist.ts` — delegation function
4. `app/api/webhooks/whatsapp/route.ts` — webhook stub:
   - **GET**: Meta webhook verification challenge (requires `WHATSAPP_WEBHOOK_VERIFY_TOKEN` env var)
   - **POST**: Returns 200 immediately when `WHATSAPP_APP_SECRET` is not set (provider not configured)

### Explicitly NOT Implemented

- `communication.whatsapp.send` — requires approved templates + provider credentials (B1–B4)
- Outbound WhatsApp messages of any kind
- Meta Cloud API calls
- Phone number → org resolution (requires WABA + registered number)
- Message signature verification (requires `WHATSAPP_APP_SECRET` from provider)

## New Skill: `communication.whatsapp.classify`

- **Family:** COMMUNICATION
- **AI calls:** Zero — keyword pattern matching only
- **Input:** `{ text: string; language?: string }`
- **Output:** `{ category: WhatsAppMessageCategory; confidence: 'HIGH' | 'LOW'; keywords: string[] }`
- **Categories:** SALES_INQUIRY | SUPPORT_REQUEST | FEEDBACK | COMPLAINT | SCHEDULING | SPAM | UNKNOWN
- **Confidence:** HIGH = 2+ keyword signals; LOW = 1 keyword signal; UNKNOWN = no match
- **PII boundary:** Classifies text content only; does not extract or store sender phone numbers
- **AGENT_ALLOWLIST:** Added (DR 0125 authority)
- **HUMAN_SKILL_AUTHORITY:** OWNER, ADMIN_OPERATIONS

## New IntentType: `ROUTE_WHATSAPP_INQUIRY`

Workflow (3-step fixed plan):

| Step | Type | Description |
|------|------|-------------|
| 0 | SKILL `communication.whatsapp.classify` | Classify inbound message text |
| 1 | HUMAN_GATE | Staff review mandatory — no autonomous response to sender |
| 2 | NOTIFICATION | Alert OWNER/ADMIN_OPERATIONS via existing Communication Agent |

## Required External Prerequisites

To enable full WhatsApp functionality, the following must be provisioned externally:

| # | Prerequisite | Owner Action |
|---|-------------|-------------|
| B1 | Provider selection | Choose Meta Cloud API or BSP (Twilio, Bird, 360dialog, etc.) |
| B2 | WABA registration | Register WhatsApp Business Account with Meta |
| B3 | Phone number | Register dedicated WhatsApp Business number |
| B4 | Message templates | Submit to Meta; obtain approval; share approved names + params |
| B5 | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Set in Vercel server-side env (any string you choose) |
| B6 | `WHATSAPP_APP_SECRET` | Set in Vercel server-side env (from Meta App or BSP) |

Once B5 and B6 are set, the webhook stub becomes functional for inbound message receipt. Full outbound sending requires B1–B4 and a new DR.

## Constraints

- No outbound WhatsApp messages under any circumstances (B1–B4 not resolved)
- No autonomous client replies
- HUMAN_GATE mandatory on every ROUTE_WHATSAPP_INQUIRY task (step 1)
- `organizationId` always from server-side session/token, never from message content
- Message text is untrusted external data; classifier treats it as opaque string
- No financial mutations of any kind
- No cross-org data access
- Full audit trail via existing `auditEvents` mechanism
- `WHATSAPP_APP_SECRET` and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` are server-side only

## Files Created / Modified

- `docs/decisions/0125-whatsapp-agent-foundation.md` (this file)
- `db/migrations/0019_whatsapp_foundation.sql`
- `lib/skills/interface.ts` (add `communication.whatsapp.classify`, add 'COMMUNICATION' to SkillFamily)
- `lib/skills/authority.ts` (add to HUMAN_SKILL_AUTHORITY + AGENT_ALLOWLIST)
- `lib/skills/communication/whatsapp-classify.ts` (new deterministic skill)
- `lib/skills/registry.ts` (register)
- `lib/orchestration/types.ts` (add ROUTE_WHATSAPP_INQUIRY)
- `lib/orchestration/planner.ts` (add plan template)
- `lib/agents/whatsapp-inquiry-specialist.ts` (delegation function)
- `lib/agents/index.ts` (export)
- `app/api/webhooks/whatsapp/route.ts` (webhook stub)
- `lib/__tests__/whatsapp-classify.test.ts`
- `lib/__tests__/whatsapp-inquiry-specialist.test.ts`
- `app/api/webhooks/whatsapp/route.test.ts`
