/** Zevra Experience Layer — AnimationOrchestrator (Phase 3.2, Rule 1).
 *  The SINGLE scheduling authority for coordinated motion. Pages/engines never sequence
 *  animations themselves — they hand the Orchestrator a RevealSequence (or an emphasis request)
 *  and it owns ordering, stagger, priority, interruption, cancellation, and idle transition.
 *
 *  Framework-independent (Rule: no React, no pages, no business objects). It depends only on a
 *  MotionEngineLike (so it can be faked in tests) and the performance budgets. */
import type { Clock } from '../clock';
import type { PerformanceBudgets } from '../config';
import type { Unsubscribe } from '../types';
import {
  AnimationQueue, CancellationManager, IdleCoordinator, InterruptionManager, PriorityResolver,
} from './managers';
import type {
  MotionEngineLike, MotionKeyframe, MotionOptions, MotionTarget, RevealSequence, ScopedAnimation,
} from './types';

export class AnimationOrchestrator {
  private readonly cancellation = new CancellationManager();
  private readonly interruption = new InterruptionManager(this.cancellation);
  private readonly idle: IdleCoordinator;
  private readonly emphasisQueue: AnimationQueue;

  constructor(
    private readonly engine: MotionEngineLike,
    private readonly budgets: PerformanceBudgets,
    clock: Clock,
  ) {
    this.idle = new IdleCoordinator(clock);
    this.emphasisQueue = new AnimationQueue(budgets.maxConcurrentForeground);
  }

  /** True when motion must resolve instantly (reduced-motion or kill-switch). */
  get reducedMotion(): boolean {
    return this.engine.isReduced() || !this.engine.isEnabled();
  }

  /**
   * Compose a surface: order items by priority, stagger them within the completion budget, and
   * resolve when every item has finished (or been interrupted). Reduced-motion/kill collapse to
   * instant with zero stagger — no special-case code (the engine returns instant handles).
   */
  async play(sequence: RevealSequence, scope: symbol): Promise<void> {
    this.idle.enter(scope);
    try {
      const items = PriorityResolver.order(sequence.items);
      const stagger = this.reducedMotion
        ? 0
        : PriorityResolver.effectiveStagger(items.length, sequence.stagger, this.budgets);

      const handles = items.map((item, i) => {
        const handle = this.engine.animate(item.el, item.keyframes, {
          ...item.options,
          delay: this.reducedMotion ? 0 : i * stagger,
          fill: 'both',
        });
        this.trackScoped(scope, handle);
        return handle;
      });

      await Promise.all(handles.map((h) => h.finished));
    } finally {
      this.idle.leave(scope);
    }
  }

  /**
   * A single foreground emphasis animation (e.g. a recommendation arrival). Routed through the
   * concurrency-limited queue so `maxConcurrentForeground` is actively enforced. Also the seam the
   * Attention policy will arbitrate over (§4) — everything foreground flows through here.
   */
  emphasize(el: MotionTarget, keyframes: MotionKeyframe[], options: MotionOptions, scope: symbol): Promise<void> {
    return this.emphasisQueue.add(() => {
      const handle = this.engine.animate(el, keyframes, { ...options, fill: 'both' });
      this.trackScoped(scope, handle);
      return handle;
    });
  }

  /** Interruption: complete a scope's in-flight motion now (user input during compose). */
  interrupt(scope: symbol): void { this.interruption.interrupt(scope); }
  interruptAll(): void { this.interruption.interruptAll(); }

  /** Cancellation: stop/revert a scope's motion (unmount / route change). Leak-free. */
  cancel(scope: symbol): void { this.cancellation.cancel(scope); }
  cancelAll(): void { this.cancellation.cancelAll(); }

  /** Fires when all sequences have completed — the hand-off to the idle loop. */
  onIdle(cb: () => void): Unsubscribe { return this.idle.onIdle(cb); }

  /** Currently tracked animations (for tests / diagnostics). */
  activeCount(): number { return this.cancellation.activeCount(); }

  private trackScoped(scope: symbol, handle: ScopedAnimation): void {
    this.cancellation.track(scope, handle);
    handle.finished.then(() => this.cancellation.untrack(scope, handle));
  }
}
