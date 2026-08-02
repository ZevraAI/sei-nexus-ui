/** Zevra Design Language — the omnipresent command bar + ⌘K palette.
 *  Always available, always visually secondary (COMPONENTS.md / DESIGN_PHILOSOPHY.md). */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { SearchIcon } from './Input';

export interface CommandItem {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  onSelect?: () => void;
}

export interface CommandBarProps {
  placeholder?: string;
  items?: CommandItem[];
  /** Footer note under the item list. */
  footer?: ReactNode;
  className?: string;
}

/** Self-contained: renders the top-bar trigger and manages the ⌘K palette. */
export function CommandBar({
  placeholder = 'Ask or investigate anything…',
  items = [],
  footer,
  className,
}: CommandBarProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <>
      {/* Trigger — styled as a search shell, visually secondary */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-z-md border border-z-border bg-z-surface px-3.5 py-2.5',
          'text-z-body text-z-text-3 shadow-z-1 transition-colors duration-z-fast ease-z-standard hover:border-z-primary',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring',
          className,
        )}
        aria-haspopup="dialog"
      >
        <SearchIcon />
        <span className="flex-1 text-left">{placeholder}</span>
        <kbd className="rounded-z-xs border border-z-border bg-z-card-2 px-1.5 py-0.5 text-[11px] text-z-text-3">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex justify-center bg-[var(--z-overlay)] pt-[14vh] backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="h-fit w-[min(620px,92vw)] animate-z-rise-scale overflow-hidden rounded-z-xl border border-z-border bg-z-surface shadow-z-4"
          >
            <div className="flex items-center gap-3 border-b border-z-border px-5 py-4">
              <SearchIcon size={18} />
              <input
                ref={inputRef}
                placeholder="Ask about your enterprise, or start an investigation…"
                className="flex-1 border-none bg-transparent text-z-body-lg text-z-text outline-none placeholder:text-z-text-muted"
              />
            </div>
            <div className="py-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { item.onSelect?.(); setOpen(false); }}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-z-body text-z-text-2 transition-colors duration-z-fast hover:bg-z-selected hover:text-z-text"
                >
                  <span className="flex-1">{item.label}</span>
                  {item.hint && <span className="text-z-caption text-z-text-3">{item.hint}</span>}
                </button>
              ))}
            </div>
            {footer && <div className="border-t border-z-border bg-z-card-2 px-5 py-3 text-z-caption text-z-text-3">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
}
