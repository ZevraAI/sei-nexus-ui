/** Confidence banding — projects an existing 0–100 confidence score into the words an
 *  executive reads a judgment call in, never the raw number. Presentation only: it does
 *  not compute, invent, or adjust confidence — it labels a value that already exists. */
export function confidenceBand(value: number): string {
  if (value >= 80) return 'High confidence';
  if (value >= 55) return 'Moderate confidence';
  return 'Preliminary confidence';
}
