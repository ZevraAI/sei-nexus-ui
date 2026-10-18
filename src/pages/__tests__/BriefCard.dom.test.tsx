// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { BriefCard } from '../Chat.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const LONG = Array.from({ length: 9 }, (_, i) => `Line ${i + 1} of the brief`).join('\n');

describe('BriefCard', () => {
  it('shows the full brief, keeping its line breaks', () => {
    const text = 'First line\nSecond line';
    render(<BriefCard question={text} onRerun={() => {}} />);
    const p = screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === text);
    expect(p).toBeTruthy();
    expect(p.className).toContain('whitespace-pre-wrap');
    expect(screen.queryByText('Show more')).toBeNull();
  });

  it('offers Show more / Show less for a brief longer than six lines', () => {
    render(<BriefCard question={LONG} onRerun={() => {}} />);
    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByText('Show less')).toBeTruthy();
  });

  it('Edit and re-run runs the edited text; Cancel changes nothing', () => {
    const onRerun = vi.fn();
    render(<BriefCard question="Original brief" onRerun={onRerun} />);
    fireEvent.click(screen.getByText('Edit and re-run'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onRerun).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Edit and re-run'));
    fireEvent.change(screen.getByLabelText('Edit the brief'), { target: { value: '  Edited brief  ' } });
    fireEvent.click(screen.getByText('Re-run'));
    expect(onRerun).toHaveBeenCalledWith('Edited brief');
  });

  it('will not re-run an empty brief', () => {
    const onRerun = vi.fn();
    render(<BriefCard question="Original brief" onRerun={onRerun} />);
    fireEvent.click(screen.getByText('Edit and re-run'));
    fireEvent.change(screen.getByLabelText('Edit the brief'), { target: { value: '   ' } });
    expect((screen.getByText('Re-run') as HTMLButtonElement).closest('button')!.disabled).toBe(true);
  });
});
