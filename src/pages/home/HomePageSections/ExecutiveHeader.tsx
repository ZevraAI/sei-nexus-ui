/** Executive Header — greeting, briefing status line, verdict headline, actions.
 *  Phase 1: the verdict comes from the production brief (via the adapter). When the
 *  brief is still loading it shows a skeleton; when the tenant has no brief yet it shows an honest
 *  "ready" state inviting the first step — never a fabricated verdict.
 *  Executive Brief hierarchy: this section answers ONLY "what happened" (status + verdict) — no
 *  narrative reading, no KPI strip. The decision queue and coverage strip render below it, in
 *  HomePage.tsx, so the executive sees decisions before any supporting detail. */
import { Button, PulseSpine, Skeleton } from '../../../ds';
import { Verdict } from '../../../ds/intelligence';
import { Reveal, RevealPriority } from '../../../experience';
import type { ExecutiveSummaryVM, Segment } from '../HomePageViewModel';

const toneClass: Record<NonNullable<Segment['tone']>, string> = {
  good: 'text-z-healthy',
  warn: 'text-z-warning',
  up: 'text-z-up',
  ok: 'text-z-resolved',
};

function renderSegments(segments: Segment[]) {
  return segments.map((s, i) => {
    if (s.strong) return <b key={i} className={s.tone ? toneClass[s.tone] : 'text-z-text'}>{s.text}</b>;
    if (s.tone) return <span key={i} className={toneClass[s.tone]}>{s.text}</span>;
    return <span key={i}>{s.text}</span>;
  });
}

function go(to: string) {
  window.location.hash = to;
}

export function ExecutiveHeader({ vm, loading }: { vm: ExecutiveSummaryVM; loading?: boolean }) {
  const hasVerdict = vm.headline.length > 0;
  return (
    <Reveal priority={RevealPriority.CRITICAL}>
      <section aria-labelledby="home-verdict">
        <PulseSpine className="mb-8" />
        <p className="mb-3 font-z-serif italic text-z-body-lg text-z-text-2">{vm.greeting}</p>

        {!loading && hasVerdict && vm.eyebrow && (
          <p className="mb-3 text-z-caption uppercase tracking-[0.08em] text-z-text-3">{vm.eyebrow}</p>
        )}

        {loading ? (
          <div className="max-w-[20ch] space-y-3">
            <Skeleton className="h-9 w-[85%]" />
            <Skeleton className="h-9 w-[55%]" />
          </div>
        ) : hasVerdict ? (
          <Verdict id="home-verdict" size="xl" className="max-w-[20ch]">{renderSegments(vm.headline)}</Verdict>
        ) : (
          <Verdict id="home-verdict" size="xl" className="max-w-[22ch]">Zevra is ready.</Verdict>
        )}

        {!loading && !hasVerdict && (
          <p className="mt-8 max-w-z-read font-z-serif text-z-body-lg leading-[1.62] text-z-text-2">
            {vm.emptyMessage}
          </p>
        )}

        {!loading && (
          <div className="mt-10 flex flex-wrap gap-3">
            {hasVerdict ? (
              vm.actions.map((a) => (
                <Button key={a.label} variant={a.primary ? 'primary' : 'ghost'} onClick={() => go(a.to)}>{a.label}</Button>
              ))
            ) : vm.emptyAction ? (
              <Button variant="primary" onClick={() => go(vm.emptyAction!.to)}>{vm.emptyAction.label}</Button>
            ) : null}
          </div>
        )}
      </section>
    </Reveal>
  );
}
