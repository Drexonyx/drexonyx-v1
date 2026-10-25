// DR 0120: Payment page intermediary — reads httpOnly cookie set by server action,
// validates the URL is from Ziina, then serves either:
//   (a) an iframe page — if Ziina allows framing (App Links not triggered by iframes)
//   (b) a copy-link fallback — if Ziina blocks framing via X-Frame-Options
//
// Both paths keep the browser URL on drexonyx.com, so Android App Links
// (which only intercept top-level navigations to pay.ziina.com) are bypassed.

import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = ['pay.ziina.com', 'pay-test.ziina.com'];

async function ziinaPolicyAllowsIframe(url: string): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(t);
    const xfo = (resp.headers.get('x-frame-options') ?? '').toUpperCase().trim();
    const csp = resp.headers.get('content-security-policy') ?? '';
    if (xfo === 'DENY' || xfo === 'SAMEORIGIN') return false;
    if (/frame-ancestors\s+['"]?none['"]?/i.test(csp)) return false;
    return true;
  } catch {
    clearTimeout(t);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  const session = await auth();
  if (!session) {
    return NextResponse.redirect(`${origin}/portal/login`);
  }

  const cookieStore = await cookies();
  const payUrl = cookieStore.get('_drex_pay')?.value ?? '';
  cookieStore.delete('_drex_pay');

  let valid = false;
  try {
    valid = ALLOWED_HOSTS.includes(new URL(payUrl).hostname);
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.redirect(`${origin}/portal/credits/buy`);
  }

  // Escape for safe HTML attribute embedding
  const safeUrl = payUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Escape for JS single-quoted string literal
  const jsUrl = payUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const jsOrigin = origin.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const allowIframe = await ziinaPolicyAllowsIframe(payUrl);

  const html = allowIframe
    ? buildIframePage(safeUrl, jsUrl, jsOrigin)
    : buildFallbackPage(safeUrl, jsUrl, origin);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function buildIframePage(safeUrl: string, jsUrl: string, jsOrigin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment — Drexonyx</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#fff}
    #pay-frame{position:fixed;inset:0;width:100%;height:100%;border:none}
    #loading{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:12px;font-family:-apple-system,system-ui,sans-serif;
    color:#666;font-size:14px;background:#fff}
    #loading.hidden{display:none}
    .spinner{width:32px;height:32px;border:3px solid #e5e5e5;border-top-color:#7c5cfc;
    border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div id="loading"><div class="spinner"></div><span>Loading payment…</span></div>
  <iframe id="pay-frame" src="${safeUrl}" allow="payment *" title="Secure Payment"></iframe>
  <script>
    var frame = document.getElementById('pay-frame');
    var loading = document.getElementById('loading');
    var base = '${jsOrigin}';
    frame.addEventListener('load', function() {
      loading.classList.add('hidden');
      check();
    });
    function check() {
      try {
        var href = frame.contentWindow.location.href;
        if (href && href !== 'about:blank' && href.startsWith(base)) {
          window.location.replace(href);
        }
      } catch(e) {}
    }
    setInterval(check, 400);
  </script>
</body>
</html>`;
}

function buildFallbackPage(safeUrl: string, jsUrl: string, origin: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>اكمال الدفع — Drexonyx</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{min-height:100%;font-family:-apple-system,system-ui,sans-serif;
    background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;
    justify-content:center;padding:1.5rem}
    .card{background:#161616;border:1px solid #2a2a2a;border-radius:16px;
    padding:2rem 1.5rem;max-width:360px;width:100%;text-align:center;
    display:flex;flex-direction:column;gap:1.25rem}
    .icon{font-size:2.5rem;line-height:1}
    h1{font-size:1.15rem;font-weight:600;color:#fff}
    p{font-size:0.88rem;color:#999;line-height:1.65}
    .url-box{background:#0f0f0f;border:1px solid #2a2a2a;border-radius:8px;
    padding:10px 12px;font-size:0.68rem;color:#666;word-break:break-all;
    text-align:left;direction:ltr;user-select:all;cursor:text}
    .copy-btn{background:#7c5cfc;color:#fff;border:none;padding:14px 24px;
    border-radius:10px;font-size:1rem;cursor:pointer;width:100%;font-weight:500;
    transition:background .15s}
    .copy-btn:active{background:#6a4de0}
    .copy-btn.ok{background:#22c55e}
    .back-btn{background:transparent;color:#555;border:none;
    font-size:0.82rem;cursor:pointer;text-decoration:underline;padding:4px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>رابط الدفع جاهز</h1>
    <p>
      اضغط على <strong>نسخ الرابط</strong>، ثم الصقه في شريط العنوان بالمتصفح
      لإتمام عملية الدفع.
    </p>
    <div class="url-box" id="url-box">${safeUrl}</div>
    <button class="copy-btn" id="copy-btn" onclick="doCopy()">نسخ رابط الدفع</button>
    <button class="back-btn" onclick="history.back()">← رجوع</button>
  </div>
  <script>
    function doCopy() {
      var url = '${jsUrl}';
      var btn = document.getElementById('copy-btn');
      function ok() {
        btn.textContent = 'تم النسخ ✓';
        btn.classList.add('ok');
        setTimeout(function(){ btn.textContent = 'نسخ رابط الدفع'; btn.classList.remove('ok'); }, 3000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(ok).catch(legacy);
      } else { legacy(); }
      function legacy() {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); ok(); } catch(e) {}
        document.body.removeChild(ta);
      }
    }
  </script>
</body>
</html>`;
}
