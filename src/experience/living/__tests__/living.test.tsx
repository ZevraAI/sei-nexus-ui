// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, renderHook, act, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ExperienceProvider } from '../../ExperienceProvider';
import { LivingCard, LivingMetricCard } from '../LivingCards';
import { LivingStatusDot } from '../LivingControls';
import { useProgressiveDisclosure } from '../useProgressiveDisclosure';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const wrap = (ui: ReactNode, config = {}) =>
  render(<ExperienceProvider config={config}>{ui}</ExperienceProvider>);

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches, media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    dispatchEvent() { return false; },
  }));
}

describe('Living composition (runtime → wrapper → frozen DS)', () => {
  it('LivingCard renders the DS Card and applies the seam markers', () => {
    const { container } = wrap(
      <LivingCard sharedId="c1" previewEntity={{ kind: 'store', id: 's42' }}>hello</LivingCard>,
      { enabled: false },
    );
    const el = container.querySelector('[data-z-shared="c1"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-z-preview-kind')).toBe('store');
    expect(el?.getAttribute('data-z-preview-id')).toBe('s42');
    expect(container.textContent).toContain('hello');
  });

  it('LivingMetricCard reuses AnimatedCounter and shows the final value under the kill-switch', () => {
    // enabled:false → the Motion Runtime resolves instantly; the counter lands on its value.
    const { container } = wrap(
      <LivingMetricCard value={42} label="Coverage" format={(n) => `${Math.round(n)}%`} />,
      { enabled: false },
    );
    expect(container.textContent).toContain('42%');
    expect(container.textContent).toContain('Coverage');
  });

  it('LivingStatusDot propagates reduced-motion (heartbeat stops)', () => {
    mockReducedMotion(true);
    const reduced = render(<LivingStatusDot status="running" live />);
    expect(reduced.container.querySelector('.animate-z-pulse-ring')).toBeNull();
    cleanup();

    mockReducedMotion(false);
    const normal = render(<LivingStatusDot status="running" live />);
    expect(normal.container.querySelector('.animate-z-pulse-ring')).not.toBeNull();
  });

  it('unmounts cleanly (no throw — leak-free teardown)', () => {
    const { unmount } = wrap(<LivingMetricCard value={7} label="X" />, { enabled: false });
    expect(() => unmount()).not.toThrow();
  });
});

describe('useProgressiveDisclosure', () => {
  it('toggles open state and drives a11y content props', () => {
    const { result } = renderHook(() => useProgressiveDisclosure());
    expect(result.current.open).toBe(false);
    expect(result.current.contentProps.hidden).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    expect(result.current.contentProps.hidden).toBe(false);
    expect(result.current.triggerProps['aria-controls']).toBe(result.current.contentProps.id);
  });
});
