import { describe, it, expect, vi } from 'vitest';
import { PulseEngine } from '../PulseEngine';
import { MockPulseSource, INITIAL_PULSE } from '../PulseSource';
import { ExperienceEventBus } from '../../events/ExperienceEventBus';
import { FreshnessClock, formatSince } from '../../freshness/FreshnessClock';
import { createTestClock } from '../../clock';
import type { ExperienceEvent } from '../../events/events';

// ── MockPulseSource ──────────────────────────────────────────────────────────
describe('MockPulseSource', () => {
  it('emits the current state immediately on subscribe', () => {
    const src = new MockPulseSource({ coverage: 90 });
    const seen: number[] = [];
    src.subscribe((s) => seen.push(s.coverage));
    expect(seen).toEqual([90]);
  });

  it('notifies subscribers on emit and stops after unsubscribe', () => {
    const src = new MockPulseSource();
    const seen: number[] = [];
    const off = src.subscribe((s) => seen.push(s.coverage));
    src.emit({ coverage: 50 });
    off();
    src.emit({ coverage: 75 });
    expect(seen).toEqual([INITIAL_PULSE.coverage, 50]);
    expect(src.subscriberCount).toBe(0);
  });
});

// ── PulseEngine ──────────────────────────────────────────────────────────────
describe('PulseEngine', () => {
  const setup = () => {
    const src = new MockPulseSource({ status: 'watching', coverage: 80, freshness: 0 });
    const bus = new ExperienceEventBus();
    const clock = createTestClock(1000);
    const events: ExperienceEvent[] = [];
    bus.subscribe('*', (e) => events.push(e));
    const engine = new PulseEngine(src, bus, clock);
    return { src, bus, clock, events, engine };
  };

  it('subscribes once and exposes state on start', () => {
    const { src, engine } = setup();
    engine.start();
    engine.start();                                   // idempotent
    expect(src.subscriberCount).toBe(1);
    expect(engine.getState()?.coverage).toBe(80);
  });

  it('publishes PulseUpdated + PulseStatusChanged + PulseFreshnessChanged on first ingest', () => {
    const { engine, events } = setup();
    engine.start();
    expect(events.map((e) => e.type)).toEqual(['PulseStatusChanged', 'PulseFreshnessChanged', 'PulseUpdated']);
  });

  it('emits status/freshness change events only when they actually change', () => {
    const { src, engine, events } = setup();
    engine.start();
    events.length = 0;
    src.emit({ coverage: 85 });                       // no status/freshness change
    expect(events.map((e) => e.type)).toEqual(['PulseUpdated']);
    events.length = 0;
    src.emit({ status: 'reasoning', freshness: 5 });  // both change
    expect(events.map((e) => e.type)).toEqual(['PulseStatusChanged', 'PulseFreshnessChanged', 'PulseUpdated']);
    const statusEvt = events.find((e) => e.type === 'PulseStatusChanged') as Extract<ExperienceEvent, { type: 'PulseStatusChanged' }>;
    expect(statusEvt.to).toBe('reasoning');
  });

  it('records the last-update time from the clock (freshness base)', () => {
    const { src, engine, clock } = setup();
    engine.start();
    expect(engine.lastUpdate()).toBe(1000);
    clock.advance(5000);
    src.emit({ coverage: 81 });                       // a later emission re-stamps the time
    expect(engine.lastUpdate()).toBe(6000);
  });

  it('feeds local subscribers and cleans up on stop (leak-free)', () => {
    const { src, engine } = setup();
    const cb = vi.fn();
    engine.subscribe(cb);
    engine.start();
    expect(cb).toHaveBeenCalledTimes(1);
    engine.stop();
    expect(src.subscriberCount).toBe(0);
    src.emit({ coverage: 99 });
    expect(cb).toHaveBeenCalledTimes(1);              // no updates after stop
  });
});

// ── FreshnessClock (shared, one timer) ───────────────────────────────────────
describe('FreshnessClock', () => {
  it('runs one shared timer regardless of subscriber count', () => {
    const clock = createTestClock();
    const fc = new FreshnessClock(clock, 1000);
    const a = vi.fn(); const b = vi.fn();
    const offA = fc.subscribe(a);
    const offB = fc.subscribe(b);
    expect(fc.subscriberCount).toBe(2);
    expect(clock.pending()).toBe(1);                  // ONE timer for both
    clock.advance(1000);
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    offA(); offB();
    expect(fc.ticking).toBe(false);                   // stops with the last subscriber
    expect(clock.pending()).toBe(0);
  });

  it('formats relative time in calm units', () => {
    expect(formatSince(500)).toBe('just now');
    expect(formatSince(12_000)).toBe('12s ago');
    expect(formatSince(3 * 60_000)).toBe('3m ago');
    expect(formatSince(2 * 3_600_000)).toBe('2h ago');
  });
});
