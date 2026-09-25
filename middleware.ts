// Admin routes are served only from the dedicated admin deployment.
// Set ENABLE_ADMIN_ROUTES=true in the admin Vercel project; leave it unset on the public
// site. Any request to /admin/* or /api/admin/* without the flag returns 404 immediately,
// so the admin control surface is completely absent from the public deployment.
//
// next-auth is NOT imported here: next-auth/lib/index.js has a top-level
// `import { headers } from 'next/headers'` that crashes the Vercel Edge runtime
// at module load time with MIDDLEWARE_INVOCATION_FAILED. Portal JWT verification
// is handled server-side by auth.ts; the middleware only checks cookie presence
// for an early redirect, not cryptographic validity.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    process.env.ENABLE_ADMIN_ROUTES !== 'true'
  ) {
    return new NextResponse(null, { status: 404 });
  }

  if (pathname.startsWith('/portal') && pathname !== '/portal/login') {
    const hasSession =
      request.cookies.has('__Secure-authjs.session-token') ||
      request.cookies.has('authjs.session-token');
    if (!hasSession) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.href);
      return NextResponse.redirect(loginUrl);
    }
  }
}

export default proxy;

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*', '/api/admin/:path*'],
};
