// Rule-based intent classifier for Phase 1 (Architecture v2 §20 P1).
// No AI/LLM. Maps a validated intent_type string to the IntentType enum.
// Phase 2 replaces this with an AI-based classifier using typed structured output.

import type { IntentType } from './types';

const VALID_INTENT_TYPES: ReadonlySet<string> = new Set<IntentType>([
  'ROUTE_APPROVAL',
  'INSPECT_ASSET_METADATA',
  'OPTIMIZE_BRIEF_PROMPTS',
  'COORDINATE_BATCH_OPERATION',
  'COORDINATE_PRODUCTION_RUN',
  'COORDINATE_QC_REVIEW',
  'COORDINATE_FINANCIAL_MONITORING',
  'GENERATE_OPERATIONAL_REPORT',
  'GENERATE_INTELLIGENCE_REPORT',
  'COORDINATE_INTERNAL_NOTIFICATION',
  'HUNT_LEADS',
  'COORDINATE_WEBSITE_PRODUCTION',
  'AUDIT_WEBSITE_CONTENT',
  'COORDINATE_MARKETING_CAMPAIGN',  // DR 0124 — campaign + Facebook publish pipeline
  // DR 0128: Sales Operating System intents
  'DISCOVER_SALES_LEAD',
  'QUALIFY_SALES_LEAD',
  'DRAFT_SALES_OUTREACH',
  'SCHEDULE_SALES_FOLLOWUP',
]);

export function isValidIntentType(raw: string): raw is IntentType {
  return VALID_INTENT_TYPES.has(raw);
}

// Returns the IntentType if valid, or null if the input is unrecognized.
export function classifyIntent(raw: string): IntentType | null {
  const trimmed = raw.trim().toUpperCase();
  return isValidIntentType(trimmed) ? trimmed : null;
}
