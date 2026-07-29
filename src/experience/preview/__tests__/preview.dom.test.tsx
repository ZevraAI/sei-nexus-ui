// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ExperienceProvider } from '../../ExperienceProvider';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); cleanup(); });

/** A bare element carrying the seam a Living Component would emit — no page code. */
function Seeded({ config = {} }: { config?: object }) {
  return (
    <ExperienceProvider config={config}>
      <div data-z-preview-kind="store" data-z-preview-id="s1">Store card</div>
    </ExperienceProvider>
  );
}

describe('Preview delegation (auto-behavior from data-z-preview-* seams)', () => {
  it('opens a preview on hover after the dwell, then closes on Escape', async () => {
    const { getByText } = render(<Seeded />);
    fireEvent.pointerOver(getByText('Store card'));
    await vi.advanceTimersByTimeAsync(400);                 // past the intent dwell

    const panel = document.querySelector('[role="dialog"]');
    expect(panel).not.toBeNull();
    expect(document.body.textContent).toContain('Store s1');  // MockPreviewResolver output

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('still opens under the kill-switch (behavior is independent of motion)', async () => {
    render(<Seeded config={{ enabled: false }} />);
    fireEvent.pointerOver(document.querySelector('[data-z-preview-kind]')!);
    await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('does not open for unmarked elements', async () => {
    const { getByText } = render(
      <ExperienceProvider><div>plain</div></ExperienceProvider>,
    );
    fireEvent.pointerOver(getByText('plain'));
    await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
