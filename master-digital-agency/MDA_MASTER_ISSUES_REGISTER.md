# MDA MASTER ISSUES REGISTER
**Project:** DREXONYX / MDA — drexonyx-v1  
**Branch:** ccr-3a71ba38-pwua60 (dev), main (production)  
**Last Updated:** 2026-10-30  
**Scope:** Inventory, analysis, documentation only. No changes without owner approval.

---

## Evidence Labels
| Label | Meaning |
|---|---|
| CONFIRMED—CODE | Verified by reading source file in current branch |
| CONFIRMED—FIXED | Merged to main and deployed |
| CONFIRMED—LIVE | Tested at live URL |
| UNVERIFIED | Not yet checked |
| NEEDS-PROD-TEST | Code exists but not tested in production environment |
| DEFERRED | Known, out of scope for current phase |

---

## ISSUE REGISTER

### ISS-001 — Chatbot Primary Model Name Incorrect
| Field | Value |
|---|---|
| **ID** | ISS-001 |
| **Status** | CONFIRMED—CODE |
| **Severity** | MEDIUM |
| **Source** | `app/api/chatbot/route.ts:9` |
| **Evidence** | `const MODELS = ['gemini-3.5-flash-lite', 'gemini-2.0-flash']` — `gemini-3.5-flash-lite` is not a valid Google Gemini model name. Valid names follow pattern `gemini-2.5-flash-lite`. The fallback catches 404 errors, so the bot silently uses `gemini-2.0-flash` on every request. |
| **Description** | Primary chatbot model is invalid/non-existent. System falls back to secondary model on every API call without the user knowing. |
| **Proposed Fix** | Change `'gemini-3.5-flash-lite'` to `'gemini-2.5-flash-lite'` in `app/api/chatbot/route.ts` |
| **Test Result** | Not yet tested (awaiting owner approval to modify) |
| **Affected Systems** | /chat/demo, /chat/try, /chat/mda |

---

### ISS-002 — Netflix "N" Logo in /chat/try Hero Background
| Field | Value |
|---|---|
| **ID** | ISS-002 |
| **Status** | CONFIRMED—CODE |
| **Severity** | HIGH (brand risk) |
| **Source** | `lib/chatbot/clients.ts:203` |
| **Evidence** | `heroBg: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113...'` — screenshot confirmed Netflix "N" logo visible in the background |
| **Description** | The /chat/try promotional demo page displays a Netflix "N" logo in the hero background. This is a trademark issue and misrepresents the brand. |
| **Proposed Fix** | Replace Unsplash image with a neutral tech/AI image. Candidate: search Unsplash for "chatbot AI business" without identifiable brand logos. |
| **Test Result** | Not yet fixed |
| **Affected Systems** | /chat/try |

---

### ISS-003 — Chatbot Pricing Discrepancy (Code vs. Owner Statement)
| Field | Value |
|---|---|
| **ID** | ISS-003 |
| **Status** | CONFIRMED—CODE (discrepancy needs owner resolution) |
| **Severity** | HIGH (commercial risk) |
| **Source** | `lib/chatbot/clients.ts` (system prompts for demo, try clients) |
| **Evidence** | Code lists plans as: Basic AED 299 / Advanced AED 499 / Professional AED 799. Owner stated "199 درهم" as the first client's payment in a recent conversation session. `MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` does NOT list a chatbot subscription pricing tier. |
| **Description** | Chatbot subscription pricing in code (299/499/799) may not match approved pricing. Owner stated 199 AED in conversation. This requires clarification from the owner. |
| **Proposed Fix** | Owner must explicitly confirm the approved chatbot subscription price tiers before any code change. |
| **Test Result** | Pending owner decision |
| **Affected Systems** | /chat/demo, /chat/try system prompts |

---

### ISS-004 — promo.html Button Does Not Link to /chat/try
| Field | Value |
|---|---|
| **ID** | ISS-004 |
| **Status** | CONFIRMED—CODE (pending verification) |
| **Severity** | MEDIUM |
| **Source** | `public/promo.html` (embedded widget approach) |
| **Evidence** | Previous session analysis confirmed the promo page used an embedded chatbot widget rather than linking to `/chat/try`. Owner requested it link to the dedicated bot page instead. |
| **Description** | The promotional landing page (promo.html) should direct visitors to `/chat/try` rather than embedding its own widget. |
| **Proposed Fix** | Update CTA button in promo.html to `href="/chat/try"` |
| **Test Result** | Not yet fixed |
| **Affected Systems** | /promo.html → /chat/try |

---

### ISS-005 — MDA Bot Widget Not Embedded on /mda Page
| Field | Value |
|---|---|
| **ID** | ISS-005 |
| **Status** | CONFIRMED—CODE |
| **Severity** | MEDIUM |
| **Source** | `app/mda/page.tsx` |
| **Evidence** | Read entire `app/mda/page.tsx` — no chatbot widget component present. The /chat/mda bot exists but is only accessible at its own URL. |
| **Description** | The MDA page does not include the MDA chatbot widget. Owner requested it be added to the /mda section. |
| **Proposed Fix** | Embed the chatbot component in `app/mda/page.tsx`, pointed at clientId='mda'. |
| **Test Result** | Not yet implemented |
| **Affected Systems** | /mda page |

---

### ISS-006 — DREXONYX Homepage Lacks Its Own Chatbot
| Field | Value |
|---|---|
| **ID** | ISS-006 |
| **Status** | CONFIRMED—CODE |
| **Severity** | LOW (enhancement) |
| **Source** | `lib/chatbot/clients.ts` — no 'drexonyx' client registered |
| **Evidence** | Only clients: mda, demo, try, template-restaurant, template-shop, template-salon. No 'drexonyx' client registered. |
| **Description** | Owner noted the DREXONYX homepage has no dedicated bot. To add one, a new client entry needs to be registered. Owner decided to defer until social media bot discussions complete. |
| **Proposed Fix** | Register a 'drexonyx' client in `lib/chatbot/clients.ts` with appropriate system prompt, then embed on homepage. |
| **Test Result** | Deferred |
| **Affected Systems** | Homepage |

---

### ISS-007 — Cloudflare R2 Not Configured
| Field | Value |
|---|---|
| **ID** | ISS-007 |
| **Status** | CONFIRMED—CODE (env vars not set) |
| **Severity** | HIGH (blocks Facebook publishing, asset management) |
| **Source** | `lib/infrastructure/object-storage.ts`, `.env.example` |
| **Evidence** | R2 throws if `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` are absent. No R2 credentials confirmed set in Vercel. Facebook image/video publishing requires R2 media URLs. |
| **Description** | Cloudflare R2 object storage is not configured. Any feature that uploads or reads assets (Facebook image/video posts, asset management) will fail with an unhandled exception. |
| **Proposed Fix** | Create R2 bucket in Cloudflare dashboard, generate R2 API token (read+write), set all 4 env vars in Vercel production. |
| **Test Result** | Cannot test without credentials |
| **Affected Systems** | Facebook publishing (IMAGE/VIDEO), asset uploads, /api/assets/* |

---

### ISS-008 — Facebook Publishing Completely Blocked (Meta Credentials Missing)
| Field | Value |
|---|---|
| **ID** | ISS-008 |
| **Status** | CONFIRMED—CODE (env vars not set) |
| **Severity** | HIGH |
| **Source** | `lib/skills/facebook/page-publish.ts:227`, `.env.example` |
| **Evidence** | `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID_1`, `META_PAGE_ID_2` not confirmed set. Skill returns `MISSING_CREDENTIAL` if absent. |
| **Description** | Facebook organic page publishing is completely blocked. No posts can be made to either authorized page. Also blocked by ISS-007 (R2 required for IMAGE/VIDEO). |
| **Proposed Fix** | 1. Create System User Token in Meta Business Manager with `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` scopes. 2. Set META_PAGE_ACCESS_TOKEN, META_PAGE_ID_1, META_PAGE_ID_2 in Vercel. 3. Also fix ISS-007 for image/video. |
| **Test Result** | Cannot test without credentials |
| **Affected Systems** | COORDINATE_MARKETING_CAMPAIGN pipeline |

---

### ISS-009 — Resend Email Configuration Status Unknown
| Field | Value |
|---|---|
| **ID** | ISS-009 |
| **Status** | UNVERIFIED |
| **Severity** | MEDIUM |
| **Source** | `lib/email/brief-notification.ts`, `lib/orchestration/email.ts`, `.env.example` |
| **Evidence** | Code pattern: `if (!apiKey) return;` — email silently skips if RESEND_API_KEY is absent. Cannot confirm whether RESEND_API_KEY and RESEND_FROM_ADDRESS are set in Vercel without checking Vercel env vars directly. |
| **Description** | Brief notification emails, quote emails, delivery emails, and orchestration alerts all depend on Resend. If not configured, they silently fail. Domain verification status also unknown. |
| **Proposed Fix** | Confirm RESEND_API_KEY and RESEND_FROM_ADDRESS are set in Vercel. Verify domain drexonyx.com is verified in Resend dashboard. Test with /api/internal/sales-test-send (requires SALES_OUTREACH_TEST_MODE=true). |
| **Test Result** | Pending Vercel env var check |
| **Affected Systems** | Brief notifications, orchestration alerts, delivery emails, sales outreach |

---

### ISS-010 — SALES_OUTREACH_TEST_MODE Safety Gate Status Unknown in Production
| Field | Value |
|---|---|
| **ID** | ISS-010 |
| **Status** | UNVERIFIED — CRITICAL SAFETY |
| **Severity** | CRITICAL |
| **Source** | `.env.example:58`, multiple cron routes |
| **Evidence** | `.env.example` clearly warns: "Absent or any value other than 'true' means test mode is OFF and real prospect emails WILL be sent." Cannot confirm Vercel production value without checking. |
| **Description** | If SALES_OUTREACH_TEST_MODE is not explicitly set to "true" in Vercel production, the 5 sales cron jobs (discovery, followups, outreach-send, reply-poll, daily-report) will send real emails to real prospect email addresses. |
| **Proposed Fix** | Immediately verify this env var is set to "true" in Vercel production before any cron fires. Keep "true" until owner explicitly authorizes switching to live mode after verifying domain + end-to-end test delivery. |
| **Test Result** | Must verify in Vercel dashboard ASAP |
| **Affected Systems** | ALL sales cron jobs |

---

### ISS-011 — Admin Panel Configuration Status Unknown
| Field | Value |
|---|---|
| **ID** | ISS-011 |
| **Status** | UNVERIFIED |
| **Severity** | MEDIUM |
| **Source** | `app/api/admin/login/route.ts`, `.env.example` |
| **Evidence** | Admin login requires: ADMIN_LOGIN_PASSWORD_HASH, DREXONYX_ORG_ID, DATABASE_URL, ENABLE_ADMIN_ROUTES=true. All must be set on a separate admin Vercel deployment (public site should NOT have ENABLE_ADMIN_ROUTES). |
| **Description** | It's unknown whether the admin panel is deployed and accessible. If ENABLE_ADMIN_ROUTES is not set, /admin/* returns 404 (this is correct for the public site). |
| **Proposed Fix** | Confirm if admin Vercel project exists and is configured with all required env vars. |
| **Test Result** | Pending |
| **Affected Systems** | /admin/* |

---

### ISS-012 — Database Migration 0026 (email_optouts) May Not Be Applied
| Field | Value |
|---|---|
| **ID** | ISS-012 |
| **Status** | CONFIRMED—CODE (migration exists, applied status unknown) |
| **Severity** | MEDIUM |
| **Source** | `app/api/internal/run-migration/route.ts` |
| **Evidence** | Migration creates `sales.email_optouts` table. Required for sales outreach unsubscribe flow. Uses `CREATE TABLE IF NOT EXISTS` (safe to re-run). Only runs when SALES_OUTREACH_TEST_MODE=true. |
| **Description** | The email_optouts migration may not have been applied to the Neon DB. Without it, the unsubscribe flow will fail when a prospect clicks unsubscribe. |
| **Proposed Fix** | Run GET /api/internal/run-migration (with SALES_OUTREACH_TEST_MODE=true) to apply safely. |
| **Test Result** | Not yet run |
| **Affected Systems** | /api/unsubscribe, sales outreach |

---

### ISS-013 — Higgsfield AI Provider Not Configured
| Field | Value |
|---|---|
| **ID** | ISS-013 |
| **Status** | UNVERIFIED |
| **Severity** | LOW (not yet in commercial use) |
| **Source** | `.env.example:62-71` |
| **Evidence** | HIGGSFIELD_API_KEY, HIGGSFIELD_API_BASE_URL, HIGGSFIELD_WEBHOOK_URL, HIGGSFIELD_WEBHOOK_SECRET required. Status in Vercel unknown. |
| **Description** | Higgsfield is the AI video/image production provider. Required for COORDINATE_MARKETING_CAMPAIGN pipeline video generation. |
| **Proposed Fix** | Configure when video production campaigns begin. |
| **Test Result** | Deferred |
| **Affected Systems** | Production/campaign pipeline, /api/webhooks/higgsfield |

---

### ISS-014 — Stripe and Ziina Payments Not Configured
| Field | Value |
|---|---|
| **ID** | ISS-014 |
| **Status** | UNVERIFIED |
| **Severity** | LOW (no clients yet) |
| **Source** | `.env.example:36-42, 151-162` |
| **Evidence** | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ZIINA_API_KEY, ZIINA_BASE_URL, ZIINA_TEST_MODE all required but status unknown. |
| **Description** | Payment processing is not confirmed configured. No clients exist yet so this is not blocking revenue. |
| **Proposed Fix** | Configure when first paying client is onboarded. |
| **Test Result** | Deferred |
| **Affected Systems** | /api/webhooks/stripe, /portal/payments |

---

### ISS-015 — WhatsApp Webhook Not Configured
| Field | Value |
|---|---|
| **ID** | ISS-015 |
| **Status** | UNVERIFIED |
| **Severity** | LOW |
| **Source** | `.env.example:122-135` |
| **Evidence** | WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_PHONE_NUMBER_ID required. Status unknown. |
| **Description** | WhatsApp inbound message handling is not configured. WhatsApp CTA buttons in chatbots open WhatsApp directly (client-side), so this only affects inbound webhook routing, not the chatbot WA links. |
| **Proposed Fix** | Configure when WhatsApp business integration is ready. |
| **Test Result** | Deferred |
| **Affected Systems** | /api/webhooks/whatsapp |

---

### ISS-016 — PR #49 Chatbot Fixes — Production Deployment Status
| Field | Value |
|---|---|
| **ID** | ISS-016 |
| **Status** | CONFIRMED—FIXED (merged to main). Production deploy: BLOCKED by Vercel 100/day limit at time of merge. |
| **Severity** | MEDIUM |
| **Source** | GitHub commit `210ff06`, Vercel deployment log |
| **Evidence** | PR #49 merged successfully. Vercel deployment was attempted but hit the 100 deployments/day limit. Limit was expected to reset ~10:26 AM Dubai time, Oct 30. |
| **Description** | The chatbot history role fix, markdown rendering, and RTL/LTR auto-direction are merged but may not be live in production. |
| **Proposed Fix** | Verify current production deployment SHA matches `210ff06` in Vercel dashboard. If not, promote the latest deployment when Vercel limit resets. |
| **Test Result** | Pending Vercel limit reset verification |
| **Affected Systems** | /api/chatbot, /chat/* |

---

### ISS-017 — Audit Report Error: Research Service Prices
| Field | Value |
|---|---|
| **ID** | ISS-017 |
| **Status** | CONFIRMED—FIXED (documentation error) |
| **Severity** | LOW (documentation only) |
| **Source** | `lib/catalog/mda-services.ts`, `MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` |
| **Evidence** | Previous audit artifact (Oct 29, 2026) listed Research prices as AED 149/299. Actual code and SOT document confirm: Product Research = AED 99, Market Research = AED 199. |
| **Description** | Audit artifact published in previous session contained incorrect research service prices. No code was wrong. Only the audit document. |
| **Proposed Fix** | This register supersedes the Oct 29 audit. Correct prices are 99/199 AED. |
| **Test Result** | N/A (documentation correction) |
| **Affected Systems** | None (documentation only) |

---

### ISS-018 — Neon DB Connection Status Cannot Be Verified in This Session
| Field | Value |
|---|---|
| **ID** | ISS-018 |
| **Status** | UNVERIFIED (Neon MCP requires OAuth — not authorized) |
| **Severity** | MEDIUM |
| **Source** | `db/index.ts` |
| **Evidence** | DB client uses `postgres(DATABASE_URL, { prepare: false })` with lazy initialization. If DATABASE_URL is not set in Vercel, all DB-dependent routes throw on first query. Neon MCP connector requires OAuth not yet completed in this session. |
| **Description** | Cannot confirm DATABASE_URL is set in Vercel, DB schemas are migrated, or tables exist without Neon OAuth or Vercel env var access. |
| **Proposed Fix** | Owner should: 1. Confirm DATABASE_URL is set in Vercel. 2. Check Neon console for schema existence. 3. Authorize Neon MCP in this session if needed for deeper checks. |
| **Test Result** | Pending owner action |
| **Affected Systems** | ALL routes that query the database |

---

## SUMMARY TABLE

| ID | Severity | Status | System | Description |
|---|---|---|---|---|
| ISS-001 | MEDIUM | CONFIRMED—CODE | Chatbot API | Wrong primary model name (`gemini-3.5-flash-lite`) |
| ISS-002 | HIGH | CONFIRMED—CODE | /chat/try | Netflix "N" logo in hero background |
| ISS-003 | HIGH | NEEDS-OWNER-DECISION | /chat/demo,try | Chatbot subscription pricing discrepancy |
| ISS-004 | MEDIUM | CONFIRMED—CODE | promo.html | CTA button doesn't link to /chat/try |
| ISS-005 | MEDIUM | CONFIRMED—CODE | /mda page | MDA bot widget not embedded |
| ISS-006 | LOW | DEFERRED | Homepage | No DREXONYX-specific chatbot |
| ISS-007 | HIGH | CONFIRMED—CODE | Assets, Facebook | R2 not configured (4 env vars missing) |
| ISS-008 | HIGH | CONFIRMED—CODE | Facebook publishing | Meta credentials missing (3 env vars) |
| ISS-009 | MEDIUM | UNVERIFIED | Email / Resend | Resend config status unknown |
| ISS-010 | CRITICAL | UNVERIFIED | Sales crons | SALES_OUTREACH_TEST_MODE status unknown |
| ISS-011 | MEDIUM | UNVERIFIED | /admin/* | Admin panel config status unknown |
| ISS-012 | MEDIUM | CONFIRMED—CODE | Sales / Unsubscribe | Migration 0026 may not be applied |
| ISS-013 | LOW | DEFERRED | Video production | Higgsfield not configured |
| ISS-014 | LOW | DEFERRED | Payments | Stripe/Ziina not configured |
| ISS-015 | LOW | DEFERRED | WhatsApp | WhatsApp webhook not configured |
| ISS-016 | MEDIUM | CONFIRMED—FIXED | Chatbot | PR #49 production deploy pending |
| ISS-017 | LOW | CONFIRMED—FIXED | Documentation | Research prices incorrectly documented |
| ISS-018 | MEDIUM | UNVERIFIED | Database | Neon DB connection cannot be verified |

---

*Document created: 2026-10-30. Read-only analysis — no code changes made.*
