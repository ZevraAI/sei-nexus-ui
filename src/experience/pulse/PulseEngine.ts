/** Zevra Experience Layer — PulseEngine (Phase 3.3, Layer A: no React).
 *  The signature capability's runtime core. Owns ONLY: subscription lifecycle, state, the
 *  last-update timestamp (freshness base), local subscribers, and Event Bus publication.
 *  No business logic, no motion, no presentation (Rules 1–5). One source subscription. */
import type { Clock } from '../clock';
import type { ExperienceEventBus } from '../events/ExperienceEventBus';
import type { PulseState, Unsubscribe } from '../types';
import type { PulseSource } from './PulseSource';

export class PulseEngine {
  private state: PulseState | null = null;
  private lastUpdateAt = 0;
  private sourceUnsub: Unsubscribe | null = null;
  private readonly listeners = new Set<(s: PulseState) => void>();

  constructor(
    private readonly source: PulseSource,
    private readonly bus: ExperienceEventBus,
    private readonly clock: Clock,
  ) {}

  /** Begin consuming the source. Idempotent — exactly one subscription (Rule: one Pulse subscription). */
  start(): void {
    if (this.sourceUnsub) return;
    this.sourceUnsub = this.source.subscribe((s) => this.ingest(s));
  }

  /** Stop and release everything (leak-free). */
  stop(): void {
    this.sourceUnsub?.();
    this.sourceUnsub = null;
    this.listeners.clear();
  }

  getState(): PulseState | null { return this.state; }
  /** Clock time of the last update — the base for freshness display. */
  lastUpdate(): number { return this.lastUpdateAt; }

  /** Local subscription for the React hook (useSyncExternalStore). */
  subscribe(cb: (s: PulseState) => void): Unsubscribe {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private ingest(next: PulseState): void {
    const prev = this.state;
    this.state = next;
    this.lastUpdateAt = this.clock.now();

    // Cross-engine communication ONLY via the Event Bus (Rule 4).
    if (!prev || prev.status !== next.status) {
      this.bus.publish({ type: 'PulseStatusChanged', from: prev?.status ?? next.status, to: next.status });
    }
    if (!prev || prev.freshness !== next.freshness) {
      this.bus.publish({ type: 'PulseFreshnessChanged', freshness: next.freshness });
    }
    this.bus.publish({ type: 'PulseUpdated', state: next });

    for (const cb of [...this.listeners]) cb(next);
  }
}
