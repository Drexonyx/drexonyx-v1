/**
 * Resolves today's campaign post from assets/facebook/campaign.json.
 * Emits GitHub Actions output variables (GITHUB_OUTPUT) for subsequent steps.
 * Writes the post message to /tmp/post-message.txt to avoid shell injection.
 *
 * Usage: node scripts/fb-resolve-day.mjs [YYYY-MM-DD]
 *   Optional date arg overrides today's date (for catch-up or testing).
 *
 * Outputs (via GITHUB_OUTPUT):
 *   SKIP=true|false
 *   DAY=<n>
 *   MEDIA_TYPE=image|video
 *   IMAGE_PATH=<repo-relative-path>
 *   VIDEO_PATH=<repo-relative-path or empty>
 */

import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'fs';

const targetDate = process.argv[2] || new Date().toISOString().slice(0, 10);
const githubOutput = process.env.GITHUB_OUTPUT || '/dev/stdout';

function emit(key, value) {
  appendFileSync(githubOutput, `${key}=${value}\n`);
}

function skip(reason) {
  console.log(reason);
  emit('SKIP', 'true');
  process.exit(0);
}

const campaign = JSON.parse(readFileSync('assets/facebook/campaign.json', 'utf8'));
const entry = campaign.posts.find(p => p.date === targetDate);

if (!entry) {
  skip(`No campaign entry for ${targetDate} — nothing to publish.`);
}

// Duplicate check against the publish log
let log = [];
if (existsSync('assets/facebook/publish-log.json')) {
  try { log = JSON.parse(readFileSync('assets/facebook/publish-log.json', 'utf8')); } catch {}
}
const mediaPath = entry.video_path || entry.image_path;
const alreadyPublished = Array.isArray(log) && log.some(
  e => e.imagePath === mediaPath || e.videoPath === mediaPath,
);
if (alreadyPublished) {
  skip(`Duplicate: ${mediaPath} already in publish log — skipping.`);
}

// Write message to a temp file — avoids shell injection for multiline captions
writeFileSync('/tmp/post-message.txt', entry.message);

emit('SKIP', 'false');
emit('DAY', String(entry.day));
emit('MEDIA_TYPE', entry.media_type);
emit('IMAGE_PATH', entry.image_path);
emit('VIDEO_PATH', entry.video_path || '');

console.log(`Resolved Day ${entry.day} (${entry.date}) — ${entry.media_type} — ${mediaPath}`);
