import { describe, it, expect, vi } from 'vitest';
import { MotionEngine } from '../MotionEngine';
import { DEFAULT_BUDGETS } from '../../config';
import type { FrameSource } from '../types';

/** Manual frame source — deterministic RAF. */
function fakeFrame() {
  let t = 0;
  let queued: ((now: number) => void) | null = null;
  const source: FrameSource = {
    request: (cb) => { queued = cb; return 1; },
    cancel: () => { queued = null; },
    now: () => t,
  };
  return {
    source,
    tick(dt: number) { t += dt; const cb = queued; queued = null; if (cb) cb(t); },
    get pending() { return queued !== null; },
  };
}

const deps = (over: Partial<{ enabled: boolean; reduced: boolean; frame: FrameSource | null }> = {}) => ({
  budgets: DEFAULT_BUDGETS,
  isEnabled: () => over.enabled ?? true,
  isReduced: () => over.reduced ?? false,
  frame: over.frame === undefined ? fakeFrame().source : over.frame,
});

describe('MotionEngine.tween', () => {
  it('animates through frames to the final value', () => {
    const frame = fakeFrame();
    const e = new MotionEngine(deps({ frame: frame.source }));
    const updates: number[] = [];
    const onComplete = vi.fn();
    e.tween({ from: 0, to: 100, duration: 100, onUpdate: (v) => updates.push(v), onComplete });

    frame.tick(50);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[updates.length - 1]).toBeGreaterThan(0);
    expect(onComplete).not.toHaveBeenCalled();

    frame.tick(50);                           // reaches t = 100 (progress 1)
    expect(updates[updates.length - 1]).toBe(100);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('reduced-motion emits the final value instantly (no frames)', () => {
    const frame = fakeFrame();
    const e = new MotionEngine(deps({ reduced: true, frame: frame.source }));
    const updates: number[] = [];
    const h = e.tween({ from: 0, to: 42, duration: 500, onUpdate: (v) => updates.push(v) });
    expect(updates).toEqual([42]);
    expect(h.done).toBe(true);
    expect(frame.pending).toBe(false);
  });

  it('kill-switch also emits instantly', () => {
    const e = new MotionEngine(deps({ enabled: false }));
    const updates: number[] = [];
    e.tween({ from: 10, to: 20, onUpdate: (v) => updates.push(v) });
    expect(updates).toEqual([20]);
  });

  it('degrades to instant when there is no frame source (Node)', () => {
    const e = new MotionEngine(deps({ frame: null }));
    const updates: number[] = [];
    expect(e.tween({ from: 0, to: 5, onUpdate: (v) => updates.push(v) }).done).toBe(true);
    expect(updates).toEqual([5]);
  });

  it('cancel stops further frames', () => {
    const frame = fakeFrame();
    const e = new MotionEngine(deps({ frame: frame.source }));
    const updates: number[] = [];
    const h = e.tween({ from: 0, to: 100, duration: 100, onUpdate: (v) => updates.push(v) });
    frame.tick(20);
    const count = updates.length;
    h.cancel();
    frame.tick(80);
    expect(updates.length).toBe(count);      // no more updates after cancel
    expect(h.done).toBe(true);
  });
});
