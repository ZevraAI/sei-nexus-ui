/** Zevra Experience Layer — MotionEngine (Phase 3.2, Rule 5).
 *  The ONLY layer permitted to invoke browser animation APIs (WAAPI). It resolves timing
 *  through tokens + budgets (Rule 6), enforces the max-duration budget, honors reduced-motion
 *  and the kill-switch (Rule 7), and degrades to an instant final state when WAAPI is absent
 *  (jsdom/SSR) — no special-case code at the call sites. */
import type { PerformanceBudgets } from '../config';
import { AnimationHandle } from './AnimationHandle';
import { PRESETS, resolveMotionTokens } from './tokens';
import type { DurationName, EasingName, MotionTokens } from './tokens';
import type {
  FrameSource, MotionEngineLike, MotionKeyframe, MotionOptions, MotionTarget, PresetName,
  TweenHandle, TweenOptions,
} from './types';

export interface MotionEngineDeps {
  budgets: PerformanceBudgets;
  isEnabled: () => boolean;
  isReduced: () => boolean;
  /** Token overrides for tests; otherwise resolved from CSS with constant fallback. */
  tokens?: Partial<MotionTokens>;
  /** Frame source for numeric tweens (the only RAF in the app). Defaults to rAF; null in Node. */
  frame?: FrameSource | null;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

function defaultFrameSource(): FrameSource | null {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) return null;
  return {
    request: (cb) => window.requestAnimationFrame(cb),
    cancel: (h) => window.cancelAnimationFrame(h),
    now: () => (window.performance?.now?.() ?? Date.now()),
  };
}

export class MotionEngine implements MotionEngineLike {
  readonly presets: Record<PresetName, MotionKeyframe[]> = PRESETS;
  private readonly tokens: MotionTokens;
  private readonly frame: FrameSource | null;

  constructor(private readonly deps: MotionEngineDeps) {
    this.tokens = resolveMotionTokens(deps.tokens);
    this.frame = deps.frame === undefined ? defaultFrameSource() : deps.frame;
  }

  isEnabled(): boolean { return this.deps.isEnabled(); }
  isReduced(): boolean { return this.deps.isReduced(); }

  dur(name: DurationName): number { return this.tokens.dur[name]; }
  ease(name: EasingName): string { return this.tokens.ease[name]; }

  /** The single entry point for all animation execution. */
  animate(el: MotionTarget, keyframes: MotionKeyframe[], opts: MotionOptions = {}): AnimationHandle {
    const duration = clamp(opts.duration ?? this.dur('base'), 0, this.deps.budgets.maxAnimationMs);
    const easing = opts.easing ?? this.ease('standard');

    // Instant path: layer disabled, reduced-motion, or environment lacks WAAPI.
    if (!this.isEnabled() || this.isReduced() || !supportsWAAPI(el)) {
      applyFinal(el, keyframes);
      return AnimationHandle.instant();
    }

    const anim = (el as unknown as Animatable).animate(keyframes as Keyframe[], {
      duration,
      easing,
      delay: Math.max(0, opts.delay ?? 0),
      fill: (opts.fill as FillMode) ?? 'both',   // 'both' prevents flash during stagger delay
    });
    return new AnimationHandle(anim);
  }

  /**
   * Numeric tween (Counter Engine primitive). The single RAF loop in the app lives here.
   * Honors reduced-motion, kill-switch, and the duration budget with no special-case code:
   * when instant, it emits the final value once. Deterministic in tests via an injected frame source.
   */
  tween(opts: TweenOptions): TweenHandle {
    const duration = clamp(opts.duration ?? this.dur('deliberate'), 0, this.deps.budgets.maxAnimationMs);
    const easing = opts.easing ?? easeOutCubic;
    const frame = this.frame;

    if (!this.isEnabled() || this.isReduced() || duration <= 0 || !frame) {
      opts.onUpdate(opts.to);
      opts.onComplete?.();
      return { cancel() {}, done: true };
    }

    let done = false;
    let raf = 0;
    const start = frame.now();
    const step = (now: number) => {
      if (done) return;
      const t = Math.min(1, (now - start) / duration);
      opts.onUpdate(opts.from + (opts.to - opts.from) * easing(t));
      if (t >= 1) { done = true; opts.onComplete?.(); }
      else raf = frame.request(step);
    };
    raf = frame.request(step);

    return {
      cancel() { if (!done) { done = true; frame.cancel(raf); } },
      get done() { return done; },
    };
  }
}

interface Animatable { animate(keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation; }

function supportsWAAPI(el: unknown): el is Animatable {
  return !!el && typeof (el as Animatable).animate === 'function';
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Apply the last keyframe's declared properties directly (instant final state). */
function applyFinal(el: MotionTarget, keyframes: MotionKeyframe[]): void {
  const last = keyframes[keyframes.length - 1];
  if (!last) return;
  const style = (el as unknown as { style?: Record<string, unknown> }).style;
  if (!style) return;
  for (const key of Object.keys(last)) {
    if (key === 'offset' || key === 'easing' || last[key] == null) continue;
    style[key] = String(last[key]);
  }
}
