/** Zevra Experience Layer — shared runtime types (substrate-level contracts).
 *  These are contracts, not engines. Engines (Pulse, Preview, …) arrive in later phases. */

export type Unsubscribe = () => void;

export type EntityKind =
  | 'supplier' | 'store' | 'invoice' | 'product' | 'recommendation' | 'investigation';

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

/** Where the user is and what they're doing (ExperienceContext, §9.1a). */
export type InteractionMode = 'executive' | 'investigation' | 'presenting';

/** Lightweight lifecycle phase (§3 — NOT a formal state machine). */
export type ExperiencePhase = 'bootstrapping' | 'composing' | 'ready' | 'idle';

/** The Enterprise Pulse read-model (consumed by the Pulse engine in Phase 3.3;
 *  declared here because the Event Bus union references it). */
export interface PulseState {
  coverage: number;        // % of operations understood
  freshness: number;       // ms since last full understanding pass
  reasoningLoad: number;   // active investigations / agents working now
  activityRate: number;    // recent event cadence
  confidenceTrend: 'up' | 'flat' | 'down';
  status: 'watching' | 'reasoning' | 'degraded';
}
