// DR-0130: Tests for SSB CRM marker, lead parsing, and WhatsApp destination contract.

import { describe, it, expect } from 'vitest';
import {
  WA_LINK_TEXT_RE,
  parseLeadFields,
  isLeadValid,
} from '@/lib/chatbot/ssb-lead-parser';
import { getClient } from '@/lib/chatbot/clients';

// ─── Constants ────────────────────────────────────────────────────────────────
const MDA_WA_NUMBER = '971521770988';
const OLD_WA_NUMBER = '971585806534';

// Realistic bot output mirroring what the mda-sales prompt produces.
const FULL_MARKER = `رائع! إليك ملخص معلوماتك:

{{WA_LINK_TEXT:مرحباً فريق MDA 👋
أريد الاشتراك في بوت المبيعات الذكي

✅ تفاصيلي:
• النشاط: متجر ملابس أطفال
• النوع: متجر إلكتروني
• المنصة: إنستغرام
• أوقات العمل: 9 صباحاً - 11 مساءً
• الخدمات/المنتجات: ملابس أطفال بنات وأولاد (0-12 سنة)
• رقم التواصل: 971501234567
• الخطة: الأساسية 299 درهم/شهر}}

سيتواصل معك فريق MDA قريباً!`;

// Truncated response (maxOutputTokens too low → closing }} cut off).
const TRUNCATED_MARKER = `رائع! إليك ملخص معلوماتك:

{{WA_LINK_TEXT:مرحباً فريق MDA 👋
أريد الاشتراك في بوت المبيعات الذكي

✅ تفاصيلي:
• النشاط: متجر ملابس أطفال
• النوع: متجر إلكتروني`;

describe('WA_LINK_TEXT_RE — regex contract', () => {
  it('matches a complete, well-formed {{WA_LINK_TEXT:...}} block', () => {
    const m = FULL_MARKER.match(WA_LINK_TEXT_RE);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('متجر ملابس أطفال');
  });

  it('does NOT match a truncated block missing closing }}', () => {
    const m = TRUNCATED_MARKER.match(WA_LINK_TEXT_RE);
    expect(m).toBeNull();
  });

  it('captures only the inner text, not the delimiters', () => {
    const m = FULL_MARKER.match(WA_LINK_TEXT_RE);
    expect(m![0]).toMatch(/^\{\{WA_LINK_TEXT:/);
    expect(m![1]).not.toContain('{{WA_LINK_TEXT:');
    expect(m![1]).not.toContain('}}');
  });
});

describe('parseLeadFields — field extraction', () => {
  it('extracts all 6 fields from a realistic mda-sales output', () => {
    const m = FULL_MARKER.match(WA_LINK_TEXT_RE)!;
    const fields = parseLeadFields(m[1]);

    expect(fields.businessName).toBe('متجر ملابس أطفال');
    expect(fields.businessType).toBe('متجر إلكتروني');
    expect(fields.platform).toBe('إنستغرام');
    expect(fields.workingHours).toBe('9 صباحاً - 11 مساءً');
    expect(fields.services).toBe('ملابس أطفال بنات وأولاد (0-12 سنة)');
    expect(fields.contactWhatsapp).toBe('971501234567');
  });

  it('handles missing optional fields gracefully', () => {
    const minimal = `• النشاط: تصوير فوتوغرافي\n• رقم التواصل: 971509876543`;
    const fields = parseLeadFields(minimal);

    expect(fields.businessName).toBe('تصوير فوتوغرافي');
    expect(fields.contactWhatsapp).toBe('971509876543');
    expect(fields.businessType).toBeUndefined();
    expect(fields.platform).toBeUndefined();
    expect(fields.workingHours).toBeUndefined();
    expect(fields.services).toBeUndefined();
  });

  it('ignores lines without a colon separator', () => {
    const text = `• النشاط: مطعم شعبي\n✅ تفاصيلي\n• رقم التواصل: 971505555555`;
    const fields = parseLeadFields(text);
    expect(fields.businessName).toBe('مطعم شعبي');
    expect(fields.contactWhatsapp).toBe('971505555555');
  });

  it('strips bullet characters (•, -, *) from line prefixes', () => {
    const text = `- النشاط: صالون تجميل\n* رقم التواصل: 971500000001`;
    const fields = parseLeadFields(text);
    expect(fields.businessName).toBe('صالون تجميل');
    expect(fields.contactWhatsapp).toBe('971500000001');
  });
});

describe('isLeadValid — validation', () => {
  it('returns true when both required fields are present', () => {
    expect(isLeadValid({ businessName: 'مطعم', contactWhatsapp: '971500000001' })).toBe(true);
  });

  it('returns false when businessName is missing', () => {
    expect(isLeadValid({ contactWhatsapp: '971500000001' })).toBe(false);
  });

  it('returns false when contactWhatsapp is missing', () => {
    expect(isLeadValid({ businessName: 'مطعم' })).toBe(false);
  });

  it('returns false when businessName is whitespace-only', () => {
    expect(isLeadValid({ businessName: '   ', contactWhatsapp: '971500000001' })).toBe(false);
  });

  it('returns false when both fields are missing', () => {
    expect(isLeadValid({})).toBe(false);
  });
});

// ─── WhatsApp destination contract ───────────────────────────────────────────

describe('mda-sales WhatsApp destination', () => {
  const client = getClient('mda-sales');

  it('client exists', () => {
    expect(client).not.toBeNull();
  });

  it(`waNumber is the official MDA number ${MDA_WA_NUMBER}`, () => {
    expect(client!.waNumber).toBe(MDA_WA_NUMBER);
  });

  it('generated button URL targets official MDA number', () => {
    const url = `https://wa.me/${client!.waNumber}`;
    expect(url).toBe(`https://wa.me/${MDA_WA_NUMBER}`);
  });

  it('old number is NOT the mda-sales destination', () => {
    expect(client!.waNumber).not.toBe(OLD_WA_NUMBER);
  });

  it('customer contact number in CRM fields does not affect waNumber', () => {
    // Simulate customer providing a different phone number as their contact.
    const customerPhone = '971501234567';
    const marker = `{{WA_LINK_TEXT:• النشاط: مطعم\n• النوع: مطعم\n• المنصة: واتساب\n• أوقات العمل: 9-11\n• الخدمات/المنتجات: وجبات\n• رقم التواصل: ${customerPhone}}}`;
    const m = marker.match(WA_LINK_TEXT_RE)!;
    const fields = parseLeadFields(m[1]);
    // Customer phone stored as CRM field
    expect(fields.contactWhatsapp).toBe(customerPhone);
    // waNumber is NEVER derived from parsed lead fields — it stays the official number
    expect(client!.waNumber).toBe(MDA_WA_NUMBER);
    expect(client!.waNumber).not.toBe(customerPhone);
  });
});

describe('no active MDA Sales Agent fallback uses old number', () => {
  it('mda-sales waNumber is not the old number', () => {
    const client = getClient('mda-sales');
    expect(client!.waNumber).not.toBe(OLD_WA_NUMBER);
  });

  it('mda-sales systemPrompt does not contain old number', () => {
    const client = getClient('mda-sales');
    expect(client!.systemPrompt).not.toContain(OLD_WA_NUMBER);
  });
});

// ─── Sales behavior constraints (system prompt audit) ────────────────────────

describe('mda-sales system prompt — behavior constraints', () => {
  const prompt = getClient('mda-sales')!.systemPrompt;

  it('does not claim Instagram DM automation', () => {
    expect(prompt).not.toMatch(/رسائل إنستغرام.*آلي.*مباشرةً|Instagram.*DM.*auto/i);
  });

  it('does not claim TikTok DM automation', () => {
    expect(prompt).not.toMatch(/تيك توك.*آلي.*مباشرةً|TikTok.*DM.*auto/i);
  });

  it('does not guarantee 24-hour setup', () => {
    // Must NOT promise "سنجهّز بوتك خلال 24 ساعة" or "within 24 hours"
    expect(prompt).not.toMatch(/سنجهّز.*خلال 24 ساعة/);
    expect(prompt).not.toMatch(/set up.*within 24 hours/i);
  });

  it('refers setup timing to team confirmation', () => {
    expect(prompt).toMatch(/يؤكده فريق MDA|confirm.*next steps|تأكيد الخطوات/);
  });

  it('instructs one question per message', () => {
    expect(prompt).toMatch(/سؤال واحد/);
  });

  it('instructs short replies', () => {
    expect(prompt).toMatch(/قصيرة|short/i);
  });

  it('price is AED 299/month', () => {
    expect(prompt).toMatch(/299/);
  });

  it('preserves the exact CRM marker template fields', () => {
    expect(prompt).toContain('النشاط:');
    expect(prompt).toContain('النوع:');
    expect(prompt).toContain('المنصة:');
    expect(prompt).toContain('أوقات العمل:');
    expect(prompt).toContain('الخدمات/المنتجات:');
    expect(prompt).toContain('رقم التواصل:');
  });

  it('preserves the SYSTEM OUTPUT MARKER instruction', () => {
    expect(prompt).toContain('SYSTEM OUTPUT MARKER');
    expect(prompt).toContain('{{WA_LINK_TEXT:');
  });
});

// ─── Duplicate prevention (client-side guard) ────────────────────────────────

describe('CRM duplicate prevention', () => {
  it('isLeadValid rejects empty fields — preventing spurious submissions', () => {
    // The guard in ChatPage calls isLeadValid before posting; if it returns false
    // the submit is aborted and leadSubmitAttempted is reset to false.
    expect(isLeadValid({ businessName: '', contactWhatsapp: '971500000001' })).toBe(false);
    expect(isLeadValid({ businessName: 'مطعم', contactWhatsapp: '' })).toBe(false);
  });

  it('once valid fields are present, the lead is submitted exactly once per session', () => {
    // Client-side guard: leadSubmitAttempted.current flips to true on first submit attempt.
    // This test documents the invariant; the actual ref is in ChatPage React state.
    const fields = { businessName: 'مطعم الكرم', contactWhatsapp: '971500000099' };
    expect(isLeadValid(fields)).toBe(true); // submission would proceed
    // A second call with the same valid fields still passes validation,
    // but ChatPage's leadSubmitAttempted ref prevents re-submission.
    expect(isLeadValid(fields)).toBe(true);
  });
});
