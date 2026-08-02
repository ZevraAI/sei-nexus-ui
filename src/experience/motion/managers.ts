/** Zevra Experience Layer — Orchestrator support classes (Phase 3.2, Layer A: no React).
 *  Each has one responsibility; together they give the Orchestrator sequencing, priority,
 *  concurrency, cancellation, interruption, and idle transition. All framework-independent. */
import type { Clock } from '../clock';
import type { PerformanceBudgets } from '../config';
import type { Unsubscribe } from '../types';
import type { RevealItem, ScopedAnimation } from './types';

// ── PriorityResolver — arrival order + stagger governance ────────────────────
export const PriorityResolver = {
  /** Stable order: by priority ascending, then registration order (the answer lands first). */
  order(items: RevealItem[]): RevealItem[] {
    return items
      .map((it, i) => ({ it, i }))
      .sort((a, b) => a.it.priority - b.it.priority || a.i - b.i)
      .map((x) => x.it);
  },

  /** Effective stagger, clamped so the whole compose fits `revealCompleteTargetMs` (budget). */
  effectiveStagger(count: number, requested: number | undefined, budgets: PerformanceBudgets): number {
    if (count <= 1) return 0;
    const base = requested ?? budgets.staggerMs;
    const window = Math.max(0, budgets.revealCompleteTargetMs - budgets.maxAnimationMs);
    const cap = Math.floor(window / (count - 1));
    return Math.min(base, cap);
  },
};

// ── AnimationQueue — concurrency-limited runner (enforces maxConcurrentForeground) ──
export class AnimationQueue {
  private running = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly concurrency: number) {}

  /** Schedule a task; runs when a slot is free. Resolves when the task's animation finishes. */
  add(task: () => ScopedAnimation): Promise<void> {
    return new Promise<void>((resolve) => {
      const run = () => {
        this.running++;
        const anim = task();
        anim.finished.then(() => { this.running--; resolve(); this.pump(); });
      };
      if (this.running < this.concurrency) run();
      else this.waiting.push(run);
    });
  }

  private pump(): void {
    if (this.running < this.concurrency) { const next = this.waiting.shift(); if (next) next(); }
  }

  get activeCount(): number { return this.running; }
  get queuedCount(): number { return this.waiting.length; }
  clear(): void { this.waiting.length = 0; }
}

// ── CancellationManager — per-scope tracking + teardown (Invariant 10) ───────
export class CancellationManager {
  private readonly byScope = new Map<symbol, Set<ScopedAnimation>>();

  track(scope: symbol, a: ScopedAnimation): void {
    let set = this.byScope.get(scope);
    if (!set) { set = new Set(); this.byScope.set(scope, set); }
    set.add(a);
  }

  untrack(scope: symbol, a: ScopedAnimation): void {
    const set = this.byScope.get(scope);
    if (set) { set.delete(a); if (set.size === 0) this.byScope.delete(scope); }
  }

  get(scope: symbol): ScopedAnimation[] {
    return [...(this.byScope.get(scope) ?? [])];
  }

  /** Cancel (stop/revert) every animation in a scope. */
  cancel(scope: symbol): void {
    const set = this.byScope.get(scope);
    if (!set) return;
    for (const a of [...set]) a.dispose();
    this.byScope.delete(scope);
  }

  cancelAll(): void {
    for (const scope of [...this.byScope.keys()]) this.cancel(scope);
  }

  scopes(): symbol[] { return [...this.byScope.keys()]; }
  activeCount(): number { let n = 0; for (const s of this.byScope.values()) n += s.size; return n; }
}

// ── InterruptionManager — finish-now on user input ───────────────────────────
export class InterruptionManager {
  constructor(private readonly cancellation: CancellationManager) {}

  /** Complete every in-flight animation in a scope immediately (never a half-animated page). */
  interrupt(scope: symbol): void {
    for (const a of this.cancellation.get(scope)) a.finish();
  }

  interruptAll(): void {
    for (const scope of this.cancellation.scopes()) this.interrupt(scope);
  }
}

// ── IdleCoordinator — hand to the idle loop when composition completes ───────
export class IdleCoordinator {
  private readonly active = new Set<symbol>();
  private readonly listeners = new Set<() => void>();
  private timer: number | null = null;

  constructor(private readonly clock: Clock) {}

  enter(scope: symbol): void {
    this.active.add(scope);
    if (this.timer !== null) { this.clock.clearTimeout(this.timer); this.timer = null; }
  }

  leave(scope: symbol): void {
    this.active.delete(scope);
    if (this.active.size === 0) this.scheduleIdle();
  }

  onIdle(cb: () => void): Unsubscribe {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  get activeScopes(): number { return this.active.size; }

  /** Coalesce multiple completing sequences into a single idle signal (one clock tick). */
  private scheduleIdle(): void {
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = this.clock.setTimeout(() => {
      this.timer = null;
      if (this.active.size === 0) for (const cb of [...this.listeners]) cb();
    }, 0);
  }
}
