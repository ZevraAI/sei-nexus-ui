/** Zevra Experience Layer — Motion runtime types (Phase 3.2, Layer A: no React).
 *  The vocabulary the Motion Engine and Orchestrator speak. */

/** A keyframe as WAAPI accepts it (camelCase CSS props + optional offset/easing). */
export type MotionKeyframe = Record<string, string | number | undefined>;

/** Named motion presets, derived from the tokens.css keyframes. */
export type PresetName = 'rise' | 'riseScale' | 'fillWidth' | 'pulseRing';

/** Options for a single animation. All timing resolves through tokens/budgets (Invariant 1, 6). */
export interface MotionOptions {
  duration?: number;   // ms; clamped to budgets.maxAnimationMs
  easing?: string;     // resolved from --z-ease-* by name via the engine
  delay?: number;      // ms (used for stagger — WAAPI delay, fill:both prevents flash)
  fill?: FillMode | 'both' | 'forwards' | 'backwards' | 'none' | 'auto';
}

/** The element an animation targets. `Element` in the browser; tests pass a fake. */
export type MotionTarget = Element;

/**
 * A running (or instantly-completed) animation, tracked by the runtime.
 * `finish()` = jump to final state now (interruption). `dispose()` = stop/revert (cancellation).
 */
export interface ScopedAnimation {
  readonly finished: Promise<void>;
  readonly done: boolean;
  finish(): void;
  dispose(): void;
}

/** The only surface the Orchestrator needs from the Motion Engine — so it can be faked in tests. */
export interface MotionEngineLike {
  isReduced(): boolean;
  isEnabled(): boolean;
  readonly presets: Record<PresetName, MotionKeyframe[]>;
  animate(el: MotionTarget, keyframes: MotionKeyframe[], opts?: MotionOptions): ScopedAnimation;
}

/** Priority governs arrival order: the answer lands first. Lower value = earlier. */
export enum RevealPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface RevealItem {
  el: MotionTarget;
  priority: number;
  keyframes: MotionKeyframe[];
  options?: MotionOptions;
}

export interface RevealSequence {
  items: RevealItem[];
  /** Requested stagger step (ms). Clamped to fit the reveal-completion budget. */
  stagger?: number;
}

// ── Numeric tween (Counter Engine primitive — Phase 3.3) ─────────────────────
/** A frame source; the ONLY place requestAnimationFrame lives is behind this seam,
 *  inside the Motion Engine (Rule 5). Injectable/manual for deterministic tests. */
export interface FrameSource {
  request(cb: (now: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

export interface TweenOptions {
  from: number;
  to: number;
  duration?: number;               // clamped to budgets.maxAnimationMs
  easing?: (t: number) => number;  // 0..1 → 0..1
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export interface TweenHandle {
  cancel(): void;
  readonly done: boolean;
}
