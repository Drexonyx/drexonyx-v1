// DR 0125: communication.whatsapp.classify — deterministic skill unit tests.
import { describe, it, expect } from 'vitest';
import { whatsappClassifySkill } from '../skills/communication/whatsapp-classify';
import type { SkillContext } from '../skills/interface';

const CTX: SkillContext = {
  organizationId: 'org-001',
  actorId: 'user-001',
  actorType: 'USER',
  actorRole: 'OWNER',
};

describe('communication.whatsapp.classify', () => {
  it('has correct id, version, family', () => {
    expect(whatsappClassifySkill.id).toBe('communication.whatsapp.classify');
    expect(whatsappClassifySkill.version).toBe('1.0.0');
    expect(whatsappClassifySkill.family).toBe('COMMUNICATION');
  });

  // ─── Always ok:true — deterministic ─────────────────────────────────────

  it('always returns ok:true (deterministic, no external calls)', async () => {
    const result = await whatsappClassifySkill.execute({ text: 'hello' }, CTX);
    expect(result.ok).toBe(true);
  });

  it('output always has category, confidence, keywords', async () => {
    const result = await whatsappClassifySkill.execute({ text: 'hi there' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.output.category).toBe('string');
      expect(['HIGH', 'LOW']).toContain(result.output.confidence);
      expect(Array.isArray(result.output.keywords)).toBe(true);
    }
  });

  // ─── SALES_INQUIRY ───────────────────────────────────────────────────────

  it('classifies price inquiry as SALES_INQUIRY', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'Hi, what is the price for your services?' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('SALES_INQUIRY');
  });

  it('classifies quote request as SALES_INQUIRY', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'I need a quote for a marketing package' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('SALES_INQUIRY');
  });

  it('classifies "how much" as SALES_INQUIRY', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'how much does it cost?' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('SALES_INQUIRY');
  });

  // ─── SUPPORT_REQUEST ──────────────────────────────────────────────────────

  it('classifies "help" message as SUPPORT_REQUEST', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'I need help with my order. There is a problem.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('SUPPORT_REQUEST');
  });

  it('classifies delivery status inquiry as SUPPORT_REQUEST', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: "where is my delivery? I still haven't received it" },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('SUPPORT_REQUEST');
  });

  // ─── COMPLAINT ────────────────────────────────────────────────────────────

  it('classifies demand for refund as COMPLAINT', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'This is unacceptable! I demand refund immediately.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('COMPLAINT');
  });

  it('classifies scam accusation as COMPLAINT', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'You are a scam! Terrible service, worst I ever had.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('COMPLAINT');
  });

  // ─── SCHEDULING ───────────────────────────────────────────────────────────

  it('classifies appointment request as SCHEDULING', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'Can I book an appointment? What time slots are available?' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('SCHEDULING');
  });

  // ─── FEEDBACK ─────────────────────────────────────────────────────────────

  it('classifies thank you as FEEDBACK', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'Thank you! The work was amazing, I am very satisfied.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('FEEDBACK');
  });

  // ─── SPAM ─────────────────────────────────────────────────────────────────

  it('classifies spam signals as SPAM', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'Congratulations you have won! Click here to claim your prize.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('SPAM');
  });

  // ─── UNKNOWN ──────────────────────────────────────────────────────────────

  it('classifies unrecognizable text as UNKNOWN', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'xyz qrs zzz' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('UNKNOWN');
  });

  it('classifies empty text as UNKNOWN', async () => {
    const result = await whatsappClassifySkill.execute({ text: '' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('UNKNOWN');
  });

  it('classifies whitespace-only text as UNKNOWN', async () => {
    const result = await whatsappClassifySkill.execute({ text: '   ' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.category).toBe('UNKNOWN');
  });

  // ─── Confidence ───────────────────────────────────────────────────────────

  it('returns HIGH confidence when 2+ keywords match', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'I have an issue and a problem with my order' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.category).toBe('SUPPORT_REQUEST');
      expect(result.output.confidence).toBe('HIGH');
    }
  });

  it('returns LOW confidence for single keyword match', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'Just wondering about the price' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.confidence).toBe('LOW');
    }
  });

  // ─── Matched keywords returned ────────────────────────────────────────────

  it('returns matched keywords in output', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'I need help urgently, there is a problem with my delivery' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.keywords.length).toBeGreaterThan(0);
    }
  });

  // ─── PII boundary ─────────────────────────────────────────────────────────

  it('does not extract or expose phone numbers from text (PII boundary)', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'Call me at +971501234567, I need help with my order' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // The output must not contain the phone number — keywords only contain matched terms
      const outputStr = JSON.stringify(result.output);
      expect(outputStr).not.toContain('+971501234567');
      expect(outputStr).not.toContain('971501234567');
    }
  });

  it('does not extract or expose email addresses from text (PII boundary)', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'Please help me, my email is client@example.com, there is an issue' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const outputStr = JSON.stringify(result.output);
      expect(outputStr).not.toContain('client@example.com');
    }
  });

  // ─── Determinism / idempotency ────────────────────────────────────────────

  it('returns identical output for identical input (deterministic)', async () => {
    const input = { text: 'I need a price quote for your services, how much does it cost?' };
    const r1 = await whatsappClassifySkill.execute(input, CTX);
    const r2 = await whatsappClassifySkill.execute(input, CTX);
    expect(r1).toEqual(r2);
  });

  // ─── Case insensitivity ───────────────────────────────────────────────────

  it('is case-insensitive in keyword matching', async () => {
    const lower = await whatsappClassifySkill.execute({ text: 'i need help' }, CTX);
    const upper = await whatsappClassifySkill.execute({ text: 'I NEED HELP' }, CTX);
    expect(lower.ok).toBe(true);
    expect(upper.ok).toBe(true);
    if (lower.ok && upper.ok) {
      expect(lower.output.category).toBe(upper.output.category);
    }
  });

  // ─── Language hint (no-op) ────────────────────────────────────────────────

  it('accepts optional language hint without error', async () => {
    const result = await whatsappClassifySkill.execute(
      { text: 'I need help please', language: 'en' },
      CTX,
    );
    expect(result.ok).toBe(true);
  });
});
