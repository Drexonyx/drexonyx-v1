// Admin routes are served only from the dedicated admin deployment.
// Set ENABLE_ADMIN_ROUTES=true in the admin Vercel project; leave it unset on the public
// site. Any request to /admin/* or /api/admin/* without the flag returns 404 immediately,
// so the admin control surface is completely absent from the public deployment.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth(function proxy(request) {
  const { pathname } = request.nextUrl;
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    process.env.ENABLE_ADMIN_ROUTES !== 'true'
  ) {
    return new NextResponse(null, { status: 404 });
  }
});

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*', '/api/admin/:path*'],
};
