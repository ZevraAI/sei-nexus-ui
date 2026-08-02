/** Zevra Experience Layer — Experience Event Bus (§9.1b).
 *  Typed, in-memory, synchronous pub/sub. The sole cross-engine channel
 *  (Runtime Invariant 3). Not a broker: no persistence, no network, no async guarantees
 *  beyond "handlers run in subscription order during publish". */
import type { Unsubscribe } from '../types';
import type { ExperienceEvent, ExperienceEventType, EventOf } from './events';

type AnyHandler = (e: ExperienceEvent) => void;

export class ExperienceEventBus {
  private readonly byType = new Map<ExperienceEventType, Set<AnyHandler>>();
  private readonly wildcard = new Set<AnyHandler>();

  /** Publish an event to typed subscribers, then wildcard subscribers.
   *  Handler exceptions are isolated so one bad subscriber can't break the bus. */
  publish(event: ExperienceEvent): void {
    const typed = this.byType.get(event.type);
    if (typed) for (const h of [...typed]) this.safe(h, event);
    for (const h of [...this.wildcard]) this.safe(h, event);
  }

  /** Subscribe to one event type, or '*' for all. Returns an unsubscribe fn. */
  subscribe<T extends ExperienceEventType>(
    type: T | '*',
    handler: (e: T extends ExperienceEventType ? EventOf<T> : ExperienceEvent) => void,
  ): Unsubscribe {
    const h = handler as AnyHandler;
    if (type === '*') {
      this.wildcard.add(h);
      return () => this.wildcard.delete(h);
    }
    let set = this.byType.get(type);
    if (!set) { set = new Set(); this.byType.set(type, set); }
    set.add(h);
    return () => set!.delete(h);
  }

  /** Remove every subscriber (used on provider teardown — Invariant 10: leak-free). */
  clear(): void {
    this.byType.clear();
    this.wildcard.clear();
  }

  private safe(h: AnyHandler, e: ExperienceEvent): void {
    try { h(e); } catch (err) {
      if (import.meta.env?.DEV) console.error('[zx] event handler error', e.type, err);
    }
  }
}
