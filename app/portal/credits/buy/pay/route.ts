// DR 0120: Payment redirect handler — reads httpOnly cookie set by server action,
// validates the URL is from Ziina, then redirects directly.
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
  } catch { valid = false; }
  if (!valid) {
    return NextResponse.redirect(`${origin}/portal/credits/buy`);
  }
  // Android App Links intercept all navigations to pay.ziina.com.
  // Strategy: open in new tab (_blank) which Chrome skips App Links for,
  // and append #web fragment to URL which may break App Links path matching.
  const safeUrl = JSON.stringify(payUrl);
  const safeUrlWithFragment = JSON.stringify(payUrl + '#web');
  const html = `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>صفحة الدفع</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;padding:24px;text-align:center}
  p{font-size:14px;color:#888}
  #btn{display:inline-block;padding:16px 40px;background:#fff;color:#000;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;cursor:pointer;border:none}
</style>
</head><body>
<p>اضغط الزر لإتمام الدفع</p>
<a id="btn" href="${payUrl}" target="_blank" rel="noopener noreferrer">اكمل الدفع</a>
<script>
(function(){
  // Auto-click the _blank link on page load (user-agent triggered via DOMContentLoaded).
  // _blank navigation in Chrome Android typically bypasses App Links.
  var btn = document.getElementById('btn');
  btn.addEventListener('click', function(e){
    e.preventDefault();
    var w = window.open(${safeUrl}, '_blank', 'noopener,noreferrer');
    if (!w) { window.location.replace(${safeUrlWithFragment}); }
  });
  // Auto-trigger after short delay so the page is visible first.
  setTimeout(function(){ btn.click(); }, 400);
})();
</script>
</body></html>`;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
