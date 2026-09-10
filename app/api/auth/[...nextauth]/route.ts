import { type NextRequest } from 'next/server';
import { handlers } from '@/auth';

// TEMPORARY DIAGNOSTIC — remove after root cause identified (Phase 24)
export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  console.log(`[diag:auth] GET ${pathname}`);
  try {
    const res = await handlers.GET(req);
    console.log(`[diag:auth] GET ${pathname} → ${res.status}`);
    return res;
  } catch (err: unknown) {
    const name = err instanceof Error ? err.constructor.name : 'Unknown';
    console.error(`[diag:auth] GET threw: ${name}`);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  console.log(`[diag:auth] POST ${pathname}`);
  try {
    const res = await handlers.POST(req);
    console.log(`[diag:auth] POST ${pathname} → ${res.status}`);
    return res;
  } catch (err: unknown) {
    const name = err instanceof Error ? err.constructor.name : 'Unknown';
    console.error(`[diag:auth] POST threw: ${name}`);
    throw err;
  }
}
