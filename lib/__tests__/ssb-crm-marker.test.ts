// DR-0130: Tests for SSB CRM marker extraction and lead field parsing.
// Verifies the {{WA_LINK_TEXT:...}} contract so silent CRM failures are caught early.

import { describe, it, expect } from 'vitest';
import {
  WA_LINK_TEXT_RE,
  parseLeadFields,
  isLeadValid,
} from '@/lib/chatbot/ssb-lead-parser';

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
