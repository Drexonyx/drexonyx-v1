#!/usr/bin/env python3
"""MDA Service Catalog — Arabic version — web HTML + print-ready A4 PDF"""
import os, subprocess, base64
from PIL import Image


def get_embedded_fonts() -> str:
    """Return <style> block with Cairo variable font embedded as base64 TTF."""
    print('  Embedding Cairo font from local assets…')
    font_path = os.path.join(
        '/home/user/drexonyx-v1/master-digital-agency/deliverables/mda-service-catalog',
        'assets/fonts/Cairo-Variable.ttf'
    )
    with open(font_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    return (
        '<style>\n'
        '@font-face{font-family:"Cairo";font-style:normal;font-weight:100 900;'
        f'src:url("data:font/ttf;base64,{b64}") format("truetype");}}\n'
        '</style>'
    )

SCRATCHPAD = '/tmp/claude-0/-home-user-drexonyx-v1/5d986d79-a6f1-5fda-b8f6-602f57ae3b36/scratchpad'
CAT_DIR    = f'{SCRATCHPAD}/catalog_pages'
OUT_DIR    = '/home/user/drexonyx-v1/master-digital-agency/deliverables/mda-service-catalog'
IMG_DIR    = f'{OUT_DIR}/assets/images'
WEB_HTML   = f'{OUT_DIR}/index_ar.html'
PRINT_HTML = f'{OUT_DIR}/print_ar.html'
PDF_PATH   = f'{OUT_DIR}/MDA_Service_Catalog_AR.pdf'
FINAL_PDF  = f'{OUT_DIR}/MDA_Service_Catalog_AR_Final.pdf'
PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright'
NODE       = '/opt/node22/bin/node'

os.makedirs(IMG_DIR, exist_ok=True)

# ─── Images (reuse from English build) ────────────────────────────
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

# ─── Arabic Service Data ───────────────────────────────────────────
SERVICES = [
    dict(
        id='profile', img='profile', num='01', label='خدمة التصميم',
        title='تصميم البروفايل\nالشركاتي',
        subtitle='قدّم أعمالك بأسلوب يُلهم الثقة',
        desc='البروفايل الشركاتي الاحترافي هو أقوى انطباع أول تتركه على عملائك. نصمّم بروفايلات أنيقة وجاهزة للطباعة تعكس رؤيتك وتُبرز خدماتك وتبني الثقة مع العملاء والشركاء والمستثمرين. كل صفحة مُهيكلة لتحكي قصتك بوضوح وإقناع.',
        highlights=[
            dict(title='تصميم ثنائي اللغة', text='عربي وإنجليزي'),
            dict(title='طباعة ورقمي', text='جميع الصيغ متضمنة'),
            dict(title='هوية متناسقة', text='يعكس هويتك بدقة'),
        ],
        panel_hl='أعمالك،\nبشكل\nاحترافي',
        panel_points=[
            'تخطيط تحريري مخصص — من 20 إلى 50+ صفحة',
            'ثنائي اللغة بالكامل: عربي وإنجليزي',
            'PDF جاهز للطباعة + ملفات قابلة للتعديل',
            'منسجم مع هويتك التجارية الحالية',
            'يُسلَّم خلال 5–7 أيام عمل',
        ],
        includes=['صفحة الرؤية والرسالة','نبذة عن شركتك','نظرة عامة على الخدمات','تعريف بالفريق','المحفظة والإنجازات','تطبيق الهوية التجارية','صيغ الطباعة والرقمية'],
        steps=[
            dict(n='01', t='الإحاطة',   d='نتعرف على أعمالك وأهدافك وجمهورك'),
            dict(n='02', t='التصميم',   d='تخطيطات مُصممة لتتناسب مع هويتك'),
            dict(n='03', t='المحتوى',   d='دمج نصوصك ومرئياتك بشكل منظم'),
            dict(n='04', t='المراجعة',  d='تعديلات حتى يصل إلى الكمال'),
            dict(n='05', t='التسليم',   d='PDF جاهز للطباعة وملفات للتعديل'),
        ],
        tags=['PDF جاهز للطباعة','صيغة رقمية','تخطيط A4','منسجم مع الهوية','عربي وإنجليزي'],
    ),
    dict(
        id='website', img='website', num='02', label='خدمة رقمية',
        title='تصميم المواقع\nالإلكترونية',
        subtitle='مواقع حديثة تنمّي أعمالك',
        desc='موقعك الإلكتروني هو مندوب مبيعاتك على مدار الساعة. نصمّم مواقع سريعة ومتجاوبة مع الجوال تجذب الانتباه وتحوّل الزوار إلى عملاء وتعكس جودة علامتك التجارية — للمطاعم والعيادات والصالونات والشركات وكل الأعمال. مبنية للترتيب، مبنية للتحويل.',
        highlights=[
            dict(title='أولوية الجوال', text='يعمل على كل الأجهزة'),
            dict(title='محسّن لمحركات البحث', text='مبني للترتيب والتحويل'),
            dict(title='تسليم سريع', text='جاهز خلال 2–3 أسابيع'),
        ],
        panel_hl='مواقع مبنية\nلتحويل\nالزوار',
        panel_points=[
            'تصميم فريد منسجم مع هويتك التجارية',
            'متجاوب مع الجوال على جميع الشاشات',
            'هيكل محسّن لمحركات البحث من الأساس',
            'نماذج تواصل وحجز وتكامل جاهزة',
            'تسليم كامل مع التدريب والدعم',
        ],
        includes=['تصميم وتخطيط مخصص','متجاوب مع الجوال','هيكل محسّن لـ SEO','نماذج التواصل والحجز','تكامل السوشيال ميديا','محسّن للسرعة','إدارة المحتوى'],
        steps=[
            dict(n='01', t='الاستكشاف',      d='فهم أعمالك وأهدافك'),
            dict(n='02', t='التصميم الهيكلي', d='هيكل وبنية الصفحات'),
            dict(n='03', t='التصميم',         d='تصميم مرئي بهويتك التجارية'),
            dict(n='04', t='البناء',           d='تطوير كامل وتكامل'),
            dict(n='05', t='الإطلاق',          d='اختبار نهائي وتسليم'),
        ],
        tags=['مطاعم','تجزئة','رعاية صحية','شركات','تجارة إلكترونية','صفحات هبوط'],
    ),
    dict(
        id='brand', img='brand', num='03', label='خدمة العلامة التجارية',
        title='حزمة الهوية\nالتجارية',
        subtitle='هوية مميزة تبقى في الذاكرة',
        desc='من تصميم الشعار إلى هوية العلامة التجارية الكاملة، نساعد أعمالك على التميز بصورة احترافية ومتناسقة عبر جميع المنصات — إلكترونياً وورقياً. كل عنصر مُصمم ليحكي قصتك بلمحة واحدة ويترك انطباعاً دائماً لدى كل عميل تلتقيه.',
        highlights=[
            dict(title='نظام الشعار', text='جميع المتغيرات متضمنة'),
            dict(title='دليل العلامة', text='قواعد الأسلوب الكاملة'),
            dict(title='القرطاسية', text='بطاقات وترويسات والمزيد'),
        ],
        panel_hl='هوية\nتستحق\nأن تُذكر',
        panel_points=[
            'عدة مفاهيم للشعار للاختيار',
            'لوحة ألوان كاملة ونظام طباعي',
            'بطاقة أعمال وترويسة وقرطاسية',
            'دليل أسلوب العلامة للاستخدام المتناسق',
            'ملفات جاهزة للطباعة والرقمية',
        ],
        includes=['تصميم الشعار','دليل أسلوب العلامة','نظام لوحة الألوان','اختيار الطباعة','تصميم بطاقة الأعمال','الترويسة والقرطاسية','دليل تطبيقات العلامة'],
        steps=[
            dict(n='01', t='الاستكشاف',  d='قيم العلامة والجمهور والمنافسين'),
            dict(n='02', t='المفاهيم',   d='عدة اتجاهات للشعار'),
            dict(n='03', t='الهوية',     d='نظام العلامة الكامل'),
            dict(n='04', t='التحسين',    d='مراجعات وموافقة نهائية'),
            dict(n='05', t='كتاب العلامة', d='دليل شامل مُسلَّم'),
        ],
        tags=['تصميم الشعار','دليل العلامة','القرطاسية','التغليف','اللافتات','رقمي وطباعي'],
    ),
    dict(
        id='launch', img='launch', num='04', label='خدمة الإطلاق',
        title='حزمة الإطلاق\nالرقمي',
        subtitle='كل ما تحتاجه للانطلاق في العالم الرقمي',
        desc='مجموعة كاملة من المواد الرقمية المصممة لإطلاق أعمالك بحضور قوي واحترافي منذ اليوم الأول — موقع إلكتروني وصفحات سوشيال ميديا ومواد مطبوعة ومحتوى مرئي، كلها موحدة تحت علامتك التجارية. انطلق بثقة، واظهر باحترافية فورية.',
        highlights=[
            dict(title='متكامل في واحد', text='موقع + سوشيال + طباعة'),
            dict(title='علامة موحدة', text='متناسق عبر كل شيء'),
            dict(title='إطلاق سريع', text='جاهز خلال 2–3 أسابيع'),
        ],
        panel_hl='انطلق قوياً.\nانطلق بذكاء.\nانطلق الآن.',
        panel_points=[
            'الموقع والسوشيال ميديا والطباعة في حزمة واحدة',
            'هوية علامة تجارية موحدة عبر جميع نقاط التواصل',
            'إعداد صفحات السوشيال ميديا وتعليمها بالكامل',
            'قائمة رقمية أو كتيب أو بوستر إطلاق',
            'توقيع بريد إلكتروني وبطاقة أعمال رقمية',
        ],
        includes=['تصميم الموقع','إعداد صفحات السوشيال','تصميم بطاقة الأعمال','قائمة أو كتيب رقمي','مجموعة بوسترات الإطلاق','تصميم توقيع البريد','قائمة فحص الإطلاق'],
        steps=[
            dict(n='01', t='الإعداد',    d='جمع معلومات العلامة والأعمال'),
            dict(n='02', t='المواد',     d='إنشاء جميع المواد المرئية والرقمية'),
            dict(n='03', t='التهيئة',    d='تكوين المنصات والتكامل'),
            dict(n='04', t='المراجعة',   d='جلسة استعراض كاملة وموافقة العميل'),
            dict(n='05', t='الإطلاق',    d='أعمالك على الهواء، جاهزة للنمو'),
        ],
        tags=['حزمة كاملة','صفحات سوشيال','موقع إلكتروني','مواد مطبوعة','تسليم سريع'],
    ),
    dict(
        id='social', img='social', num='05', label='خدمة إبداعية',
        title='تصميم البوسترات\nومحتوى السوشيال',
        subtitle='تصاميم جذابة تُحيي علامتك التجارية',
        desc='تصاميم مخصصة لمنتجاتك وعروضك وفعالياتك ومحتوى السوشيال ميديا اليومي. تميّز في الفيدات المزدحمة بمرئيات مُصممة لتوقف التمرير وتوصل رسالتك وتحفز التفاعل الحقيقي — عبر إنستغرام وتيك توك وفيسبوك وكل منصة يستخدمها عملاؤك.',
        highlights=[
            dict(title='كل المنصات', text='إنستغرام وتيك توك والمزيد'),
            dict(title='جاهز للنشر', text='أبعاد وصيغ صحيحة'),
            dict(title='محتوى بهويتك', text='هوية بصرية متناسقة'),
        ],
        panel_hl='تصاميم\nتوقف\nالتمرير',
        panel_points=[
            'منشورات الفيد والقصص والريلز والأغلفة',
            'عروض وترويجات وإعلانات الفعاليات',
            'مرئيات بعلامتك تعبّر بشكل فوري',
            'نسخ جاهزة للطباعة كبوسترات ولافتات',
            'تسليم بجميع صيغ المنصات المطلوبة',
        ],
        includes=['منشورات فيد السوشيال','أغلفة القصص والريلز','بوسترات ترويجية','إعلانات الفعاليات','تصاميم العروض والتخفيضات','قوالب محتوى بعلامتك','نسخ جاهزة للطباعة'],
        steps=[
            dict(n='01', t='الإحاطة',  d='فهم العرض والنبرة والهدف'),
            dict(n='02', t='المفهوم',  d='الاتجاه المرئي ونهج التخطيط'),
            dict(n='03', t='التصميم',  d='مرئيات بعلامتك مُصممة للتحويل'),
            dict(n='04', t='المراجعة', d='تعديلات حتى تكون راضياً'),
            dict(n='05', t='التسليم',  d='الملفات النهائية بجميع الصيغ المطلوبة'),
        ],
        tags=['إنستغرام','فيسبوك','تيك توك','طباعة','قصص','عروض وترويجات'],
    ),
    dict(
        id='video', img='video', num='06', label='خدمة الفيديو',
        title='الفيديو الترويجي\nالمؤسسي',
        subtitle='احكِ قصتك بأسلوب مؤثر',
        desc='فيديوهات احترافية تعرض أعمالك وخدماتك وعلامتك التجارية بطريقة تجذب العملاء وتبني الثقة. من المفهوم حتى التسليم النهائي — جودة سينمائية وسرد قصصي مقنع، في كل مرة. يُنتج في دبي مع فريق احترافي كامل وما بعد الإنتاج.',
        highlights=[
            dict(title='إنتاج دبي', text='تصوير احترافي في الموقع'),
            dict(title='جودة سينمائية', text='تصحيح ألوان وتصميم صوت كامل'),
            dict(title='متعدد المنصات', text='جميع الدقات مُسلَّمة'),
        ],
        panel_hl='قصتك،\nمُروَاة\nسينمائياً',
        panel_points=[
            'تطوير المفهوم والإحاطة الإبداعية',
            'تصوير احترافي في الموقع بدبي',
            'ما بعد إنتاج كامل: مونتاج وألوان وصوت',
            'موشن غرافيك وعناوين وتراكبات العلامة',
            'تسليم بجميع الدقات المطلوبة',
        ],
        includes=['تطوير المفهوم والسكريبت','تصوير احترافي','تحرير ما بعد الإنتاج','تصحيح الألوان وتصميم الصوت','موشن غرافيك وعناوين','صيغ متعددة للمنصات'],
        steps=[
            dict(n='01', t='المفهوم',      d='السكريبت واللوحة المصورة والإحاطة'),
            dict(n='02', t='ما قبل الإنتاج', d='الموقع والمواهب وجدولة التصوير'),
            dict(n='03', t='التصوير',       d='إنتاج احترافي في الموقع'),
            dict(n='04', t='المونتاج',       d='ما بعد الإنتاج والألوان والصوت'),
            dict(n='05', t='التسليم',        d='الفيديو النهائي بجميع الدقات'),
        ],
        tags=['عرض الشركة','إبراز الخدمات','فيلم المنتج','قصة العلامة','إنتاج دبي'],
    ),
    dict(
        id='ugc', img='ugc', num='07', label='خدمة الفيديو',
        title='مقاطع الفيديو\nالقصيرة UGC',
        subtitle='أشخاص حقيقيون. محتوى حقيقي. نتائج حقيقية.',
        desc='فيديوهات قصيرة أصيلة تجعل أعمالك تبرز وتتواصل مع العملاء الحقيقيين. مُصممة للريلز وتيك توك — جاهزة للنشر ومبنية لتنمية التفاعل بشكل طبيعي. الصيغة الأكثر ثقة في التسويق الرقمي الحديث، مُنتجة باحترافية لعلامتك.',
        highlights=[
            dict(title='ريلز وتيك توك', text='صيغ محسّنة للمنصات'),
            dict(title='أشخاص أصيلون', text='محتوى حقيقي وموثوق'),
            dict(title='تسليم سريع', text='جاهز للنشر بسرعة'),
        ],
        panel_hl='محتوى أصيل\nيُحوّل\nالمشاهدين',
        panel_points=[
            'سكريبت مكتوب لتقديم طبيعي وأصيل',
            'تصوير في موقعك أو في استوديونا',
            'مونتاج احترافي وتصحيح ألوان ومقاطع صوتية',
            'محسّن للريلز وتيك توك ويوتيوب شورتس',
            'ملفات جاهزة للنشر على جميع المنصات',
        ],
        includes=['السكريبت واللوحة المصورة','تصوير في الموقع أو الاستوديو','مونتاج وتصحيح ألوان احترافي','مقاطع صوتية وترجمة','صيغ محسّنة للمنصات','تسليم جاهز للنشر'],
        steps=[
            dict(n='01', t='الإحاطة',   d='المفهوم والرسائل والجمهور المستهدف'),
            dict(n='02', t='السكريبت',  d='سكريبت طبيعي وأصيل مكتوب'),
            dict(n='03', t='التصوير',   d='مُصوَّر في موقعك أو الاستوديو'),
            dict(n='04', t='المونتاج',  d='مُعدَّل، مُصحَّح الألوان، مُترجَم'),
            dict(n='05', t='التسليم',   d='ملفات جاهزة للنشر، جميع المنصات'),
        ],
        tags=['ريلز','تيك توك','يوتيوب شورتس','محتوى أصيل','تفاعل عالي'],
    ),
]

GOLD  = '#C8980A'
FONTS = None  # resolved at build time via get_embedded_fonts()


# ─── Build print HTML (A4 pages) ──────────────────────────────────
def build_print():
    global FONTS
    if FONTS is None:
        FONTS = get_embedded_fonts()

    def inc_item(text):
        return (f'<div class="inc-item">'
                f'<span class="inc-dot">&#9668;</span>'
                f'<span>{text}</span></div>')

    def step_card(n, t, d):
        return (f'<div class="step">'
                f'<div class="step-n">الخطوة {n}</div>'
                f'<div class="step-t">{t}</div>'
                f'<div class="step-d">{d}</div>'
                f'</div>')

    def tag_pill(t):
        return f'<span class="tag">{t}</span>'

    def hl_item(title, text):
        return (f'<div class="hl-item">'
                f'<div class="hl-title">{title}</div>'
                f'<div class="hl-text">{text}</div>'
                f'</div>')

    def panel_point(text):
        return (f'<div class="panel-item">'
                f'<div class="panel-bullet"></div>'
                f'<div class="panel-item-text">{text}</div>'
                f'</div>')

    def svc_page(s, pg_num):
        title_html      = s['title'].replace('\n', '<br>')
        includes_html   = ''.join(inc_item(f) for f in s['includes'])
        steps_html      = ''.join(step_card(st['n'], st['t'], st['d']) for st in s['steps'])
        tags_html       = ''.join(tag_pill(t) for t in s['tags'])
        highlights_html = ''.join(hl_item(h['title'], h['text']) for h in s['highlights'])
        panel_html      = ''.join(panel_point(p) for p in s['panel_points'])
        panel_hl_html   = s['panel_hl'].replace('\n', '<br>')

        return f'''
<div class="pg pg-svc">
  <div class="pg-hdr">
    <span class="pg-hdr-l">MDA — ماستر ديجيتال إيجنسي</span>
    <span class="pg-hdr-r">علامة تجارية من DREXONYX &nbsp;·&nbsp; كاتالوج الخدمات 2026</span>
  </div>
  <div class="pg-hdr-rule"></div>
  <div class="pg-body">
    <div class="pg-left">
      <div class="lft-a">
        <div class="svc-label">{s['label']} &nbsp;/&nbsp; {s['num']}</div>
        <div class="svc-label-rule"></div>
        <div class="svc-accent"></div>
        <h2 class="svc-title">{title_html}</h2>
        <p class="svc-sub">{s['subtitle']}</p>
        <div class="svc-rule"></div>
        <p class="svc-desc">{s['desc']}</p>
        <div class="highlights">{highlights_html}</div>
      </div>
      <div class="lft-b">
        <div class="sect-head">ما يشمله</div>
        <div class="sect-sub-div"></div>
        <div class="inc-grid">{includes_html}</div>
        <div class="sect-gap"></div>
        <div class="sect-head">آلية العمل</div>
        <div class="sect-sub-div"></div>
        <div class="steps-row">{steps_html}</div>
      </div>
      <div class="lft-c">
        <div class="tags-row">{tags_html}</div>
      </div>
    </div>
    <div class="pg-right">
      <div class="svc-panel">
        <div class="panel-ghost">{s['num']}</div>
        <div class="panel-bar"></div>
        <div class="panel-cat">{s['label']}</div>
        <div class="panel-hl">{panel_hl_html}</div>
        <div class="panel-div"></div>
        <div class="panel-list">{panel_html}</div>
        <div class="panel-foot">
          <div class="panel-foot-text">MDA — ماستر ديجيتال إيجنسي</div>
        </div>
      </div>
    </div>
  </div>
  <div class="pg-footer">
    <span class="ft-brand">DREXONYX × MDA</span>
    <span class="ft-doc">كاتالوج الخدمات — سري</span>
    <span class="ft-num">{pg_num:02d}</span>
  </div>
</div>'''

    cover_pg = f'''
<div class="pg pg-cover">
  <img src="{IMG_DIR}/cover.jpg" class="cv-img" alt="MDA">
  <div class="cv-overlay"></div>
  <div class="cv-body">
    <div class="cv-top-label">MDA / ماستر ديجيتال إيجنسي</div>
    <div class="cv-main">
      <h1 class="cv-title">خدمات<br><span class="cv-gold">إطلاق</span><br>الأعمال</h1>
      <div class="cv-rule"></div>
      <p class="cv-sub">من البروفايل الشركاتي إلى الفيديو المؤسسي —<br>كل ما تحتاجه لإطلاق أعمالك ونموها.</p>
      <div class="cv-services">
        {''.join(f"""<div class="cv-svc-row"><span class="cv-svc-num">{s['num']}</span><span class="cv-svc-dot-sm"></span><span class="cv-svc-name">{s['title'].replace(chr(10),' ')}</span></div>""" for s in SERVICES)}
      </div>
    </div>
    <div class="cv-foot">
      <div class="cv-contacts">
        <span>www.drexonyx.com</span><span class="cv-dot">·</span>
        <span>info@drexonyx.com</span><span class="cv-dot">·</span>
        <span>دبي، الإمارات العربية المتحدة</span>
      </div>
      <div class="cv-brand-line">MDA علامة تجارية من DREXONYX · أفكار تُحدث أثراً</div>
    </div>
  </div>
</div>'''

    contact_pg = f'''
<div class="pg pg-contact">
  <div class="ct-hdr">
    <span class="ct-hdr-l">MDA — ماستر ديجيتال إيجنسي</span>
    <span class="ct-hdr-r">علامة تجارية من DREXONYX · كاتالوج الخدمات 2026</span>
  </div>
  <div class="ct-cols">
    <div class="ct-left">
      <div class="ct-ghost">MDA</div>
      <div class="ct-left-top">
        <div class="ct-eyebrow">تواصل معنا</div>
        <h2 class="ct-title">لنعمل<br><em>معاً.</em></h2>
        <div class="ct-gold-rule"></div>
        <p class="ct-tagline">من البروفايل الشركاتي إلى الفيديو المؤسسي —<br>كل ما تحتاجه لإطلاق أعمالك ونموها.</p>
      </div>
      <div class="ct-svc-list">
        <div class="ct-svc-row"><span class="ct-svc-num">01</span><span class="ct-svc-dot"></span><span class="ct-svc-name">تصميم البروفايل الشركاتي</span></div>
        <div class="ct-svc-row"><span class="ct-svc-num">02</span><span class="ct-svc-dot"></span><span class="ct-svc-name">تصميم المواقع الإلكترونية</span></div>
        <div class="ct-svc-row"><span class="ct-svc-num">03</span><span class="ct-svc-dot"></span><span class="ct-svc-name">حزمة الهوية التجارية</span></div>
        <div class="ct-svc-row"><span class="ct-svc-num">04</span><span class="ct-svc-dot"></span><span class="ct-svc-name">حزمة الإطلاق الرقمي</span></div>
        <div class="ct-svc-row"><span class="ct-svc-num">05</span><span class="ct-svc-dot"></span><span class="ct-svc-name">تصميم البوسترات ومحتوى السوشيال</span></div>
        <div class="ct-svc-row"><span class="ct-svc-num">06</span><span class="ct-svc-dot"></span><span class="ct-svc-name">الفيديو الترويجي المؤسسي</span></div>
        <div class="ct-svc-row"><span class="ct-svc-num">07</span><span class="ct-svc-dot"></span><span class="ct-svc-name">مقاطع الفيديو القصيرة UGC</span></div>
      </div>
      <div class="ct-brand-row">
        <div class="ct-brand-name">DREXONYX</div>
        <div class="ct-brand-right">
          <div class="ct-brand-sub">MDA علامة تجارية من DREXONYX</div>
          <div class="ct-brand-tagline">أفكار تُحدث أثراً</div>
        </div>
      </div>
    </div>
    <div class="ct-right">
      <div class="ct-panel">
        <div class="ct-panel-ghost">09</div>
        <div class="panel-bar"></div>
        <div class="ct-panel-cat">تواصل معنا</div>
        <div class="ct-panel-hl">ابدأ مشروعك<br>اليوم.</div>
        <div class="panel-div"></div>
        <div class="ct-cards">
          <div class="ct-crd">
            <div class="ct-crd-label">الموقع الإلكتروني</div>
            <div class="ct-crd-val">www.drexonyx.com</div>
          </div>
          <div class="ct-crd">
            <div class="ct-crd-label">البريد الإلكتروني</div>
            <div class="ct-crd-val">info@drexonyx.com</div>
          </div>
          <div class="ct-crd">
            <div class="ct-crd-label">الموقع</div>
            <div class="ct-crd-val">دبي،<br>الإمارات العربية المتحدة</div>
          </div>
          <div class="ct-crd">
            <div class="ct-crd-label">ساعات العمل</div>
            <div class="ct-crd-val">الأحد – الخميس<br>9 صباحاً – 6 مساءً (توقيت الخليج)</div>
          </div>
        </div>
        <div class="ct-panel-foot">
          <div class="panel-foot-text">MDA — ماستر ديجيتال إيجنسي</div>
        </div>
      </div>
    </div>
  </div>
</div>'''

    service_pages = ''.join(svc_page(s, i + 2) for i, s in enumerate(SERVICES))

    html = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>MDA — ماستر ديجيتال إيجنسي | كاتالوج الخدمات</title>
{FONTS}
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
body{{
  font-family:Cairo,sans-serif;background:#111;color:#fff;
  direction:rtl;text-align:right;
}}

/* ─── A4 BASE ─── */
.pg{{
  width:210mm;height:297mm;
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;
  flex-shrink:0;
}}
@page{{size:210mm 297mm;margin:0;}}

/* ══ COVER ══ */
.pg-cover{{position:relative;display:block;}}
.cv-img{{
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center top;
}}
.cv-overlay{{
  position:absolute;inset:0;
  background:
    linear-gradient(to left,
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
  direction:rtl;text-align:right;
}}
.cv-top-label{{
  font-family:Cairo,sans-serif;font-size:7pt;font-weight:500;
  color:rgba(200,152,10,0.7);letter-spacing:0;text-transform:uppercase;
}}
.cv-main{{display:flex;flex-direction:column;}}
.cv-title{{
  font-family:Cairo,sans-serif;font-size:22pt;font-weight:300;
  color:rgba(255,255,255,0.88);line-height:1.15;
  margin-top:6mm;margin-bottom:5mm;
  text-shadow:0 2px 12px rgba(0,0,0,0.9),0 0 30px rgba(0,0,0,0.8);
}}
.cv-gold{{
  color:{GOLD};font-size:58pt;font-weight:700;
  display:block;line-height:0.95;margin-block:1mm;
  text-shadow:0 2px 16px rgba(0,0,0,0.95),0 0 40px rgba(200,152,10,0.25);
}}
.cv-rule{{
  width:22mm;height:1pt;
  background:linear-gradient(270deg,{GOLD},transparent);
  margin-bottom:4.5mm;
}}
.cv-sub{{
  font-family:Cairo,sans-serif;font-size:10pt;
  color:rgba(255,255,255,0.72);line-height:1.7;
  max-width:100mm;margin-bottom:7mm;
  text-shadow:0 1px 6px rgba(0,0,0,0.9);
}}
.cv-services{{display:flex;flex-direction:column;gap:0;}}
.cv-svc-row{{
  display:flex;align-items:center;gap:3mm;
  flex-direction:row;
  padding:3mm 0;
  border-bottom:0.3pt solid rgba(200,152,10,0.12);
}}
.cv-svc-row:first-child{{border-top:0.3pt solid rgba(200,152,10,0.12);}}
.cv-svc-num{{
  font-family:Cairo,sans-serif;font-size:7pt;font-weight:700;
  color:{GOLD};letter-spacing:0;
  width:6mm;flex-shrink:0;text-align:center;
}}
.cv-svc-dot-sm{{
  width:3pt;height:3pt;background:rgba(200,152,10,0.35);
  border-radius:50%;flex-shrink:0;
}}
.cv-svc-name{{
  font-family:Cairo,sans-serif;font-size:9pt;
  color:rgba(255,255,255,0.85);
  text-shadow:0 1px 5px rgba(0,0,0,0.9);
  flex:1;text-align:right;
}}
.cv-foot{{}}
.cv-contacts{{
  font-family:Cairo,sans-serif;font-size:8pt;
  color:rgba(255,255,255,0.55);
  display:flex;gap:4mm;align-items:center;justify-content:flex-end;
}}
.cv-dot{{color:rgba(200,152,10,0.4);}}
.cv-brand-line{{
  font-family:Cairo,sans-serif;font-size:6pt;
  color:rgba(200,152,10,0.5);letter-spacing:0;
  margin-top:3mm;
}}

/* ══ SERVICE PAGES ══ */
.pg-svc{{background:#0a0a0a;}}
.pg-hdr{{
  display:flex;justify-content:space-between;align-items:center;
  padding:4mm 14mm;
  border-bottom:0.4pt solid rgba(200,152,10,0.15);
  flex-shrink:0;
}}
.pg-hdr-l{{
  font-family:Cairo,sans-serif;font-size:6.5pt;font-weight:600;
  color:rgba(200,152,10,0.7);letter-spacing:0;
}}
.pg-hdr-r{{
  font-family:Cairo,sans-serif;font-size:6.5pt;
  color:rgba(255,255,255,0.35);letter-spacing:0;
}}
.pg-hdr-rule{{
  height:0.5pt;background:linear-gradient(270deg,{GOLD} 0%,rgba(200,152,10,0.3) 40%,transparent 100%);
  flex-shrink:0;
}}
.pg-body{{
  flex:1;display:flex;overflow:hidden;
}}
.pg-left{{
  flex:1;display:flex;flex-direction:column;justify-content:space-between;
  padding:8mm 14mm 8mm 12mm;overflow:hidden;
}}
/* Block A: service title + highlights */
.lft-a{{flex-shrink:0;}}
.svc-label{{
  font-family:Cairo,sans-serif;font-size:6.5pt;font-weight:700;
  color:rgba(200,152,10,0.75);letter-spacing:0;text-transform:uppercase;
  margin-bottom:2mm;
}}
.svc-label-rule{{
  height:0.4pt;background:rgba(200,152,10,0.2);margin-bottom:3mm;
}}
.svc-accent{{
  width:10mm;height:2pt;background:{GOLD};margin-bottom:4mm;margin-right:auto;
}}
.svc-title{{
  font-family:Cairo,sans-serif;font-size:22pt;font-weight:700;
  color:#fff;line-height:1.25;margin-bottom:2mm;
}}
.svc-sub{{
  font-family:Cairo,sans-serif;font-size:9pt;font-style:italic;
  color:{GOLD};font-weight:400;margin-bottom:3.5mm;
}}
.svc-rule{{
  width:40mm;height:1pt;
  background:linear-gradient(270deg,{GOLD},transparent);
  margin-bottom:3.5mm;margin-right:auto;
}}
.svc-desc{{
  font-family:Cairo,sans-serif;font-size:8pt;
  color:rgba(255,255,255,0.70);line-height:1.75;
  margin-bottom:4mm;
}}
.highlights{{display:flex;gap:3mm;flex-direction:row-reverse;}}
.hl-item{{
  flex:1;padding:3mm 3.5mm;
  background:rgba(200,152,10,0.05);
  border:0.4pt solid rgba(200,152,10,0.18);
  border-top:1.5pt solid rgba(200,152,10,0.6);
}}
.hl-title{{
  font-family:Cairo,sans-serif;font-size:7.5pt;font-weight:700;
  color:#fff;margin-bottom:1.5mm;
}}
.hl-text{{
  font-family:Cairo,sans-serif;font-size:6.5pt;
  color:rgba(200,152,10,0.75);
}}
/* Block B */
.lft-b{{flex-shrink:0;}}
.sect-div{{
  height:0.4pt;
  background:linear-gradient(270deg,rgba(200,152,10,0.4),rgba(200,152,10,0.1) 60%,transparent);
  margin-bottom:4mm;
}}
.sect-sub-div{{
  height:0.3pt;background:rgba(200,152,10,0.15);margin-bottom:3mm;
}}
.sect-gap{{height:3.5mm;flex-shrink:0;}}
.sect-head{{
  font-family:Cairo,sans-serif;font-size:6.5pt;font-weight:700;
  color:rgba(200,152,10,0.80);letter-spacing:0;text-transform:uppercase;
  margin-bottom:2mm;
}}
.inc-grid{{
  display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 5mm;
  margin-bottom:3mm;
}}
.inc-item{{
  display:flex;gap:2.5mm;align-items:flex-start;
  flex-direction:row-reverse;
}}
.inc-dot{{
  color:{GOLD};font-size:5pt;margin-top:2.5pt;flex-shrink:0;
}}
.inc-item span:last-child{{
  font-family:Cairo,sans-serif;font-size:7.5pt;
  color:rgba(255,255,255,0.75);line-height:1.45;
}}
.steps-row{{display:flex;gap:2.5mm;flex-direction:row-reverse;}}
.step{{
  flex:1;padding:2.5mm 3mm;
  background:rgba(200,152,10,0.04);
  border:0.4pt solid rgba(200,152,10,0.15);
}}
.step-n{{
  font-family:Cairo,sans-serif;font-size:5.5pt;
  color:rgba(200,152,10,0.55);letter-spacing:0;margin-bottom:1.5mm;
}}
.step-t{{
  font-family:Cairo,sans-serif;font-size:8.5pt;font-weight:700;
  color:#fff;margin-bottom:1.5mm;
}}
.step-d{{
  font-family:Cairo,sans-serif;font-size:6.5pt;
  color:rgba(255,255,255,0.50);line-height:1.45;
}}
/* Block C */
.lft-c{{flex-shrink:0;}}
.tags-row{{display:flex;gap:2mm;flex-wrap:wrap;flex-direction:row-reverse;}}
.tag{{
  font-family:Cairo,sans-serif;font-size:6pt;
  color:rgba(200,152,10,0.85);padding:1.8mm 3.5mm;
  border:0.5pt solid rgba(200,152,10,0.3);
}}

/* Right panel (dark editorial) */
.pg-right{{width:72mm;flex-shrink:0;}}
.svc-panel{{
  width:72mm;height:100%;
  background:linear-gradient(155deg,#0d0d0d 0%,#181108 60%,#0f0c04 100%);
  display:flex;flex-direction:column;padding:8mm 7mm;
  position:relative;overflow:hidden;
  direction:rtl;text-align:right;
}}
.panel-ghost{{
  position:absolute;bottom:-10mm;left:-5mm;
  font-family:Cairo,sans-serif;font-size:110pt;font-weight:700;
  color:rgba(200,152,10,0.055);line-height:1;
  pointer-events:none;user-select:none;
}}
.panel-bar{{width:12mm;height:2pt;background:{GOLD};margin-bottom:5.5mm;flex-shrink:0;margin-right:auto;}}
.panel-cat{{
  font-family:Cairo,sans-serif;font-size:6pt;font-weight:700;
  letter-spacing:0;color:rgba(200,152,10,0.80);text-transform:uppercase;
  margin-bottom:4.5mm;flex-shrink:0;
}}
.panel-hl{{
  font-family:Cairo,sans-serif;font-size:17pt;font-weight:700;
  color:#fff;line-height:1.35;margin-bottom:5mm;flex-shrink:0;
}}
.panel-div{{height:0.5pt;background:rgba(200,152,10,0.2);margin-bottom:5mm;flex-shrink:0;}}
.panel-list{{flex:1;display:flex;flex-direction:column;gap:3mm;}}
.panel-item{{display:flex;align-items:flex-start;gap:3mm;flex-direction:row-reverse;}}
.panel-bullet{{width:3.5pt;height:3.5pt;background:{GOLD};border-radius:50%;margin-top:3.5pt;flex-shrink:0;}}
.panel-item-text{{font-family:Cairo,sans-serif;font-size:7.5pt;color:rgba(255,255,255,0.80);line-height:1.6;}}
.panel-foot{{border-top:0.5pt solid rgba(200,152,10,0.2);padding-top:3.5mm;margin-top:4mm;flex-shrink:0;}}
.panel-foot-text{{font-family:Cairo,sans-serif;font-size:5.5pt;color:rgba(200,152,10,0.60);letter-spacing:0;}}

/* Footer strip */
.pg-footer{{
  display:flex;justify-content:space-between;align-items:center;
  padding:3mm 14mm;
  border-top:0.4pt solid rgba(200,152,10,0.12);
  flex-shrink:0;
  flex-direction:row-reverse;
}}
.ft-brand{{font-family:Cairo,sans-serif;font-size:6pt;font-weight:700;color:rgba(200,152,10,0.5);letter-spacing:0;}}
.ft-doc{{font-family:Cairo,sans-serif;font-size:6pt;color:rgba(255,255,255,0.25);}}
.ft-num{{font-family:Cairo,sans-serif;font-size:8pt;color:rgba(200,152,10,0.4);}}

/* ══ CONTACT PAGE ══ */
.pg-contact{{
  background:linear-gradient(155deg,#0d0d0d 0%,#181108 60%,#0f0c04 100%);
  display:flex;flex-direction:column;
  direction:rtl;
}}
.ct-hdr{{
  display:flex;justify-content:space-between;align-items:baseline;
  padding:8mm 18mm 5mm;
  border-bottom:0.4pt solid rgba(200,152,10,0.15);
  flex-shrink:0;
  flex-direction:row-reverse;
}}
.ct-hdr-l{{
  font-family:Cairo,sans-serif;font-size:6.5pt;font-weight:700;
  color:rgba(200,152,10,0.6);letter-spacing:0;
}}
.ct-hdr-r{{
  font-family:Cairo,sans-serif;font-size:6.5pt;
  color:rgba(255,255,255,0.50);letter-spacing:0;
}}
.ct-cols{{flex:1;display:flex;overflow:hidden;flex-direction:row-reverse;}}
.ct-left{{
  flex:1;display:flex;flex-direction:column;justify-content:space-between;
  padding:14mm 18mm 12mm 8mm;
  position:relative;overflow:hidden;
}}
.ct-ghost{{
  position:absolute;left:-5mm;bottom:-10mm;
  font-family:Cairo,sans-serif;font-size:140pt;font-weight:700;
  color:rgba(200,152,10,0.05);line-height:1;
  pointer-events:none;user-select:none;
}}
.ct-left-top{{flex-shrink:0;}}
.ct-eyebrow{{
  font-family:Cairo,sans-serif;font-size:7.5pt;font-weight:600;
  color:rgba(200,152,10,0.90);letter-spacing:0;text-transform:uppercase;
  margin-bottom:5mm;
}}
.ct-title{{
  font-family:Cairo,sans-serif;font-size:44pt;font-weight:700;
  color:#fff;line-height:1.2;margin-bottom:5mm;
}}
.ct-title em{{color:{GOLD};font-style:italic;}}
.ct-gold-rule{{
  width:45mm;height:1.5pt;
  background:linear-gradient(270deg,{GOLD},transparent);
  margin-bottom:5mm;margin-right:auto;
}}
.ct-tagline{{
  font-family:Cairo,sans-serif;font-size:9.5pt;
  color:rgba(255,255,255,0.78);line-height:1.75;
}}
.ct-svc-list{{
  flex:1;display:flex;flex-direction:column;justify-content:space-evenly;
  padding:6mm 0;position:relative;z-index:1;
  border-top:0.4pt solid rgba(200,152,10,0.25);
  border-bottom:0.4pt solid rgba(200,152,10,0.25);
  margin:5mm 0;
}}
.ct-svc-row{{
  display:flex;align-items:center;gap:3mm;
  padding:1mm 0;flex-direction:row-reverse;
}}
.ct-svc-num{{
  font-family:Cairo,sans-serif;font-size:7pt;font-weight:700;
  color:{GOLD};letter-spacing:0;width:5mm;flex-shrink:0;text-align:center;
}}
.ct-svc-dot{{width:2.5pt;height:2.5pt;background:rgba(200,152,10,0.60);border-radius:50%;flex-shrink:0;}}
.ct-svc-name{{font-family:Cairo,sans-serif;font-size:9pt;color:rgba(255,255,255,0.85);flex:1;}}
.ct-brand-row{{
  display:flex;justify-content:space-between;align-items:flex-end;
  position:relative;z-index:1;
  border-top:0.4pt solid rgba(200,152,10,0.25);
  padding-top:4mm;flex-shrink:0;
  flex-direction:row-reverse;
}}
.ct-brand-name{{font-family:Cairo,sans-serif;font-size:18pt;font-weight:700;color:#fff;letter-spacing:0;}}
.ct-brand-right{{text-align:left;}}
.ct-brand-sub{{
  font-family:Cairo,sans-serif;font-size:6pt;
  color:rgba(200,152,10,0.70);letter-spacing:0;
  margin-bottom:2mm;
}}
.ct-brand-tagline{{font-family:Cairo,sans-serif;font-size:9pt;font-style:italic;color:rgba(255,255,255,0.55);}}
.ct-right{{width:90mm;flex-shrink:0;}}
.ct-panel{{
  width:90mm;height:100%;
  background:linear-gradient(155deg,#0e0e0e 0%,#181108 60%,#100c02 100%);
  display:flex;flex-direction:column;
  padding:12mm 9mm;
  position:relative;overflow:hidden;
  border-right:0.5pt solid rgba(200,152,10,0.20);
  direction:rtl;text-align:right;
}}
.ct-panel-ghost{{
  position:absolute;bottom:-12mm;left:-6mm;
  font-family:Cairo,sans-serif;font-size:120pt;font-weight:700;
  color:rgba(200,152,10,0.07);line-height:1;
  pointer-events:none;user-select:none;
}}
.ct-panel-cat{{
  font-family:Cairo,sans-serif;font-size:6pt;font-weight:700;
  letter-spacing:0;color:rgba(200,152,10,0.90);
  margin-bottom:4.5mm;flex-shrink:0;
}}
.ct-panel-hl{{
  font-family:Cairo,sans-serif;font-size:26pt;font-weight:700;
  color:#fff;line-height:1.3;margin-bottom:6mm;flex-shrink:0;
}}
.ct-cards{{flex:1;display:flex;flex-direction:column;gap:4mm;}}
.ct-crd{{
  flex:1;padding:3.5mm 4mm;
  background:rgba(255,255,255,0.05);
  border:0.5pt solid rgba(200,152,10,0.20);
  border-top:1.5pt solid rgba(200,152,10,0.65);
}}
.ct-crd-label{{
  font-family:Cairo,sans-serif;font-size:6pt;font-weight:700;
  color:rgba(200,152,10,0.85);letter-spacing:0;
  margin-bottom:2mm;
}}
.ct-crd-val{{
  font-family:Cairo,sans-serif;font-size:9.5pt;
  color:rgba(255,255,255,0.90);line-height:1.45;
  direction:ltr;text-align:right;
}}
.ct-panel-foot{{border-top:0.5pt solid rgba(200,152,10,0.25);padding-top:3.5mm;margin-top:5mm;flex-shrink:0;}}
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
  await page.goto('file://{PRINT_HTML}', {{waitUntil:'networkidle'}});
  await page.waitForTimeout(2000);
  await page.pdf({{
    path: '{PDF_PATH}',
    width: '210mm', height: '297mm',
    printBackground: true,
    margin: {{top:'0',right:'0',bottom:'0',left:'0'}},
  }});
  await browser.close();
  console.log('PDF done');
}})();
"""
    script_path = f'{SCRATCHPAD}/gen_pdf_ar.js'
    with open(script_path, 'w') as f:
        f.write(script)
    result = subprocess.run([NODE, script_path], capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print('PDF ERROR:', result.stderr)
        raise RuntimeError('PDF generation failed')
    print(f'PDF generated: {PDF_PATH}')


# ─── Rasterize for cross-viewer compatibility ──────────────────────
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
if __name__ == '__main__':
    print('\n=== Building MDA Service Catalog — Arabic ===\n')
    build_print()
    print('\nGenerating PDF...')
    generate_pdf()
    print('\nRasterizing for cross-viewer compatibility...')
    rasterize()
    print(f'\n✓ Done.\n  PDF:  {FINAL_PDF}')
