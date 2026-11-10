#!/usr/bin/env node
/**
 * Brand Asset PNG Exporter
 * Uses Playwright (pre-installed) to render SVG files to transparent PNGs.
 * Outputs: 256px, 128px, 64px, 32px marks + 180px Apple Touch Icons.
 *
 * Usage: node brand-assets/export-pngs.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.resolve(__dirname);

const MARK_SIZES = [256, 128, 64, 32];
const APPLE_TOUCH_SIZE = 180;
const LOCKUP_WIDTH = 800;   // 2× the 400 viewBox for crisp display
const LOCKUP_HEIGHT = 184;  // 2× the 92 viewBox

const MARKS = [
  { brand: 'drexonyx-group', file: 'drexonyx-group-mark-dark',  variant: 'mark',    bg: 'transparent' },
  { brand: 'drexonyx-group', file: 'drexonyx-group-mark-light', variant: 'mark',    bg: '#F8F9FC' },
  { brand: 'dx-studio',      file: 'dx-studio-mark-dark',       variant: 'mark',    bg: 'transparent' },
  { brand: 'dx-studio',      file: 'dx-studio-mark-light',      variant: 'mark',    bg: '#F8F9FC' },
  { brand: 'mda',            file: 'mda-mark-dark',             variant: 'mark',    bg: 'transparent' },
  { brand: 'mda',            file: 'mda-mark-light',            variant: 'mark',    bg: '#F8F9FC' },
];

const LOCKUPS = [
  { brand: 'drexonyx-group', file: 'drexonyx-group-horizontal-dark',  variant: 'lockup', bg: 'transparent' },
  { brand: 'drexonyx-group', file: 'drexonyx-group-horizontal-light', variant: 'lockup', bg: '#FFFFFF' },
  { brand: 'dx-studio',      file: 'dx-studio-horizontal-dark',       variant: 'lockup', bg: 'transparent' },
  { brand: 'dx-studio',      file: 'dx-studio-horizontal-light',      variant: 'lockup', bg: '#FFFFFF' },
  { brand: 'mda',            file: 'mda-horizontal-dark',             variant: 'lockup', bg: 'transparent' },
  { brand: 'mda',            file: 'mda-horizontal-light',            variant: 'lockup', bg: '#FFFFFF' },
];

const FAVICONS = [
  { brand: 'drexonyx-group', file: 'drexonyx-group-favicon', variant: 'favicon' },
  { brand: 'dx-studio',      file: 'dx-studio-favicon',      variant: 'favicon' },
  { brand: 'mda',            file: 'mda-favicon',            variant: 'favicon' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readSvg(brand, filename) {
  const svgPath = path.join(ASSETS_DIR, brand, `${filename}.svg`);
  return fs.readFileSync(svgPath, 'utf8');
}

function getViewBox(svgContent) {
  const match = svgContent.match(/viewBox="([^"]+)"/);
  if (!match) return null;
  const parts = match[1].split(/\s+/).map(Number);
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

async function exportMark(page, brand, filename, size, bg) {
  const svgContent = readSvg(brand, filename);
  const vb = getViewBox(svgContent);
  if (!vb) throw new Error(`No viewBox found in ${filename}.svg`);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${size}px; height: ${size}px; background: ${bg}; overflow: hidden; }
.wrap { width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; }
svg { width: ${size}px; height: ${size}px; }
</style>
</head>
<body>
<div class="wrap">
${svgContent}
</div>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: size, height: size });

  const outDir = path.join(ASSETS_DIR, brand, 'exports');
  ensureDir(outDir);
  const outPath = path.join(outDir, `${filename}-${size}px.png`);
  await page.screenshot({ path: outPath, omitBackground: bg === 'transparent' });
  console.log(`  ✓ ${outPath.replace(ASSETS_DIR + '/', '')}`);
}

async function exportLockup(page, brand, filename, bg) {
  const svgContent = readSvg(brand, filename);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${LOCKUP_WIDTH}px; height: ${LOCKUP_HEIGHT}px; background: ${bg}; overflow: hidden; }
svg { width: ${LOCKUP_WIDTH}px; height: ${LOCKUP_HEIGHT}px; display: block; }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: LOCKUP_WIDTH, height: LOCKUP_HEIGHT });

  const outDir = path.join(ASSETS_DIR, brand, 'exports');
  ensureDir(outDir);
  const outPath = path.join(outDir, `${filename}-800px.png`);
  await page.screenshot({ path: outPath, omitBackground: bg === 'transparent' });
  console.log(`  ✓ ${outPath.replace(ASSETS_DIR + '/', '')}`);
}

async function exportFavicon(page, brand, filename) {
  const svgContent = readSvg(brand, filename);

  for (const size of [64, 32, 16]) {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; }
html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
svg { width: ${size}px; height: ${size}px; display: block; }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: size, height: size });

    const outDir = path.join(ASSETS_DIR, brand, 'exports');
    ensureDir(outDir);
    const outPath = path.join(outDir, `${filename}-${size}px.png`);
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`  ✓ ${outPath.replace(ASSETS_DIR + '/', '')}`);
  }
}

async function exportAppleTouch(page, brand, markFile) {
  const svgContent = readSvg(brand, markFile);
  const size = APPLE_TOUCH_SIZE;
  const padded = Math.round(size * 0.15); // 15% padding around the mark

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; }
html, body { width: ${size}px; height: ${size}px; background: #0B0F1E; overflow: hidden; border-radius: 20px; }
.wrap { width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; }
svg { width: ${size - padded * 2}px; height: ${size - padded * 2}px; }
</style>
</head>
<body>
<div class="wrap">
${svgContent}
</div>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: size, height: size });

  const outDir = path.join(ASSETS_DIR, brand, 'exports');
  ensureDir(outDir);
  const brandShort = markFile.replace(/-mark-dark$/, '');
  const outPath = path.join(outDir, `${brandShort}-apple-touch-icon-180px.png`);
  await page.screenshot({ path: outPath, omitBackground: false });
  console.log(`  ✓ ${outPath.replace(ASSETS_DIR + '/', '')}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    // Marks at all sizes
    console.log('\n── Mark exports ──');
    for (const { brand, file, bg } of MARKS) {
      for (const size of MARK_SIZES) {
        await exportMark(page, brand, file, size, bg);
      }
    }

    // Lockups at 2× (800×184)
    console.log('\n── Lockup exports ──');
    for (const { brand, file, bg } of LOCKUPS) {
      await exportLockup(page, brand, file, bg);
    }

    // Favicons at 64/32/16
    console.log('\n── Favicon exports ──');
    for (const { brand, file } of FAVICONS) {
      await exportFavicon(page, brand, file);
    }

    // Apple Touch Icons (dark-mark variant on dark navy bg)
    console.log('\n── Apple Touch Icon exports ──');
    const darkMarks = [
      { brand: 'drexonyx-group', file: 'drexonyx-group-mark-dark' },
      { brand: 'dx-studio',      file: 'dx-studio-mark-dark' },
      { brand: 'mda',            file: 'mda-mark-dark' },
    ];
    for (const { brand, file } of darkMarks) {
      await exportAppleTouch(page, brand, file);
    }

    console.log('\n✅  All PNG exports complete.\n');
  } finally {
    await browser.close();
  }
})();
