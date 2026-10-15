#!/usr/bin/env python3
"""
DREXONYX × MDA — 10-Page Catalog Company Profile v3
Text + Image layout on every service page (same style as v6 profile)
"""
import os, io, base64, subprocess
from PIL import Image

SCRATCHPAD = '/tmp/claude-0/-home-user-drexonyx-v1/5d986d79-a6f1-5fda-b8f6-602f57ae3b36/scratchpad'
CAT_DIR    = f'{SCRATCHPAD}/catalog_pages'
OUT_DIR    = '/home/user/drexonyx-v1/master-digital-agency/deliverables/company-profile-v4'
HTML_PATH  = f'{OUT_DIR}/DREXONYX_MDA_Catalog_Profile_v3.html'
PDF_PATH   = f'{OUT_DIR}/DREXONYX_MDA_Catalog_Profile_v3.pdf'
PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright'
NODE       = '/opt/node22/bin/node'

PHONE   = '+971 52 177 0988'
WEBSITE = 'www.drexonyx.com'

os.makedirs(OUT_DIR, exist_ok=True)

def img_b64(n, quality=88):
    with Image.open(f'{CAT_DIR}/p{n:02d}.png') as im:
        buf = io.BytesIO()
        im.convert('RGB').save(buf, 'JPEG', quality=quality, optimize=True)
        return base64.b64encode(buf.getvalue()).decode()

print('Encoding catalog images...')
C = {n: img_b64(n) for n in range(1, 9)}
for n, d in C.items():
    print(f'  P{n:02d}: {len(d)//1024} KB')

# ── Helpers ───────────────────────────────────────────────────────────────────
def tag(s):
    return (f'<span style="font-family:Inter,sans-serif;font-size:7pt;'
            f'color:rgba(255,255,255,.52);padding:1.3mm 3mm;'
            f'border:.3pt solid rgba(200,152,10,.22);border-radius:20mm;'
            f'white-space:nowrap;">{s}</span>')

def bullet(text):
    return (f'<div style="display:flex;gap:2.5mm;align-items:flex-start;margin-bottom:2mm;">'
            f'<span style="color:#C8980A;font-size:6pt;margin-top:.8mm;flex-shrink:0;">&#9656;</span>'
            f'<span style="font-family:Inter,sans-serif;font-size:8.5pt;'
            f'color:rgba(255,255,255,.68);line-height:1.55;">{text}</span>'
            f'</div>')

# ── P01 — Cover ───────────────────────────────────────────────────────────────
def p01():
    return f"""<div class="pg">
  <div style="position:absolute;inset:0;overflow:hidden;background:#0b0b0b;">
    <img src="data:image/jpeg;base64,{C[1]}"
         style="height:100%;width:auto;max-width:none;display:block;margin:0 auto;">
  </div>
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 68% 68% at 50% 50%,transparent 36%,rgba(0,0,0,.78) 100%);pointer-events:none;"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:20%;background:linear-gradient(180deg,rgba(0,0,0,.65),transparent);pointer-events:none;"></div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:32%;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent);pointer-events:none;"></div>
  <div style="position:absolute;top:6mm;left:6mm;right:6mm;bottom:6mm;border:.5pt solid rgba(200,152,10,.38);pointer-events:none;"></div>
  <div style="position:absolute;top:3mm;left:3mm;width:9mm;height:.7pt;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;top:3mm;left:3mm;width:.7pt;height:9mm;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;top:3mm;right:3mm;width:9mm;height:.7pt;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;top:3mm;right:3mm;width:.7pt;height:9mm;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;bottom:3mm;left:3mm;width:9mm;height:.7pt;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;bottom:3mm;left:3mm;width:.7pt;height:9mm;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;bottom:3mm;right:3mm;width:9mm;height:.7pt;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;bottom:3mm;right:3mm;width:.7pt;height:9mm;background:#C8980A;opacity:.6;pointer-events:none;"></div>
  <div style="position:absolute;bottom:13mm;left:0;right:0;text-align:center;pointer-events:none;">
    <div style="font-family:Inter,sans-serif;font-size:6pt;color:rgba(200,152,10,.55);letter-spacing:3pt;text-transform:uppercase;margin-bottom:2.5mm;">MASTER DIGITAL AGENCY · A DREXONYX BRAND</div>
    <div style="height:.35pt;width:22mm;background:linear-gradient(90deg,transparent,rgba(200,152,10,.45),transparent);margin:0 auto 3mm;"></div>
    <div style="font-family:Inter,sans-serif;font-size:7pt;color:rgba(255,255,255,.42);letter-spacing:5pt;text-transform:uppercase;">COMPANY PROFILE</div>
  </div>
</div>"""

# ── P02 — About Us (unchanged from v2) ───────────────────────────────────────
def p02():
    tags_html = ''.join(tag(s) for s in [
        "Website Design","Company Profile","Brand Identity",
        "Digital Launch Kit","Promotional Video","Social Media Creatives","UGC Video Shorts"
    ])
    return f"""
<div class="pg" style="background:#0b0b0b;">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 45% at 50% 30%,rgba(200,152,10,.06) 0%,transparent 65%);pointer-events:none;"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:.8pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>

  <div style="position:absolute;top:0;left:0;right:0;bottom:8mm;padding:11mm 14mm 0;display:flex;flex-direction:column;">

    <div style="flex-shrink:0;margin-bottom:5.5mm;">
      <div style="font-family:Inter,sans-serif;font-size:5.8pt;color:#C8980A;letter-spacing:3.5pt;text-transform:uppercase;margin-bottom:2.5mm;">WHO WE ARE</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:22pt;color:#fff;line-height:1.12;font-weight:700;margin:0 0 2.8mm;">Built to Deliver. <span style="color:#C8980A;">Driven by Impact.</span></h1>
      <div style="height:.4pt;width:30mm;background:linear-gradient(90deg,#C8980A,transparent);"></div>
    </div>

    <div style="flex-shrink:0;display:flex;gap:7mm;margin-bottom:5mm;">
      <div style="flex:0 0 54%;display:flex;flex-direction:column;gap:3.5mm;min-width:0;">
        <p style="font-family:Inter,sans-serif;font-size:7.8pt;color:rgba(255,255,255,.8);line-height:1.68;"><strong style="color:#fff;">DREXONYX</strong> is a UAE-based creative agency built on a single conviction — that bold ideas, executed with precision, create real business impact. As the parent brand, DREXONYX sets the creative standard and strategic direction across every engagement.</p>
        <p style="font-family:Inter,sans-serif;font-size:7.8pt;color:rgba(255,255,255,.8);line-height:1.68;"><strong style="color:#fff;">Master Digital Agency (MDA)</strong> is the digital execution arm of DREXONYX — delivering professional websites, visual identities, company profiles, promotional videos, and creative content to businesses across the UAE and beyond.</p>
        <p style="font-family:Inter,sans-serif;font-size:7.8pt;color:rgba(255,255,255,.8);line-height:1.68;">Whether you are a newly registered business or an established brand — every project is delivered with the same commitment to quality and precision.</p>
        <div style="height:.3pt;background:rgba(200,152,10,.2);"></div>
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
        <div>
          <div style="font-family:Inter,sans-serif;font-size:5.5pt;color:rgba(200,152,10,.45);letter-spacing:2pt;text-transform:uppercase;margin-bottom:2mm;">Our Services</div>
          <div style="display:flex;flex-wrap:wrap;gap:1.5mm;">{tags_html}</div>
        </div>
      </div>
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

    <div style="flex:1;min-height:0;overflow:hidden;border-radius:.7mm;position:relative;">
      <img src="data:image/jpeg;base64,{C[1]}" style="width:100%;height:100%;object-fit:cover;object-position:center 65%;display:block;filter:brightness(.55);">
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

  <div style="position:absolute;bottom:0;left:0;right:0;height:8mm;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:space-between;padding:0 14mm;">
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(200,152,10,.5);letter-spacing:2pt;">DREXONYX × MDA &nbsp;·&nbsp; MASTER DIGITAL AGENCY</span>
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.28);letter-spacing:1.5pt;">02 / 10</span>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:.7pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>
</div>"""

# ── Service page: LEFT text + RIGHT catalog image ─────────────────────────────
def service_page(pg_num, img_num, label, title, subtitle, description, features, tags_list, img_position="center 30%"):
    bullets_html = ''.join(bullet(f) for f in features)
    tags_html = '<div style="display:flex;flex-wrap:wrap;gap:1.5mm;">' + ''.join(tag(t) for t in tags_list) + '</div>'

    return f"""
<div class="pg" style="background:#0b0b0b;">
  <div style="position:absolute;top:0;left:0;right:0;height:.8pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 55% 55% at 25% 45%,rgba(200,152,10,.045) 0%,transparent 65%);pointer-events:none;"></div>

  <!-- Two-column layout -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:8mm;display:flex;">

    <!-- LEFT: Text column -->
    <div style="flex:0 0 48%;display:flex;flex-direction:column;padding:12mm 10mm 8mm 14mm;min-width:0;overflow:hidden;">

      <!-- Label + page number -->
      <div style="flex-shrink:0;display:flex;align-items:center;gap:3mm;margin-bottom:4.5mm;">
        <div style="font-family:Inter,sans-serif;font-size:7pt;color:#C8980A;letter-spacing:3pt;text-transform:uppercase;">{label}</div>
        <div style="flex:1;height:.3pt;background:linear-gradient(90deg,rgba(200,152,10,.3),transparent);"></div>
        <div style="font-family:Inter,sans-serif;font-size:7pt;color:rgba(255,255,255,.2);letter-spacing:1.5pt;">{pg_num:02d} / 10</div>
      </div>

      <!-- Title -->
      <div style="flex-shrink:0;margin-bottom:4mm;">
        <h1 style="font-family:'Playfair Display',serif;font-size:21pt;color:#fff;line-height:1.15;font-weight:700;margin:0 0 1.5mm;">{title}</h1>
        <div style="font-family:Inter,sans-serif;font-size:9pt;color:rgba(200,152,10,.75);font-style:italic;margin-bottom:3mm;">{subtitle}</div>
        <div style="height:.4pt;width:22mm;background:linear-gradient(90deg,#C8980A,transparent);"></div>
      </div>

      <!-- Description -->
      <div style="flex-shrink:0;margin-bottom:4.5mm;">
        <p style="font-family:Inter,sans-serif;font-size:9pt;color:rgba(255,255,255,.72);line-height:1.68;">{description}</p>
      </div>

      <!-- Feature list -->
      <div style="flex-shrink:0;margin-bottom:4.5mm;">
        <div style="font-family:Inter,sans-serif;font-size:6.5pt;color:rgba(200,152,10,.5);letter-spacing:2.5pt;text-transform:uppercase;margin-bottom:3mm;">WHAT'S INCLUDED</div>
        {bullets_html}
      </div>

      <!-- Divider -->
      <div style="flex-shrink:0;height:.3pt;background:rgba(200,152,10,.15);margin-bottom:4mm;"></div>

      <!-- Tags -->
      <div style="flex-shrink:0;margin-bottom:4mm;">
        <div style="font-family:Inter,sans-serif;font-size:6.5pt;color:rgba(200,152,10,.4);letter-spacing:2pt;text-transform:uppercase;margin-bottom:2.5mm;">SERVICE TAGS</div>
        {tags_html}
      </div>

      <!-- Bottom CTA -->
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;">
        <div style="padding:3mm 4mm;background:rgba(200,152,10,.06);border:.3pt solid rgba(200,152,10,.2);border-radius:.6mm;">
          <div style="font-family:Inter,sans-serif;font-size:6.5pt;color:rgba(200,152,10,.55);letter-spacing:2pt;text-transform:uppercase;margin-bottom:1.5mm;">GET IN TOUCH</div>
          <div style="font-family:'Playfair Display',serif;font-size:10.5pt;color:#fff;font-weight:600;">{WEBSITE}</div>
          <div style="font-family:Inter,sans-serif;font-size:8.5pt;color:rgba(255,255,255,.45);margin-top:.8mm;">WhatsApp: {PHONE}</div>
        </div>
      </div>

    </div>

    <!-- Vertical divider -->
    <div style="flex-shrink:0;width:.4pt;background:linear-gradient(180deg,transparent,rgba(200,152,10,.18),transparent);align-self:stretch;"></div>

    <!-- RIGHT: Catalog image — full natural ratio, vertically centred -->
    <div style="flex:1;min-width:0;overflow:hidden;position:relative;background:#0b0b0b;">
      <!-- Subtle gold glow -->
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse 95% 55% at 52% 45%,rgba(200,152,10,.04) 0%,transparent 70%);pointer-events:none;z-index:0;"></div>
      <!-- Full image at natural ratio, vertically centred -->
      <img src="data:image/jpeg;base64,{C[img_num]}"
           style="position:absolute;top:50%;left:0;transform:translateY(-50%);width:100%;height:auto;display:block;z-index:1;">
      <!-- Left edge blend into divider -->
      <div style="position:absolute;top:0;bottom:0;left:0;width:18%;background:linear-gradient(90deg,rgba(11,11,11,.88),transparent);pointer-events:none;z-index:2;"></div>
      <!-- Right edge blend into page margin -->
      <div style="position:absolute;top:0;bottom:0;right:0;width:14%;background:linear-gradient(270deg,rgba(11,11,11,.88),transparent);pointer-events:none;z-index:2;"></div>
      <!-- Top dark fade over image edge -->
      <div style="position:absolute;top:0;left:0;right:0;height:26%;background:linear-gradient(180deg,#0b0b0b 42%,transparent);pointer-events:none;z-index:2;"></div>
      <!-- Bottom dark fade over image edge -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:26%;background:linear-gradient(0deg,#0b0b0b 42%,transparent);pointer-events:none;z-index:2;"></div>
      <!-- Top dark area accent line -->
      <div style="position:absolute;top:18mm;left:0;right:0;text-align:center;z-index:3;pointer-events:none;">
        <div style="height:.3pt;width:16mm;background:linear-gradient(90deg,transparent,rgba(200,152,10,.22),transparent);margin:0 auto;"></div>
      </div>
      <!-- Bottom dark area service label -->
      <div style="position:absolute;bottom:12mm;left:0;right:0;text-align:center;z-index:3;pointer-events:none;">
        <div style="font-family:Inter,sans-serif;font-size:5pt;color:rgba(200,152,10,.3);letter-spacing:3pt;text-transform:uppercase;">{label}</div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:8mm;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:space-between;padding:0 14mm;">
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(200,152,10,.5);letter-spacing:2pt;">DREXONYX × MDA &nbsp;·&nbsp; MASTER DIGITAL AGENCY</span>
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.28);letter-spacing:1.5pt;">{pg_num:02d} / 10</span>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:.7pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>
</div>"""

# ── P10 — Contact (unchanged from v2) ────────────────────────────────────────
def p10():
    tags_html = ''.join(tag(s) for s in [
        "Website Design","Company Profile","Brand Identity",
        "Digital Launch Kit","Promotional Video","Social Media Creatives","UGC Video Shorts"
    ])
    return f"""
<div class="pg" style="background:#0b0b0b;">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 38%,rgba(200,152,10,.075) 0%,transparent 65%);pointer-events:none;"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:.8pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>
  <div style="position:absolute;top:0;bottom:0;right:18mm;width:.35pt;background:linear-gradient(180deg,transparent,rgba(200,152,10,.1),transparent);"></div>
  <div style="position:absolute;top:0;bottom:0;left:18mm;width:.35pt;background:linear-gradient(180deg,transparent,rgba(200,152,10,.08),transparent);"></div>

  <div style="position:absolute;top:0;left:0;right:0;bottom:8mm;padding:14mm 14mm 0;display:flex;flex-direction:column;align-items:center;text-align:center;">

    <div style="flex-shrink:0;margin-bottom:6mm;">
      <div style="font-family:Inter,sans-serif;font-size:5.8pt;color:#C8980A;letter-spacing:4pt;text-transform:uppercase;margin-bottom:3.5mm;">LET'S WORK TOGETHER</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:26pt;color:#fff;line-height:1.1;font-weight:700;margin:0 0 3.5mm;">Start the <span style="color:#C8980A;">Conversation.</span></h1>
      <div style="height:.4pt;width:28mm;background:linear-gradient(90deg,transparent,#C8980A,transparent);margin:0 auto 4mm;"></div>
      <p style="font-family:Inter,sans-serif;font-size:8pt;color:rgba(255,255,255,.62);line-height:1.65;max-width:115mm;margin:0 auto;">Ready to build your digital presence? Our team is here to help you design, launch, and grow. Get in touch and let's turn your vision into impact.</p>
    </div>

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

    <div style="flex-shrink:0;display:flex;flex-wrap:wrap;gap:1.8mm;justify-content:center;max-width:140mm;margin-bottom:4.5mm;">{tags_html}</div>

    <div style="flex-shrink:0;width:100%;max-width:130mm;padding:4mm 6mm;border:.3pt solid rgba(200,152,10,.18);border-radius:.7mm;background:rgba(255,255,255,.02);margin-bottom:4mm;">
      <p style="font-family:'Playfair Display',serif;font-size:8.2pt;color:rgba(255,255,255,.38);font-style:italic;letter-spacing:.4pt;text-align:center;">"Every business deserves a professional presence. We make it possible."</p>
    </div>

    <div style="flex-shrink:0;display:flex;align-items:center;gap:3.5mm;margin-bottom:4mm;">
      <div style="height:.3pt;width:14mm;background:linear-gradient(90deg,transparent,rgba(200,152,10,.4));"></div>
      <span style="font-family:Inter,sans-serif;font-size:5.8pt;color:rgba(200,152,10,.55);letter-spacing:2.5pt;">DREXONYX × MDA</span>
      <div style="height:.3pt;width:14mm;background:linear-gradient(90deg,rgba(200,152,10,.4),transparent);"></div>
    </div>

    <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6mm 0 4mm;">
      <div style="width:55mm;height:.4pt;background:linear-gradient(90deg,transparent,rgba(200,152,10,.42),transparent);margin-bottom:6mm;"></div>
      <div style="font-family:'Playfair Display',serif;font-size:30pt;color:rgba(200,152,10,.13);font-weight:700;letter-spacing:5pt;text-transform:uppercase;line-height:1;margin-bottom:1.5mm;">DREXONYX</div>
      <div style="font-family:Inter,sans-serif;font-size:6pt;color:rgba(200,152,10,.32);letter-spacing:4pt;text-transform:uppercase;margin-bottom:5mm;">× MASTER DIGITAL AGENCY</div>
      <div style="font-family:'Playfair Display',serif;font-size:10.5pt;color:rgba(255,255,255,.22);font-style:italic;letter-spacing:.5pt;margin-bottom:6mm;">Ideas Into Impact.</div>
      <div style="width:16mm;height:.4pt;background:linear-gradient(90deg,transparent,rgba(200,152,10,.4),transparent);margin-bottom:6mm;"></div>
      <div style="font-family:Inter,sans-serif;font-size:8pt;color:rgba(255,255,255,.28);letter-spacing:1.5pt;margin-bottom:2.5mm;">{WEBSITE}</div>
      <div style="font-family:Inter,sans-serif;font-size:7pt;color:rgba(255,255,255,.2);letter-spacing:.8pt;">WhatsApp: {PHONE}</div>
    </div>

  </div>

  <div style="position:absolute;bottom:0;left:0;right:0;height:8mm;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:space-between;padding:0 14mm;">
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(200,152,10,.5);letter-spacing:2pt;">DREXONYX × MDA &nbsp;·&nbsp; MASTER DIGITAL AGENCY</span>
    <span style="font-family:Inter,sans-serif;font-size:5.2pt;color:rgba(255,255,255,.28);letter-spacing:1.5pt;">10 / 10</span>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:.7pt;background:linear-gradient(90deg,transparent,#C8980A,transparent);"></div>
</div>"""

# ── Service page definitions ───────────────────────────────────────────────────
SERVICES = [
    dict(
        pg_num=3, img_num=3,
        label="WEBSITE DESIGN",
        title="Professional Website Design",
        subtitle="Modern websites built to grow your business",
        description="We design and develop custom websites for businesses across the UAE — from clean landing pages to full multi-page sites. Every website is mobile-responsive, fast, and built for real business results.",
        features=[
            "5–20 page websites built from scratch to brief",
            "Fully mobile-responsive across all devices",
            "WhatsApp integration, contact & booking forms",
            "SEO foundations, sitemap & Google Analytics setup",
            "Full codebase handover — you own every file",
            "Delivered in 5–10 working days",
        ],
        tags_list=["Website Design","Landing Pages","Mobile Optimised","SEO Setup","WhatsApp Integration"],
        img_position="center 20%",
    ),
    dict(
        pg_num=4, img_num=2,
        label="COMPANY PROFILE",
        title="Company Profile Design",
        subtitle="Make a powerful first impression",
        description="A professionally designed company profile establishes credibility and communicates your value clearly. Our profiles are crafted for proposals, client presentations, government submissions, and investor meetings.",
        features=[
            "10–25 page PDF design tailored to your brand",
            "Custom layout adapted to your industry",
            "Available in Arabic & English versions",
            "Print-ready and digital-optimised formats",
            "Delivered with source files on handover",
        ],
        tags_list=["Company Profile","Brand Identity","Print Design","Arabic / English","PDF"],
        img_position="center 25%",
    ),
    dict(
        pg_num=5, img_num=5,
        label="BRANDING PACKAGE",
        title="Complete Brand Identity",
        subtitle="Build a strong, recognisable business identity",
        description="Your brand is more than a logo — it's the visual language of your business. Our branding packages give you a complete identity system: logo, colour palette, typography, and usage guidelines across all touchpoints.",
        features=[
            "Logo design with 3 directions presented for approval",
            "Brand style guide: colours, fonts, usage rules",
            "Business cards, letterheads & email signatures",
            "Social media cover sets and profile graphics",
            "Print-ready files in all required formats",
        ],
        tags_list=["Brand Identity","Logo Design","Brand Guidelines","Stationery","Social Media Graphics"],
        img_position="center 30%",
    ),
    dict(
        pg_num=6, img_num=4,
        label="DIGITAL LAUNCH KIT",
        title="Digital Launch Kit",
        subtitle="Everything you need to launch from day one",
        description="The Digital Launch Kit bundles your website, company profile, and brand identity into one complete package at a single fixed price. Designed for newly registered businesses that need a professional presence fast.",
        features=[
            "Professional website (5–10 pages)",
            "Company profile PDF in Arabic & English",
            "Full brand identity package",
            "Social media profile setup & cover graphics",
            "Delivered within an agreed timeline",
        ],
        tags_list=["Website","Company Profile","Branding","All-in-One","Fixed Price"],
        img_position="center 25%",
    ),
    dict(
        pg_num=7, img_num=6,
        label="PROMOTIONAL VIDEO",
        title="Corporate Promotional Video",
        subtitle="Tell your story in a powerful way",
        description="Professional video production that showcases your business, team, and services. Delivered post-production ready — suitable for websites, social media, exhibitions, and client presentations.",
        features=[
            "Concept development & script writing",
            "Professional filming & direction",
            "Full post-production & colour grading",
            "60–90 second brand video",
            "Delivered in web-optimised and broadcast formats",
        ],
        tags_list=["Video Production","Brand Video","Corporate Film","Post-Production","Social Media"],
        img_position="center 35%",
    ),
    dict(
        pg_num=8, img_num=7,
        label="SOCIAL MEDIA CREATIVES",
        title="Posters & Social Media Creatives",
        subtitle="Eye-catching visuals for print and digital",
        description="We design scroll-stopping social media posts, stories, and event posters that reflect your brand identity and drive engagement. Consistent, professional, and ready to post or print.",
        features=[
            "Social media post & story templates",
            "Event announcements & promotional posters",
            "Brand-consistent design across all formats",
            "Arabic & English versions available",
            "Delivered in high-resolution & web-ready formats",
        ],
        tags_list=["Social Media","Graphic Design","Posters","Stories","Arabic / English"],
        img_position="center 25%",
    ),
    dict(
        pg_num=9, img_num=8,
        label="UGC VIDEO SHORTS",
        title="UGC Video Shorts",
        subtitle="Real people. Real content. Real results.",
        description="Authentic short-form videos that connect with customers and build trust on TikTok, Instagram Reels, and YouTube Shorts. Created with real people in your environment — not stock footage.",
        features=[
            "Concept & script development",
            "On-location filming with real talent",
            "Short-form edit for TikTok, Reels & Shorts",
            "Multiple content variations per shoot",
            "Ready to post across all platforms",
        ],
        tags_list=["UGC Video","Short-Form Content","TikTok","Instagram Reels","YouTube Shorts"],
        img_position="center 20%",
    ),
]

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

pages = [p01(), p02()]
for svc in SERVICES:
    pages.append(service_page(**svc))
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

# ── Render PDF ────────────────────────────────────────────────────────────────
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

PW_JS = f'{SCRATCHPAD}/render-catalog-v3.js'
with open(PW_JS, 'w') as f:
    f.write(PW_SCRIPT)

print('\nRendering PDF...')
result = subprocess.run([NODE, PW_JS], capture_output=True, text=True, timeout=120)
print('STDOUT:', result.stdout.strip())
if result.stderr.strip():
    print('STDERR:', result.stderr.strip()[:500])

if os.path.exists(PDF_PATH):
    import pymupdf
    size_mb = os.path.getsize(PDF_PATH) / (1024*1024)
    doc = pymupdf.open(PDF_PATH)
    print(f'\n✓ PDF: {PDF_PATH}')
    print(f'  Size: {size_mb:.1f} MB  |  Pages: {doc.page_count}')
    doc.close()
else:
    print('✗ PDF not created')
    raise RuntimeError('PDF generation failed')
