/** Zevra Experience Layer — ExperienceConfig (§9.1c).
 *  Performance budgets are architectural CONSTRAINTS, enforced at engine chokepoints.
 *  `enabled` is the global kill-switch; the whole layer degrades to inert when false. */

export interface PerformanceBudgets {
  /** Max foreground emphasis animations at once (Attention/Orchestrator chokepoint). */
  maxConcurrentForeground: number;
  /** No single animation exceeds this (= --z-dur-deliberate). */
  maxAnimationMs: number;
  /** Reveal stagger step between elements (token-derived). */
  staggerMs: number;
  /** Full compose target; interruptible. */
  revealCompleteTargetMs: number;
  /** Preview resolve + position budget. */
  previewOpenLatencyMs: number;
  /** ⌘K open budget. */
  commandLaunchLatencyMs: number;
  /** Shared freshness/pulse cadence — ONE interval, not N timers. */
  pulseTickMs: number;
  /** Minimum gap between visible ambient insertions (calm-feed guarantee). */
  ambientMinIntervalMs: number;
}

export interface ExperienceConfig {
  /** Global kill-switch. When false, engines are inert and render children unchanged. */
  enabled: boolean;
  /** Honor prefers-reduced-motion (collapse motion to instant final state). */
  respectReducedMotion: boolean;
  /** Idle is declared after this much inactivity (drives phase → 'idle'). */
  idleAfterMs: number;
  budgets: PerformanceBudgets;
  /** Per-engine feature flags (engines added phase by phase). */
  engines: Record<string, boolean>;
}

/** Default budgets — the frozen constraints from §9.1c. Derived from motion tokens. */
export const DEFAULT_BUDGETS: PerformanceBudgets = {
  maxConcurrentForeground: 2,
  maxAnimationMs: 560,          // --z-dur-deliberate
  staggerMs: 60,
  revealCompleteTargetMs: 3500,
  previewOpenLatencyMs: 120,
  commandLaunchLatencyMs: 150,
  pulseTickMs: 1000,
  ambientMinIntervalMs: 3000,
};

export const DEFAULT_CONFIG: ExperienceConfig = {
  enabled: true,
  respectReducedMotion: true,
  idleAfterMs: 60_000,
  budgets: DEFAULT_BUDGETS,
  engines: {},
};

/** Deep-ish merge of a partial override onto the defaults (budgets merged field-wise). */
export function resolveConfig(override?: DeepPartial<ExperienceConfig>): ExperienceConfig {
  if (!override) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...override,
    budgets: { ...DEFAULT_BUDGETS, ...(override.budgets ?? {}) },
    engines: { ...DEFAULT_CONFIG.engines, ...(override.engines ?? {}) },
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };
