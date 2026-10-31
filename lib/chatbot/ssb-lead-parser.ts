// DR-0130: Pure utility — extracted from ChatPage.tsx so it can be unit-tested
// and reused server-side without importing the React component.

/** Regex that matches the {{WA_LINK_TEXT:...}} machine-readable marker. */
export const WA_LINK_TEXT_RE = /\{\{WA_LINK_TEXT:([\s\S]*?)\}\}/;

export interface SsbLeadFields {
  businessName?: string;
  businessType?: string;
  platform?: string;
  workingHours?: string;
  services?: string;
  contactWhatsapp?: string;
}

/**
 * Returns true when a value is an unfilled placeholder like [اسم النشاط الفعلي].
 * The bot is instructed to replace these with real values; if it emits the literal
 * bracket text, the lead must be rejected to prevent garbage data in the CRM.
 */
export function isPlaceholderValue(v: string): boolean {
  return /^\[.+\]$/.test(v.trim());
}

/**
 * Parses a WA summary text emitted by the mda-sales bot and extracts the
 * structured lead fields. Keys must match the Arabic labels in the
 * {{WA_LINK_TEXT:...}} template in clients.ts.
 * Placeholder values like [اسم النشاط الفعلي] are silently dropped.
 */
export function parseLeadFields(waText: string): SsbLeadFields {
  const result: SsbLeadFields = {};
  for (const line of waText.split('\n')) {
    const stripped = line.replace(/^[•\-\*]\s*/, '').trim();
    const sep = stripped.indexOf(':');
    if (sep === -1) continue;
    const k = stripped.slice(0, sep).trim();
    const v = stripped.slice(sep + 1).trim();
    if (!v || isPlaceholderValue(v)) continue;
    if (k === 'النشاط') result.businessName = v;
    else if (k === 'النوع') result.businessType = v;
    else if (k === 'المنصة') result.platform = v;
    else if (k === 'أوقات العمل') result.workingHours = v;
    else if (k === 'الخدمات/المنتجات') result.services = v;
    else if (k === 'رقم التواصل') result.contactWhatsapp = v;
  }
  return result;
}

/** Returns true when the minimum required fields are present and non-placeholder. */
export function isLeadValid(fields: SsbLeadFields): boolean {
  const name = fields.businessName?.trim() ?? '';
  const wa = fields.contactWhatsapp?.trim() ?? '';
  return Boolean(name && wa && !isPlaceholderValue(name) && !isPlaceholderValue(wa));
}
