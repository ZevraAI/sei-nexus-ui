/** Zevra Design Language — Dialog (accessible modal). Platform-wide; never page-specific.
 *  Focus trap · ESC to close · optional click-outside · body scroll-lock · restores focus ·
 *  aria-modal + labelled title. Signature surface + elevation. Sizes sm/md/lg/xl. */
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: keyof typeof sizeClass;
  footer?: ReactNode;
  /** Click on the backdrop closes the dialog (default true). */
  closeOnOverlay?: boolean;
  children?: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, title, description, size = 'md', footer, closeOnOverlay = true, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // scroll-lock

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
          .filter((el) => el.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const raf = requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      el?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      prevActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center overflow-y-auto bg-[var(--z-overlay)] p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => { if (closeOnOverlay && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn('relative mt-[8vh] mb-8 h-fit w-full rounded-z-xl border border-z-border bg-z-card shadow-z-4', sizeClass[size])}
      >
        {(title || description) && (
          <div className="border-b border-z-border px-6 py-5">
            {title && <h2 id={titleId} className="font-z-serif text-z-h2 font-medium tracking-[-0.01em] text-z-text">{title}</h2>}
            {description && <p id={descId} className="mt-1 text-z-caption text-z-text-2">{description}</p>}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-z-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
