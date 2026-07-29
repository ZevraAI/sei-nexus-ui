/** Executive Header — greeting, verdict headline, KPI strip, narrative, actions.
 *  Signature migration: matches signature-motif-home's hero rhythm — eyebrow (Enterprise Pulse) →
 *  Pulse Spine → serif italic greeting → serif verdict → KPI strip → serif narrative → actions.
 *  The KPI strip is injected as `kpiSlot` so it sits between the verdict and the narrative at full
 *  content width (the verdict/narrative stay reading-width). No animation code here. */
import type { ReactNode } from 'react';
import { Display, Button, PulseSpine } from '../../../ds';
import { EnterprisePulse, Reveal, RevealPriority } from '../../../experience';
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

export function ExecutiveHeader({ vm, kpiSlot }: { vm: ExecutiveSummaryVM; kpiSlot?: ReactNode }) {
  return (
    <Reveal priority={RevealPriority.CRITICAL}>
      <section aria-labelledby="home-verdict">
        <EnterprisePulse className="mb-4" />
        <PulseSpine className="mb-8" />
        <p className="mb-3 font-z-serif italic text-z-body-lg text-z-text-2">{vm.greeting}</p>
        <Display id="home-verdict" size="xl" className="max-w-[20ch]">{renderSegments(vm.headline)}</Display>

        {kpiSlot}

        <div className="mt-10 max-w-z-read space-y-4">
          {vm.narrative.map((para, i) => (
            <p key={i} className="font-z-serif text-z-body-lg leading-[1.62] text-z-text-2">{renderSegments(para)}</p>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {vm.actions.map((a) => (
            <Button key={a.label} variant={a.primary ? 'primary' : 'ghost'} onClick={() => go(a.to)}>
              {a.label}
            </Button>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
