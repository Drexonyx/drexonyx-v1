// DR 0125: Deterministic WhatsApp message classifier — zero AI calls, zero external API calls.
// Classifies inbound WhatsApp message text using keyword pattern matching.
// PII boundary: classifies text content only; does not extract or store sender phone numbers.

import type { Skill, SkillContext, SkillResult } from '../interface';

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
    ],
  },
  {
    category: 'SCHEDULING',
    keywords: [
      'appointment', 'schedule', 'meeting', 'available', 'availability',
      'deadline', 'timeline', 'when can', 'book', 'slot', 'time slot',
    ],
  },
  {
    category: 'FEEDBACK',
    keywords: [
      'great', 'excellent', 'amazing', 'love', 'thank', 'thanks',
      'satisfied', 'happy with', 'well done', 'good job', 'appreciate',
      'disappointed', 'not happy', 'could be better', 'feedback',
    ],
  },
];

function matchKeywords(text: string, keywords: ReadonlyArray<string>): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

function classify(text: string): WhatsAppClassifyOutput {
  if (!text || text.trim().length === 0) {
    return { category: 'UNKNOWN', confidence: 'LOW', keywords: [] };
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

  const confidence: 'HIGH' | 'LOW' = bestCount >= 2 ? 'HIGH' : bestCount === 1 ? 'LOW' : 'LOW';

  return { category: bestCategory, confidence, keywords: bestMatches };
}

export const whatsappClassifySkill: Skill<WhatsAppClassifyInput, WhatsAppClassifyOutput> = {
  id: 'communication.whatsapp.classify',
  version: '1.0.0',
  family: 'COMMUNICATION',

  async execute(input: WhatsAppClassifyInput, _context: SkillContext): Promise<SkillResult<WhatsAppClassifyOutput>> {
    const output = classify(input.text);
    return { ok: true, output };
  },
};
