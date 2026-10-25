// DR 0120: Payment redirect intermediary — reads httpOnly cookie set by server action,
// validates the URL is from Ziina, then serves a meta-refresh page.
// Meta-refresh navigation does not trigger Android App Links interception,
// so the Ziina web checkout opens in the browser instead of the Ziina app.

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting to Payment…</title>
  <meta http-equiv="refresh" content="0; url=${safeUrl}">
  <style>
    body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;
    justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#ccc;
    text-align:center;padding:1.5rem}
  </style>
</head>
<body>
  <p>Redirecting to secure payment page…</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
