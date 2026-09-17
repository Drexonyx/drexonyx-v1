import { describe, it, expect } from 'vitest';
import { classifyIntent, isValidIntentType } from '../intent';

describe('isValidIntentType', () => {
  it('returns true for each valid intent type', () => {
    expect(isValidIntentType('ROUTE_APPROVAL')).toBe(true);
    expect(isValidIntentType('INSPECT_ASSET_METADATA')).toBe(true);
    expect(isValidIntentType('OPTIMIZE_BRIEF_PROMPTS')).toBe(true);
    expect(isValidIntentType('COORDINATE_BATCH_OPERATION')).toBe(true);
    expect(isValidIntentType('COORDINATE_PRODUCTION_RUN')).toBe(true);
    expect(isValidIntentType('COORDINATE_QC_REVIEW')).toBe(true);
    expect(isValidIntentType('COORDINATE_FINANCIAL_MONITORING')).toBe(true);
    expect(isValidIntentType('GENERATE_OPERATIONAL_REPORT')).toBe(true);
    expect(isValidIntentType('GENERATE_INTELLIGENCE_REPORT')).toBe(true);
    expect(isValidIntentType('COORDINATE_INTERNAL_NOTIFICATION')).toBe(true);
    expect(isValidIntentType('HUNT_LEADS')).toBe(true);
    expect(isValidIntentType('COORDINATE_WEBSITE_PRODUCTION')).toBe(true);
    expect(isValidIntentType('AUDIT_WEBSITE_CONTENT')).toBe(true);
  });

  it('returns false for unknown strings', () => {
    expect(isValidIntentType('CREATE_CAMPAIGN')).toBe(false);
    expect(isValidIntentType('')).toBe(false);
    expect(isValidIntentType('route_approval')).toBe(false);
  });
});

describe('classifyIntent', () => {
  it('classifies exact uppercase matches', () => {
    expect(classifyIntent('ROUTE_APPROVAL')).toBe('ROUTE_APPROVAL');
    expect(classifyIntent('INSPECT_ASSET_METADATA')).toBe('INSPECT_ASSET_METADATA');
    expect(classifyIntent('OPTIMIZE_BRIEF_PROMPTS')).toBe('OPTIMIZE_BRIEF_PROMPTS');
    expect(classifyIntent('COORDINATE_BATCH_OPERATION')).toBe('COORDINATE_BATCH_OPERATION');
    expect(classifyIntent('COORDINATE_PRODUCTION_RUN')).toBe('COORDINATE_PRODUCTION_RUN');
    expect(classifyIntent('COORDINATE_QC_REVIEW')).toBe('COORDINATE_QC_REVIEW');
    expect(classifyIntent('COORDINATE_FINANCIAL_MONITORING')).toBe('COORDINATE_FINANCIAL_MONITORING');
    expect(classifyIntent('GENERATE_OPERATIONAL_REPORT')).toBe('GENERATE_OPERATIONAL_REPORT');
    expect(classifyIntent('GENERATE_INTELLIGENCE_REPORT')).toBe('GENERATE_INTELLIGENCE_REPORT');
    expect(classifyIntent('COORDINATE_INTERNAL_NOTIFICATION')).toBe('COORDINATE_INTERNAL_NOTIFICATION');
    expect(classifyIntent('HUNT_LEADS')).toBe('HUNT_LEADS');
    expect(classifyIntent('COORDINATE_WEBSITE_PRODUCTION')).toBe('COORDINATE_WEBSITE_PRODUCTION');
    expect(classifyIntent('AUDIT_WEBSITE_CONTENT')).toBe('AUDIT_WEBSITE_CONTENT');
  });

  it('classifies lowercase by normalizing to uppercase', () => {
    expect(classifyIntent('route_approval')).toBe('ROUTE_APPROVAL');
    expect(classifyIntent('optimize_brief_prompts')).toBe('OPTIMIZE_BRIEF_PROMPTS');
  });

  it('trims whitespace before classifying', () => {
    expect(classifyIntent('  ROUTE_APPROVAL  ')).toBe('ROUTE_APPROVAL');
  });

  it('returns null for unknown intent types', () => {
    expect(classifyIntent('CREATE_CAMPAIGN')).toBeNull();
    expect(classifyIntent('')).toBeNull();
    expect(classifyIntent('unknown')).toBeNull();
  });
});
