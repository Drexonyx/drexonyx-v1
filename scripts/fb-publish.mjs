/**
 * Direct Facebook Page publisher — Claude Code → Meta Graph API.
 *
 * Usage:
 *   # Credential validation (no publish):
 *   META_PAGE_ACCESS_TOKEN="<token>" META_PAGE_ID_1="<pageId>" \
 *     node scripts/fb-publish.mjs --validate
 *
 *   # QC check only (no publish):
 *   IMAGE_PATH="assets/facebook/posts/day01.png" \
 *     node scripts/fb-publish.mjs --qc "Caption text"
 *
 *   # Text post:
 *   META_PAGE_ACCESS_TOKEN="<token>" META_PAGE_ID_1="<pageId>" \
 *     node scripts/fb-publish.mjs "Your post text here"
 *
 *   # Image post (QC runs automatically before publish):
 *   META_PAGE_ACCESS_TOKEN="<token>" META_PAGE_ID_1="<pageId>" \
 *     IMAGE_PATH="assets/facebook/posts/day01.png" \
 *     LOG_PATH="assets/facebook/publish-log.json" \
 *     node scripts/fb-publish.mjs --image-post "Caption here"
 *
 * Returns JSON to stdout:
 *   { "ok": true,  "postId": "<postId>" }
 *   { "ok": false, "error": "[REASON] description" }
 *
 * The access token is never printed, logged, or included in any output.
 * Requires Node.js 18+ (native fetch, FormData, Blob).
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
// Facebook photo size limit: 10 MB
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
// Facebook caption character limit
const CAPTION_MAX_CHARS = 63206;

// ---------------------------------------------------------------------------
// QC — validates image file + caption before any publish attempt
// ---------------------------------------------------------------------------
function validateQC(imagePath, caption) {
  const issues = [];

  // Caption checks
  if (!caption || !caption.trim()) {
    issues.push('Caption is empty');
  } else if (caption.length > CAPTION_MAX_CHARS) {
    issues.push(`Caption exceeds Facebook limit (${caption.length}/${CAPTION_MAX_CHARS} chars)`);
  }

  // Image file checks
  if (!imagePath) {
    issues.push('IMAGE_PATH is not set');
  } else {
    if (!existsSync(imagePath)) {
      issues.push(`Image file not found: ${imagePath}`);
    } else {
      const stat = statSync(imagePath);
      if (stat.size === 0) {
        issues.push('Image file is empty (0 bytes)');
      } else if (stat.size > IMAGE_MAX_BYTES) {
        issues.push(`Image file too large (${(stat.size / 1024 / 1024).toFixed(1)} MB; Facebook limit 10 MB)`);
      }
      // Validate file signature (magic bytes)
      const buf = readFileSync(imagePath);
      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
      const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
      if (!isPng && !isJpg && !isGif) {
        issues.push('Image format is not PNG, JPEG, or GIF (invalid file signature)');
      }
    }
  }

  return issues.length === 0
    ? { ok: true }
    : { ok: false, issues };
}

// ---------------------------------------------------------------------------
// Duplicate detection — checks publish log to prevent re-publishing the same
// image asset. Keyed on normalised imagePath.
// ---------------------------------------------------------------------------
function isDuplicate(logPath, imagePath) {
  if (!logPath || !existsSync(logPath)) return false;
  try {
    const log = JSON.parse(readFileSync(logPath, 'utf-8'));
    return Array.isArray(log) && log.some(entry => entry.imagePath === imagePath);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Publish log — appends one entry after a successful publish
// ---------------------------------------------------------------------------
function appendToLog(logPath, entry) {
  if (!logPath) return;
  let log = [];
  if (existsSync(logPath)) {
    try { log = JSON.parse(readFileSync(logPath, 'utf-8')); } catch { log = []; }
  }
  log.push(entry);
  writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Token resolution
// ---------------------------------------------------------------------------
async function resolvePageToken(credential, pageId) {
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

  if (typeof meJson.id === 'string' && meJson.id === pageId) {
    return { ok: true, token: credential };
  }

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

// ---------------------------------------------------------------------------
// Text post
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Image post — multipart/form-data binary upload to /{pageId}/photos
// The access token is never logged, returned, or included in any output.
// ---------------------------------------------------------------------------
async function publishImageToPage(pageId, token, caption, imagePath) {
  let imageBytes;
  try {
    imageBytes = readFileSync(imagePath);
  } catch (e) {
    return { ok: false, code: 0, msg: `Could not read image file: ${e.message}` };
  }

  const ext = imagePath.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

  const form = new FormData();
  form.append('source', new Blob([imageBytes], { type: mimeType }), `image.${ext}`);
  form.append('caption', caption);
  form.append('published', 'true');

  let res;
  try {
    res = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
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

// ---------------------------------------------------------------------------
// Credential validation (no publish)
// ---------------------------------------------------------------------------
async function validateCredential(credential) {
  let meRes;
  try {
    meRes = await fetch(`${GRAPH_API_BASE}/me?fields=id,name`, {
      headers: { Authorization: `Bearer ${credential}` },
    });
  } catch (e) {
    return { ok: false, error: `[NETWORK_ERROR] ${e.message}` };
  }

  let meJson;
  try { meJson = await meRes.json(); } catch {
    return { ok: false, error: `[GRAPH_API_ERROR] token-check: HTTP ${meRes.status} (non-JSON)` };
  }

  if (!meRes.ok) {
    const err = meJson?.error;
    const code = typeof err?.code === 'number' ? `:${err.code}` : '';
    const msg = typeof err?.message === 'string' ? err.message : `HTTP ${meRes.status}`;
    return { ok: false, error: `[GRAPH_API_ERROR${code}] ${msg}` };
  }

  const selfId = meJson.id;
  const selfName = meJson.name ?? '(unknown)';

  let accountsRes;
  try {
    accountsRes = await fetch(`${GRAPH_API_BASE}/me/accounts?fields=id,name`, {
      headers: { Authorization: `Bearer ${credential}` },
    });
  } catch (e) {
    return { ok: true, identity: { id: selfId, name: selfName }, pages: null, accountsError: e.message };
  }

  let accountsJson;
  try { accountsJson = await accountsRes.json(); } catch {
    return { ok: true, identity: { id: selfId, name: selfName }, pages: null };
  }

  const pages = accountsRes.ok && Array.isArray(accountsJson.data)
    ? accountsJson.data.map(p => ({ id: p.id, name: p.name }))
    : null;

  return { ok: true, identity: { id: selfId, name: selfName }, pages };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const arg = process.argv[2];

  const credential = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!credential) {
    console.log(JSON.stringify({ ok: false, error: '[MISSING_CREDENTIAL] META_PAGE_ACCESS_TOKEN is not set' }));
    process.exit(1);
  }

  // --validate: credential check only, no publish
  if (arg === '--validate') {
    const result = await validateCredential(credential);
    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  }

  // --qc: QC check only, no publish (credential not required)
  if (arg === '--qc') {
    const caption = process.argv[3];
    const imagePath = process.env.IMAGE_PATH?.trim();
    const qc = validateQC(imagePath, caption);
    console.log(JSON.stringify(qc));
    process.exit(qc.ok ? 0 : 1);
  }

  // --image-post: QC → duplicate check → publish → log
  if (arg === '--image-post') {
    const caption = process.argv[3];
    if (!caption || !caption.trim()) {
      console.error('Usage: IMAGE_PATH=<path> node scripts/fb-publish.mjs --image-post "Caption here"');
      process.exit(1);
    }
    const imagePath = process.env.IMAGE_PATH?.trim();
    const logPath = process.env.LOG_PATH?.trim() || null;

    // Step 1: QC
    const qc = validateQC(imagePath, caption);
    if (!qc.ok) {
      console.log(JSON.stringify({ ok: false, error: `[QC_FAILED] ${qc.issues.join('; ')}` }));
      process.exit(1);
    }

    // Step 2: Duplicate detection
    if (isDuplicate(logPath, imagePath)) {
      console.log(JSON.stringify({ ok: false, error: `[DUPLICATE] ${imagePath} has already been published` }));
      process.exit(1);
    }

    const pageId = process.env.META_PAGE_ID_1?.trim();
    if (!pageId) {
      console.log(JSON.stringify({ ok: false, error: '[MISSING_CREDENTIAL] META_PAGE_ID_1 is not set' }));
      process.exit(1);
    }

    // Step 3: Resolve token
    const resolution = await resolvePageToken(credential, pageId);
    if (!resolution.ok) {
      const codeTag = resolution.code ? `:${resolution.code}` : '';
      console.log(JSON.stringify({ ok: false, error: `[${resolution.reason}${codeTag}] ${resolution.msg}` }));
      process.exit(1);
    }

    // Step 4: Publish
    const result = await publishImageToPage(pageId, resolution.token, caption.trim(), imagePath);
    if (!result.ok) {
      const codeTag = result.code ? `:${result.code}` : '';
      const sub = result.subcode ? `/${result.subcode}` : '';
      console.log(JSON.stringify({ ok: false, error: `[GRAPH_API_ERROR${codeTag}${sub}] ${result.msg}` }));
      process.exit(1);
    }

    // Step 5: Write to publish log
    appendToLog(logPath, {
      imagePath,
      postId: result.postId,
      publishedAt: new Date().toISOString(),
      captionPreview: caption.trim().slice(0, 80),
    });

    console.log(JSON.stringify({ ok: true, postId: result.postId }));
    process.exit(0);
  }

  // Text post
  const message = arg;
  if (!message || !message.trim()) {
    console.error('Usage: node scripts/fb-publish.mjs "Your post text here"');
    console.error('       node scripts/fb-publish.mjs --image-post "Caption" (requires IMAGE_PATH env var)');
    console.error('       node scripts/fb-publish.mjs --qc "Caption" (requires IMAGE_PATH env var)');
    console.error('       node scripts/fb-publish.mjs --validate');
    process.exit(1);
  }

  const pageId = process.env.META_PAGE_ID_1?.trim();
  if (!pageId) {
    console.log(JSON.stringify({ ok: false, error: '[MISSING_CREDENTIAL] META_PAGE_ID_1 is not set' }));
    process.exit(1);
  }

  const resolution = await resolvePageToken(credential, pageId);
  if (!resolution.ok) {
    const codeTag = resolution.code ? `:${resolution.code}` : '';
    console.log(JSON.stringify({ ok: false, error: `[${resolution.reason}${codeTag}] ${resolution.msg}` }));
    process.exit(1);
  }

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
