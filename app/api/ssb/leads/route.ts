// DR-0130: SSB lead capture endpoint — Node.js runtime (Drizzle ORM, not Edge-compatible).
// Called by the mda-sales bot after collecting prospect info in the /social-seller chat.
// C-4: Drizzle ORM cannot run in the Edge runtime; this endpoint must remain Node.js.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, ssbSchema } from '@/db';

export const runtime = 'nodejs';

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
