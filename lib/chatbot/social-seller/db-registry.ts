// DR-0130: Stage 6 — DB-backed dynamic client loader for provisioned SSB bots.
// Called from the chat Page (Node.js runtime). Falls back to DB when a slug is
// not in the static in-memory registry (e.g. after a server restart on Vercel).
// The Edge chatbot API route cannot use this directly — it relies on in-process
// memory populated by the Page loading the config first.

import { db, ssbSchema } from '@/db';
import { eq, and } from 'drizzle-orm';
import { getClient, registerClient } from '../clients';
import { buildSellerClient } from './builder';
import type { ChatbotClient } from '../clients';
import type { SocialSellerConfig } from './types';

export async function getOrLoadDynamicClient(slug: string): Promise<ChatbotClient | null> {
  // Fast path: already in memory
  const existing = getClient(slug);
  if (existing !== null) return existing;

  // Slow path: look up in ssb_bot_configs (delivered, active subscription)
  const rows = await db
    .select({
      config_json: ssbSchema.ssbBotConfigs.config_json,
      merchant_slug: ssbSchema.ssbBotConfigs.merchant_slug,
      qc_passed_at: ssbSchema.ssbBotConfigs.qc_passed_at,
      delivered_at: ssbSchema.ssbBotConfigs.delivered_at,
      active: ssbSchema.ssbSubscriptions.active,
    })
    .from(ssbSchema.ssbBotConfigs)
    .innerJoin(
      ssbSchema.ssbSubscriptions,
      eq(ssbSchema.ssbBotConfigs.subscription_id, ssbSchema.ssbSubscriptions.id),
    )
    .where(
      and(
        eq(ssbSchema.ssbBotConfigs.merchant_slug, slug),
        eq(ssbSchema.ssbSubscriptions.active, true),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  if (!row.qc_passed_at || !row.delivered_at) return null; // not yet provisioned

  const config = row.config_json as SocialSellerConfig;
  const client = buildSellerClient(config);
  registerClient(slug, client); // warm in-memory for this process instance
  return client;
}
