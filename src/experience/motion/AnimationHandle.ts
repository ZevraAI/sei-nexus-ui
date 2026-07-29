/** Zevra Experience Layer — AnimationHandle (Phase 3.2).
 *  Wraps a single WAAPI Animation, or represents an instantly-completed animation
 *  (reduced-motion / kill-switch / no-WAAPI). The runtime tracks handles as ScopedAnimations. */
import type { ScopedAnimation } from './types';

export class AnimationHandle implements ScopedAnimation {
  private anim: Animation | null;
  private _done = false;
  private resolveFinished!: () => void;
  readonly finished: Promise<void>;

  constructor(anim: Animation | null) {
    this.anim = anim;
    this.finished = new Promise<void>((resolve) => { this.resolveFinished = resolve; });
    if (!anim) {
      this.settle();                    // instant handle — already complete
    } else {
      // WAAPI's finished promise rejects on cancel; either way the handle is done.
      anim.finished.then(() => this.settle(), () => this.settle());
    }
  }

  /** An animation that is already complete (final state applied elsewhere). */
  static instant(): AnimationHandle {
    return new AnimationHandle(null);
  }

  get done(): boolean {
    return this._done;
  }

  /** Interruption: jump to the final state immediately. */
  finish(): void {
    if (this.anim && !this._done) { try { this.anim.finish(); } catch { /* already done */ } }
    this.settle();
  }

  /** Cancellation: stop and revert; the element returns to its base state. */
  cancel(): void {
    if (this.anim && !this._done) { try { this.anim.cancel(); } catch { /* already done */ } }
    this.settle();
  }

  dispose(): void {
    this.cancel();
  }

  private settle(): void {
    if (this._done) return;
    this._done = true;
    this.resolveFinished();
  }
}
