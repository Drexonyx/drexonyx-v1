// Admin routes are served only from the dedicated admin deployment.
// Set ENABLE_ADMIN_ROUTES=true in the admin Vercel project; leave it unset on the public
// site. Any request to /admin/* or /api/admin/* without the flag returns 404 immediately,
// so the admin control surface is completely absent from the public deployment.
//
// auth.config.ts (not auth.ts) is used here: auth.ts imports the DB client which uses
// postgres.js — a Node.js-only library that crashes the Vercel Edge runtime.

import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth(function middleware(request) {
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
