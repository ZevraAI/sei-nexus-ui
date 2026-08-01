/** Zevra Intelligence Experience — ComposerSurface. The signature interaction
 *  surface: the command box every conversational Intelligence Experience composes
 *  (Investigations, Reasoning, agent conversations, Knowledge Studio assistants).
 *  Children are the field + actions (composes the base Input / Button). */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface ComposerSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Leading emerald pulse dot — the "live command surface" mark. */
  pulse?: boolean;
  /** Vertically align actions to the end (for multi-line composers). */
  align?: 'center' | 'end';
  /** `md` — the full workspace composer. `sm` — a slim bar composer (the shell). */
  size?: 'sm' | 'md';
  children?: ReactNode;
}

export function ComposerSurface({ pulse = true, align = 'center', size = 'md', className, children, ...rest }: ComposerSurfaceProps) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-z-lg border bg-z-ai-surface shadow-z-ai-lift backdrop-blur-[var(--z-ai-blur)]',
        size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-3.5',
        '[border-color:var(--z-ai-edge)] [border-top-color:var(--z-ai-edge-em)]',
        'transition-colors duration-z-fast ease-z-standard focus-within:[border-color:var(--z-primary)]',
        align === 'end' ? 'items-end' : 'items-center',
        className,
      )}
      {...rest}
    >
      {pulse && (
        <span aria-hidden className={cn('h-2 w-2 flex-shrink-0 rounded-full bg-z-primary shadow-[0_0_10px_var(--z-spine-glow)]', align === 'end' && 'mb-2')} />
      )}
      {children}
    </div>
  );
}
