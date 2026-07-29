import { describe, it, expect, vi } from 'vitest';
import { AnimationOrchestrator } from '../AnimationOrchestrator';
import { DEFAULT_BUDGETS } from '../../config';
import { createTestClock } from '../../clock';
import { RevealPriority } from '../types';
import type { MotionEngineLike, MotionKeyframe, MotionOptions, MotionTarget, RevealSequence, ScopedAnimation } from '../types';

class FakeHandle implements ScopedAnimation {
  done = false; finishCalls = 0; disposeCalls = 0;
  private resolve!: () => void;
  readonly finished = new Promise<void>((r) => { this.resolve = r; });
  settle() { if (!this.done) { this.done = true; this.resolve(); } }
  finish() { this.finishCalls++; this.settle(); }
  dispose() { this.disposeCalls++; this.settle(); }
}

class FakeEngine implements MotionEngineLike {
  reduced = false; enabled = true;
  readonly presets = { rise: [{ opacity: 0 }, { opacity: 1 }], riseScale: [], fillWidth: [], pulseRing: [] } as any;
  calls: Array<{ el: MotionTarget; opts: MotionOptions; handle: FakeHandle }> = [];
  isReduced() { return this.reduced; }
  isEnabled() { return this.enabled; }
  animate(el: MotionTarget, _kf: MotionKeyframe[], opts: MotionOptions = {}): ScopedAnimation {
    const handle = new FakeHandle();
    this.calls.push({ el, opts, handle });
    return handle;
  }
}

const el = (id: string) => ({ id } as unknown as MotionTarget);
const seq = (items: Array<{ id: string; priority: number }>): RevealSequence => ({
  items: items.map((i) => ({ el: el(i.id), priority: i.priority, keyframes: [{ opacity: 1 }] })),
});
const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('AnimationOrchestrator', () => {
  const make = () => {
    const engine = new FakeEngine();
    const clock = createTestClock();
    return { engine, clock, orch: new AnimationOrchestrator(engine, DEFAULT_BUDGETS, clock) };
  };

  it('sequences items in priority order (the answer lands first)', () => {
    const { engine, orch } = make();
    orch.play(seq([
      { id: 'a', priority: RevealPriority.NORMAL },
      { id: 'b', priority: RevealPriority.CRITICAL },
      { id: 'c', priority: RevealPriority.HIGH },
    ]), Symbol('s'));
    expect(engine.calls.map((c) => (c.el as any).id)).toEqual(['b', 'c', 'a']);
  });

  it('staggers by a token-derived step (delay increases per item)', () => {
    const { engine, orch } = make();
    orch.play(seq([
      { id: 'a', priority: 0 }, { id: 'b', priority: 0 }, { id: 'c', priority: 0 },
    ]), Symbol('s'));
    expect(engine.calls.map((c) => c.opts.delay)).toEqual([0, DEFAULT_BUDGETS.staggerMs, DEFAULT_BUDGETS.staggerMs * 2]);
  });

  it('reduced-motion collapses stagger to zero', () => {
    const { engine, orch } = make();
    engine.reduced = true;
    orch.play(seq([{ id: 'a', priority: 0 }, { id: 'b', priority: 0 }]), Symbol('s'));
    expect(engine.calls.map((c) => c.opts.delay)).toEqual([0, 0]);
  });

  it('kill-switch collapses stagger to zero', () => {
    const { engine, orch } = make();
    engine.enabled = false;
    orch.play(seq([{ id: 'a', priority: 0 }, { id: 'b', priority: 0 }]), Symbol('s'));
    expect(engine.calls.map((c) => c.opts.delay)).toEqual([0, 0]);
  });

  it('interruption finishes all in-flight animations and resolves the compose', async () => {
    const { engine, orch } = make();
    const scope = Symbol('s');
    const p = orch.play(seq([{ id: 'a', priority: 0 }, { id: 'b', priority: 0 }]), scope);
    orch.interrupt(scope);
    await p;
    expect(engine.calls.every((c) => c.handle.finishCalls === 1)).toBe(true);
  });

  it('cancellation disposes all animations and clears tracking', async () => {
    const { engine, orch } = make();
    const scope = Symbol('s');
    const p = orch.play(seq([{ id: 'a', priority: 0 }, { id: 'b', priority: 0 }]), scope);
    orch.cancel(scope);
    await p;
    expect(engine.calls.every((c) => c.handle.disposeCalls === 1)).toBe(true);
    expect(orch.activeCount()).toBe(0);
  });

  it('cancelling one scope does not affect another (simultaneous composes)', async () => {
    const { engine, orch } = make();
    const a = Symbol('a'); const b = Symbol('b');
    orch.play(seq([{ id: 'a1', priority: 0 }]), a);
    orch.play(seq([{ id: 'b1', priority: 0 }]), b);
    orch.cancel(a);
    const aCall = engine.calls.find((c) => (c.el as any).id === 'a1')!;
    const bCall = engine.calls.find((c) => (c.el as any).id === 'b1')!;
    expect(aCall.handle.disposeCalls).toBe(1);
    expect(bCall.handle.disposeCalls).toBe(0);
    bCall.handle.settle();
    await flush();
  });

  it('cleans up tracking when animations complete (leak-free)', async () => {
    const { engine, orch } = make();
    const scope = Symbol('s');
    const p = orch.play(seq([{ id: 'a', priority: 0 }, { id: 'b', priority: 0 }]), scope);
    engine.calls.forEach((c) => c.handle.settle());
    await p; await flush();
    expect(orch.activeCount()).toBe(0);
  });

  it('fires onIdle after the compose completes', async () => {
    const { engine, clock, orch } = make();
    const idle = vi.fn();
    orch.onIdle(idle);
    const p = orch.play(seq([{ id: 'a', priority: 0 }]), Symbol('s'));
    engine.calls.forEach((c) => c.handle.settle());
    await p;
    clock.advance(1);
    expect(idle).toHaveBeenCalledOnce();
  });

  it('emphasize enforces the concurrent-foreground budget', async () => {
    const { engine, orch } = make();       // budget.maxConcurrentForeground = 2
    const scope = Symbol('s');
    for (let i = 0; i < 4; i++) orch.emphasize(el(`e${i}`), [{ opacity: 1 }], {}, scope);
    expect(engine.calls).toHaveLength(2);
    engine.calls[0].handle.settle();
    await flush();
    expect(engine.calls).toHaveLength(3);
  });
});
