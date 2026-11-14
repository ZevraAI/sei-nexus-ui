// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
// @ts-expect-error — JSX module without types
import DraftComposer from '../DraftComposer.jsx';

afterEach(cleanup);

describe('DraftComposer', () => {
  it('keeps the draft internally and hands the parent the text only on submit', () => {
    const onSubmit = vi.fn();
    render(<DraftComposer onSubmit={onSubmit} placeholder="Ask" />);
    const box = screen.getByPlaceholderText('Ask') as HTMLTextAreaElement;

    fireEvent.change(box, { target: { value: 'top suppliers by spend' } });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByLabelText("Send")[0]);
    expect(onSubmit).toHaveBeenCalledWith('top suppliers by spend');
    expect(box.value).toBe('');
  });

  it('does not send empty text unless an attachment allows it', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<DraftComposer onSubmit={onSubmit} placeholder="Ask" />);
    expect((screen.getAllByLabelText("Send")[0] as HTMLButtonElement).disabled).toBe(true);
    rerender(<DraftComposer onSubmit={onSubmit} placeholder="Ask" canSubmitEmpty />);
    expect((screen.getAllByLabelText("Send")[0] as HTMLButtonElement).disabled).toBe(false);
  });
});
