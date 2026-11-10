# DREXONYX V1 — Brand Assets

Production-ready logo files for all three brands, generated from the **Approved Concept D — Creative Bold** identity (final owner approval).

---

## Directory Structure

```
brand-assets/
├── drexonyx-group/
│   ├── drexonyx-group-mark-dark.svg          Standalone mark — dark backgrounds
│   ├── drexonyx-group-mark-light.svg         Standalone mark — light backgrounds
│   ├── drexonyx-group-horizontal-dark.svg    Horizontal lockup — dark backgrounds
│   ├── drexonyx-group-horizontal-light.svg   Horizontal lockup — light backgrounds
│   ├── drexonyx-group-favicon.svg            Favicon SVG (32×32 viewBox)
│   └── exports/
│       ├── drexonyx-group-mark-dark-256px.png
│       ├── drexonyx-group-mark-dark-128px.png
│       ├── drexonyx-group-mark-dark-64px.png
│       ├── drexonyx-group-mark-dark-32px.png
│       ├── drexonyx-group-mark-light-256px.png
│       ├── drexonyx-group-mark-light-128px.png
│       ├── drexonyx-group-mark-light-64px.png
│       ├── drexonyx-group-mark-light-32px.png
│       ├── drexonyx-group-horizontal-dark-800px.png
│       ├── drexonyx-group-horizontal-light-800px.png
│       ├── drexonyx-group-favicon-64px.png
│       ├── drexonyx-group-favicon-32px.png
│       ├── drexonyx-group-favicon-16px.png
│       └── drexonyx-group-apple-touch-icon-180px.png
│
├── dx-studio/
│   ├── dx-studio-mark-dark.svg
│   ├── dx-studio-mark-light.svg
│   ├── dx-studio-horizontal-dark.svg
│   ├── dx-studio-horizontal-light.svg
│   ├── dx-studio-favicon.svg
│   └── exports/
│       ├── dx-studio-mark-dark-256px.png
│       ├── dx-studio-mark-dark-128px.png
│       ├── dx-studio-mark-dark-64px.png
│       ├── dx-studio-mark-dark-32px.png
│       ├── dx-studio-mark-light-256px.png
│       ├── dx-studio-mark-light-128px.png
│       ├── dx-studio-mark-light-64px.png
│       ├── dx-studio-mark-light-32px.png
│       ├── dx-studio-horizontal-dark-800px.png
│       ├── dx-studio-horizontal-light-800px.png
│       ├── dx-studio-favicon-64px.png
│       ├── dx-studio-favicon-32px.png
│       ├── dx-studio-favicon-16px.png
│       └── dx-studio-apple-touch-icon-180px.png
│
├── mda/
│   ├── mda-mark-dark.svg
│   ├── mda-mark-light.svg
│   ├── mda-horizontal-dark.svg
│   ├── mda-horizontal-light.svg
│   ├── mda-favicon.svg
│   └── exports/
│       ├── mda-mark-dark-256px.png
│       ├── mda-mark-dark-128px.png
│       ├── mda-mark-dark-64px.png
│       ├── mda-mark-dark-32px.png
│       ├── mda-mark-light-256px.png
│       ├── mda-mark-light-128px.png
│       ├── mda-mark-light-64px.png
│       ├── mda-mark-light-32px.png
│       ├── mda-horizontal-dark-800px.png
│       ├── mda-horizontal-light-800px.png
│       ├── mda-favicon-64px.png
│       ├── mda-favicon-32px.png
│       ├── mda-favicon-16px.png
│       └── mda-apple-touch-icon-180px.png
│
├── export-pngs.js    Playwright export script (re-run after any SVG edits)
└── README.md
```

---

## Brand Specifications

### DREXONYX GROUP
- **Mark:** Bold chrome DX monogram — angular faceted D + wide X bars
- **Accent:** Blue gradient (`#00CCFF → #1A6FFF → #0033CC`)
- **Chrome:** Multi-stop silver-blue diagonal gradient
- **Tagline:** DIGITAL BUSINESS ECOSYSTEM
- **Font:** Space Grotesk 700 (wordmark), 300 (tagline)

### DX STUDIO
- **Mark:** Same DX geometry with cinematic additions
- **Accent:** RED — `#FF4040 → #E81C2C → #991010` (intentional, explicitly approved)
- **Symbol:** Right-pointing red play button triangle inside D counter
- **Detail:** Film strip perforations on X bar 1 (via SVG clipPath)
- **Tagline:** FILM | VIDEO | CREATIVE CONTENT
- **Font:** Space Grotesk 700 (wordmark), 400 (tagline)

### MDA — Master Digital Agency
- **Mark:** Three ascending rounded signal bars + cyan arc
- **Accent:** Cyan-to-electric-blue gradient (`#18CCFF → #1A6FFF → #003ACC`)
- **Geometry:** 56×56 viewBox; bars bottom-aligned, cubic arc from lower-left to upper-right
- **Sub-label:** MASTER DIGITAL AGENCY
- **Tagline:** GROW SMARTER · SCALE FASTER
- **Font:** Space Grotesk 700 (wordmark), 300 (tagline)

---

## SVG Notes

- All SVGs use `viewBox` (not fixed width/height) — scale freely at any resolution.
- Font loaded via `@import url('https://fonts.googleapis.com/...')` — requires network access to render correctly in browsers. For offline/print use, convert text to outlines.
- Chrome gradients are SVG linear-gradient approximations of the AI-rendered metallic reference. The photorealistic chrome in the Concept D reference image cannot be reproduced exactly in 2D SVG vectors — this is a reported limitation per the brand approval directive.
- Dark variants: transparent background — place directly on dark/navy surfaces.
- Light variants: designed for white/light backgrounds — use the -light files on those surfaces.

---

## Re-exporting PNGs

After any SVG edit, regenerate all PNG exports:

```bash
node brand-assets/export-pngs.js
```

Requires Node.js and the pre-installed Playwright with Chromium.

---

## Usage

| File type    | Use case                                           |
|--------------|----------------------------------------------------|
| `-mark-dark` | App icons, watermarks, dark-bg placements          |
| `-mark-light`| Light-bg placements, print on white                |
| `-horizontal-dark` | Email headers, dark-bg banners, presentations|
| `-horizontal-light`| Light-bg documents, letterheads, slides      |
| `-favicon`   | Browser favicons (`<link rel="icon">`)             |
| `-apple-touch-icon-180px` | `<link rel="apple-touch-icon">`     |

---

*Brand identity: Approved Concept D — Creative Bold. Final owner approval issued.*
*Do not modify, reinterpret, or redesign without explicit owner authorization.*
