// DR 0120: Payment iframe intermediary — reads httpOnly cookie set by server action,
// validates the URL is from Ziina, then serves an iframe page.
// iframe embedding does NOT trigger Android App Links (only top-level navigations do),
// so the Ziina web checkout renders inside the browser instead of opening the Ziina app.
// JavaScript polls for same-origin navigation to detect success/cancel redirects.

import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = ['pay.ziina.com', 'pay-test.ziina.com'];

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

  // Escape for JS string literal (single-quoted)
  const jsUrl = payUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const jsOrigin = origin.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const html = `<!DOCTYPE html>
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
    #blocked{position:fixed;inset:0;display:none;flex-direction:column;align-items:center;
    justify-content:center;gap:16px;font-family:-apple-system,system-ui,sans-serif;
    color:#ccc;background:#0a0a0a;text-align:center;padding:1.5rem}
    #blocked.visible{display:flex}
    #blocked p{font-size:15px;max-width:320px}
    #blocked small{font-size:12px;color:#666;word-break:break-all;max-width:320px}
    #copy-btn{background:#7c5cfc;color:#fff;border:none;padding:12px 24px;
    border-radius:10px;font-size:15px;cursor:pointer;min-width:180px}
    #back-btn{background:transparent;color:#888;border:1px solid #333;padding:10px 20px;
    border-radius:10px;font-size:14px;cursor:pointer}
  </style>
</head>
<body>
  <div id="loading"><div class="spinner"></div><span>Loading payment…</span></div>
  <iframe id="pay-frame" src="${safeUrl}" allow="payment *" title="Secure Payment"></iframe>
  <div id="blocked">
    <p>The payment page could not be embedded.</p>
    <p>Copy the link below and paste it in your browser address bar:</p>
    <small id="url-text">${safeUrl}</small>
    <button id="copy-btn" onclick="copyUrl()">Copy Payment Link</button>
    <button id="back-btn" onclick="window.location.href='${origin}/portal/credits/buy'">← Go Back</button>
  </div>
  <script>
    var frame = document.getElementById('pay-frame');
    var loading = document.getElementById('loading');
    var blocked = document.getElementById('blocked');
    var base = '${jsOrigin}';
    var frameLoaded = false;

    frame.addEventListener('load', function() {
      frameLoaded = true;
      loading.classList.add('hidden');
      check();
    });

    // If iframe never fires load (blocked before load), show fallback after 8s
    setTimeout(function() {
      if (!frameLoaded) {
        loading.classList.add('hidden');
        blocked.classList.add('visible');
        frame.style.display = 'none';
      }
    }, 8000);

    function check() {
      try {
        var href = frame.contentWindow.location.href;
        if (href && href !== 'about:blank' && href.startsWith(base)) {
          window.location.replace(href);
        }
      } catch(e) {
        // Cross-origin — still on Ziina, expected
      }
    }

    // Poll for same-origin redirect (Ziina success/cancel redirects to our domain)
    setInterval(check, 400);

    function copyUrl() {
      var url = '${jsUrl}';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          document.getElementById('copy-btn').textContent = 'Copied!';
        }).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    }

    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = '${jsUrl}';
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); document.getElementById('copy-btn').textContent = 'Copied!'; } catch(e) {}
      document.body.removeChild(ta);
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
