// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import InvestigationPopup from '../InvestigationPopup.jsx';

function Harness({ onSubmit = () => {}, onClose = () => {}, open = true, suggestions = [] as string[] }) {
  const [value, setValue] = useState('');
  return (
    <InvestigationPopup open={open} onClose={onClose} value={value} onChange={setValue}
      onSubmit={() => onSubmit(value)} suggestions={suggestions} />
  );
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('InvestigationPopup', () => {
  it('renders nothing when closed', () => {
    render(<Harness open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a modal dialog holding a four-row brief editor', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).rows).toBe(4);
  });

  it('Escape closes it, and a click on the backdrop closes it', () => {
    const onClose = vi.fn();
    const { container } = render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(container.firstElementChild as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Ctrl+Enter submits what was typed; Enter only adds a line', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: 'Which lines are at risk?' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledWith('Which lines are at risk?');
  });

  it('a suggested question fills the editor instead of running', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} suggestions={['Which suppliers are under review?']} />);
    fireEvent.click(screen.getByText('Which suppliers are under review?'));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Which suppliers are under review?');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
