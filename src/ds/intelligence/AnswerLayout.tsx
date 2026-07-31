/** ============================================================================
 *  RESERVED — AnswerLayout (contract only; behaviour NOT implemented).
 *
 *  Eventual role: standardize the presentation order of an investigation answer so
 *  no page hand-orders its own layout. Every investigation answer will one day
 *  compose this instead of inventing its own arrangement — one of the highest-value
 *  future composition primitives.
 *
 *  Fixed slot order (each omitted when empty):
 *    Narrative → Metrics → Tables → Visualizations → Sources → Follow-up → Reasoning
 *
 *  Slots will render inside a NarrativeSurface. This file documents the contract and
 *  reserves the name; it must not be composed yet.
 *  ============================================================================ */
import type { ReactNode } from 'react';

/** Source of truth for the eventual render order of a standardized answer. */
export const ANSWER_SLOT_ORDER = [
  'narrative',
  'metrics',
  'tables',
  'visualizations',
  'sources',
  'followups',
  'reasoning',
] as const;

export type AnswerSlot = (typeof ANSWER_SLOT_ORDER)[number];

/** Reserved props — the presentation slots of an investigation answer. `narrative`
 *  is required; every other slot is optional and omitted when absent. */
export interface AnswerLayoutProps {
  narrative: ReactNode;
  metrics?: ReactNode;
  tables?: ReactNode;
  visualizations?: ReactNode;
  sources?: ReactNode;
  followups?: ReactNode;
  reasoning?: ReactNode;
  className?: string;
}

/** RESERVED — not implemented. Composing this today throws by design so the
 *  contract cannot be depended on before it is built. */
export function AnswerLayout(_props: AnswerLayoutProps): never {
  throw new Error(
    'AnswerLayout is reserved and not implemented yet. Eventual order: ' +
      ANSWER_SLOT_ORDER.join(' → ') + '.',
  );
}
