/**
 * Helpers for an investigation's "brief": the full text a person wrote, which may run to several
 * lines. The page shows the brief in full (BriefCard) under a short title derived from it.
 */

/** A short title for a brief: its first non-empty line, without trailing punctuation, cut at a word. */
export function briefTitle(text, max = 70) {
  const first = String(text || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
  const clean = first.replace(/[?.!:\s]+$/, '');
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}\u2026`;
}

/** True when a brief has more than `maxLines` explicit lines (long ones are also clamped by measurement). */
export function hasManyLines(text, maxLines = 6) {
  return String(text || '').split('\n').length > maxLines;
}
