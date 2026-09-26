// Robust JSON extraction from AI responses.
//
// Models instructed to "return only valid JSON" sometimes wrap the object in
// markdown code fences or prepend/append prose. This utility tries three
// strategies in order before giving up:
//   1. Direct JSON.parse on the trimmed text (fast path, zero overhead).
//   2. Strip ```json … ``` or ``` … ``` fences, then JSON.parse.
//   3. Extract the first outermost {...} or [...] substring, then JSON.parse.
//
// Returns the parsed value, or null if all strategies fail.
// Never throws.

export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // ── 1. Direct parse ────────────────────────────────────────────────────────
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue to fence extraction
  }

  // ── 2. Markdown code fence ─────────────────────────────────────────────────
  // Matches ```json\n…\n``` or ```\n…\n``` (with optional whitespace)
  const fenceMatch = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/m.exec(trimmed);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue to brace extraction
    }
  }

  // ── 3. First outermost brace/bracket pair ──────────────────────────────────
  const firstBrace = trimmed.search(/[{[]/);
  if (firstBrace !== -1) {
    const open = trimmed[firstBrace];
    const close = open === '{' ? '}' : ']';
    const lastClose = trimmed.lastIndexOf(close);
    if (lastClose > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastClose + 1));
      } catch {
        // all strategies exhausted
      }
    }
  }

  return null;
}
