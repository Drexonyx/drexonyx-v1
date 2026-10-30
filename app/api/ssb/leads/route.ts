// DR-0130: SSB lead capture endpoint — Node.js runtime (Drizzle ORM, not Edge-compatible).
// Called by the mda-sales bot after collecting prospect info in the /social-seller chat.
// C-4: Drizzle ORM cannot run in the Edge runtime; this endpoint must remain Node.js.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, ssbSchema } from '@/db';

export const runtime = 'nodejs';

// In-memory rate limiter: max 5 lead submissions per IP per hour.
const ipSubmissions = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = ipSubmissions.get(ip);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    ipSubmissions.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (rec.count >= RATE_LIMIT) return true;
  rec.count++;
  return false;
}

interface LeadPayload {
  businessName: string;
  businessType?: string;
  platform?: string;
  contactWhatsapp: string;
  workingHours?: string;
  services?: string;
  sourceBot?: string;
  sourceUrl?: string;
}

function isValidPayload(body: unknown): body is LeadPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.businessName === 'string' && b.businessName.trim().length > 0
    && typeof b.contactWhatsapp === 'string' && b.contactWhatsapp.trim().length > 0;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: 'businessName and contactWhatsapp are required' },
      { status: 400 },
    );
  }

  try {
    const [lead] = await db
      .insert(ssbSchema.ssbLeads)
      .values({
        business_name: body.businessName.trim(),
        business_type: body.businessType?.trim() ?? null,
        platform: body.platform?.trim() ?? null,
        contact_whatsapp: body.contactWhatsapp.trim(),
        working_hours: body.workingHours?.trim() ?? null,
        services: body.services?.trim() ?? null,
        source_bot: body.sourceBot ?? 'mda-sales',
        source_url: body.sourceUrl?.trim() ?? null,
      })
      .returning({ id: ssbSchema.ssbLeads.id });

    return NextResponse.json({ id: lead.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[SSB leads] insert error:', msg);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}
