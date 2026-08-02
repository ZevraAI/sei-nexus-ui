/** Zevra Experience Layer — PulseSource (Phase 3.3, business-logic boundary — Rule 2).
 *  The Pulse engine consumes ONLY this. A real source (polling/SSE/WebSocket over governed data)
 *  is injected in a later, isolated step; the engine never changes. `MockPulseSource` powers
 *  dev/tests deterministically. */
import type { PulseState, Unsubscribe } from '../types';

export interface PulseSource {
  /** Subscribe to pulse state. Implementations SHOULD emit the current state immediately. */
  subscribe(cb: (state: PulseState) => void): Unsubscribe;
}

export const INITIAL_PULSE: PulseState = {
  coverage: 0,
  freshness: 0,
  reasoningLoad: 0,
  activityRate: 0,
  confidenceTrend: 'flat',
  status: 'watching',
};

/** Deterministic in-memory source. Tests drive it with `emit(...)`; no timers, no network. */
export class MockPulseSource implements PulseSource {
  private state: PulseState;
  private readonly subs = new Set<(s: PulseState) => void>();

  constructor(initial: Partial<PulseState> = {}) {
    this.state = { ...INITIAL_PULSE, ...initial };
  }

  subscribe(cb: (state: PulseState) => void): Unsubscribe {
    this.subs.add(cb);
    cb(this.state);                      // emit current immediately
    return () => this.subs.delete(cb);
  }

  /** Push a partial update to all subscribers (test/dev driver). */
  emit(next: Partial<PulseState>): void {
    this.state = { ...this.state, ...next };
    for (const cb of [...this.subs]) cb(this.state);
  }

  get current(): PulseState { return this.state; }
  get subscriberCount(): number { return this.subs.size; }
}
