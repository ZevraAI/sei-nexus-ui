/** Zevra Design Language — shared UI states (loading / empty / error).
 *  One implementation reused across every page. Promoted from the homepage. */
import { cn } from '../../utils/cn';
import { SectionLabel } from './AppShell';

/** Shimmer placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-z-lg bg-z-card-2', className)} aria-hidden />;
}

/** Elegant empty state — dashed panel, optional section label + CTA. */
export function EmptyState({ label, title, hint, ctaLabel, ctaTo, className }: {
  label?: string; title: string; hint?: string; ctaLabel?: string; ctaTo?: string; className?: string;
}) {
  return (
    <section aria-label={label ?? title} className={className}>
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="rounded-z-lg border border-dashed border-z-border-strong bg-z-card-2 px-8 py-10 text-center">
        <h3 className="font-z-serif text-z-h3 font-medium text-z-text">{title}</h3>
        {hint && <p className="mx-auto mt-2 max-w-[54ch] text-z-body leading-[1.6] text-z-text-2">{hint}</p>}
        {ctaLabel && ctaTo && (
          <a href={`#${ctaTo}`}
            className="mt-6 inline-flex items-center gap-2 rounded-z-pill bg-z-primary px-5 py-2.5 text-sm font-semibold text-z-on-accent shadow-z-1 transition-all hover:-translate-y-px hover:shadow-z-2">
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

/** Calm, non-blocking error banner. */
export function ErrorState({ message, className }: { message: string; className?: string }) {
  return (
    <div role="alert"
      className={cn('rounded-z-lg border border-z-critical bg-z-critical-soft px-5 py-4 text-z-body text-z-critical-on', className)}>
      {message}
    </div>
  );
}
