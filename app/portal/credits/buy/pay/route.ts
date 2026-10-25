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
  // JS redirect bypasses Android App Links (server-side 302 triggers the Ziina app).
  const html = `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تحويل للدفع</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;padding:24px}
  p{font-size:15px;color:#aaa;text-align:center}
  a{display:inline-block;padding:14px 32px;background:#fff;color:#000;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;text-align:center}
</style>
</head><body>
<p>جاري التحويل لصفحة الدفع…</p>
<a href="${payUrl}">افتح صفحة الدفع</a>
<script>window.location.replace(${JSON.stringify(payUrl)});</script>
</body></html>`;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
