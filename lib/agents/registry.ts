// SPECIALIST_AGENT_REGISTRY — mirrors SKILL_REGISTRY pattern (DR 0072, DR 0108).
// Add entries only with explicit Owner approval + new/amended decision record.

import { delegateQcMetadata, type QcMetadataDelegationParams, type QcMetadataDelegationResult } from './qc-metadata-specialist';
import { delegatePromptOptimize, type PromptOptimizeDelegationParams, type PromptOptimizeDelegationResult } from './prompt-optimize-specialist';
import { delegateProductionRun, type ProductionRunDelegationParams, type ProductionRunDelegationResult } from './production-run-specialist';
import { delegateQcReview, type QcReviewDelegationParams, type QcReviewDelegationResult } from './qc-review-specialist';
import { delegateFinanceMonitoring, type FinanceMonitoringDelegationParams, type FinanceMonitoringDelegationResult } from './finance-monitoring-specialist';
import { delegateReporting, type ReportingDelegationParams, type ReportingDelegationResult } from './reporting-specialist';
import { delegateAnalytics, type AnalyticsDelegationParams, type AnalyticsDelegationResult } from './analytics-specialist';
import { delegateCommunication, type CommunicationDelegationParams, type CommunicationDelegationResult } from './communication-specialist';

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
  // DR 0116: Finance Monitoring Agent — B2 resolved (registry entry approved)
  [
    'finance-monitoring',
    {
      id: 'finance-monitoring',
      delegate: delegateFinanceMonitoring as (params: FinanceMonitoringDelegationParams) => Promise<FinanceMonitoringDelegationResult>,
    },
  ],
  // DR 0117: Reporting Agent — B2 resolved (registry entry approved)
  [
    'reporting',
    {
      id: 'reporting',
      delegate: delegateReporting as (params: ReportingDelegationParams) => Promise<ReportingDelegationResult>,
    },
  ],
  // DR 0118: Analytics Agent — B2 resolved (registry entry approved)
  [
    'analytics',
    {
      id: 'analytics',
      delegate: delegateAnalytics as (params: AnalyticsDelegationParams) => Promise<AnalyticsDelegationResult>,
    },
  ],
  // DR 0119: Communication Agent — B2 resolved (registry entry approved)
  [
    'communication',
    {
      id: 'communication',
      delegate: delegateCommunication as (params: CommunicationDelegationParams) => Promise<CommunicationDelegationResult>,
    },
  ],
]);
