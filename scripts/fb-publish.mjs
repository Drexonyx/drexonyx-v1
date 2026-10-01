/**
 * Direct Facebook Page publisher — Claude Code → Meta Graph API.
 *
 * Usage:
 *   META_PAGE_ACCESS_TOKEN="<token>" META_PAGE_ID_1="<pageId>" \
 *     node scripts/fb-publish.mjs "Your post text here"
 *
 * Returns JSON to stdout:
 *   { "ok": true,  "postId": "<pageId>_<postId>" }
 *   { "ok": false, "error": "[GRAPH_API_ERROR:190] Session has expired..." }
 *
 * The access token is never printed, logged, or included in output.
 * Requires Node.js 18+ (native fetch).
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

async function resolvePageToken(credential, pageId) {
  // Determine whether credential is already a Page token for this page.
  let meRes;
  try {
    meRes = await fetch(`${GRAPH_API_BASE}/me?fields=id`, {
      headers: { Authorization: `Bearer ${credential}` },
    });
  } catch (e) {
    return { ok: false, reason: 'NETWORK_ERROR', msg: e.message };
  }

  let meJson;
  try { meJson = await meRes.json(); } catch {
    return { ok: false, reason: 'GRAPH_API_ERROR', msg: `token-check: HTTP ${meRes.status} (non-JSON)` };
  }

  if (!meRes.ok) {
    const err = meJson?.error;
    return {
      ok: false,
      reason: 'GRAPH_API_ERROR',
      msg: typeof err?.message === 'string' ? `token-check: ${err.message}` : `token-check: HTTP ${meRes.status}`,
      code: typeof err?.code === 'number' ? err.code : meRes.status,
    };
  }

  // Already a Page token for the target page — use directly.
  if (typeof meJson.id === 'string' && meJson.id === pageId) {
    return { ok: true, token: credential };
  }

  // User token — exchange for Page token via /me/accounts.
  let accountsRes;
  try {
    accountsRes = await fetch(`${GRAPH_API_BASE}/me/accounts?fields=id,access_token`, {
      headers: { Authorization: `Bearer ${credential}` },
    });
  } catch (e) {
    return { ok: false, reason: 'NETWORK_ERROR', msg: e.message };
  }

  let accountsJson;
  try { accountsJson = await accountsRes.json(); } catch {
    return { ok: false, reason: 'GRAPH_API_ERROR', msg: `accounts: HTTP ${accountsRes.status} (non-JSON)` };
  }

  if (!accountsRes.ok) {
    const err = accountsJson?.error;
    return {
      ok: false,
      reason: 'GRAPH_API_ERROR',
      msg: typeof err?.message === 'string' ? `accounts: ${err.message}` : `accounts: HTTP ${accountsRes.status}`,
      code: typeof err?.code === 'number' ? err.code : accountsRes.status,
    };
  }

  const pages = Array.isArray(accountsJson.data) ? accountsJson.data : [];
  const match = pages.find(p => typeof p.id === 'string' && p.id === pageId);
  if (!match) {
    return { ok: false, reason: 'UNAUTHORIZED_PAGE', msg: 'Page not found in /me/accounts — verify admin role for the configured page' };
  }
  if (typeof match.access_token !== 'string' || !match.access_token) {
    return { ok: false, reason: 'MISSING_CREDENTIAL', msg: 'accounts: target page entry has no access_token' };
  }

  return { ok: true, token: match.access_token };
}

async function publishToPage(pageId, token, message) {
  let res;
  try {
    res = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, published: true }),
    });
  } catch (e) {
    return { ok: false, code: 0, msg: e.message };
  }

  let json;
  try { json = await res.json(); } catch {
    return { ok: false, code: res.status, msg: `HTTP ${res.status} (non-JSON body)` };
  }

  if (res.ok && typeof json.id === 'string') {
    return { ok: true, postId: json.id };
  }

  const err = json?.error;
  return {
    ok: false,
    code: typeof err?.code === 'number' ? err.code : res.status,
    subcode: typeof err?.error_subcode === 'number' ? err.error_subcode : undefined,
    msg: typeof err?.message === 'string' ? err.message : `HTTP ${res.status}`,
  };
}

async function main() {
  const message = process.argv[2];
  if (!message || !message.trim()) {
    console.error('Usage: node scripts/fb-publish.mjs "Your post text here"');
    process.exit(1);
  }

  const credential = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!credential) {
    console.log(JSON.stringify({ ok: false, error: '[MISSING_CREDENTIAL] META_PAGE_ACCESS_TOKEN is not set' }));
    process.exit(1);
  }

  const pageId = process.env.META_PAGE_ID_1?.trim();
  if (!pageId) {
    console.log(JSON.stringify({ ok: false, error: '[MISSING_CREDENTIAL] META_PAGE_ID_1 is not set' }));
    process.exit(1);
  }

  // Step 1: resolve to an effective Page Access Token.
  const resolution = await resolvePageToken(credential, pageId);
  if (!resolution.ok) {
    const codeTag = resolution.code ? `:${resolution.code}` : '';
    console.log(JSON.stringify({ ok: false, error: `[${resolution.reason}${codeTag}] ${resolution.msg}` }));
    process.exit(1);
  }

  // Step 2: publish.
  const result = await publishToPage(pageId, resolution.token, message.trim());
  if (!result.ok) {
    const codeTag = result.code ? `:${result.code}` : '';
    const sub = result.subcode ? `/${result.subcode}` : '';
    console.log(JSON.stringify({ ok: false, error: `[GRAPH_API_ERROR${codeTag}${sub}] ${result.msg}` }));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, postId: result.postId }));
}

main().catch(e => {
  console.log(JSON.stringify({ ok: false, error: `[UNHANDLED] ${e.message ?? String(e)}` }));
  process.exit(1);
});
