/** Executive Header — greeting, verdict headline, KPI strip, narrative, actions.
 *  Phase 1: the verdict + narrative come from the production brief (via the adapter). When the
 *  brief is still loading it shows a skeleton; when the tenant has no brief yet it shows an honest
 *  "ready" state inviting the first step — never a fabricated verdict. Signature rhythm unchanged. */
import type { ReactNode } from 'react';
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

export function ExecutiveHeader({ vm, kpiSlot, loading }: { vm: ExecutiveSummaryVM; kpiSlot?: ReactNode; loading?: boolean }) {
  const hasVerdict = vm.headline.length > 0;
  return (
    <Reveal priority={RevealPriority.CRITICAL}>
      <section aria-labelledby="home-verdict">
        <PulseSpine className="mb-8" />
        <p className="mb-3 font-z-serif italic text-z-body-lg text-z-text-2">{vm.greeting}</p>

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

        {!loading && (
          <div className="mt-8 max-w-z-read space-y-3">
            {hasVerdict ? (
              vm.narrative.map((para, i) => (
                <p key={i} className="font-z-serif text-z-body-lg leading-[1.6] text-z-text-2">{renderSegments(para)}</p>
              ))
            ) : (
              <p className="font-z-serif text-z-body-lg leading-[1.62] text-z-text-2">
                Connect a data source and start your first investigation — your enterprise brief,
                recommendations, and live intelligence will appear here as Zevra learns your business.
              </p>
            )}
          </div>
        )}

        {!loading && hasVerdict && vm.eyebrow && (
          <p className="mt-6 text-z-caption uppercase tracking-[0.08em] text-z-text-3">{vm.eyebrow}</p>
        )}

        {kpiSlot}

        {!loading && (
          <div className="mt-10 flex flex-wrap gap-3">
            {hasVerdict ? (
              vm.actions.map((a) => (
                <Button key={a.label} variant={a.primary ? 'primary' : 'ghost'} onClick={() => go(a.to)}>{a.label}</Button>
              ))
            ) : (
              <Button variant="primary" onClick={() => go('/connections')}>Connect a data source</Button>
            )}
          </div>
        )}
      </section>
    </Reveal>
  );
}
