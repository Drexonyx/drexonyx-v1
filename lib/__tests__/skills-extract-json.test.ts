import { describe, it, expect } from 'vitest';
import { extractJson } from '../skills/ai/extract-json';

describe('extractJson', () => {
  // ── Strategy 1: direct JSON.parse ──────────────────────────────────────────

  it('parses a plain JSON object', () => {
    const result = extractJson('{"foo":"bar","n":1}');
    expect(result).toEqual({ foo: 'bar', n: 1 });
  });

  it('parses a plain JSON array', () => {
    const result = extractJson('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('parses JSON with leading/trailing whitespace', () => {
    const result = extractJson('  \n{"key":"value"}\n  ');
    expect(result).toEqual({ key: 'value' });
  });

  // ── Strategy 2: markdown code fences ───────────────────────────────────────

  it('extracts JSON from ```json fence', () => {
    const text = '```json\n{"campaignName":"Test","campaignObjective":"Promote"}\n```';
    const result = extractJson(text);
    expect(result).toEqual({ campaignName: 'Test', campaignObjective: 'Promote' });
  });

  it('extracts JSON from plain ``` fence', () => {
    const text = '```\n{"verdict":"PASS","score":90}\n```';
    const result = extractJson(text);
    expect(result).toEqual({ verdict: 'PASS', score: 90 });
  });

  it('extracts JSON from fence without surrounding newlines', () => {
    const text = '```json{"foo":"bar"}```';
    const result = extractJson(text);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('handles a fence with trailing whitespace after closing backticks', () => {
    const text = '```json\n{"a":1}\n```   ';
    const result = extractJson(text);
    expect(result).toEqual({ a: 1 });
  });

  // ── Strategy 3: brace extraction ───────────────────────────────────────────

  it('extracts JSON object embedded in prose', () => {
    const text = 'Here is your result:\n{"caption":"Hello world","alternatives":[]}\nLet me know if you need changes.';
    const result = extractJson(text);
    expect(result).toEqual({ caption: 'Hello world', alternatives: [] });
  });

  it('extracts JSON array embedded in prose', () => {
    const text = 'The angles are:\n["angle1","angle2"]';
    const result = extractJson(text);
    expect(result).toEqual(['angle1', 'angle2']);
  });

  // ── Invalid input ──────────────────────────────────────────────────────────

  it('returns null for plain prose with no JSON', () => {
    expect(extractJson('Here is your plan for the campaign.')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractJson('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(extractJson('   \n   ')).toBeNull();
  });

  it('returns null for truncated/malformed JSON', () => {
    expect(extractJson('{"foo": "bar"')).toBeNull();
  });

  it('returns null for a fence containing non-JSON', () => {
    const text = '```\nThis is just text.\n```';
    expect(extractJson(text)).toBeNull();
  });

  // ── Real-world model response patterns ─────────────────────────────────────

  it('handles typical Claude-style fenced response for brief parsing', () => {
    const text = [
      '```json',
      '{',
      '  "campaignName": "Video Course Launch",',
      '  "campaignObjective": "Promote video editing course",',
      '  "targetAudience": "freelancers",',
      '  "tone": "professional",',
      '  "pageTarget": "PAGE_1",',
      '  "placement": "feed",',
      '  "publishMode": "IMMEDIATE",',
      '  "scheduledAt": null',
      '}',
      '```',
    ].join('\n');
    const result = extractJson(text) as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result.campaignName).toBe('Video Course Launch');
    expect(result.publishMode).toBe('IMMEDIATE');
  });

  it('handles prose preamble followed by fenced JSON', () => {
    const text = [
      'Sure, here is the structured output:',
      '',
      '```json',
      '{"caption":"Ready to level up?","alternatives":["Join us today"]}',
      '```',
    ].join('\n');
    const result = extractJson(text) as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result.caption).toBe('Ready to level up?');
  });
});
