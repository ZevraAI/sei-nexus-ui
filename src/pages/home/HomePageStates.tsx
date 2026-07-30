/** Loading / Empty / Error building blocks for the homepage sections.
 *  These are new *states* (not a redesign) — the populated layout is unchanged. */
import { SectionLabel } from '../../ds';

/** Shimmer block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-z-lg bg-z-card-2 ${className}`} aria-hidden />;
}

/** Skeleton for the hero KPI strip. */
export function StripSkeleton() {
  return <Skeleton className="mt-9 h-[92px] w-full" />;
}

/** Skeleton for the section rows below the hero (while production data loads). */
export function SectionsSkeleton() {
  return (
    <div aria-busy className="space-y-6" role="status" aria-label="Loading enterprise intelligence">
      <div className="pt-6"><Skeleton className="h-4 w-40 mb-5" /><div className="grid gap-z-gutter md:grid-cols-2"><Skeleton className="h-[150px]" /><Skeleton className="h-[150px]" /></div></div>
      <div className="pt-6"><Skeleton className="h-4 w-40 mb-5" /><div className="grid gap-z-gutter md:grid-cols-2"><Skeleton className="h-[160px]" /><Skeleton className="h-[160px]" /></div></div>
    </div>
  );
}

/** Elegant empty state for a homepage section (dashed panel, muted, optional CTA). */
export function SectionEmpty({ label, title, hint, ctaLabel, ctaTo }: {
  label?: string; title: string; hint: string; ctaLabel?: string; ctaTo?: string;
}) {
  return (
    <section aria-label={label ?? title}>
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="rounded-z-lg border border-dashed border-z-border-strong bg-z-card-2 px-8 py-10 text-center">
        <h3 className="font-z-serif text-z-h3 font-medium text-z-text">{title}</h3>
        <p className="mx-auto mt-2 max-w-[54ch] text-z-body leading-[1.6] text-z-text-2">{hint}</p>
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

/** Error banner — honest, calm, non-blocking (the hero greeting still renders above it). */
export function SectionError({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-z-lg border border-z-critical bg-z-critical-soft px-5 py-4 text-z-body text-z-critical-on"
         role="alert">
      {message}
    </div>
  );
}
