/** Zevra Experience Layer — RevealController (the Reveal Engine, Phase 3.2).
 *  Framework-independent per-group coordinator: collects reveal registrations, builds a
 *  RevealSequence, and hands it to the Orchestrator once. React's <RevealGroup> owns one of these.
 *  Contains no React and no timing logic — it only assembles intent. */
import type { AnimationOrchestrator } from './AnimationOrchestrator';
import type { MotionKeyframe, MotionOptions, MotionTarget, RevealItem } from './types';

export interface RevealRegistration {
  priority: number;
  keyframes: MotionKeyframe[];
  options?: MotionOptions;
}

export class RevealController {
  private readonly items = new Map<MotionTarget, RevealItem>();
  private played = false;

  constructor(
    private readonly orchestrator: AnimationOrchestrator,
    private readonly scope: symbol,
    private readonly stagger?: number,
  ) {}

  /** Register an element's reveal intent. Returns an unregister fn. */
  register(el: MotionTarget, reg: RevealRegistration): () => void {
    this.items.set(el, { el, priority: reg.priority, keyframes: reg.keyframes, options: reg.options });
    return () => { this.items.delete(el); };
  }

  /** Play the composed sequence once (idempotent). */
  play(): Promise<void> {
    if (this.played) return Promise.resolve();
    this.played = true;
    return this.orchestrator.play({ items: [...this.items.values()], stagger: this.stagger }, this.scope);
  }

  /** Cancel the group's animations (unmount / route change). */
  cancel(): void {
    this.orchestrator.cancel(this.scope);
  }

  get size(): number { return this.items.size; }
}
