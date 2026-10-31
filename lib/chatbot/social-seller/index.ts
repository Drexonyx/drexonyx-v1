// DR 0122: Social Seller Bot registry — imports all merchant configs and registers them.
// To add a new merchant: create a file in ./merchants/, then add one import + entry below.

import { registerClient } from '../clients';
import { buildSellerClient } from './builder';
import type { SocialSellerConfig } from './types';

// ── Merchant imports ──────────────────────────────────────────────────────────
import demoSalon from './merchants/demo-salon';

// ── Merchant list ─────────────────────────────────────────────────────────────
// Add each new merchant here. The slug in the config is used as the URL path.
const MERCHANTS: SocialSellerConfig[] = [
  demoSalon,
];

// ── Registration (runs once on module load) ───────────────────────────────────
for (const config of MERCHANTS) {
  registerClient(config.slug, buildSellerClient(config));
}

// Exported for the admin panel to read without re-building clients.
export { MERCHANTS };
export type { SocialSellerConfig } from './types';
