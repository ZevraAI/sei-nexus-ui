// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({ list: vi.fn(), approve: vi.fn(), archive: vi.fn() }));
vi.mock('../../api.js', () => ({ api: { instructions: api } }));

import Instructions from '../Instructions.jsx';

const pending = { instructionId: 'ins-1', instructionText: 'Always show the item description', status: 'PENDING', alwaysApply: false, submittedBy: 'a@b.com', createdAt: '2026-10-18T10:00:00Z' };

beforeEach(() => {
  api.list.mockResolvedValue([pending]);
  api.approve.mockResolvedValue({});
  api.archive.mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Instructions review', () => {
  it('lists pending instructions', async () => {
    render(<Instructions />);
    await waitFor(() => expect(screen.getByDisplayValue('Always show the item description')).toBeTruthy());
    expect(api.list).toHaveBeenCalledWith('PENDING');
  });

  it('approves with the edited wording and the always-apply choice', async () => {
    render(<Instructions />);
    const box = await screen.findByDisplayValue('Always show the item description');
    fireEvent.change(box, { target: { value: 'Show item description on line items' } });
    fireEvent.click(screen.getByLabelText(/Always apply/));
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('ins-1',
      { text: 'Show item description on line items', alwaysApply: true }));
  });

  it('rejects a pending instruction by archiving it', async () => {
    render(<Instructions />);
    fireEvent.click(await screen.findByText('Reject'));
    await waitFor(() => expect(api.archive).toHaveBeenCalledWith('ins-1'));
  });

  it('shows the server error when approval fails', async () => {
    api.approve.mockRejectedValue(new Error('At most 5 instructions can be set to always apply'));
    render(<Instructions />);
    fireEvent.click(await screen.findByText('Approve'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('At most 5'));
  });
});
