import { describe, it, expect, vi } from 'vitest';
import { ExperienceEventBus } from '../events/ExperienceEventBus';
import type { ExperienceEvent } from '../events/events';

const pulse: ExperienceEvent = {
  type: 'PulseUpdated',
  state: { coverage: 98, freshness: 12, reasoningLoad: 3, activityRate: 1, confidenceTrend: 'up', status: 'watching' },
};
const command: ExperienceEvent = { type: 'CommandExecuted', intent: 'investigate' };

describe('ExperienceEventBus', () => {
  it('delivers to a typed subscriber', () => {
    const bus = new ExperienceEventBus();
    const seen: string[] = [];
    bus.subscribe('PulseUpdated', (e) => seen.push(e.type));
    bus.publish(pulse);
    expect(seen).toEqual(['PulseUpdated']);
  });

  it('does not deliver other types to a typed subscriber', () => {
    const bus = new ExperienceEventBus();
    const fn = vi.fn();
    bus.subscribe('PulseUpdated', fn);
    bus.publish(command);
    expect(fn).not.toHaveBeenCalled();
  });

  it('wildcard receives every event', () => {
    const bus = new ExperienceEventBus();
    const seen: string[] = [];
    bus.subscribe('*', (e) => seen.push(e.type));
    bus.publish(pulse);
    bus.publish(command);
    expect(seen).toEqual(['PulseUpdated', 'CommandExecuted']);
  });

  it('unsubscribe stops delivery', () => {
    const bus = new ExperienceEventBus();
    const fn = vi.fn();
    const off = bus.subscribe('CommandExecuted', fn);
    off();
    bus.publish(command);
    expect(fn).not.toHaveBeenCalled();
  });

  it('isolates a throwing handler so others still receive', () => {
    const bus = new ExperienceEventBus();
    const ok = vi.fn();
    bus.subscribe('CommandExecuted', () => { throw new Error('boom'); });
    bus.subscribe('CommandExecuted', ok);
    expect(() => bus.publish(command)).not.toThrow();
    expect(ok).toHaveBeenCalledOnce();
  });

  it('clear() removes all subscribers', () => {
    const bus = new ExperienceEventBus();
    const fn = vi.fn();
    bus.subscribe('*', fn);
    bus.clear();
    bus.publish(command);
    expect(fn).not.toHaveBeenCalled();
  });
});
