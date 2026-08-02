// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ExperienceProvider } from '../../ExperienceProvider';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); cleanup(); });

const App = () => (
  <ExperienceProvider>
    <div>page content</div>
  </ExperienceProvider>
);

describe('Command Experience (auto — no page wiring)', () => {
  it('opens on Ctrl/⌘-K and closes on Escape', () => {
    render(<App />);
    expect(document.querySelector('[role="dialog"][aria-label="Ask Zevra"]')).toBeNull();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(document.querySelector('[role="dialog"][aria-label="Ask Zevra"]')).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('[role="dialog"][aria-label="Ask Zevra"]')).toBeNull();
  });

  it('shows contextual suggestions before a keystroke', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(document.body.textContent).toContain('Suggested');
    expect(document.body.textContent).toContain('Investigate the Southwest inventory drop');
  });

  it('reflects intent and streams a governed answer', async () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'investigate inventory' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await vi.advanceTimersByTimeAsync(2000);       // interpret → reasoning → streaming → done

    expect(document.body.textContent).toContain('Investigate →');       // intent reflection
    expect(document.body.textContent).toContain('missed inbound');      // streamed answer
    expect(document.body.textContent).toContain('governed business data');
  });
});
