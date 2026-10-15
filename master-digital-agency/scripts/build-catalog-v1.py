#!/usr/bin/env python3
"""
DREXONYX × MDA — 10-Page Catalog Company Profile v1
Pages: Cover + About Us (custom) + 7 service pages (catalog artwork) + Contact (custom)
"""
import os, io, base64, subprocess, textwrap
from PIL import Image

SCRATCHPAD = '/tmp/claude-0/-home-user-drexonyx-v1/5d986d79-a6f1-5fda-b8f6-602f57ae3b36/scratchpad'
CAT_DIR    = f'{SCRATCHPAD}/catalog_pages'
OUT_DIR    = '/home/user/drexonyx-v1/master-digital-agency/deliverables/company-profile-v4'
HTML_PATH  = f'{OUT_DIR}/DREXONYX_MDA_Catalog_Profile_v1.html'
PDF_PATH   = f'{OUT_DIR}/DREXONYX_MDA_Catalog_Profile_v1.pdf'
PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright'
NODE       = '/opt/node22/bin/node'

PHONE   = '+971 52 177 0988'
WEBSITE = 'www.drexonyx.com'

os.makedirs(OUT_DIR, exist_ok=True)

# ── Image encoding ────────────────────────────────────────────────────────────
def img_b64(n, quality=88):
    with Image.open(f'{CAT_DIR}/p{n:02d}.png') as im:
        buf = io.BytesIO()
        im.convert('RGB').save(buf, 'JPEG', quality=quality, optimize=True)
        return base64.b64encode(buf.getvalue()).decode()

print('Encoding catalog images...')
C = {n: img_b64(n) for n in range(1, 9)}
for n, d in C.items():
    print(f'  P{n:02d}: {len(d)//1024} KB')
total_kb = sum(len(d) for d in C.values()) // 1024
print(f'  Total: {total_kb} KB')

# ── Helpers ───────────────────────────────────────────────────────────────────
def service_tags(items):
    return ''.join(
        f'<span style="font-family:Inter,sans-serif;font-size:6pt;'
        f'color:rgba(255,255,255,.55);padding:1.2mm 2.5mm;'
        f'border:.3pt solid rgba(200,152,10,.2);border-radius:20mm;">{s}</span>'
        for s in items
    )

# ── P01 — Cover ───────────────────────────────────────────────────────────────
def p01():
    return (
        '<div class="pg">'
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">'
        f'<img src="data:image/jpeg;base64,{C[1]}"'
        ' style="height:100%;width:auto;max-width:none;display:block;">'
        '</div>'
        '</div>'
    )

# ── P02 — About Us ────────────────────────────────────────────────────────────
def p02():
    tags = service_tags([
        "Website Design","Company Profile","Brand Identity",
        "Digital Launch Kit","Promotional Video","Social Media Creatives","UGC Video Shorts"
    ])
    return f"""
<div class="pg" style="background:#0b0b0b;">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 45% at 50% 30%,rgba(200,152,10,.06) 0%,transparent 65%);pointer-events:none;"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:.8pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>

  <!-- Content wrapper: column flex with bottom photo fill -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:8mm;padding:11mm 14mm 0;display:flex;flex-direction:column;">

    <!-- HEADER -->
    <div style="flex-shrink:0;margin-bottom:5.5mm;">
      <div style="font-family:Inter,sans-serif;font-size:5.8pt;color:#C8980A;letter-spacing:3.5pt;text-transform:uppercase;margin-bottom:2.5mm;">WHO WE ARE</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:22pt;color:#fff;line-height:1.12;font-weight:700;margin:0 0 2.8mm;">Built to Deliver. <span style="color:#C8980A;">Driven by Impact.</span></h1>
      <div style="height:.4pt;width:30mm;background:linear-gradient(90deg,#C8980A,transparent);"></div>
    </div>

    <!-- TWO-COLUMN BODY (flex-shrink:0 — natural height) -->
    <div style="flex-shrink:0;display:flex;gap:7mm;margin-bottom:5mm;">

      <!-- Left column: 54% width -->
      <div style="flex:0 0 54%;display:flex;flex-direction:column;gap:3.5mm;min-width:0;">

        <p style="font-family:Inter,sans-serif;font-size:7.8pt;color:rgba(255,255,255,.8);line-height:1.68;">
          <strong style="color:#fff;">DREXONYX</strong> is a UAE-based creative agency built on a single conviction — that bold ideas, executed with precision, create real business impact. As the parent brand, DREXONYX sets the creative standard and strategic direction across every engagement.
        </p>

        <p style="font-family:Inter,sans-serif;font-size:7.8pt;color:rgba(255,255,255,.8);line-height:1.68;">
          <strong style="color:#fff;">Master Digital Agency (MDA)</strong> is the digital execution arm of DREXONYX — delivering professional websites, visual identities, company profiles, promotional videos, and creative content to businesses across the UAE and beyond.
        </p>

        <p style="font-family:Inter,sans-serif;font-size:7.8pt;color:rgba(255,255,255,.8);line-height:1.68;">
          Whether you are a newly registered business or an established brand — referred through a business setup partner or approaching us directly — every project is delivered with the same commitment to quality.
        </p>

        <div style="height:.3pt;background:rgba(200,152,10,.2);"></div>

        <!-- 3 pillars -->
        <div style="display:flex;gap:2.5mm;">
          <div style="flex:1;min-width:0;padding:3mm;background:rgba(200,152,10,.05);border:.3pt solid rgba(200,152,10,.2);border-radius:.6mm;">
            <div style="font-family:'Playfair Display',serif;font-size:14pt;color:#C8980A;font-weight:700;line-height:1;margin-bottom:1.5mm;">01</div>
            <div style="font-family:Inter,sans-serif;font-size:6pt;color:#fff;font-weight:600;text-transform:uppercase;letter-spacing:.7pt;margin-bottom:1.2mm;">Premium Quality</div>
            <div style="font-family:Inter,sans-serif;font-size:5.8pt;color:rgba(255,255,255,.5);line-height:1.5;">Every deliverable built for real business use.</div>
          </div>
          <div style="flex:1;min-width:0;padding:3mm;background:rgba(200,152,10,.05);border:.3pt solid rgba(200,152,10,.2);border-radius:.6mm;">
            <div style="font-family:'Playfair Display',serif;font-size:14pt;color:#C8980A;font-weight:700;line-height:1;margin-bottom:1.5mm;">02</div>
            <div style="font-family:Inter,sans-serif;font-size:6pt;color:#fff;font-weight:600;text-transform:uppercase;letter-spacing:.7pt;margin-bottom:1.2mm;">Client Focused</div>
            <div style="font-family:Inter,sans-serif;font-size:5.8pt;color:rgba(255,255,255,.5);line-height:1.5;">Adapted to your sector, stage, and goals.</div>
          </div>
          <div style="flex:1;min-width:0;padding:3mm;background:rgba(200,152,10,.05);border:.3pt solid rgba(200,152,10,.2);border-radius:.6mm;">
            <div style="font-family:'Playfair Display',serif;font-size:14pt;color:#C8980A;font-weight:700;line-height:1;margin-bottom:1.5mm;">03</div>
            <div style="font-family:Inter,sans-serif;font-size:6pt;color:#fff;font-weight:600;text-transform:uppercase;letter-spacing:.7pt;margin-bottom:1.2mm;">Fast Delivery</div>
            <div style="font-family:Inter,sans-serif;font-size:5.8pt;color:rgba(255,255,255,.5);line-height:1.5;">Efficient delivery without sacrificing detail.</div>
          </div>
        </div>

        <!-- Services -->
        <div>
          <div style="font-family:Inter,sans-serif;font-size:5.5pt;color:rgba(200,152,10,.45);letter-spacing:2pt;text-transform:uppercase;margin-bottom:2mm;">Our Services</div>
          <div style="display:flex;flex-wrap:wrap;gap:1.5mm;">{tags}</div>
        </div>

      </div>

      <!-- Right column: brand relationship -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2.5mm;">

        <div style="flex-shrink:0;background:rgba(255,255,255,.025);border:.35pt solid rgba(200,152,10,.25);border-radius:.8mm;padding:4.5mm;display:flex;flex-direction:column;gap:0;">

          <div style="padding-bottom:3.5mm;border-bottom:.3pt solid rgba(200,152,10,.12);">
            <div style="font-family:Inter,sans-serif;font-size:4.8pt;color:rgba(200,152,10,.5);letter-spacing:2.5pt;text-transform:uppercase;margin-bottom:1.5mm;">Parent Brand</div>
            <div style="font-family:'Playfair Display',serif;font-size:13pt;color:#fff;font-weight:700;letter-spacing:.5pt;margin-bottom:1.5mm;">DREXONYX</div>
            <div style="font-family:Inter,sans-serif;font-size:5pt;color:rgba(255,255,255,.32);letter-spacing:2pt;margin-bottom:2.5mm;">IDEAS INTO IMPACT</div>
            <p style="font-family:Inter,sans-serif;font-size:6.5pt;color:rgba(255,255,255,.55);line-height:1.6;">Creative direction, brand strategy, and the overarching standard of excellence that defines every DREXONYX engagement.</p>
          </div>

          <div style="text-align:center;padding:2mm 0;">
            <div style="font-size:8pt;color:rgba(200,152,10,.35);">&#x2193;</div>
            <div style="font-family:Inter,sans-serif;font-size:4.5pt;color:rgba(200,152,10,.35);letter-spacing:2pt;text-transform:uppercase;">Powered By</div>
          </div>

          <div style="padding-top:3.5mm;border-top:.3pt solid rgba(200,152,10,.12);">
            <div style="font-family:Inter,sans-serif;font-size:4.8pt;color:rgba(200,152,10,.5);letter-spacing:2.5pt;text-transform:uppercase;margin-bottom:1.5mm;">Digital Agency</div>
            <div style="font-family:'Playfair Display',serif;font-size:13pt;color:#fff;font-weight:700;letter-spacing:.5pt;margin-bottom:1.5mm;">MDA</div>
            <div style="font-family:Inter,sans-serif;font-size:4.8pt;color:rgba(255,255,255,.28);letter-spacing:.8pt;margin-bottom:2.5mm;">MASTER DIGITAL AGENCY · A DREXONYX BRAND</div>
            <p style="font-family:Inter,sans-serif;font-size:6.5pt;color:rgba(255,255,255,.55);line-height:1.6;">Digital execution — delivering professional quality at every client touchpoint, from concept to final delivery.</p>
          </div>

        </div>

        <div style="flex-shrink:0;padding:2.5mm 3.5mm;background:rgba(200,152,10,.06);border:.3pt solid rgba(200,152,10,.18);border-radius:.5mm;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.4);letter-spacing:1.5pt;">UAE</span>
          <div style="width:.3pt;height:2.5mm;background:rgba(200,152,10,.22);"></div>
          <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.4);letter-spacing:1.5pt;">GLOBAL VISION</span>
          <div style="width:.3pt;height:2.5mm;background:rgba(200,152,10,.22);"></div>
          <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.4);letter-spacing:1.5pt;">DIGITAL EXCELLENCE</span>
        </div>

      </div>

    </div>

    <!-- BOTTOM PHOTO FILL (fills remaining space) -->
    <div style="flex:1;min-height:0;overflow:hidden;border-radius:.7mm;position:relative;">
      <img src="data:image/jpeg;base64,{C[1]}"
           style="width:100%;height:100%;object-fit:cover;object-position:center 65%;display:block;filter:brightness(.55);">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,.1) 40%,rgba(0,0,0,.4) 100%);"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 7mm;">
        <div>
          <div style="font-family:Inter,sans-serif;font-size:5.5pt;color:rgba(200,152,10,.7);letter-spacing:2.5pt;text-transform:uppercase;margin-bottom:1.5mm;">Where We Work</div>
          <div style="font-family:'Playfair Display',serif;font-size:13pt;color:#fff;font-weight:700;line-height:1.2;font-style:italic;">UAE &amp; Beyond.</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:Inter,sans-serif;font-size:5.5pt;color:rgba(200,152,10,.6);letter-spacing:2pt;margin-bottom:1.5mm;">REACH US AT</div>
          <div style="font-family:'Playfair Display',serif;font-size:9pt;color:#fff;font-weight:600;">{WEBSITE}</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:8mm;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:space-between;padding:0 14mm;">
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(200,152,10,.5);letter-spacing:2pt;">DREXONYX × MDA &nbsp;·&nbsp; MASTER DIGITAL AGENCY</span>
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.28);letter-spacing:1.5pt;">02 / 10</span>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:.7pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>

</div>"""

# ── P03–P09 — Catalog service pages ──────────────────────────────────────────
# Map: profile page number → catalog image number
PAGE_MAP = {
    3: 3,   # Website Design
    4: 2,   # Company Profile Design
    5: 5,   # Branding Package
    6: 4,   # Digital Launch Kit
    7: 6,   # Corporate Promotional Video
    8: 7,   # Posters & Social Media Creatives
    9: 8,   # UGC Video Shorts
}

def catalog_page(profile_page, catalog_img_num):
    return (
        '<div class="pg" style="background:#0b0b0b;">'
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">'
        f'<img src="data:image/jpeg;base64,{C[catalog_img_num]}"'
        ' style="height:100%;width:auto;max-width:none;display:block;">'
        '</div>'
        '</div>'
    )

# ── P10 — Contact ─────────────────────────────────────────────────────────────
def p10():
    tags = service_tags([
        "Website Design","Company Profile","Brand Identity",
        "Digital Launch Kit","Promotional Video","Social Media Creatives","UGC Video Shorts"
    ])
    return f"""
<div class="pg" style="background:#0b0b0b;">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 38%,rgba(200,152,10,.075) 0%,transparent 65%);pointer-events:none;"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:.8pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>
  <div style="position:absolute;top:0;bottom:0;right:18mm;width:.35pt;background:linear-gradient(180deg,transparent,rgba(200,152,10,.1),transparent);"></div>
  <div style="position:absolute;top:0;bottom:0;left:18mm;width:.35pt;background:linear-gradient(180deg,transparent,rgba(200,152,10,.08),transparent);"></div>

  <!-- Content wrapper: column flex with bottom photo fill -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:8mm;padding:14mm 14mm 0;display:flex;flex-direction:column;align-items:center;text-align:center;">

    <!-- HEADER -->
    <div style="flex-shrink:0;margin-bottom:6mm;">
      <div style="font-family:Inter,sans-serif;font-size:5.8pt;color:#C8980A;letter-spacing:4pt;text-transform:uppercase;margin-bottom:3.5mm;">LET'S WORK TOGETHER</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:26pt;color:#fff;line-height:1.1;font-weight:700;margin:0 0 3.5mm;">
        Start the <span style="color:#C8980A;">Conversation.</span>
      </h1>
      <div style="height:.4pt;width:28mm;background:linear-gradient(90deg,transparent,#C8980A,transparent);margin:0 auto 4mm;"></div>
      <p style="font-family:Inter,sans-serif;font-size:8pt;color:rgba(255,255,255,.62);line-height:1.65;max-width:115mm;margin:0 auto;">
        Ready to build your digital presence? Our team is here to help you design, launch, and grow. Get in touch and let's turn your vision into impact.
      </p>
    </div>

    <!-- CONTACT CARDS -->
    <div style="flex-shrink:0;display:flex;gap:5mm;width:100%;max-width:135mm;margin-bottom:4.5mm;">

      <div style="flex:1;min-width:0;padding:5mm 4mm;background:rgba(200,152,10,.06);border:.4pt solid rgba(200,152,10,.32);border-radius:1mm;text-align:center;">
        <div style="font-family:Inter,sans-serif;font-size:5.5pt;color:rgba(200,152,10,.55);letter-spacing:2.5pt;text-transform:uppercase;margin-bottom:2.5mm;">Website</div>
        <div style="width:5mm;height:.35pt;background:rgba(200,152,10,.3);margin:0 auto 2.5mm;"></div>
        <div style="font-family:'Playfair Display',serif;font-size:9.5pt;color:#fff;font-weight:600;">{WEBSITE}</div>
      </div>

      <div style="flex:1;min-width:0;padding:5mm 4mm;background:rgba(200,152,10,.06);border:.4pt solid rgba(200,152,10,.32);border-radius:1mm;text-align:center;">
        <div style="font-family:Inter,sans-serif;font-size:5.5pt;color:rgba(200,152,10,.55);letter-spacing:2.5pt;text-transform:uppercase;margin-bottom:2.5mm;">WhatsApp</div>
        <div style="width:5mm;height:.35pt;background:rgba(200,152,10,.3);margin:0 auto 2.5mm;"></div>
        <div style="font-family:'Playfair Display',serif;font-size:9.5pt;color:#fff;font-weight:600;">{PHONE}</div>
      </div>

    </div>

    <!-- SERVICE TAGS -->
    <div style="flex-shrink:0;display:flex;flex-wrap:wrap;gap:1.8mm;justify-content:center;max-width:140mm;margin-bottom:4.5mm;">
      {tags}
    </div>

    <!-- QUOTE + BRAND LABEL -->
    <div style="flex-shrink:0;width:100%;max-width:130mm;padding:4mm 6mm;border:.3pt solid rgba(200,152,10,.18);border-radius:.7mm;background:rgba(255,255,255,.02);margin-bottom:4mm;">
      <p style="font-family:'Playfair Display',serif;font-size:8.2pt;color:rgba(255,255,255,.38);font-style:italic;letter-spacing:.4pt;text-align:center;">
        "Every business deserves a professional presence. We make it possible."
      </p>
    </div>

    <div style="flex-shrink:0;display:flex;align-items:center;gap:3.5mm;margin-bottom:4mm;">
      <div style="height:.3pt;width:14mm;background:linear-gradient(90deg,transparent,rgba(200,152,10,.4));"></div>
      <span style="font-family:Inter,sans-serif;font-size:5.8pt;color:rgba(200,152,10,.55);letter-spacing:2.5pt;">DREXONYX × MDA</span>
      <div style="height:.3pt;width:14mm;background:linear-gradient(90deg,rgba(200,152,10,.4),transparent);"></div>
    </div>

    <!-- BOTTOM PHOTO FILL (fills remaining space) -->
    <div style="flex:1;min-height:0;overflow:hidden;border-radius:.7mm;position:relative;width:100%;">
      <img src="data:image/jpeg;base64,{C[6]}"
           style="width:100%;height:100%;object-fit:cover;object-position:center 40%;display:block;filter:brightness(.45);">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.05) 45%,rgba(0,0,0,.55) 100%);"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 7mm;">
        <div style="text-align:left;">
          <div style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(200,152,10,.65);letter-spacing:2.5pt;text-transform:uppercase;margin-bottom:1.5mm;">Your Vision</div>
          <div style="font-family:'Playfair Display',serif;font-size:12pt;color:#fff;font-weight:700;font-style:italic;line-height:1.2;">Our Execution.</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(200,152,10,.6);letter-spacing:1.8pt;margin-bottom:1.5mm;">REACH US AT</div>
          <div style="font-family:'Playfair Display',serif;font-size:8.5pt;color:#fff;font-weight:600;">{WEBSITE}</div>
          <div style="font-family:Inter,sans-serif;font-size:7pt;color:rgba(255,255,255,.6);margin-top:1mm;">{PHONE}</div>
        </div>
      </div>
    </div>

  </div>

  <div style="position:absolute;bottom:0;left:0;right:0;height:8mm;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:space-between;padding:0 14mm;">
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(200,152,10,.5);letter-spacing:2pt;">DREXONYX × MDA &nbsp;·&nbsp; MASTER DIGITAL AGENCY</span>
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.28);letter-spacing:1.5pt;">10 / 10</span>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:.7pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>

</div>"""

# ── Assemble HTML ─────────────────────────────────────────────────────────────
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
@page { size: 210mm 297mm; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #0b0b0b; }
.pg {
  width: 210mm;
  height: 297mm;
  overflow: hidden;
  position: relative;
  page-break-after: always;
  page-break-inside: avoid;
  background: #0b0b0b;
}
.pg:last-child { page-break-after: avoid; }
"""

pages = []
pages.append(p01())
pages.append(p02())
for pg_num in range(3, 10):
    pages.append(catalog_page(pg_num, PAGE_MAP[pg_num]))
pages.append(p10())

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DREXONYX × MDA — Company Profile</title>
<style>{CSS}</style>
</head>
<body>
{''.join(pages)}
</body>
</html>"""

print(f'\nWriting HTML ({len(html)//1024} KB)...')
with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'  → {HTML_PATH}')

# ── Render PDF via Playwright ─────────────────────────────────────────────────
PW_SCRIPT = f"""
const {{ chromium }} = require('{PLAYWRIGHT}');
(async () => {{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://{HTML_PATH}', {{ waitUntil: 'networkidle', timeout: 60000 }});
  await page.waitForTimeout(3000);
  await page.pdf({{
    path: '{PDF_PATH}',
    width: '210mm',
    height: '297mm',
    printBackground: true,
    margin: {{ top: '0', right: '0', bottom: '0', left: '0' }}
  }});
  await browser.close();
  console.log('PDF rendered OK');
}})();
"""

PW_JS = f'{SCRATCHPAD}/render-catalog-v1.js'
with open(PW_JS, 'w') as f:
    f.write(PW_SCRIPT)

print('\nRendering PDF...')
result = subprocess.run([NODE, PW_JS], capture_output=True, text=True, timeout=120)
print('STDOUT:', result.stdout.strip())
if result.stderr.strip():
    print('STDERR:', result.stderr.strip()[:500])

if os.path.exists(PDF_PATH):
    size_mb = os.path.getsize(PDF_PATH) / (1024*1024)
    print(f'\n✓ PDF: {PDF_PATH}')
    print(f'  Size: {size_mb:.1f} MB')
    # Page count
    import pymupdf
    doc = pymupdf.open(PDF_PATH)
    print(f'  Pages: {doc.page_count}')
    doc.close()
else:
    print('✗ PDF not created')
    raise RuntimeError('PDF generation failed')
