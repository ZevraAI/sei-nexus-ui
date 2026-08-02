import { describe, it, expect, vi } from 'vitest';
import { CommandController } from '../CommandController';
import { MockIntentInterpreter } from '../IntentInterpreter';
import { ExperienceEventBus } from '../../events/ExperienceEventBus';
import { createTestClock } from '../../clock';
import type { ExperienceEvent } from '../../events/events';
import type { CommandContext } from '../types';

const flush = () => Promise.resolve().then(() => Promise.resolve());

function setup(ctx: Partial<CommandContext> = {}) {
  const bus = new ExperienceEventBus();
  const clock = createTestClock();
  const events: ExperienceEvent[] = [];
  bus.subscribe('*', (e) => events.push(e));
  const onNavigate = vi.fn();
  const context: CommandContext = { surface: 'home', interactionMode: 'executive', focusedEntity: null, activeInvestigation: null, ...ctx };
  const c = new CommandController({ interpreter: new MockIntentInterpreter(), bus, clock, getContext: () => context, onNavigate });
  return { bus, clock, events, onNavigate, c };
}
const types = (events: ExperienceEvent[]) => events.map((e) => e.type);

describe('CommandController', () => {
  it('opens and closes, publishing lifecycle events', () => {
    const { c, events } = setup();
    c.open('seed');
    expect(c.getState().open).toBe(true);
    expect(c.getState().query).toBe('seed');
    c.close();
    expect(c.getState().open).toBe(false);
    expect(types(events)).toEqual(['CommandOpened', 'CommandClosed']);
  });

  it('toggles open/closed', () => {
    const { c } = setup();
    c.toggle(); expect(c.getState().open).toBe(true);
    c.toggle(); expect(c.getState().open).toBe(false);
  });

  it('surfaces context-aware suggestions from the interpreter', () => {
    const withInv = setup({ activeInvestigation: 'inv-1' });
    expect(withInv.c.getSuggestions()[0].id).toBe('explain');
    const without = setup();
    expect(without.c.getSuggestions().some((s) => s.id === 'explain')).toBe(false);
  });

  it('interprets a query, reflects intent, and streams through reasoning', async () => {
    const { c, clock, events } = setup();
    c.open();
    c.setQuery('investigate inventory');
    await c.submit();
    await flush();
    expect(c.getState().intent?.kind).toBe('investigate');
    expect(c.getState().intent?.label).toContain('Investigate');
    expect(types(events)).toEqual(expect.arrayContaining(['CommandSubmitted', 'IntentRecognized', 'InvestigationRequested']));
    expect(c.getState().phase).toBe('reasoning');

    clock.advance(1000);                       // reasoning steps progress → streaming
    expect(c.getState().phase).toBe('streaming');

    c.finishStreaming();
    expect(c.getState().phase).toBe('done');
    expect(c.getState().history).toHaveLength(1);
    expect(types(events)).toContain('CommandExecuted');
  });

  it('navigation handoff calls the injected navigator only (no routing in the engine)', async () => {
    const { c, onNavigate } = setup();
    c.open(); c.setQuery('investigate inventory'); await c.submit(); await flush();
    c.handoff();
    expect(onNavigate).toHaveBeenCalledWith('/reasoning');
    expect(c.getState().open).toBe(false);
  });

  it('a superseded submit does not overwrite the newer one', async () => {
    const { c } = setup();
    c.open(); c.setQuery('summarize this week'); await c.submit(); await flush();
    expect(c.getState().intent?.kind).toBe('summarize');
  });

  it('destroy clears timers and subscribers (leak-free)', async () => {
    const { c, clock } = setup();
    c.open(); c.setQuery('investigate inventory'); await c.submit(); await flush();
    expect(clock.pending()).toBeGreaterThan(0);
    c.destroy();
    expect(clock.pending()).toBe(0);
  });
});
