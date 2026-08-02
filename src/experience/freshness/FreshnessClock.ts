/** Zevra Experience Layer — FreshnessClock (Phase 3.3).
 *  A reusable runtime capability, NOT Pulse-specific: ONE shared ticking source that every
 *  "updated Ns ago" indicator subscribes to. No per-indicator timers. Uses the substrate clock,
 *  so it's deterministic in tests. Ticks only while there are subscribers (leak-free). */
import type { Clock } from '../clock';
import type { Unsubscribe } from '../types';

export class FreshnessClock {
  private readonly listeners = new Set<() => void>();
  private handle: number | null = null;

  constructor(private readonly clock: Clock, private readonly tickMs: number) {}

  /** Current time (single source of "now" for relative-time math). */
  now(): number {
    return this.clock.now();
  }

  /** Subscribe to ticks. The shared timer starts on the first subscriber, stops on the last. */
  subscribe(cb: () => void): Unsubscribe {
    this.listeners.add(cb);
    if (this.listeners.size === 1) this.start();
    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0) this.stop();
    };
  }

  get subscriberCount(): number { return this.listeners.size; }
  get ticking(): boolean { return this.handle !== null; }

  private start(): void {
    const tick = () => {
      for (const cb of [...this.listeners]) cb();
      this.handle = this.clock.setTimeout(tick, this.tickMs);
    };
    this.handle = this.clock.setTimeout(tick, this.tickMs);
  }

  private stop(): void {
    if (this.handle !== null) { this.clock.clearTimeout(this.handle); this.handle = null; }
  }
}

/** Format a relative "time since" label. Bounded, calm vocabulary. */
export function formatSince(ms: number): string {
  if (ms < 1000) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
