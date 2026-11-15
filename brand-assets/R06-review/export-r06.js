#!/usr/bin/env node
/**
 * R06 Brand Asset PNG Exporter
 * Uses Playwright (pre-installed) to render R06-review SVG files to PNGs.
 * Outputs to brand-assets/R06-review/<brand>/exports/
 *
 * Usage: node brand-assets/R06-review/export-r06.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const R06_DIR = path.resolve(__dirname);

const MARK_SIZES = [256, 128, 64, 32];
const LOCKUP_WIDTH  = 800;
const LOCKUP_HEIGHT = 184;

const MARKS = [
  { brand: 'drexonyx-group', file: 'drexonyx-group-mark-dark',  bg: 'transparent' },
  { brand: 'drexonyx-group', file: 'drexonyx-group-mark-light', bg: '#F8F9FC' },
  { brand: 'dx-studio',      file: 'dx-studio-mark-dark',       bg: 'transparent' },
  { brand: 'dx-studio',      file: 'dx-studio-mark-light',      bg: '#F8F9FC' },
  { brand: 'mda',            file: 'mda-mark-dark',             bg: 'transparent' },
  { brand: 'mda',            file: 'mda-mark-light',            bg: '#F8F9FC' },
];

const LOCKUPS = [
  { brand: 'drexonyx-group', file: 'drexonyx-group-horizontal-dark',  bg: 'transparent' },
  { brand: 'drexonyx-group', file: 'drexonyx-group-horizontal-light', bg: '#FFFFFF' },
  { brand: 'dx-studio',      file: 'dx-studio-horizontal-dark',       bg: 'transparent' },
  { brand: 'dx-studio',      file: 'dx-studio-horizontal-light',      bg: '#FFFFFF' },
  { brand: 'mda',            file: 'mda-horizontal-dark',             bg: 'transparent' },
  { brand: 'mda',            file: 'mda-horizontal-light',            bg: '#FFFFFF' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readSvg(brand, filename) {
  return fs.readFileSync(path.join(R06_DIR, brand, `${filename}.svg`), 'utf8');
}

function getViewBox(svgContent) {
  const m = svgContent.match(/viewBox="([^"]+)"/);
  if (!m) return null;
  const p = m[1].split(/\s+/).map(Number);
  return { x: p[0], y: p[1], width: p[2], height: p[3] };
}

async function exportMark(page, brand, filename, size, bg) {
  const svg = readSvg(brand, filename);
  const vb = getViewBox(svg);
  if (!vb) throw new Error(`No viewBox in ${filename}.svg`);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:${size}px; height:${size}px; background:${bg}; overflow:hidden; }
.wrap { width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; }
svg { width:${size}px; height:${size}px; }
</style></head><body>
<div class="wrap">${svg}</div>
</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: size, height: size });

  const outDir = path.join(R06_DIR, brand, 'exports');
  ensureDir(outDir);
  const outPath = path.join(outDir, `${filename}-${size}px.png`);
  await page.screenshot({ path: outPath, omitBackground: bg === 'transparent' });
  console.log(`  ✓ ${outPath.replace(R06_DIR + '/', '')}`);
}

async function exportLockup(page, brand, filename, bg) {
  const svg = readSvg(brand, filename);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:${LOCKUP_WIDTH}px; height:${LOCKUP_HEIGHT}px; background:${bg}; overflow:hidden; }
svg { width:${LOCKUP_WIDTH}px; height:${LOCKUP_HEIGHT}px; display:block; }
</style></head><body>
${svg}
</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: LOCKUP_WIDTH, height: LOCKUP_HEIGHT });

  const outDir = path.join(R06_DIR, brand, 'exports');
  ensureDir(outDir);
  const outPath = path.join(outDir, `${filename}-800px.png`);
  await page.screenshot({ path: outPath, omitBackground: bg === 'transparent' });
  console.log(`  ✓ ${outPath.replace(R06_DIR + '/', '')}`);
}

async function exportAppleTouch(page, brand, markFile) {
  const svg = readSvg(brand, markFile);
  const size = 180;
  const padded = Math.round(size * 0.15);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; }
html,body { width:${size}px; height:${size}px; background:#0B0F1E; overflow:hidden; }
.wrap { width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; }
svg { width:${size - padded * 2}px; height:${size - padded * 2}px; }
</style></head><body>
<div class="wrap">${svg}</div>
</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: size, height: size });

  const outDir = path.join(R06_DIR, brand, 'exports');
  ensureDir(outDir);
  const brandShort = markFile.replace(/-mark-dark$/, '');
  const outPath = path.join(outDir, `${brandShort}-apple-touch-icon-180px.png`);
  await page.screenshot({ path: outPath, omitBackground: false });
  console.log(`  ✓ ${outPath.replace(R06_DIR + '/', '')}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.log('\n── R06 Mark exports ──');
    for (const { brand, file, bg } of MARKS) {
      for (const size of MARK_SIZES) {
        await exportMark(page, brand, file, size, bg);
      }
    }

    console.log('\n── R06 Lockup exports ──');
    for (const { brand, file, bg } of LOCKUPS) {
      await exportLockup(page, brand, file, bg);
    }

    console.log('\n── R06 Apple Touch Icon exports ──');
    for (const { brand, file } of [
      { brand: 'drexonyx-group', file: 'drexonyx-group-mark-dark' },
      { brand: 'dx-studio',      file: 'dx-studio-mark-dark' },
      { brand: 'mda',            file: 'mda-mark-dark' },
    ]) {
      await exportAppleTouch(page, brand, file);
    }

    console.log('\n✅  R06 PNG exports complete.\n');
  } finally {
    await browser.close();
  }
})();
