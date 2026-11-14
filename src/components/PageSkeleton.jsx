/**
 * PageSkeleton — the placeholder shown while a page's code loads. Quiet, on-token, and sized like
 * a typical page so the switch to real content does not jump.
 */
export default function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto w-full max-w-z-stage animate-z-fade px-8 py-10"
    >
      <div className="h-7 w-56 rounded-z-sm bg-z-card-2" />
      <div className="mt-3 h-4 w-96 max-w-full rounded-z-sm bg-z-card-2" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-z-lg border border-z-border bg-z-card" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-z-lg border border-z-border bg-z-card" />
    </div>
  );
}
