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
            dict(n='01', t='Brief', d='We learn your business, goals and audience'),
            dict(n='02', t='Design', d='Crafted layouts aligned to your brand'),
            dict(n='03', t='Content', d='Your copy and visuals integrated cleanly'),
            dict(n='04', t='Revisions', d='Refinements until it is perfect'),
            dict(n='05', t='Delivery', d='Print-ready PDF and editable files'),
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
            dict(n='03', t='Design', d='Visual design with your brand identity'),
            dict(n='04', t='Build', d='Full development and integration'),
            dict(n='05', t='Launch', d='Final testing and go-live handover'),
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
            dict(n='01', t='Discovery', d='Brand values, audience and competitors'),
            dict(n='02', t='Concepts', d='Multiple logo directions presented'),
            dict(n='03', t='Identity', d='Full brand system developed'),
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
            dict(n='02', t='Assets', d='Creating all visual and digital materials'),
            dict(n='03', t='Setup', d='Platform configuration and integration'),
            dict(n='04', t='Review', d='Full walkthrough and client approval'),
            dict(n='05', t='Launch', d='Your business goes live, ready to grow'),
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
            dict(n='01', t='Brief', d='Understanding the offer, tone and goal'),
            dict(n='02', t='Concept', d='Visual direction and layout approach'),
            dict(n='03', t='Design', d='On-brand visuals crafted to convert'),
            dict(n='04', t='Revisions', d='Adjustments until you are satisfied'),
            dict(n='05', t='Delivery', d='Final files in all required formats'),
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
            dict(n='01', t='Concept', d='Script, storyboard and creative brief'),
            dict(n='02', t='Pre-Prod', d='Location, talent and schedule planning'),
            dict(n='03', t='Filming', d='Professional on-location production'),
            dict(n='04', t='Edit', d='Post-production, grade and sound'),
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
            dict(n='01', t='Brief', d='Concept, messaging and target audience'),
            dict(n='02', t='Script', d='Natural, authentic script written'),
            dict(n='03', t='Shoot', d='Filmed in your location or studio'),
            dict(n='04', t='Edit', d='Cut, graded, captioned and polished'),
            dict(n='05', t='Deliver', d='Ready-to-post files, all platforms'),
        ],
        tags=['Reels','TikTok','YouTube Shorts','Authentic Content','High Engagement'],
    ),
]

# ─── CSS shared between web and print ─────────────────────────────
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">'

# ─── HTML helpers ─────────────────────────────────────────────────
def gold_rule(w='60px', mb='28px'):
    return f'<div style="width:{w};height:1.5px;background:linear-gradient(90deg,#C8980A,transparent);margin-bottom:{mb};"></div>'

def tag_pill(t):
    return (f'<span style="display:inline-block;font-family:Inter,sans-serif;font-size:10px;'
            f'font-weight:500;color:rgba(200,152,10,0.85);padding:4px 12px;'
            f'border:1px solid rgba(200,152,10,0.25);border-radius:20px;'
            f'letter-spacing:0.5px;white-space:nowrap;">{t}</span>')

def feature_item(text):
    return (f'<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;">'
            f'<span style="color:#C8980A;font-size:8px;margin-top:4px;flex-shrink:0;">&#9656;</span>'
            f'<span style="font-family:Inter,sans-serif;font-size:13px;'
            f'color:rgba(255,255,255,0.72);line-height:1.55;">{text}</span>'
            f'</div>')

def step_card(n, t, d):
    return (f'<div style="flex:1;padding:16px 14px;background:rgba(200,152,10,0.04);'
            f'border:1px solid rgba(200,152,10,0.15);border-radius:4px;position:relative;">'
            f'<div style="font-family:Inter,sans-serif;font-size:28px;color:rgba(200,152,10,0.06);'
            f'font-weight:700;position:absolute;top:8px;right:10px;line-height:1;">{n}</div>'
            f'<div style="font-family:Inter,sans-serif;font-size:9px;color:rgba(200,152,10,0.5);'
            f'letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">STEP {n}</div>'
            f'<div style="font-family:\'Playfair Display\',serif;font-size:13px;color:#fff;'
            f'font-weight:600;margin-bottom:5px;">{t}</div>'
            f'<div style="font-family:Inter,sans-serif;font-size:11px;color:rgba(255,255,255,0.45);'
            f'line-height:1.5;">{d}</div>'
            f'</div>')

def section_label(text):
    return (f'<div style="font-family:Inter,sans-serif;font-size:9px;font-weight:600;'
            f'color:rgba(200,152,10,0.6);letter-spacing:3px;text-transform:uppercase;'
            f'margin-bottom:14px;">{text}</div>')

# ─── Build web HTML ────────────────────────────────────────────────
def build_web():
    nav_links = ''.join(
        f'<a href="#{s["id"]}" style="font-family:Inter,sans-serif;font-size:12px;font-weight:500;'
        f'color:rgba(255,255,255,0.6);text-decoration:none;letter-spacing:0.3px;'
        f'transition:color 0.2s;white-space:nowrap;" '
        f'onmouseover="this.style.color=\'#C8980A\'" onmouseout="this.style.color=\'rgba(255,255,255,0.6)\'">'
        f'{s["title"].replace(chr(10)," ")}</a>'
        for s in SERVICES
    )

    sections_html = ''
    for i, s in enumerate(SERVICES):
        img_side  = 'left'  if i % 2 == 0 else 'right'
        flex_dir  = 'row'   if i % 2 == 0 else 'row-reverse'
        bg_color  = '#0a0a0a' if i % 2 == 0 else '#0d0d0d'
        includes_html = ''.join(feature_item(f) for f in s['includes'])
        steps_html  = ''.join(step_card(st['n'], st['t'], st['d']) for st in s['steps'])
        tags_html   = ''.join(tag_pill(t) for t in s['tags'])

        title_html = s['title'].replace('\n', '<br>')

        sections_html += f'''
<section id="{s["id"]}" style="display:flex;flex-direction:{flex_dir};min-height:100vh;background:{bg_color};border-top:1px solid rgba(200,152,10,0.08);">
  <!-- image panel -->
  <div class="svc-img-panel" style="flex:0 0 42%;position:relative;overflow:hidden;">
    <img src="assets/images/{s['img']}.jpg"
         alt="{s['title'].replace(chr(10), ' ')}"
         style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;">
    <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(10,10,10,0.15),rgba(10,10,10,0));pointer-events:none;"></div>
  </div>
  <!-- content panel -->
  <div class="svc-content-panel" style="flex:1;padding:64px 56px;display:flex;flex-direction:column;justify-content:center;gap:0;">
    <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:500;color:rgba(200,152,10,0.7);letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">{s['label']} &nbsp;/&nbsp; {s['num']}</div>
    <h2 style="font-family:\'Playfair Display\',serif;font-size:clamp(28px,3vw,46px);font-weight:700;color:#fff;line-height:1.15;margin-bottom:12px;text-wrap:balance;">{title_html}</h2>
    <p style="font-family:Inter,sans-serif;font-size:13px;font-style:italic;color:#C8980A;font-weight:300;margin-bottom:20px;">{s['subtitle']}</p>
    {gold_rule('80px','24px')}
    <p style="font-family:Inter,sans-serif;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.75;margin-bottom:32px;max-width:520px;">{s['desc']}</p>

    {section_label("What's Included")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-bottom:32px;">
      {''.join(feature_item(f) for f in s['includes'])}
    </div>

    {section_label('How It Works')}
    <div style="display:flex;gap:10px;margin-bottom:32px;flex-wrap:wrap;">
      {''.join(step_card(st["n"], st["t"], st["d"]) for st in s["steps"])}
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      {''.join(tag_pill(t) for t in s["tags"])}
    </div>
  </div>
</section>
'''

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

/* ── Navigation ── */
#nav{{
  position:fixed;top:0;left:0;right:0;z-index:1000;
  background:rgba(10,10,10,0.92);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border-bottom:1px solid rgba(200,152,10,0.15);
  padding:0 40px;height:60px;
  display:flex;align-items:center;justify-content:space-between;gap:24px;
}}
#nav-links{{display:flex;gap:28px;align-items:center;flex-wrap:nowrap;overflow-x:auto;}}
#nav-links::-webkit-scrollbar{{display:none;}}

/* ── Cover ── */
#cover{{
  min-height:100vh;padding-top:60px;
  display:flex;flex-direction:row;
  background:#0a0a0a;
}}
.cover-text{{
  flex:0 0 55%;padding:80px 64px;
  display:flex;flex-direction:column;justify-content:center;
}}
.cover-image{{
  flex:0 0 45%;position:relative;overflow:hidden;
}}
.cover-image img{{width:100%;height:100%;object-fit:cover;object-position:center top;}}
.cover-image::after{{
  content:'';position:absolute;left:0;top:0;bottom:0;width:80px;
  background:linear-gradient(to right,#0a0a0a,transparent);
}}

/* ── Service responsive ── */
@media(max-width:900px){{
  #nav{{padding:0 20px;}}
  #nav .nav-brand span:last-child{{display:none;}}
  #nav-links{{gap:16px;}}
  #cover{{flex-direction:column;}}
  .cover-text{{flex:none;padding:80px 24px 40px;}}
  .cover-image{{flex:none;height:60vw;}}
  .svc-img-panel{{flex:0 0 auto!important;height:55vw;width:100%!important;}}
  section[id]{{flex-direction:column!important;}}
  .svc-content-panel{{padding:40px 24px!important;}}
}}
@media(max-width:600px){{
  .cover-image{{height:75vw;}}
  .svc-img-panel{{height:70vw;}}
  .cover-text h1{{font-size:36px!important;}}
}}

/* ── Contact ── */
#contact{{
  background:#060606;
  border-top:1px solid rgba(200,152,10,0.15);
  padding:100px 64px;
  display:flex;flex-direction:column;align-items:center;text-align:center;
}}
@media(max-width:600px){{#contact{{padding:60px 24px;}}}}

/* ── Scroll fade-in ── */
.fade-in{{opacity:0;transform:translateY(20px);transition:opacity 0.6s ease,transform 0.6s ease;}}
.fade-in.visible{{opacity:1;transform:none;}}
</style>
</head>
<body>

<!-- NAV -->
<nav id="nav">
  <div class="nav-brand" style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
    <div style="font-family:\'Playfair Display\',serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:0.5px;">MDA</div>
    <div style="width:1px;height:18px;background:rgba(200,152,10,0.3);"></div>
    <span style="font-family:Inter,sans-serif;font-size:10px;color:rgba(200,152,10,0.7);letter-spacing:2px;text-transform:uppercase;">Master Digital Agency</span>
  </div>
  <div id="nav-links">{nav_links}</div>
  <a href="#contact" style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;color:#0a0a0a;background:#C8980A;padding:8px 20px;border-radius:2px;text-decoration:none;letter-spacing:0.5px;white-space:nowrap;flex-shrink:0;">GET IN TOUCH</a>
</nav>

<!-- COVER -->
<section id="cover">
  <div class="cover-text">
    <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:500;color:rgba(200,152,10,0.7);letter-spacing:4px;text-transform:uppercase;margin-bottom:24px;">MDA &nbsp;/&nbsp; Master Digital Agency</div>
    <h1 style="font-family:\'Playfair Display\',serif;font-size:clamp(36px,5vw,72px);font-weight:700;color:#fff;line-height:1.1;margin-bottom:16px;">Business<br><span style="color:#C8980A;">Launch</span><br>Services</h1>
    <p style="font-family:Inter,sans-serif;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;margin-bottom:12px;max-width:460px;">From Company Profile to Corporate Video — everything your business needs to launch and grow with a powerful digital presence.</p>
    {gold_rule('100px','32px')}
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:48px;">
      {''.join(f"""<div style="display:flex;align-items:center;gap:12px;"><span style="color:#C8980A;font-size:10px;">&#9656;</span><span style="font-family:Inter,sans-serif;font-size:13px;color:rgba(255,255,255,0.65);">{svc['title'].replace(chr(10),' ')}</span></div>""" for svc in SERVICES)}
    </div>
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
      <div style="font-family:Inter,sans-serif;font-size:12px;color:rgba(255,255,255,0.4);">
        <div style="color:rgba(200,152,10,0.6);font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Website</div>
        www.drexonyx.com
      </div>
      <div style="width:1px;height:30px;background:rgba(200,152,10,0.2);"></div>
      <div style="font-family:Inter,sans-serif;font-size:12px;color:rgba(255,255,255,0.4);">
        <div style="color:rgba(200,152,10,0.6);font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Email</div>
        info@drexonyx.com
      </div>
      <div style="width:1px;height:30px;background:rgba(200,152,10,0.2);"></div>
      <div style="font-family:Inter,sans-serif;font-size:12px;color:rgba(255,255,255,0.4);">
        <div style="color:rgba(200,152,10,0.6);font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Location</div>
        Dubai, UAE
      </div>
    </div>
    <div style="margin-top:40px;font-family:Inter,sans-serif;font-size:10px;color:rgba(255,255,255,0.2);letter-spacing:2px;">MDA IS A DREXONYX BRAND &nbsp;·&nbsp; IDEAS INTO IMPACT</div>
  </div>
  <div class="cover-image">
    <img src="assets/images/cover.jpg" alt="MDA Master Digital Agency">
  </div>
</section>

<!-- SERVICE SECTIONS -->
{sections_html}

<!-- CONTACT -->
<section id="contact">
  <div style="font-family:Inter,sans-serif;font-size:10px;font-weight:500;color:rgba(200,152,10,0.6);letter-spacing:4px;text-transform:uppercase;margin-bottom:24px;">GET STARTED</div>
  <h2 style="font-family:\'Playfair Display\',serif;font-size:clamp(36px,5vw,64px);font-weight:700;color:#fff;line-height:1.2;margin-bottom:16px;">Let's Work<br><em>Together.</em></h2>
  <p style="font-family:Inter,sans-serif;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.8;max-width:480px;margin-bottom:48px;">Digital · Creative · Media</p>
  {gold_rule('80px','48px')}
  <div style="display:flex;gap:64px;justify-content:center;flex-wrap:wrap;margin-bottom:64px;">
    <div>
      <div style="font-family:Inter,sans-serif;font-size:9px;letter-spacing:3px;color:rgba(200,152,10,0.6);text-transform:uppercase;margin-bottom:8px;">Website</div>
      <div style="font-family:\'Playfair Display\',serif;font-size:20px;color:#fff;">www.drexonyx.com</div>
    </div>
    <div>
      <div style="font-family:Inter,sans-serif;font-size:9px;letter-spacing:3px;color:rgba(200,152,10,0.6);text-transform:uppercase;margin-bottom:8px;">Email</div>
      <div style="font-family:\'Playfair Display\',serif;font-size:20px;color:#fff;">info@drexonyx.com</div>
    </div>
    <div>
      <div style="font-family:Inter,sans-serif;font-size:9px;letter-spacing:3px;color:rgba(200,152,10,0.6);text-transform:uppercase;margin-bottom:8px;">Location</div>
      <div style="font-family:\'Playfair Display\',serif;font-size:20px;color:#fff;">Dubai, UAE</div>
    </div>
  </div>
  <div style="width:100%;max-width:600px;height:1px;background:linear-gradient(90deg,transparent,rgba(200,152,10,0.3),transparent);margin-bottom:40px;"></div>
  <div style="font-family:\'Playfair Display\',serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;margin-bottom:6px;">DREXONYX</div>
  <div style="font-family:Inter,sans-serif;font-size:10px;color:rgba(200,152,10,0.5);letter-spacing:3px;text-transform:uppercase;">MDA is a DREXONYX Brand &nbsp;·&nbsp; Ideas Into Impact</div>
</section>

<script>
// Scroll fade-in
const obs = new IntersectionObserver((entries) => {{
  entries.forEach(e => {{ if(e.isIntersecting) e.target.classList.add('visible'); }});
}}, {{threshold:0.08}});
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
</script>
</body>
</html>'''
    with open(WEB_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Web HTML written: {WEB_HTML}')

# ─── Build print HTML (A4 pages) ──────────────────────────────────
def build_print():
    def svc_page(s, pg_num):
        includes_html = ''.join(feature_item(f) for f in s['includes'])
        steps_html    = ''.join(step_card(st['n'], st['t'], st['d']) for st in s['steps'])
        tags_html     = ''.join(tag_pill(t) for t in s['tags'])
        img_path      = f'{IMG_DIR}/{s["img"]}.jpg'

        return f'''
<div class="pg">
  <img src="{img_path}" class="pg-bg" alt="">
  <div class="pg-overlay"></div>
  <div class="pg-body">
    <div class="pg-top">
      <div class="pg-label">{s['label']} / {s['num']}</div>
    </div>
    <div class="pg-content">
      <div>
        <div class="pg-rule"></div>
        <p class="pg-subtitle">{s['subtitle']}</p>
        <p class="pg-desc">{s['desc']}</p>
      </div>
      <div>
        <div class="pg-section-label">WHAT'S INCLUDED</div>
        <div class="pg-features">{includes_html}</div>
      </div>
      <div>
        <div class="pg-section-label">HOW IT WORKS</div>
        <div class="pg-steps">{steps_html}</div>
      </div>
      <div>
        <div class="pg-tags">{tags_html}</div>
        <div class="pg-footer">
          <span>www.drexonyx.com</span>
          <span>info@drexonyx.com</span>
          <span>Dubai, UAE</span>
          <span class="pg-footer-brand">MDA · MASTER DIGITAL AGENCY · A DREXONYX BRAND</span>
        </div>
      </div>
    </div>
  </div>
</div>'''

    # Cover page
    cover_pg = f'''
<div class="pg pg-cover">
  <img src="{IMG_DIR}/cover.jpg" class="cover-full-img" alt="MDA">
  <div class="cover-overlay"></div>
  <div class="cover-content">
    <div class="cover-mda-label">MDA / MASTER DIGITAL AGENCY</div>
    <div>
      <h1 class="cover-title">Business<br><span class="gold">Launch</span><br>Services</h1>
      <div class="cover-rule"></div>
      <p class="cover-sub">From Company Profile to Corporate Video —<br>Everything your business needs to launch and grow.</p>
      <div class="cover-services" style="margin-top:7mm;">
        {''.join(f"""<div class="cover-svc-item">{s['title'].replace(chr(10),' ')}</div>""" for s in SERVICES)}
      </div>
    </div>
    <div>
      <div class="cover-contacts">
        <span>www.drexonyx.com</span>
        <span class="cover-dot">·</span>
        <span>info@drexonyx.com</span>
        <span class="cover-dot">·</span>
        <span>Dubai, UAE</span>
      </div>
      <div class="cover-brand">MDA IS A DREXONYX BRAND · IDEAS INTO IMPACT</div>
    </div>
  </div>
</div>'''

    # Contact page
    contact_pg = f'''
<div class="pg pg-contact">
  <div class="contact-label">GET IN TOUCH</div>
  <div>
    <h2 class="contact-title">Let's Work<br><em>Together.</em></h2>
    <div class="contact-sub">Digital · Creative · Media</div>
    <div class="contact-rule"></div>
  </div>
  <div class="contact-details">
    <div class="contact-item">
      <div class="contact-item-label">WEBSITE</div>
      <div class="contact-item-value">www.drexonyx.com</div>
    </div>
    <div class="contact-item">
      <div class="contact-item-label">EMAIL</div>
      <div class="contact-item-value">info@drexonyx.com</div>
    </div>
    <div class="contact-item">
      <div class="contact-item-label">LOCATION</div>
      <div class="contact-item-value">Dubai, United Arab Emirates</div>
    </div>
  </div>
  <div class="contact-brand-block">
    <div class="contact-brand-name">DREXONYX</div>
    <div class="contact-brand-sub">MDA IS A DREXONYX BRAND · IDEAS INTO IMPACT</div>
  </div>
</div>'''

    service_pages = ''.join(svc_page(s, i+2) for i, s in enumerate(SERVICES))

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MDA Service Catalog — Print</title>
{FONTS}
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
body{{background:#fff;}}

/* ── A4 page (full-bleed) ── */
.pg{{
  width:210mm;height:297mm;
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;
  page-break-after:always;
}}
.pg-bg{{
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center top;z-index:0;
}}
.pg-overlay{{
  position:absolute;inset:0;z-index:1;
  background:
    radial-gradient(ellipse 88% 38% at 50% 14%,
      rgba(5,5,5,0.82) 10%,
      rgba(5,5,5,0.00) 100%),
    linear-gradient(to bottom,
      rgba(5,5,5,0.20)  0%,
      rgba(5,5,5,0.20) 21%,
      rgba(5,5,5,0.93) 29%,
      rgba(5,5,5,0.97) 35%,
      rgba(5,5,5,0.97) 100%
    );
}}
.pg-body{{
  position:relative;z-index:2;
  display:flex;flex-direction:column;
  height:100%;
  padding:10mm 14mm 10mm 14mm;
}}
.pg-top{{
  flex:0 0 34%;display:flex;flex-direction:column;justify-content:flex-start;
}}
.pg-label{{
  font-family:Inter,sans-serif;font-size:7.5pt;font-weight:500;
  color:rgba(200,152,10,0.75);letter-spacing:2.5pt;text-transform:uppercase;
  text-shadow:0 1px 4px rgba(0,0,0,0.8);
}}
.pg-content{{
  flex:1;display:flex;flex-direction:column;justify-content:space-between;
}}
.pg-rule{{
  width:14mm;height:1pt;
  background:linear-gradient(90deg,#C8980A,transparent);
  margin-bottom:3mm;
}}
.pg-subtitle{{
  font-family:Inter,sans-serif;font-size:9.5pt;font-style:italic;
  color:#C8980A;font-weight:300;margin-bottom:2.5mm;
}}
.pg-desc{{
  font-family:Inter,sans-serif;font-size:8.5pt;
  color:rgba(255,255,255,0.75);line-height:1.65;max-width:160mm;
}}
.pg-section-label{{
  font-family:Inter,sans-serif;font-size:7pt;font-weight:600;
  color:rgba(200,152,10,0.65);letter-spacing:2.5pt;text-transform:uppercase;
  margin-bottom:2mm;
}}
.pg-features{{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.5mm 6mm;
}}
.pg-steps{{display:flex;gap:2.5mm;}}
.pg-tags{{display:flex;flex-wrap:wrap;gap:1.5mm;}}
.pg-footer{{
  display:flex;align-items:center;gap:5mm;flex-wrap:wrap;
  padding-top:3mm;
  border-top:0.4pt solid rgba(200,152,10,0.2);
  font-family:Inter,sans-serif;font-size:5.5pt;color:rgba(255,255,255,0.35);
}}
.pg-footer-brand{{margin-left:auto;color:rgba(200,152,10,0.35);letter-spacing:0.5pt;}}

/* ── COVER ── */
.pg-cover{{position:relative;display:block;}}
.cover-full-img{{
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center top;
}}
.cover-overlay{{
  position:absolute;inset:0;
  background:
    linear-gradient(to right,
      rgba(8,8,8,0.97) 0%,rgba(8,8,8,0.97) 16%,
      rgba(8,8,8,0.52) 30%,rgba(8,8,8,0.00) 46%),
    linear-gradient(to bottom,
      rgba(8,8,8,0.00) 0%,rgba(8,8,8,0.00) 13%,
      rgba(8,8,8,0.22) 20%,rgba(8,8,8,0.95) 28%,
      rgba(8,8,8,0.97) 50%,rgba(8,8,8,0.95) 100%);
}}
.cover-content{{
  position:relative;z-index:2;
  padding:18mm 16mm 14mm;
  height:100%;display:flex;flex-direction:column;justify-content:space-between;
}}
.cover-mda-label{{
  font-family:Inter,sans-serif;font-size:7pt;font-weight:500;
  color:rgba(200,152,10,0.7);letter-spacing:3pt;text-transform:uppercase;
}}
.cover-title{{
  font-family:'Playfair Display',serif;font-size:42pt;font-weight:700;
  color:#fff;line-height:1.1;margin-top:6mm;margin-bottom:6mm;
  text-shadow:0 2px 12px rgba(0,0,0,0.95),0 0 35px rgba(0,0,0,0.85);
}}
.gold{{color:#C8980A;}}
.cover-rule{{
  width:24mm;height:1pt;
  background:linear-gradient(90deg,#C8980A,transparent);
  margin-bottom:5mm;
}}
.cover-sub{{
  font-family:Inter,sans-serif;font-size:10pt;
  color:rgba(255,255,255,0.55);line-height:1.7;
  max-width:100mm;
  text-shadow:0 1px 6px rgba(0,0,0,0.95);
}}
.cover-services{{
  display:flex;flex-direction:column;gap:4.5mm;
}}
.cover-svc-item{{
  font-family:Inter,sans-serif;font-size:9.5pt;
  color:rgba(255,255,255,0.65);
  border-left:1.5pt solid rgba(200,152,10,0.3);padding-left:3mm;
  text-shadow:0 1px 6px rgba(0,0,0,0.95);
}}
.cover-contacts{{
  font-family:Inter,sans-serif;font-size:8pt;
  color:rgba(255,255,255,0.45);
  display:flex;gap:4mm;align-items:center;
  flex-wrap:wrap;
}}
.cover-dot{{color:rgba(200,152,10,0.4);}}
.cover-brand{{
  font-family:Inter,sans-serif;font-size:6pt;
  color:rgba(200,152,10,0.35);letter-spacing:2pt;text-transform:uppercase;
  margin-top:3mm;
}}

/* ── CONTACT ── */
.pg-contact{{
  display:flex;flex-direction:column;justify-content:space-between;
  background:#060606;padding:22mm 24mm;
}}
.contact-content{{
  display:flex;flex-direction:column;justify-content:space-between;
  height:100%;
}}
.contact-label{{
  font-family:Inter,sans-serif;font-size:8pt;font-weight:500;
  color:rgba(200,152,10,0.6);letter-spacing:3pt;text-transform:uppercase;
}}
.contact-title{{
  font-family:'Playfair Display',serif;font-size:42pt;font-weight:700;
  color:#fff;line-height:1.2;margin-bottom:4mm;
}}
.contact-sub{{
  font-family:Inter,sans-serif;font-size:11pt;
  color:rgba(255,255,255,0.4);margin-bottom:6mm;
}}
.contact-rule{{
  width:20mm;height:1pt;
  background:linear-gradient(90deg,#C8980A,transparent);
}}
.contact-details{{
  display:flex;flex-direction:column;gap:10mm;
}}
.contact-item-label{{
  font-family:Inter,sans-serif;font-size:6.5pt;font-weight:600;
  color:rgba(200,152,10,0.55);letter-spacing:2.5pt;text-transform:uppercase;
  margin-bottom:2mm;
}}
.contact-item-value{{
  font-family:'Playfair Display',serif;font-size:16pt;color:#fff;
}}
.contact-brand-block{{
  padding-top:10mm;
  border-top:0.3pt solid rgba(200,152,10,0.2);
}}
.contact-brand-name{{
  font-family:'Playfair Display',serif;font-size:18pt;font-weight:700;
  color:#fff;letter-spacing:2pt;margin-bottom:3mm;
}}
.contact-brand-sub{{
  font-family:Inter,sans-serif;font-size:6pt;
  color:rgba(200,152,10,0.4);letter-spacing:2pt;text-transform:uppercase;
}}

@media print{{
  @page{{size:210mm 297mm;margin:0;}}
  body{{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
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
    js = f"""
const {{ chromium }} = require('{PLAYWRIGHT}');
(async () => {{
  const br = await chromium.launch();
  const pg = await br.newPage();
  await pg.goto('file://{PRINT_HTML}', {{waitUntil:'networkidle', timeout:60000}});
  await pg.waitForTimeout(3000);
  await pg.pdf({{
    path: '{PDF_PATH}',
    width: '210mm', height: '297mm',
    printBackground: true,
    margin: {{top:'0',right:'0',bottom:'0',left:'0'}},
  }});
  await br.close();
  console.log('PDF generated:', '{PDF_PATH}');
}})();
"""
    js_path = f'{SCRATCHPAD}/gen-catalog-pdf.js'
    with open(js_path, 'w') as f:
        f.write(js)
    result = subprocess.run([NODE, js_path], capture_output=True, text=True, timeout=120)
    print(result.stdout)
    if result.returncode != 0:
        print('STDERR:', result.stderr[-2000:])
        sys.exit(1)

# ─── Rasterize PDF (cross-viewer) ─────────────────────────────────
def rasterize_pdf():
    import pymupdf
    src = pymupdf.open(PDF_PATH)
    dest = pymupdf.open()
    for pg in src:
        mat = pymupdf.Matrix(2.5, 2.5)
        pix = pg.get_pixmap(matrix=mat, colorspace=pymupdf.csRGB, alpha=False)
        jpg_bytes = pix.tobytes('jpeg', 88)
        dest_pg = dest.new_page(width=pg.rect.width, height=pg.rect.height)
        dest_pg.insert_image(dest_pg.rect, stream=jpg_bytes)
    dest.save(FINAL_PDF, garbage=4, deflate=True)
    dest.close(); src.close()
    size = os.path.getsize(FINAL_PDF)/1024/1024
    print(f'Rasterized PDF: {FINAL_PDF} ({size:.1f}MB)')

# ─── Main ─────────────────────────────────────────────────────────
if __name__ == '__main__':
    print('\n=== Building MDA Service Catalog ===\n')
    build_web()
    build_print()
    print('\nGenerating PDF...')
    generate_pdf()
    print('Rasterizing for cross-viewer compatibility...')
    rasterize_pdf()
    print('\n✓ Done.')
    print(f'  Web:  {WEB_HTML}')
    print(f'  PDF:  {FINAL_PDF}')
