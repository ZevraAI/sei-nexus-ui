// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import InvestigationComposer from '../InvestigationComposer.jsx';

function Harness({ onSubmit, initial = '', ...rest }: any) {
  const [value, setValue] = useState(initial);
  return <InvestigationComposer value={value} onChange={setValue} onSubmit={onSubmit} {...rest} />;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('InvestigationComposer multi-line input', () => {
  it('grows to fit a multi-line question', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(180);
    render(<Harness onSubmit={() => {}} initial={'line one\nline two\nline three'} />);
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(box.style.height).toBe('180px');
  });

  it('follow-up mode: Enter sends a single line; Shift+Enter does not', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} initial="Which lines are at risk?" />);
    const box = screen.getByRole('textbox');
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('follow-up mode: once the text has a second line, Enter adds a line and Ctrl+Enter sends', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} initial={'first line\nsecond line'} />);
    const box = screen.getByRole('textbox');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('brief mode: Enter never sends, Ctrl/Cmd+Enter does, and it starts four rows tall', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} initial="One line" submitKey="mod-enter" minRows={4} />);
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(box.rows).toBe(4);
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Enter adds a line/)).toBeTruthy();
  });
});
