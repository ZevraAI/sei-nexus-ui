import { describe, it, expect, vi } from 'vitest';
import { computePosition } from '../positioning';
import { PreviewController } from '../PreviewController';
import { MockPreviewResolver } from '../PreviewResolver';
import { ExperienceEventBus } from '../../events/ExperienceEventBus';
import { createTestClock } from '../../clock';
import type { ExperienceEvent } from '../../events/events';
import type { PreviewTarget } from '../types';

const flush = () => Promise.resolve().then(() => Promise.resolve());
const target = (id: string, top = 0, left = 0): PreviewTarget => ({
  entity: { kind: 'store', id }, rect: { top, left, width: 20, height: 20 },
});

// ── collision-aware positioning ──────────────────────────────────────────────
describe('computePosition', () => {
  const vp = { width: 1000, height: 800 };
  const panel = { width: 300, height: 160 };

  it('places below the anchor when there is room', () => {
    const p = computePosition({ top: 100, left: 100, width: 40, height: 20 }, panel, vp);
    expect(p.placement).toBe('bottom');
    expect(p.top).toBe(100 + 20 + 8);
  });

  it('flips above when there is no room below', () => {
    const p = computePosition({ top: 760, left: 100, width: 40, height: 20 }, panel, vp);
    expect(p.placement).toBe('top');
  });

  it('shifts horizontally to stay within the viewport', () => {
    const p = computePosition({ top: 100, left: 950, width: 40, height: 20 }, panel, vp);
    expect(p.left).toBeLessThanOrEqual(vp.width - panel.width - 8);
    expect(p.left).toBeGreaterThanOrEqual(8);
  });
});

// ── lifecycle controller ─────────────────────────────────────────────────────
describe('PreviewController', () => {
  const setup = (openDelayMs = 100, closeDelayMs = 50) => {
    const bus = new ExperienceEventBus();
    const clock = createTestClock();
    const events: ExperienceEvent[] = [];
    bus.subscribe('*', (e) => events.push(e));
    const c = new PreviewController(new MockPreviewResolver(), bus, clock, { openDelayMs, closeDelayMs });
    return { bus, clock, events, c };
  };

  it('opens after the intent dwell, resolving via the injected resolver', async () => {
    const { clock, events, c } = setup();
    c.requestOpen(target('s1'));
    expect(c.getState().phase).toBe('idle');       // not yet — dwell
    clock.advance(100);
    await flush();
    expect(c.getState().phase).toBe('open');
    expect(c.getState().model?.title).toContain('Store s1');
    expect(events.some((e) => e.type === 'PreviewOpened')).toBe(true);
  });

  it('closes after the grace period', async () => {
    const { clock, events, c } = setup();
    c.requestOpen(target('s1')); clock.advance(100); await flush();
    c.requestClose();
    expect(c.getState().phase).toBe('open');        // grace still running
    clock.advance(50);
    expect(c.getState().phase).toBe('idle');
    expect(events.some((e) => e.type === 'PreviewClosed')).toBe(true);
  });

  it('cancelClose (re-hover) keeps the preview open', async () => {
    const { clock, c } = setup();
    c.requestOpen(target('s1')); clock.advance(100); await flush();
    c.requestClose();
    c.cancelClose();
    clock.advance(100);
    expect(c.getState().phase).toBe('open');
  });

  it('switching entity closes the old and opens the new', async () => {
    const { clock, events, c } = setup();
    c.requestOpen(target('s1')); clock.advance(100); await flush();
    events.length = 0;
    c.requestOpen(target('s2')); clock.advance(100); await flush();
    expect(c.getState().entity?.id).toBe('s2');
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['PreviewClosed', 'PreviewOpened']));
  });

  it('closeNow closes immediately (Escape)', async () => {
    const { clock, c } = setup();
    c.requestOpen(target('s1')); clock.advance(100); await flush();
    c.closeNow();
    expect(c.getState().phase).toBe('idle');
  });

  it('destroy clears timers (leak-free)', () => {
    const { clock, c } = setup();
    c.requestOpen(target('s1'));
    expect(clock.pending()).toBeGreaterThan(0);
    c.destroy();
    expect(clock.pending()).toBe(0);
  });

  it('notifies subscribers on state change and stops after unsubscribe', async () => {
    const { clock, c } = setup();
    const cb = vi.fn();
    const off = c.subscribe(cb);
    c.requestOpen(target('s1')); clock.advance(100); await flush();
    expect(cb).toHaveBeenCalled();
    off();
    const n = cb.mock.calls.length;
    c.closeNow();
    expect(cb.mock.calls.length).toBe(n);
  });
});
