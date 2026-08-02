/** Zevra Design Language — shared page primitives.
 *  Standard page frame + header + section, so every page shares the homepage's
 *  container width, page padding, typography and rhythm instead of hand-rolling them. */
import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { SectionLabel } from './AppShell';

/** Scroll canvas + centered max-width content column — the standard page frame.
 *  (The host Layout <main> is overflow-hidden; each page owns its scroll here.) */
export function PageContainer({ width = 'stage', className, children }: {
  width?: 'narrow' | 'stage' | 'wide'; className?: string; children?: ReactNode;
}) {
  const max = width === 'wide' ? 'max-w-[1280px]' : width === 'narrow' ? 'max-w-z-narrow' : 'max-w-z-stage';
  return (
    <div className="h-full overflow-y-auto bg-z-bg">
      <div className={cn('mx-auto w-full px-z-page', max, className)}>{children}</div>
    </div>
  );
}

/** Standard page header: title · summary · primary actions. */
export function PageHeader({ title, summary, actions, className }: {
  title: ReactNode; summary?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="font-z-serif text-z-h1 font-medium tracking-[-0.015em] text-z-text">{title}</h1>
        {summary && <p className="mt-2 max-w-z-read text-z-body-lg text-z-text-2">{summary}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** A titled content section with the Signature rhythm (reuses the shared SectionLabel). */
export function Section({ label, className, children, ...rest }: HTMLAttributes<HTMLElement> & { label?: ReactNode }) {
  return (
    <section className={className} {...rest}>
      {label && <SectionLabel>{label}</SectionLabel>}
      {children}
    </section>
  );
}
