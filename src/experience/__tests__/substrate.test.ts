import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_BUDGETS, resolveConfig } from '../config';
import { ExperienceRegistry } from '../registry/ExperienceRegistry';
import { createTestClock } from '../clock';

describe('ExperienceConfig / budgets', () => {
  it('exposes frozen default budgets', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(true);
    expect(DEFAULT_BUDGETS.maxAnimationMs).toBe(560);       // = --z-dur-deliberate
    expect(DEFAULT_BUDGETS.maxConcurrentForeground).toBe(2);
  });

  it('resolveConfig(undefined) returns the defaults', () => {
    expect(resolveConfig(undefined)).toBe(DEFAULT_CONFIG);
  });

  it('merges budgets field-wise, keeping unspecified ones', () => {
    const c = resolveConfig({ budgets: { staggerMs: 80 } });
    expect(c.budgets.staggerMs).toBe(80);
    expect(c.budgets.maxAnimationMs).toBe(560);              // untouched
    expect(c.enabled).toBe(true);
  });

  it('honors the kill-switch override', () => {
    expect(resolveConfig({ enabled: false }).enabled).toBe(false);
  });
});

describe('ExperienceRegistry', () => {
  it('returns the fallback for unknown surfaces', () => {
    const r = new ExperienceRegistry().setFallback({ engines: ['reveal'] });
    expect(r.has('nope')).toBe(false);
    expect(r.get('nope').engines).toEqual(['reveal']);
  });

  it('resolves registered surfaces and engine opt-ins', () => {
    const r = new ExperienceRegistry().register('home', { engines: ['pulse', 'reveal'], interactionMode: 'executive' });
    expect(r.get('home').interactionMode).toBe('executive');
    expect(r.usesEngine('home', 'pulse')).toBe(true);
    expect(r.usesEngine('home', 'command')).toBe(false);
  });
});

describe('test clock', () => {
  it('fires timers in chronological order on advance', () => {
    const clock = createTestClock();
    const order: string[] = [];
    clock.setTimeout(() => order.push('b'), 200);
    clock.setTimeout(() => order.push('a'), 100);
    clock.advance(150);
    expect(order).toEqual(['a']);
    clock.advance(100);
    expect(order).toEqual(['a', 'b']);
  });

  it('clearTimeout cancels a pending timer', () => {
    const clock = createTestClock();
    const fn = vi.fn();
    const h = clock.setTimeout(fn, 50);
    clock.clearTimeout(h);
    clock.advance(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs timers scheduled during a callback', () => {
    const clock = createTestClock();
    const order: string[] = [];
    clock.setTimeout(() => { order.push('first'); clock.setTimeout(() => order.push('nested'), 10); }, 10);
    clock.advance(50);
    expect(order).toEqual(['first', 'nested']);
  });
});
