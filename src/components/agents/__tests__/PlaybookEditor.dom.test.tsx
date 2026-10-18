// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({
  playbooks: vi.fn(),
  createPlaybook: vi.fn(),
  updatePlaybook: vi.fn(),
  deletePlaybook: vi.fn(),
}));
vi.mock('../../../api.js', () => ({ api: { zevraAgents: api } }));

import PlaybookEditor from '../PlaybookEditor.jsx';

const existing = { id: 'pb-1', name: 'Stock-out triage', whenToUse: 'a stock-out is reported', steps: '1. find item' };

beforeEach(() => {
  api.playbooks.mockResolvedValue([existing]);
  api.createPlaybook.mockResolvedValue({});
  api.updatePlaybook.mockResolvedValue({});
  api.deletePlaybook.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PlaybookEditor', () => {
  it('lists the agent\'s playbooks', async () => {
    render(<PlaybookEditor agentId="ag-1" />);
    await waitFor(() => expect(screen.getByText('Stock-out triage')).toBeTruthy());
    expect(api.playbooks).toHaveBeenCalledWith('ag-1');
  });

  it('refuses to save without a name, trigger and steps', async () => {
    render(<PlaybookEditor agentId="ag-1" />);
    fireEvent.click(await screen.findByText('Add'));
    fireEvent.click(screen.getByText('Add playbook'));
    expect(screen.getByText(/are required/)).toBeTruthy();
    expect(api.createPlaybook).not.toHaveBeenCalled();
  });

  it('creates a playbook with the three required fields', async () => {
    render(<PlaybookEditor agentId="ag-1" />);
    fireEvent.click(await screen.findByText('Add'));
    fireEvent.change(screen.getByLabelText('Playbook name'), { target: { value: 'Returns spike' } });
    fireEvent.change(screen.getByLabelText('Use when'), { target: { value: 'returns jump' } });
    fireEvent.change(screen.getByLabelText('Steps'), { target: { value: '1. compare weeks' } });
    fireEvent.click(screen.getByText('Add playbook'));
    await waitFor(() => expect(api.createPlaybook).toHaveBeenCalledWith('ag-1', expect.objectContaining({
      name: 'Returns spike', whenToUse: 'returns jump', steps: '1. compare weeks',
    })));
  });

  it('edits an existing playbook through update, not create', async () => {
    render(<PlaybookEditor agentId="ag-1" />);
    fireEvent.click(await screen.findByLabelText('Edit Stock-out triage'));
    fireEvent.change(screen.getByLabelText('Steps'), { target: { value: '1. new' } });
    fireEvent.click(screen.getByText('Save playbook'));
    await waitFor(() => expect(api.updatePlaybook).toHaveBeenCalledWith('ag-1', 'pb-1',
      expect.objectContaining({ steps: '1. new' })));
    expect(api.createPlaybook).not.toHaveBeenCalled();
  });

  it('archives after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PlaybookEditor agentId="ag-1" />);
    fireEvent.click(await screen.findByLabelText('Archive Stock-out triage'));
    await waitFor(() => expect(api.deletePlaybook).toHaveBeenCalledWith('ag-1', 'pb-1'));
  });
});
