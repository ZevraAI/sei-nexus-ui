import { useEffect, useRef } from 'react';
import InvestigationComposer from './InvestigationComposer.jsx';

const FOCUSABLE = 'button:not([disabled]), textarea, input, [href], [tabindex]:not([tabindex="-1"])';

/**
 * The top search's popup: a modal brief editor opened from the shell's search field (click or
 * Ctrl+K). Same editor as the empty investigation page, plus suggested questions. Escape or a click
 * outside closes it; what was typed stays in the consumer's `value`, so reopening shows the draft.
 */
export default function InvestigationPopup({ open, onClose, value, onChange, onSubmit, onSlashCommand, suggestions = [] }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {   // the slash menu consumes its own Escape
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[var(--z-overlay)] px-3 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="New investigation"
        className="w-full max-w-[720px] animate-z-rise-scale overflow-hidden rounded-z-xl border border-z-border bg-z-surface shadow-z-4"
      >
        <div className="px-4 pb-3 pt-4">
          <p className="mb-2 font-z-mono text-[10px] uppercase tracking-[0.14em] text-z-text-3">New investigation</p>
          <InvestigationComposer
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            onSlashCommand={onSlashCommand}
            placeholder="Describe it the way you would brief an analyst. Several lines are fine, or type / for commands."
            autoFocus
            disabled={!value.trim()}
            submitKey="mod-enter"
            minRows={4}
            menuPlacement="bottom"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="border-t border-z-border px-2 pb-2 pt-1">
            <p className="px-2 pb-1 pt-2 font-z-mono text-[10px] uppercase tracking-[0.14em] text-z-text-3">Suggested</p>
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onChange(q)}
                className="block w-full rounded-z-md px-2 py-2 text-left text-[13px] text-z-text-2 transition-colors hover:bg-z-selected hover:text-z-text"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
