import { NextResponse } from 'next/server';
import { makeClearCookieHeader } from '@/lib/admin/session';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', makeClearCookieHeader());
  return response;
}
