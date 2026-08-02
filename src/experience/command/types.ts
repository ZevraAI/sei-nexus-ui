/** Zevra Experience Layer — Command types (Phase 3.7). Contracts only; no business logic. */
import type { EntityRef, InteractionMode } from '../types';
import type { ReasoningStep } from '../primitives/ReasoningProgress';

export type IntentKind = 'investigate' | 'summarize' | 'compare' | 'explain' | 'navigate' | 'answer';

/** The structured understanding the interpreter returns — reflected back to the user. */
export interface Intent {
  kind: IntentKind;
  /** Human reflection, e.g. "Investigate → Inventory → Southwest · governed". */
  label: string;
  raw: string;
  entity?: EntityRef;
  to?: string;                 // navigation target — resolved by the injected navigator seam
  steps?: ReasoningStep[];     // optional reasoning to visualize
}

/** What the user is currently looking at — derived from ExperienceContext (no page wiring). */
export interface CommandContext {
  surface: string;
  interactionMode: InteractionMode;
  focusedEntity: EntityRef | null;
  activeInvestigation: string | null;
}

export interface Suggestion { id: string; label: string; seed: string; }

export interface CommandTurn { query: string; intentLabel: string; }

export type CommandPhase = 'idle' | 'thinking' | 'reasoning' | 'streaming' | 'done';

export interface CommandSessionState {
  open: boolean;
  phase: CommandPhase;
  query: string;
  intent: Intent | null;
  reasoningIndex: number;
  currentRun: AsyncIterable<string> | null;
  history: CommandTurn[];
}
