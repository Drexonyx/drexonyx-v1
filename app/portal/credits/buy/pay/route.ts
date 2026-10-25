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
  return NextResponse.redirect(payUrl);
}
