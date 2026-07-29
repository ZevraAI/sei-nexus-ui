/** Zevra Experience Layer — Clock seam (Runtime Invariant 11: testable & deterministic).
 *  Engines take a Clock rather than touching the wall clock, so time is virtual in tests. */

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => (globalThis.setTimeout(fn, ms) as unknown as number),
  clearTimeout: (h) => globalThis.clearTimeout(h),
};

export interface TestClock extends Clock {
  /** Advance virtual time, firing due timers in order. */
  advance(ms: number): void;
  /** Pending timer count (for assertions). */
  pending(): number;
}

/** A deterministic clock for unit tests — no wall clock, no real timers. */
export function createTestClock(start = 0): TestClock {
  let t = start;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => t,
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { at: t + ms, fn }); return id; },
    clearTimeout: (h) => { timers.delete(h); },
    advance: (ms) => {
      const target = t + ms;
      // Fire in chronological order, allowing timers scheduled during callbacks.
      let guard = 0;
      while (guard++ < 10_000) {
        let next: number | null = null;
        for (const [, timer] of timers) if (timer.at <= target && (next === null || timer.at < next)) next = timer.at;
        if (next === null) break;
        t = next;
        for (const [id, timer] of [...timers]) if (timer.at === next) { timers.delete(id); timer.fn(); }
      }
      t = target;
    },
    pending: () => timers.size,
  };
}
