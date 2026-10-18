// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import InvestigationComposer from '../InvestigationComposer.jsx';

function Harness({ onSubmit, initial = '' }) {
  const [value, setValue] = useState(initial);
  return <InvestigationComposer value={value} onChange={setValue} onSubmit={onSubmit} />;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('InvestigationComposer multi-line input', () => {
  it('grows to fit a multi-line question', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(180);
    render(<Harness onSubmit={() => {}} initial={'line one\nline two\nline three'} />);
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(box.style.height).toBe('180px');
  });

  it('Shift+Enter adds a line and does not send; Enter sends', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} initial="Which lines are at risk?" />);
    const box = screen.getByRole('textbox');
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
