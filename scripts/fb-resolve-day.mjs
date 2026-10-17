/**
 * Resolves the current slot's campaign post from content-schedule.json.
 *
 * Usage: node scripts/fb-resolve-day.mjs [YYYY-MM-DD]
 *
 * Slot determination (Dubai = UTC+4):
 *   UTC 03–11  → "morning"  (09:00 Dubai)
 *   UTC 12–22  → "evening"  (18:00 Dubai)
 *
 * Outputs to GITHUB_OUTPUT:
 *   SKIP        true | false
 *   DAY         post number
 *   MEDIA_TYPE  image | video
 *   IMAGE_PATH  relative path (image posts)
 *   VIDEO_PATH  relative path (video posts)
 *
 * Writes caption to /tmp/post-message.txt (avoids shell injection).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const scheduleFile = resolve('assets/facebook/content-schedule.json');
const logFile      = resolve('assets/facebook/publish-log.json');
const outputFile   = process.env.GITHUB_OUTPUT ?? '/tmp/github-output.txt';
const messageFile  = '/tmp/post-message.txt';

function setOutput(key, value) {
  writeFileSync(outputFile, `${key}=${value}\n`, { flag: 'a' });
}

function skip(reason) {
  console.log(`SKIP: ${reason}`);
  setOutput('SKIP', 'true');
  setOutput('DAY', '0');
  setOutput('MEDIA_TYPE', '');
  setOutput('IMAGE_PATH', '');
  setOutput('VIDEO_PATH', '');
  setOutput('POST_KEY', '');
  process.exit(0);
}

// Determine target date
const dateArg = process.argv[2];
let targetDate;
if (dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  targetDate = dateArg;
} else {
  targetDate = new Date().toISOString().slice(0, 10);
}

// Determine slot from UTC hour
const utcHour = new Date().getUTCHours();
const slot = utcHour < 12 ? 'morning' : 'evening';
console.log(`Resolving: date=${targetDate}  utcHour=${utcHour}  slot=${slot}`);

// Load schedule
if (!existsSync(scheduleFile)) skip('content-schedule.json not found');
const schedule = JSON.parse(readFileSync(scheduleFile, 'utf-8'));

// Find matching entry
const entry = schedule.find(e => e.date === targetDate && e.slot === slot);
if (!entry) skip(`No post scheduled for ${targetDate} [${slot}]`);

// Skip if already published in schedule
if (entry.status === 'published') skip(`Day ${entry.day} already marked published`);

// Compute a stable dedup key for this post
const postKey = entry.mediaType === 'text'
  ? `${entry.date}-${entry.slot}`
  : (entry.imagePath ?? entry.videoPath ?? `${entry.date}-${entry.slot}`);

// Guard against double-post: check publish log
if (existsSync(logFile)) {
  const log = JSON.parse(readFileSync(logFile, 'utf-8'));
  if (log.some(l => l.postKey === postKey || (entry.imagePath && l.imagePath === entry.imagePath))) {
    skip(`${postKey} already in publish log`);
  }
}

console.log(`Resolved Day ${entry.day}: ${entry.mediaType} (key: ${postKey})`);

// Write caption to temp file
writeFileSync(messageFile, entry.caption, 'utf-8');

// Emit outputs
setOutput('SKIP',        'false');
setOutput('DAY',         String(entry.day));
setOutput('MEDIA_TYPE',  entry.mediaType ?? 'image');
setOutput('IMAGE_PATH',  entry.imagePath ?? '');
setOutput('VIDEO_PATH',  entry.videoPath ?? '');
setOutput('POST_KEY',    postKey);
