#!/usr/bin/env python3
"""MDA Service Catalog — web-responsive HTML + print-ready A4 PDF"""
import os, sys, subprocess, json, textwrap
from PIL import Image

SCRATCHPAD = '/tmp/claude-0/-home-user-drexonyx-v1/5d986d79-a6f1-5fda-b8f6-602f57ae3b36/scratchpad'
CAT_DIR    = f'{SCRATCHPAD}/catalog_pages'
OUT_DIR    = '/home/user/drexonyx-v1/master-digital-agency/deliverables/mda-service-catalog'
IMG_DIR    = f'{OUT_DIR}/assets/images'
WEB_HTML   = f'{OUT_DIR}/index.html'
PRINT_HTML = f'{OUT_DIR}/print.html'
PDF_PATH   = f'{OUT_DIR}/MDA_Service_Catalog.pdf'
FINAL_PDF  = f'{OUT_DIR}/MDA_Service_Catalog_Final.pdf'
PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright'
NODE       = '/opt/node22/bin/node'

os.makedirs(IMG_DIR, exist_ok=True)

# ─── Resize images for web (800×1200, 88% JPEG) ───────────────────
IMG_MAP = {
    'cover':   'p01', 'profile': 'p02', 'website': 'p03',
    'launch':  'p04', 'brand':   'p05', 'video':   'p06',
    'social':  'p07', 'ugc':     'p08',
}
for name, src in IMG_MAP.items():
    src_path  = f'{CAT_DIR}/{src}.png'
    dest_path = f'{IMG_DIR}/{name}.jpg'
    if not os.path.exists(dest_path):
        img = Image.open(src_path)
        img = img.resize((800, 1200), Image.LANCZOS)
        img.save(dest_path, 'JPEG', quality=88, optimize=True)
        print(f'  resized {name}.jpg')
    else:
        print(f'  cached  {name}.jpg')

# ─── Service data ─────────────────────────────────────────────────
SERVICES = [
    dict(
        id='profile', img='profile', num='01', label='DESIGN SERVICE',
        title='Company Profile\nDesign',
        subtitle='Present Your Business with Authority',
        desc='A professionally designed company profile is your most powerful first impression. We craft elegant, print-ready profiles that communicate your vision, showcase your services, and build immediate trust with clients, partners and investors.',
        includes=['Vision & Mission Page','About Your Company','Services Overview','Team Showcase','Portfolio & Achievements','Brand Identity Applied','Print & Digital Formats'],
        steps=[
            dict(n='01', t='Brief',     d='We learn your business, goals and audience'),
            dict(n='02', t='Design',    d='Crafted layouts aligned to your brand'),
            dict(n='03', t='Content',   d='Your copy and visuals integrated cleanly'),
            dict(n='04', t='Revisions', d='Refinements until it is perfect'),
            dict(n='05', t='Delivery',  d='Print-ready PDF and editable files'),
        ],
        tags=['Print-Ready PDF','Digital Format','A4 Layout','Brand Aligned','Arabic & English'],
    ),
    dict(
        id='website', img='website', num='02', label='DIGITAL SERVICE',
        title='Website Design',
        subtitle='Modern Websites That Grow Your Business',
        desc='Your website is your 24/7 salesperson. We design fast, mobile-responsive websites that capture attention, convert visitors into customers, and reflect the quality of your brand — for restaurants, clinics, salons, companies and every business in between.',
        includes=['Custom Design & Layout','Mobile-Responsive','SEO-Ready Structure','Contact & Booking Forms','Social Media Integration','Speed Optimised','Content Management'],
        steps=[
            dict(n='01', t='Discovery', d='Understanding your business and goals'),
            dict(n='02', t='Wireframe', d='Structure and page architecture'),
            dict(n='03', t='Design',    d='Visual design with your brand identity'),
            dict(n='04', t='Build',     d='Full development and integration'),
            dict(n='05', t='Launch',    d='Final testing and go-live handover'),
        ],
        tags=['Restaurants','Retail','Healthcare','Corporate','E-Commerce','Landing Pages'],
    ),
    dict(
        id='brand', img='brand', num='03', label='BRAND SERVICE',
        title='Branding Package',
        subtitle='Create a Unique Identity That People Remember',
        desc='From logo design to complete brand identity, we help your business stand out with a consistent and professional image across all platforms — online and offline. Every element crafted to tell your story at a glance.',
        includes=['Logo Design','Brand Style Guide','Color Palette System','Typography Selection','Business Card Design','Letterhead & Stationery','Brand Applications Guide'],
        steps=[
            dict(n='01', t='Discovery',  d='Brand values, audience and competitors'),
            dict(n='02', t='Concepts',   d='Multiple logo directions presented'),
            dict(n='03', t='Identity',   d='Full brand system developed'),
            dict(n='04', t='Refinement', d='Revisions and final approval'),
            dict(n='05', t='Brand Book', d='Complete guidelines delivered'),
        ],
        tags=['Logo Design','Brand Guide','Stationery','Packaging','Signage','Digital & Print'],
    ),
    dict(
        id='launch', img='launch', num='04', label='LAUNCH SERVICE',
        title='Digital Launch Kit',
        subtitle='Everything Your Business Needs to Get Started Online',
        desc='A complete set of digital materials designed to launch your business with a strong, professional presence from day one — website, social profiles, printed materials and visual content, all unified under your brand.',
        includes=['Website Design','Social Media Profile Setup','Business Card Design','Digital Menu or Brochure','Launch Poster Set','Email Signature Design','Launch Checklist'],
        steps=[
            dict(n='01', t='Onboarding', d='Gathering all brand and business info'),
            dict(n='02', t='Assets',     d='Creating all visual and digital materials'),
            dict(n='03', t='Setup',      d='Platform configuration and integration'),
            dict(n='04', t='Review',     d='Full walkthrough and client approval'),
            dict(n='05', t='Launch',     d='Your business goes live, ready to grow'),
        ],
        tags=['Complete Package','Social Profiles','Website','Print Materials','Fast Turnaround'],
    ),
    dict(
        id='social', img='social', num='05', label='CREATIVE SERVICE',
        title='Posters & Social\nMedia Creatives',
        subtitle='Eye-Catching Designs That Bring Your Business to Life',
        desc='Custom designs for your products, offers, events and everyday social media content. Stand out in crowded feeds with visuals crafted to stop the scroll, communicate your message and drive real engagement.',
        includes=['Social Media Feed Posts','Story & Reel Covers','Promotional Posters','Event Announcements','Offer & Sale Designs','Branded Content Templates','Print-Ready Versions'],
        steps=[
            dict(n='01', t='Brief',     d='Understanding the offer, tone and goal'),
            dict(n='02', t='Concept',   d='Visual direction and layout approach'),
            dict(n='03', t='Design',    d='On-brand visuals crafted to convert'),
            dict(n='04', t='Revisions', d='Adjustments until you are satisfied'),
            dict(n='05', t='Delivery',  d='Final files in all required formats'),
        ],
        tags=['Instagram','Facebook','TikTok','Print','Stories','Offers & Promotions'],
    ),
    dict(
        id='video', img='video', num='06', label='VIDEO SERVICE',
        title='Corporate Promotional\nVideo',
        subtitle='Tell Your Story in a Powerful Way',
        desc='Professional videos that showcase your business, services and brand in a way that attracts customers and builds trust. From concept to final cut — cinematic quality, compelling narrative, every time.',
        includes=['Concept & Script Development','Professional Filming','Full Post-Production Editing','Color Grading & Sound Design','Motion Graphics & Titles','Multiple Platform Formats'],
        steps=[
            dict(n='01', t='Concept',  d='Script, storyboard and creative brief'),
            dict(n='02', t='Pre-Prod', d='Location, talent and schedule planning'),
            dict(n='03', t='Filming',  d='Professional on-location production'),
            dict(n='04', t='Edit',     d='Post-production, grade and sound'),
            dict(n='05', t='Delivery', d='Final video in all required resolutions'),
        ],
        tags=['Company Showcase','Services Highlight','Product Film','Brand Story','Dubai Production'],
    ),
    dict(
        id='ugc', img='ugc', num='07', label='VIDEO SERVICE',
        title='UGC Video Shorts',
        subtitle='Real People. Real Content. Real Results.',
        desc='Authentic short-form videos that make your business stand out and connect with real customers. Crafted for Reels and TikTok — ready to post and built to grow engagement organically.',
        includes=['Script & Storyboard','On-Location or Studio Shoot','Professional Editing & Grading','Captions & Subtitles','Platform-Optimised Formats','Ready-to-Post Delivery'],
        steps=[
            dict(n='01', t='Brief',   d='Concept, messaging and target audience'),
            dict(n='02', t='Script',  d='Natural, authentic script written'),
            dict(n='03', t='Shoot',   d='Filmed in your location or studio'),
            dict(n='04', t='Edit',    d='Cut, graded, captioned and polished'),
            dict(n='05', t='Deliver', d='Ready-to-post files, all platforms'),
        ],
        tags=['Reels','TikTok','YouTube Shorts','Authentic Content','High Engagement'],
    ),
]

GOLD   = '#C8980A'
FONTS  = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">'

# ─── Build web HTML ────────────────────────────────────────────────
def build_web():
    nav_links = ''.join(
        f'<a href="#{s["id"]}" style="font-family:Inter,sans-serif;font-size:12px;font-weight:500;'
        f'color:rgba(255,255,255,0.6);text-decoration:none;letter-spacing:0.3px;white-space:nowrap;" '
        f'onmouseover="this.style.color=\'#C8980A\'" onmouseout="this.style.color=\'rgba(255,255,255,0.6)\'">'
        f'{s["title"].replace(chr(10)," ")}</a>'
        for s in SERVICES
    )

    def web_svc(s, i):
        flex = 'row' if i % 2 == 0 else 'row-reverse'
        bg   = '#0a0a0a' if i % 2 == 0 else '#0d0d0d'
        inc  = ''.join(
            f'<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;">'
            f'<span style="color:#C8980A;font-size:9px;margin-top:3px;flex-shrink:0;">&#9658;</span>'
            f'<span style="font-size:13px;color:rgba(255,255,255,0.72);line-height:1.55;">{f}</span>'
            f'</div>'
            for f in s['includes']
        )
        steps = ''.join(
            f'<div style="flex:1;padding:14px 12px;background:rgba(200,152,10,0.04);'
            f'border:1px solid rgba(200,152,10,0.15);border-radius:3px;">'
            f'<div style="font-size:9px;color:rgba(200,152,10,0.45);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">STEP {st["n"]}</div>'
            f'<div style="font-family:\'Playfair Display\',serif;font-size:13px;color:#fff;font-weight:600;margin-bottom:4px;">{st["t"]}</div>'
            f'<div style="font-size:11px;color:rgba(255,255,255,0.45);line-height:1.5;">{st["d"]}</div>'
            f'</div>'
            for st in s['steps']
        )
        tags = ''.join(
            f'<span style="font-size:10px;color:rgba(200,152,10,0.85);padding:4px 12px;'
            f'border:1px solid rgba(200,152,10,0.25);border-radius:20px;white-space:nowrap;">{t}</span>'
            for t in s['tags']
        )
        return f'''
<section id="{s["id"]}" style="display:flex;flex-direction:{flex};min-height:100vh;background:{bg};border-top:1px solid rgba(200,152,10,0.08);font-family:Inter,sans-serif;">
  <div class="svc-img-panel" style="flex:0 0 42%;position:relative;overflow:hidden;">
    <img src="assets/images/{s['img']}.jpg" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center top;">
  </div>
  <div class="svc-txt" style="flex:1;padding:64px 52px;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-size:11px;font-weight:500;color:rgba(200,152,10,0.7);letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">{s['label']} &nbsp;/&nbsp; {s['num']}</div>
    <h2 style="font-family:\'Playfair Display\',serif;font-size:clamp(28px,3vw,46px);font-weight:700;color:#fff;line-height:1.12;margin-bottom:12px;">{s['title'].replace(chr(10),'<br>')}</h2>
    <p style="font-size:13px;font-style:italic;color:{GOLD};font-weight:300;margin-bottom:20px;">{s['subtitle']}</p>
    <div style="width:70px;height:1.5px;background:linear-gradient(90deg,{GOLD},transparent);margin-bottom:24px;"></div>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.78;margin-bottom:32px;max-width:520px;">{s['desc']}</p>
    <div style="font-size:10px;font-weight:600;color:rgba(200,152,10,0.6);letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">WHAT'S INCLUDED</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin-bottom:32px;">{inc}</div>
    <div style="font-size:10px;font-weight:600;color:rgba(200,152,10,0.6);letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">HOW IT WORKS</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;">{steps}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">{tags}</div>
  </div>
</section>'''

    sections_html = ''.join(web_svc(s, i) for i, s in enumerate(SERVICES))

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>MDA — Master Digital Agency | Service Catalog</title>
{FONTS}
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
html{{scroll-behavior:smooth;}}
body{{font-family:Inter,sans-serif;background:#0a0a0a;color:#fff;overflow-x:hidden;}}
img{{max-width:100%;display:block;}}
#nav{{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(10,10,10,0.93);backdrop-filter:blur(14px);border-bottom:1px solid rgba(200,152,10,0.15);padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:24px;}}
#nav-links{{display:flex;gap:28px;flex-wrap:nowrap;overflow:hidden;}}
@media(max-width:900px){{#nav-links{{display:none;}}}}
.svc-img-panel{{flex:0 0 42%;position:relative;overflow:hidden;}}
@media(max-width:860px){{.svc-img-panel{{flex:0 0 auto!important;height:55vw;width:100%!important;}} section[id]{{flex-direction:column!important;}} .svc-txt{{padding:40px 24px!important;}}}}
#cover{{min-height:100vh;display:flex;background:#050505;}}
.cover-text{{flex:1;padding:120px 64px 80px;display:flex;flex-direction:column;justify-content:center;}}
.cover-image{{flex:0 0 45%;position:relative;overflow:hidden;}}
.cover-image img{{width:100%;height:100%;object-fit:cover;object-position:center;}}
@media(max-width:860px){{#cover{{flex-direction:column;}} .cover-image{{height:70vw;flex:none;}} .cover-text{{padding:60px 24px 48px;}}}}
#contact{{background:#060606;border-top:1px solid rgba(200,152,10,0.15);padding:100px 64px;display:flex;flex-direction:column;align-items:center;text-align:center;}}
@media(max-width:600px){{#contact{{padding:60px 24px;}}}}
</style>
</head>
<body>
<nav id="nav">
  <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
    <div style="font-family:\'Playfair Display\',serif;font-size:18px;font-weight:700;color:#fff;">MDA</div>
    <div style="width:1px;height:18px;background:rgba(200,152,10,0.3);"></div>
    <span style="font-size:10px;color:rgba(200,152,10,0.7);letter-spacing:2px;text-transform:uppercase;">Master Digital Agency</span>
  </div>
  <div id="nav-links">{nav_links}</div>
  <a href="#contact" style="font-size:11px;font-weight:600;color:#0a0a0a;background:{GOLD};padding:8px 20px;border-radius:2px;text-decoration:none;letter-spacing:0.5px;white-space:nowrap;flex-shrink:0;">GET IN TOUCH</a>
</nav>

<section id="cover">
  <div class="cover-text">
    <div style="font-size:11px;font-weight:500;color:rgba(200,152,10,0.7);letter-spacing:4px;text-transform:uppercase;margin-bottom:24px;">MDA &nbsp;/&nbsp; Master Digital Agency</div>
    <h1 style="font-family:\'Playfair Display\',serif;font-size:clamp(36px,5vw,72px);font-weight:700;color:#fff;line-height:1.1;margin-bottom:16px;">Business<br><span style="color:{GOLD};">Launch</span><br>Services</h1>
    <p style="font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;margin-bottom:12px;max-width:460px;">From Company Profile to Corporate Video — everything your business needs to launch and grow.</p>
    <div style="width:100px;height:1.5px;background:linear-gradient(90deg,{GOLD},transparent);margin-bottom:32px;"></div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:48px;">
      {''.join(f"""<div style="display:flex;align-items:center;gap:12px;"><span style="color:{GOLD};font-size:10px;">&#9658;</span><span style="font-size:13px;color:rgba(255,255,255,0.65);">{s["title"].replace(chr(10)," ")}</span></div>""" for s in SERVICES)}
    </div>
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
      <span style="font-size:12px;color:rgba(255,255,255,0.4);">www.drexonyx.com</span>
      <span style="color:rgba(200,152,10,0.3);">·</span>
      <span style="font-size:12px;color:rgba(255,255,255,0.4);">info@drexonyx.com</span>
      <span style="color:rgba(200,152,10,0.3);">·</span>
      <span style="font-size:12px;color:rgba(255,255,255,0.4);">Dubai, UAE</span>
    </div>
    <div style="margin-top:32px;font-size:10px;color:rgba(255,255,255,0.2);letter-spacing:2px;">MDA IS A DREXONYX BRAND · IDEAS INTO IMPACT</div>
  </div>
  <div class="cover-image">
    <img src="assets/images/cover.jpg" alt="MDA">
    <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(5,5,5,0.4),rgba(5,5,5,0));pointer-events:none;"></div>
  </div>
</section>

{sections_html}

<section id="contact">
  <div style="font-size:10px;font-weight:500;color:rgba(200,152,10,0.6);letter-spacing:4px;text-transform:uppercase;margin-bottom:24px;">GET STARTED</div>
  <h2 style="font-family:\'Playfair Display\',serif;font-size:clamp(36px,5vw,64px);font-weight:700;color:#fff;line-height:1.2;margin-bottom:16px;">Let's Work<br><em>Together.</em></h2>
  <p style="font-size:14px;color:rgba(255,255,255,0.5);line-height:1.8;max-width:480px;margin-bottom:48px;">Digital · Creative · Media</p>
  <div style="width:80px;height:1.5px;background:linear-gradient(90deg,{GOLD},transparent);margin-bottom:48px;"></div>
  <div style="display:flex;gap:64px;justify-content:center;flex-wrap:wrap;margin-bottom:64px;">
    <div><div style="font-size:9px;letter-spacing:3px;color:rgba(200,152,10,0.6);text-transform:uppercase;margin-bottom:8px;">Website</div><div style="font-family:\'Playfair Display\',serif;font-size:20px;color:#fff;">www.drexonyx.com</div></div>
    <div><div style="font-size:9px;letter-spacing:3px;color:rgba(200,152,10,0.6);text-transform:uppercase;margin-bottom:8px;">Email</div><div style="font-family:\'Playfair Display\',serif;font-size:20px;color:#fff;">info@drexonyx.com</div></div>
    <div><div style="font-size:9px;letter-spacing:3px;color:rgba(200,152,10,0.6);text-transform:uppercase;margin-bottom:8px;">Location</div><div style="font-family:\'Playfair Display\',serif;font-size:20px;color:#fff;">Dubai, UAE</div></div>
  </div>
  <div style="font-family:\'Playfair Display\',serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;margin-bottom:6px;">DREXONYX</div>
  <div style="font-size:10px;color:rgba(200,152,10,0.5);letter-spacing:3px;text-transform:uppercase;">MDA is a DREXONYX Brand · Ideas Into Impact</div>
</section>
</body>
</html>'''
    with open(WEB_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Web HTML written: {WEB_HTML}')


# ─── Build print HTML (A4 pages) ──────────────────────────────────
def build_print():

    def inc_item(text):
        return (f'<div class="inc-item">'
                f'<span class="inc-dot">&#9658;</span>'
                f'<span>{text}</span></div>')

    def step_card(n, t, d):
        return (f'<div class="step">'
                f'<div class="step-n">STEP {n}</div>'
                f'<div class="step-t">{t}</div>'
                f'<div class="step-d">{d}</div>'
                f'</div>')

    def tag_pill(t):
        return f'<span class="tag">{t}</span>'

    def svc_page(s, pg_num):
        title_html   = s['title'].replace('\n', '<br>')
        includes_html = ''.join(inc_item(f) for f in s['includes'])
        steps_html    = ''.join(step_card(st['n'], st['t'], st['d']) for st in s['steps'])
        tags_html     = ''.join(tag_pill(t) for t in s['tags'])
        img_path      = f'{IMG_DIR}/{s["img"]}.jpg'

        return f'''
<div class="pg pg-svc">
  <!-- Page header -->
  <div class="pg-hdr">
    <span class="pg-hdr-l">MDA — MASTER DIGITAL AGENCY</span>
    <span class="pg-hdr-r">A DREXONYX BRAND &nbsp;·&nbsp; SERVICE CATALOG 2026</span>
  </div>
  <div class="pg-hdr-rule"></div>

  <!-- Two-column body -->
  <div class="pg-body">

    <!-- LEFT: all content -->
    <div class="pg-left">
      <div class="svc-label">{s['label']} &nbsp;/&nbsp; {s['num']}</div>
      <div class="svc-label-rule"></div>
      <div class="svc-accent"></div>
      <h2 class="svc-title">{title_html}</h2>
      <p class="svc-sub">{s['subtitle']}</p>
      <div class="svc-rule"></div>
      <p class="svc-desc">{s['desc']}</p>

      <div class="sect-div"></div>
      <div class="sect-head">WHAT'S INCLUDED</div>
      <div class="inc-grid">{includes_html}</div>

      <div class="sect-div"></div>
      <div class="sect-head">HOW IT WORKS</div>
      <div class="steps-row">{steps_html}</div>

      <div class="sect-div"></div>
      <div class="tags-row">{tags_html}</div>
    </div>

    <!-- RIGHT: service image -->
    <div class="pg-right">
      <img src="{img_path}" class="svc-img" alt="{s['title'].replace(chr(10), ' ')}">
    </div>

  </div>

  <!-- Footer -->
  <div class="pg-footer">
    <span class="ft-brand">DREXONYX × MDA</span>
    <span class="ft-doc">Service Catalog &mdash; Confidential</span>
    <span class="ft-num">{pg_num:02d}</span>
  </div>
</div>'''

    # ── Cover page ───────────────────────────────────────────────
    cover_pg = f'''
<div class="pg pg-cover">
  <img src="{IMG_DIR}/cover.jpg" class="cv-img" alt="MDA">
  <div class="cv-overlay"></div>
  <div class="cv-body">
    <div class="cv-top-label">MDA / MASTER DIGITAL AGENCY</div>
    <div class="cv-main">
      <h1 class="cv-title">Business<br><span class="cv-gold">Launch</span><br>Services</h1>
      <div class="cv-rule"></div>
      <p class="cv-sub">From Company Profile to Corporate Video —<br>Everything your business needs to launch and grow.</p>
      <div class="cv-services">
        {''.join(f"""<div class="cv-svc">{s['title'].replace(chr(10),' ')}</div>""" for s in SERVICES)}
      </div>
    </div>
    <div class="cv-foot">
      <div class="cv-contacts">
        <span>www.drexonyx.com</span><span class="cv-dot">·</span>
        <span>info@drexonyx.com</span><span class="cv-dot">·</span>
        <span>Dubai, UAE</span>
      </div>
      <div class="cv-brand-line">MDA IS A DREXONYX BRAND · IDEAS INTO IMPACT</div>
    </div>
  </div>
</div>'''

    # ── Contact / back page ──────────────────────────────────────
    contact_pg = f'''
<div class="pg pg-contact">
  <div class="ct-label">GET IN TOUCH</div>
  <div class="ct-main">
    <h2 class="ct-title">Let's Work<br><em>Together.</em></h2>
    <p class="ct-sub">Digital · Creative · Media</p>
    <div class="ct-rule"></div>
  </div>
  <div class="ct-details">
    <div class="ct-item">
      <div class="ct-item-l">WEBSITE</div>
      <div class="ct-item-v">www.drexonyx.com</div>
    </div>
    <div class="ct-item">
      <div class="ct-item-l">EMAIL</div>
      <div class="ct-item-v">info@drexonyx.com</div>
    </div>
    <div class="ct-item">
      <div class="ct-item-l">LOCATION</div>
      <div class="ct-item-v">Dubai, United Arab Emirates</div>
    </div>
  </div>
  <div class="ct-brand">
    <div class="ct-brand-name">DREXONYX</div>
    <div class="ct-brand-sub">MDA IS A DREXONYX BRAND · IDEAS INTO IMPACT</div>
  </div>
</div>'''

    service_pages = ''.join(svc_page(s, i + 2) for i, s in enumerate(SERVICES))

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MDA Service Catalog — Print</title>
{FONTS}
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
body{{background:#fff;}}
@page{{size:210mm 297mm;margin:0;}}

/* ─── A4 BASE ─── */
.pg{{
  width:210mm;height:297mm;
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;
  page-break-after:always;
}}

/* ══════════════════════════════════════════════
   SERVICE PAGES — white editorial
══════════════════════════════════════════════ */
.pg-svc{{background:#ffffff;}}

/* Header */
.pg-hdr{{
  display:flex;justify-content:space-between;align-items:baseline;
  padding:7mm 14mm 2mm;
  flex-shrink:0;
}}
.pg-hdr-l{{
  font-family:Inter,sans-serif;font-size:6.5pt;font-weight:700;
  color:{GOLD};letter-spacing:2.5pt;text-transform:uppercase;
}}
.pg-hdr-r{{
  font-family:Inter,sans-serif;font-size:6.5pt;
  color:#bbb;letter-spacing:1.5pt;text-transform:uppercase;
}}
.pg-hdr-rule{{
  height:0.5pt;
  background:linear-gradient(90deg,{GOLD} 0%,{GOLD} 40%,rgba(200,152,10,0.15) 100%);
  margin:0 14mm;flex-shrink:0;
}}

/* Two-column body */
.pg-body{{
  flex:1;
  display:flex;gap:8mm;
  padding:5mm 14mm 0;
  min-height:0;
}}

/* LEFT column — all text content */
.pg-left{{
  flex:1;
  display:flex;flex-direction:column;
  min-width:0;
}}

/* RIGHT column — image */
.pg-right{{width:76mm;flex-shrink:0;}}
.svc-img{{width:76mm;height:100%;object-fit:cover;object-position:center top;display:block;}}

/* Section label */
.svc-label{{
  font-family:Inter,sans-serif;font-size:6.5pt;font-weight:600;
  color:{GOLD};letter-spacing:2.5pt;text-transform:uppercase;
  margin-bottom:1.5mm;
}}
.svc-label-rule{{
  height:0.4pt;background:rgba(200,152,10,0.25);
  margin-bottom:4mm;
}}

/* Heading block */
.svc-accent{{
  width:11mm;height:2.5pt;background:{GOLD};
  margin-bottom:3mm;flex-shrink:0;
}}
.svc-title{{
  font-family:'Playfair Display',serif;font-size:27pt;font-weight:700;
  color:#111;line-height:1.1;
  margin-bottom:3mm;flex-shrink:0;
}}
.svc-sub{{
  font-family:Inter,sans-serif;font-size:9.5pt;font-style:italic;
  color:{GOLD};font-weight:300;
  margin-bottom:2.5mm;flex-shrink:0;
}}
.svc-rule{{
  width:14mm;height:1pt;
  background:linear-gradient(90deg,{GOLD},transparent);
  margin-bottom:3mm;flex-shrink:0;
}}
.svc-desc{{
  font-family:Inter,sans-serif;font-size:9pt;
  color:#444;line-height:1.72;
  flex:1;
}}

/* Section divider */
.sect-div{{
  height:0.4pt;background:rgba(200,152,10,0.2);
  margin:3.5mm 0 2.5mm;flex-shrink:0;
}}

/* Section heading */
.sect-head{{
  font-family:Inter,sans-serif;font-size:6.5pt;font-weight:700;
  color:{GOLD};letter-spacing:2.5pt;text-transform:uppercase;
  margin-bottom:2.5mm;flex-shrink:0;
}}

/* Includes */
.inc-grid{{
  display:grid;grid-template-columns:1fr 1fr;
  gap:1.5mm 8mm;
  margin-bottom:0;flex-shrink:0;
}}
.inc-item{{
  font-family:Inter,sans-serif;font-size:8.5pt;
  color:#333;display:flex;gap:4pt;
  align-items:flex-start;line-height:1.5;
}}
.inc-dot{{color:{GOLD};font-size:6.5pt;margin-top:2pt;flex-shrink:0;}}

/* Steps */
.steps-row{{display:flex;gap:2mm;flex-shrink:0;}}
.step{{
  flex:1;
  border:0.5pt solid #ebebeb;
  border-top:2pt solid {GOLD};
  padding:3mm 2.5mm 3.5mm;
}}
.step-n{{
  font-family:Inter,sans-serif;font-size:5.5pt;
  color:rgba(200,152,10,0.45);
  letter-spacing:1.5pt;text-transform:uppercase;
  margin-bottom:1.5mm;
}}
.step-t{{
  font-family:'Playfair Display',serif;font-size:9.5pt;font-weight:600;
  color:#111;margin-bottom:1.5mm;
}}
.step-d{{
  font-family:Inter,sans-serif;font-size:7pt;
  color:#777;line-height:1.45;
}}

/* Tags */
.tags-row{{
  display:flex;flex-wrap:wrap;gap:1.5mm;
  margin-bottom:1mm;flex-shrink:0;
}}
.tag{{
  font-family:Inter,sans-serif;font-size:6.5pt;
  color:rgba(200,152,10,0.9);
  border:0.5pt solid rgba(200,152,10,0.3);
  padding:1.5mm 3mm;border-radius:20pt;
  letter-spacing:0.5pt;white-space:nowrap;
}}

/* Footer */
.pg-footer{{
  display:flex;justify-content:space-between;align-items:center;
  padding:2.5mm 14mm 6mm;
  border-top:0.4pt solid #e0e0e0;
  flex-shrink:0;
}}
.ft-brand{{
  font-family:Inter,sans-serif;font-size:6pt;font-weight:700;
  color:#555;letter-spacing:1.5pt;text-transform:uppercase;
}}
.ft-doc{{font-family:Inter,sans-serif;font-size:6pt;color:#bbb;}}
.ft-num{{
  font-family:'Playfair Display',serif;font-size:10pt;font-weight:700;
  color:{GOLD};
}}

/* ══════════════════════════════════════════════
   COVER PAGE
══════════════════════════════════════════════ */
.pg-cover{{position:relative;display:block;}}
.cv-img{{
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center top;
}}
.cv-overlay{{
  position:absolute;inset:0;
  background:
    linear-gradient(to right,
      rgba(5,5,5,0.97) 0%,rgba(5,5,5,0.97) 14%,
      rgba(5,5,5,0.55) 30%,rgba(5,5,5,0.00) 48%),
    linear-gradient(to bottom,
      rgba(5,5,5,0.00) 0%,rgba(5,5,5,0.00) 12%,
      rgba(5,5,5,0.18) 20%,rgba(5,5,5,0.95) 28%,
      rgba(5,5,5,0.97) 100%);
}}
.cv-body{{
  position:relative;z-index:2;
  padding:18mm 16mm 14mm;
  height:100%;display:flex;flex-direction:column;justify-content:space-between;
}}
.cv-top-label{{
  font-family:Inter,sans-serif;font-size:7pt;font-weight:500;
  color:rgba(200,152,10,0.7);letter-spacing:3pt;text-transform:uppercase;
}}
.cv-main{{display:flex;flex-direction:column;}}
.cv-title{{
  font-family:'Playfair Display',serif;font-size:42pt;font-weight:700;
  color:#fff;line-height:1.1;
  margin-top:6mm;margin-bottom:5mm;
  text-shadow:0 2px 12px rgba(0,0,0,0.9),0 0 30px rgba(0,0,0,0.8);
}}
.cv-gold{{color:{GOLD};}}
.cv-rule{{
  width:22mm;height:1pt;
  background:linear-gradient(90deg,{GOLD},transparent);
  margin-bottom:4.5mm;
}}
.cv-sub{{
  font-family:Inter,sans-serif;font-size:10pt;
  color:rgba(255,255,255,0.55);line-height:1.7;
  max-width:100mm;margin-bottom:7mm;
  text-shadow:0 1px 6px rgba(0,0,0,0.9);
}}
.cv-services{{display:flex;flex-direction:column;gap:4mm;}}
.cv-svc{{
  font-family:Inter,sans-serif;font-size:9.5pt;
  color:rgba(255,255,255,0.65);
  border-left:1.5pt solid rgba(200,152,10,0.3);
  padding-left:3mm;
  text-shadow:0 1px 5px rgba(0,0,0,0.9);
}}
.cv-foot{{}}
.cv-contacts{{
  font-family:Inter,sans-serif;font-size:8pt;
  color:rgba(255,255,255,0.45);
  display:flex;gap:4mm;align-items:center;
}}
.cv-dot{{color:rgba(200,152,10,0.4);}}
.cv-brand-line{{
  font-family:Inter,sans-serif;font-size:6pt;
  color:rgba(200,152,10,0.35);letter-spacing:2pt;text-transform:uppercase;
  margin-top:3mm;
}}

/* ══════════════════════════════════════════════
   CONTACT PAGE
══════════════════════════════════════════════ */
.pg-contact{{
  background:#060606;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:22mm 24mm;
}}
.ct-label{{
  font-family:Inter,sans-serif;font-size:8pt;font-weight:500;
  color:rgba(200,152,10,0.6);letter-spacing:3pt;text-transform:uppercase;
}}
.ct-main{{}}
.ct-title{{
  font-family:'Playfair Display',serif;font-size:42pt;font-weight:700;
  color:#fff;line-height:1.2;margin-bottom:5mm;
}}
.ct-sub{{
  font-family:Inter,sans-serif;font-size:11pt;
  color:rgba(255,255,255,0.4);margin-bottom:6mm;
}}
.ct-rule{{
  width:60mm;height:1pt;
  background:linear-gradient(90deg,{GOLD},transparent);
}}
.ct-details{{display:flex;flex-direction:column;gap:8mm;}}
.ct-item{{border-left:2pt solid rgba(200,152,10,0.3);padding-left:6mm;}}
.ct-item-l{{
  font-family:Inter,sans-serif;font-size:7.5pt;font-weight:600;
  color:rgba(200,152,10,0.6);letter-spacing:2.5pt;text-transform:uppercase;
  margin-bottom:2mm;
}}
.ct-item-v{{
  font-family:'Playfair Display',serif;font-size:16pt;color:#fff;
}}
.ct-brand{{text-align:center;}}
.ct-brand-name{{
  font-family:'Playfair Display',serif;font-size:28pt;font-weight:700;
  color:#fff;letter-spacing:2pt;margin-bottom:4mm;
}}
.ct-brand-sub{{
  font-family:Inter,sans-serif;font-size:7pt;
  color:rgba(200,152,10,0.45);letter-spacing:2.5pt;text-transform:uppercase;
}}
</style>
</head>
<body>
{cover_pg}
{service_pages}
{contact_pg}
</body>
</html>'''

    with open(PRINT_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Print HTML written: {PRINT_HTML}')


# ─── Generate PDF via Playwright ──────────────────────────────────
def generate_pdf():
    script = f"""
const {{ chromium }} = require('{PLAYWRIGHT}');
(async () => {{
  const browser = await chromium.launch();
  const page    = await browser.newPage();
  await page.goto('file://{PRINT_HTML}', {{ waitUntil: 'networkidle', timeout: 60000 }});
  await page.waitForTimeout(2000);
  await page.pdf({{
    path: '{PDF_PATH}',
    width:  '210mm',
    height: '297mm',
    printBackground: true,
    margin: {{ top: '0', right: '0', bottom: '0', left: '0' }}
  }});
  await browser.close();
}})();
"""
    script_path = f'{SCRATCHPAD}/gen_pdf.js'
    with open(script_path, 'w') as f:
        f.write(script)
    result = subprocess.run([NODE, script_path], capture_output=True, text=True, timeout=90)
    if result.returncode != 0:
        print('PDF error:', result.stderr)
        sys.exit(1)
    print(f'PDF generated: {PDF_PATH}')


# ─── Rasterize for cross-viewer compatibility ─────────────────────
def rasterize():
    import fitz
    doc = fitz.open(PDF_PATH)
    out = fitz.open()
    mat = fitz.Matrix(3.0, 3.0)
    for page in doc:
        pix  = page.get_pixmap(matrix=mat, alpha=False)
        rect = fitz.Rect(0, 0, page.rect.width, page.rect.height)
        np   = out.new_page(width=page.rect.width, height=page.rect.height)
        np.insert_image(rect, pixmap=pix)
    out.save(FINAL_PDF, deflate=True)
    size_mb = os.path.getsize(FINAL_PDF) / 1024 / 1024
    print(f'Rasterized PDF: {FINAL_PDF} ({size_mb:.1f}MB)')


# ─── Main ─────────────────────────────────────────────────────────
print('\n=== Building MDA Service Catalog ===\n')
build_web()
build_print()
print('\nGenerating PDF...')
generate_pdf()
print('\nRasterizing for cross-viewer compatibility...')
rasterize()
print(f'\n✓ Done.')
print(f'  Web:  {WEB_HTML}')
print(f'  PDF:  {FINAL_PDF}')
