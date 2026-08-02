import { describe, it, expect, vi } from 'vitest';
import { MotionEngine } from '../MotionEngine';
import { DEFAULT_BUDGETS } from '../../config';
import { createTestClock } from '../../clock';
import { PriorityResolver, AnimationQueue, CancellationManager, InterruptionManager, IdleCoordinator } from '../managers';
import { RevealPriority } from '../types';
import type { ScopedAnimation, RevealItem } from '../types';

// ── a controllable fake animation ────────────────────────────────────────────
class FakeHandle implements ScopedAnimation {
  done = false; finishCalls = 0; disposeCalls = 0;
  private resolve!: () => void;
  readonly finished = new Promise<void>((r) => { this.resolve = r; });
  settle() { if (!this.done) { this.done = true; this.resolve(); } }
  finish() { this.finishCalls++; this.settle(); }
  dispose() { this.disposeCalls++; this.settle(); }
}

// ── MotionEngine ─────────────────────────────────────────────────────────────
describe('MotionEngine', () => {
  const deps = (over: Partial<{ enabled: boolean; reduced: boolean }> = {}) => ({
    budgets: DEFAULT_BUDGETS,
    isEnabled: () => over.enabled ?? true,
    isReduced: () => over.reduced ?? false,
  });

  it('resolves durations from the token fallback', () => {
    const e = new MotionEngine(deps());
    expect(e.dur('base')).toBe(220);
    expect(e.dur('deliberate')).toBe(560);
  });

  it('clamps duration to the max-animation budget and calls WAAPI once', () => {
    const e = new MotionEngine(deps());
    const calls: any[] = [];
    const el: any = { style: {}, animate: (kf: any, opts: any) => { calls.push({ kf, opts }); return { finished: Promise.resolve(), finish() {}, cancel() {} }; } };
    e.animate(el, e.presets.rise, { duration: 9999 });
    expect(calls).toHaveLength(1);
    expect(calls[0].opts.duration).toBe(560);          // clamped to budget
    expect(calls[0].opts.fill).toBe('both');           // flash-free stagger
  });

  it('reduced-motion applies the final state instantly, without WAAPI', () => {
    const e = new MotionEngine(deps({ reduced: true }));
    const animate = vi.fn();
    const el: any = { style: {} as Record<string, string>, animate };
    const h = e.animate(el, e.presets.rise);
    expect(animate).not.toHaveBeenCalled();
    expect(el.style.opacity).toBe('1');                // last keyframe applied
    expect(h.done).toBe(true);
  });

  it('kill-switch also collapses to instant', () => {
    const e = new MotionEngine(deps({ enabled: false }));
    const animate = vi.fn();
    const el: any = { style: {}, animate };
    expect(e.animate(el, e.presets.rise).done).toBe(true);
    expect(animate).not.toHaveBeenCalled();
  });

  it('degrades to instant when WAAPI is absent (no el.animate)', () => {
    const e = new MotionEngine(deps());
    const el: any = { style: {} };
    expect(e.animate(el, e.presets.rise).done).toBe(true);
  });
});

// ── PriorityResolver ─────────────────────────────────────────────────────────
describe('PriorityResolver', () => {
  const item = (priority: number, id: string): RevealItem => ({ el: { id } as any, priority, keyframes: [] });

  it('orders by priority then registration order (stable)', () => {
    const ordered = PriorityResolver.order([
      item(RevealPriority.NORMAL, 'a'), item(RevealPriority.CRITICAL, 'b'),
      item(RevealPriority.HIGH, 'c'), item(RevealPriority.CRITICAL, 'd'),
    ]);
    expect(ordered.map((i) => (i.el as any).id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('clamps stagger so the compose fits the completion budget', () => {
    expect(PriorityResolver.effectiveStagger(3, 60, DEFAULT_BUDGETS)).toBe(60);
    const many = PriorityResolver.effectiveStagger(200, 60, DEFAULT_BUDGETS);
    expect(many).toBeLessThan(60);
    expect(199 * many + DEFAULT_BUDGETS.maxAnimationMs).toBeLessThanOrEqual(DEFAULT_BUDGETS.revealCompleteTargetMs);
    expect(PriorityResolver.effectiveStagger(1, 60, DEFAULT_BUDGETS)).toBe(0);
  });
});

// ── AnimationQueue — concurrency budget ──────────────────────────────────────
describe('AnimationQueue', () => {
  it('never exceeds the concurrency limit', async () => {
    const q = new AnimationQueue(2);
    const handles: FakeHandle[] = [];
    for (let i = 0; i < 4; i++) q.add(() => { const h = new FakeHandle(); handles.push(h); return h; });
    expect(q.activeCount).toBe(2);
    expect(q.queuedCount).toBe(2);
    handles[0].settle();
    await Promise.resolve();
    expect(handles).toHaveLength(3);       // a queued task started
    handles[1].settle(); handles[2].settle();
    await Promise.resolve(); await Promise.resolve();
    expect(handles).toHaveLength(4);
  });
});

// ── CancellationManager + InterruptionManager ────────────────────────────────
describe('Cancellation & Interruption', () => {
  it('cancels every animation in a scope and clears tracking', () => {
    const cm = new CancellationManager();
    const scope = Symbol('s');
    const a = new FakeHandle(); const b = new FakeHandle();
    cm.track(scope, a); cm.track(scope, b);
    expect(cm.activeCount()).toBe(2);
    cm.cancel(scope);
    expect(a.disposeCalls).toBe(1); expect(b.disposeCalls).toBe(1);
    expect(cm.activeCount()).toBe(0);
  });

  it('interruption finishes (not cancels) tracked animations', () => {
    const cm = new CancellationManager();
    const im = new InterruptionManager(cm);
    const scope = Symbol('s');
    const a = new FakeHandle();
    cm.track(scope, a);
    im.interrupt(scope);
    expect(a.finishCalls).toBe(1);
    expect(a.disposeCalls).toBe(0);
  });
});

// ── IdleCoordinator ──────────────────────────────────────────────────────────
describe('IdleCoordinator', () => {
  it('fires idle once all scopes leave (coalesced on the clock)', () => {
    const clock = createTestClock();
    const idle = new IdleCoordinator(clock);
    const cb = vi.fn();
    idle.onIdle(cb);
    const s = Symbol('s');
    idle.enter(s);
    idle.leave(s);
    expect(cb).not.toHaveBeenCalled();     // scheduled, not yet fired
    clock.advance(1);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('a new sequence cancels a pending idle', () => {
    const clock = createTestClock();
    const idle = new IdleCoordinator(clock);
    const cb = vi.fn();
    idle.onIdle(cb);
    const a = Symbol('a'); const b = Symbol('b');
    idle.enter(a); idle.leave(a);          // schedules idle
    idle.enter(b);                          // cancels it
    clock.advance(1);
    expect(cb).not.toHaveBeenCalled();
  });
});
