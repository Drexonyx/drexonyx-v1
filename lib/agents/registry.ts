// SPECIALIST_AGENT_REGISTRY — mirrors SKILL_REGISTRY pattern (DR 0072, DR 0108).
// Add entries only with explicit Owner approval + new/amended decision record.

import { delegateQcMetadata, type QcMetadataDelegationParams, type QcMetadataDelegationResult } from './qc-metadata-specialist';

// Each entry carries a typed delegate function. Callers must cast to the specific
// agent's signature after looking up by ID — the registry stores the canonical handle.
export interface SpecialistAgentEntry {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: (...args: any[]) => Promise<{ ok: boolean }>;
}

export const SPECIALIST_AGENT_REGISTRY: ReadonlyMap<string, SpecialistAgentEntry> = new Map([
  [
    'qc-metadata',
    {
      id: 'qc-metadata',
      delegate: delegateQcMetadata as (params: QcMetadataDelegationParams) => Promise<QcMetadataDelegationResult>,
    },
  ],
]);
