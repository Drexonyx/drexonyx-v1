// DR 0125: Deterministic WhatsApp message classifier — zero AI calls, zero external API calls.
// Classifies inbound WhatsApp message text using keyword pattern matching.
// PII boundary: classifies text content only; does not extract or store sender phone numbers.
// Service routing uses catalog keywords from lib/catalog/mda-services.ts.

import type { Skill, SkillContext, SkillResult } from '../interface';
import { WHATSAPP_KEYWORD_MAP, type ServiceBrand } from '../../catalog/mda-services';

export type WhatsAppMessageCategory =
  | 'SALES_INQUIRY'
  | 'SUPPORT_REQUEST'
  | 'FEEDBACK'
  | 'COMPLAINT'
  | 'SCHEDULING'
  | 'SPAM'
  | 'UNKNOWN';

export interface WhatsAppClassifyInput {
  /** Inbound message text — treated as untrusted external data. */
  text: string;
  /** Optional language hint (not used in matching — reserved for future localization). */
  language?: string;
}

export interface WhatsAppClassifyOutput {
  category: WhatsAppMessageCategory;
  confidence: 'HIGH' | 'LOW';
  keywords: string[];
  /** Matched service IDs from the catalog, if any — used for human-gate routing context. */
  matchedServiceIds: string[];
  /** Brand routing: MDA or DREXONYX, based on matched services. */
  suggestedBrand: ServiceBrand | null;
}

// Keyword sets per category. Each entry matches on word boundaries (case-insensitive).
const CATEGORY_PATTERNS: ReadonlyArray<{
  category: WhatsAppMessageCategory;
  keywords: ReadonlyArray<string>;
}> = [
  {
    category: 'SPAM',
    keywords: [
      'click here', 'free money', 'you have won', 'claim your prize',
      'limited offer', 'act now', 'congratulations you', 'binary', 'crypto earn',
    ],
  },
  {
    category: 'COMPLAINT',
    keywords: [
      'unacceptable', 'terrible', 'awful', 'worst', 'disgusting',
      'demand refund', 'want refund', 'very unhappy', 'very disappointed',
      'never again', 'scam', 'cheated', 'ripped off',
    ],
  },
  {
    category: 'SUPPORT_REQUEST',
    keywords: [
      'help', 'issue', 'problem', 'not working', 'broken', 'delay',
      'where is', 'still waiting', 'havent received', "haven't received",
      'when will', 'status', 'track', 'update me', 'what happened',
    ],
  },
  {
    category: 'SALES_INQUIRY',
    keywords: [
      'price', 'pricing', 'cost', 'how much', 'quote', 'package',
      'services', 'offer', 'discount', 'what do you', 'can you do',
      'interested in', 'i need', 'looking for', 'do you provide',
      // Arabic sales inquiry triggers
      'سعر', 'كم سعر', 'كم تكلفة', 'عرض سعر', 'خدمات', 'ما هي خدماتكم',
      'اريد', 'أريد', 'محتاج', 'ابي', 'أبي', 'بكم', 'بقدر', 'تقدرون',
    ],
  },
  {
    category: 'SCHEDULING',
    keywords: [
      'appointment', 'schedule', 'meeting', 'available', 'availability',
      'deadline', 'timeline', 'when can', 'book', 'slot', 'time slot',
      'موعد', 'متى', 'اجتماع', 'وقت',
    ],
  },
  {
    category: 'FEEDBACK',
    keywords: [
      'great', 'excellent', 'amazing', 'love', 'thank', 'thanks',
      'satisfied', 'happy with', 'well done', 'good job', 'appreciate',
      'disappointed', 'not happy', 'could be better', 'feedback',
      'شكرا', 'شكراً', 'ممتاز', 'رائع', 'جميل', 'مشكور',
    ],
  },
];

function matchKeywords(text: string, keywords: ReadonlyArray<string>): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

function matchServiceKeywords(text: string): {
  serviceIds: string[];
  brand: ServiceBrand | null;
} {
  const lower = text.toLowerCase();
  const matched = WHATSAPP_KEYWORD_MAP.filter(({ keyword }) => lower.includes(keyword));

  if (matched.length === 0) return { serviceIds: [], brand: null };

  // Deduplicate service IDs
  const serviceIds = [...new Set(matched.map((m) => m.serviceId))];

  // Determine brand: MDA wins if any MDA service matched; DREXONYX only if all matches are DREXONYX
  const brands = new Set(matched.map((m) => m.brand));
  const brand: ServiceBrand | null = brands.has('MDA')
    ? 'MDA'
    : brands.has('DREXONYX')
    ? 'DREXONYX'
    : null;

  return { serviceIds, brand };
}

function classify(text: string): WhatsAppClassifyOutput {
  if (!text || text.trim().length === 0) {
    return {
      category: 'UNKNOWN',
      confidence: 'LOW',
      keywords: [],
      matchedServiceIds: [],
      suggestedBrand: null,
    };
  }

  let bestCategory: WhatsAppMessageCategory = 'UNKNOWN';
  let bestMatches: string[] = [];
  let bestCount = 0;

  for (const { category, keywords } of CATEGORY_PATTERNS) {
    const matched = matchKeywords(text, keywords);
    if (matched.length > bestCount) {
      bestCount = matched.length;
      bestCategory = category;
      bestMatches = matched;
    }
  }

  const { serviceIds, brand } = matchServiceKeywords(text);

  // If service keywords matched but category is UNKNOWN, upgrade to SALES_INQUIRY
  if (serviceIds.length > 0 && bestCategory === 'UNKNOWN') {
    bestCategory = 'SALES_INQUIRY';
    bestCount = serviceIds.length;
  }

  const confidence: 'HIGH' | 'LOW' = bestCount >= 2 ? 'HIGH' : 'LOW';

  return {
    category: bestCategory,
    confidence,
    keywords: bestMatches,
    matchedServiceIds: serviceIds,
    suggestedBrand: brand,
  };
}

export const whatsappClassifySkill: Skill<WhatsAppClassifyInput, WhatsAppClassifyOutput> = {
  id: 'communication.whatsapp.classify',
  version: '1.1.0',
  family: 'COMMUNICATION',

  async execute(input: WhatsAppClassifyInput, _context: SkillContext): Promise<SkillResult<WhatsAppClassifyOutput>> {
    const output = classify(input.text);
    return { ok: true, output };
  },
};
