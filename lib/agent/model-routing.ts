// DR 0084: Deterministic Model Routing.
// Every (provider, model) combination must be explicitly mapped.
// Unknown providers and unknown models fail closed — no guessing, no automatic routing.
// Sources: verified Higgsfield SDK model identifiers (DR 0077 §2.2, higgsfield.ts).

import type { AiProvider } from './providers/interface';
import { higgsFieldProvider } from './providers/higgsfield';

export interface ModelRoute {
  readonly provider: AiProvider;
  readonly providerName: string;
  readonly model: string;
}

// Explicit routing table: (providerName, model) → ModelRoute.
// Only explicitly approved (provider, model) pairs are permitted.
// Adding an entry here requires Owner approval and a new or amended DR.
const MODEL_ROUTING_TABLE: Readonly<Record<string, Readonly<Record<string, ModelRoute>>>> = {
  higgsfield: {
    'text2image/soul':   { provider: higgsFieldProvider, providerName: 'higgsfield', model: 'text2image/soul' },
    'image2video/dop':   { provider: higgsFieldProvider, providerName: 'higgsfield', model: 'image2video/dop' },
    'speak/higgsfield':  { provider: higgsFieldProvider, providerName: 'higgsfield', model: 'speak/higgsfield' },
  },
} as const;

// Returns the route for a given (providerName, model) pair, or null if not in the routing table.
// Callers must treat a null result as a terminal failure — do not guess or fall through.
export function resolveProviderForModel(providerName: string, model: string): ModelRoute | null {
  const providerRoutes = MODEL_ROUTING_TABLE[providerName];
  if (!providerRoutes) return null;
  return providerRoutes[model] ?? null;
}

// Returns all explicitly approved (providerName, model) pairs in a flat list.
// Used for testing and audit purposes.
export function listApprovedRoutes(): ReadonlyArray<{ providerName: string; model: string }> {
  const routes: Array<{ providerName: string; model: string }> = [];
  for (const [pName, models] of Object.entries(MODEL_ROUTING_TABLE)) {
    for (const mName of Object.keys(models)) {
      routes.push({ providerName: pName, model: mName });
    }
  }
  return routes;
}
