// SPECIALIST_AGENT_REGISTRY — mirrors SKILL_REGISTRY pattern (DR 0072, DR 0108).
// Add entries only with explicit Owner approval + new/amended decision record.

import { delegateQcMetadata, type QcMetadataDelegationParams, type QcMetadataDelegationResult } from './qc-metadata-specialist';
import { delegatePromptOptimize, type PromptOptimizeDelegationParams, type PromptOptimizeDelegationResult } from './prompt-optimize-specialist';
import { delegateProductionRun, type ProductionRunDelegationParams, type ProductionRunDelegationResult } from './production-run-specialist';
import { delegateQcReview, type QcReviewDelegationParams, type QcReviewDelegationResult } from './qc-review-specialist';

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
  [
    'prompt-optimize',
    {
      id: 'prompt-optimize',
      delegate: delegatePromptOptimize as (params: PromptOptimizeDelegationParams) => Promise<PromptOptimizeDelegationResult>,
    },
  ],
  // DR 0113: Production Agent — B2 resolved (registry entry approved)
  [
    'production-run',
    {
      id: 'production-run',
      delegate: delegateProductionRun as (params: ProductionRunDelegationParams) => Promise<ProductionRunDelegationResult>,
    },
  ],
  // DR 0114: QC Review Agent — B3 resolved (registry entry approved)
  [
    'qc-review',
    {
      id: 'qc-review',
      delegate: delegateQcReview as (params: QcReviewDelegationParams) => Promise<QcReviewDelegationResult>,
    },
  ],
]);
