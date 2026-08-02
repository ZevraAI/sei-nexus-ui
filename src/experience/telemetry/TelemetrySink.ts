/** Zevra Experience Layer — Experience Telemetry seam (§6, Runtime Invariant 12).
 *  EXPERIENCE-ONLY. Rides the Event Bus; a single subscriber forwards events to a sink.
 *  Never mixed with business analytics — different sink, different namespace. */
import type { ExperienceEvent } from '../events/events';
import type { ExperienceEventBus } from '../events/ExperienceEventBus';
import type { Unsubscribe } from '../types';

export interface ExperienceTelemetrySink {
  record(event: ExperienceEvent): void;
}

/** Default: records nothing. Wiring a real sink is a later, isolated step. */
export const noopSink: ExperienceTelemetrySink = { record() {} };

/** Dev aid: logs experience events to the console (namespaced `[zx]`). */
export const consoleSink: ExperienceTelemetrySink = {
  record(e) { if (import.meta.env?.DEV) console.debug('[zx:telemetry]', e.type, e); },
};

/** Bridge the Bus to a sink. Returns an unsubscribe for teardown (Invariant 10). */
export function bridgeTelemetry(bus: ExperienceEventBus, sink: ExperienceTelemetrySink): Unsubscribe {
  return bus.subscribe('*', (e) => sink.record(e));
}
