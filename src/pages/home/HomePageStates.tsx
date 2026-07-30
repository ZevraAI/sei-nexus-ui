/** Homepage-specific loading skeletons — compose the shared DS Skeleton.
 *  (Generic EmptyState / ErrorState / Skeleton now live in the design system.) */
import { Skeleton } from '../../ds';

/** Skeleton for the hero KPI strip. */
export function StripSkeleton() {
  return <Skeleton className="mt-9 h-[92px] w-full" />;
}

/** Skeleton for the section rows below the hero (while production data loads). */
export function SectionsSkeleton() {
  return (
    <div aria-busy role="status" aria-label="Loading enterprise intelligence" className="space-y-6">
      <div className="pt-6">
        <Skeleton className="mb-5 h-4 w-40" />
        <div className="grid gap-z-gutter md:grid-cols-2"><Skeleton className="h-[150px]" /><Skeleton className="h-[150px]" /></div>
      </div>
      <div className="pt-6">
        <Skeleton className="mb-5 h-4 w-40" />
        <div className="grid gap-z-gutter md:grid-cols-2"><Skeleton className="h-[160px]" /><Skeleton className="h-[160px]" /></div>
      </div>
    </div>
  );
}
