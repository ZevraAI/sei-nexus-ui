/** KPI Overview — the enterprise status strip.
 *  Signature migration: renders the KPIs as a single machined strip (one framed surface with a
 *  Pulse Spine on the leading edge and hairline cell dividers) that lives inside the hero, right
 *  under the verdict — matching signature-motif-home. The value is still the runtime
 *  AnimatedCounter; freshness now lives once in the hero eyebrow (EnterprisePulse). No animation
 *  code here. */
import { Card } from '../../../ds';
import { AnimatedCounter, Reveal, RevealPriority } from '../../../experience';
import { cn } from '../../../utils/cn';
import type { HomepageViewModel, KpiVM } from '../HomePageViewModel';

export function KPISection({ kpis, capturedAt }: { kpis: KpiVM[]; capturedAt: HomepageViewModel['capturedAt'] }) {
  void capturedAt; // freshness is shown once in the hero eyebrow; the strip stays clean
  if (!kpis.length) return null;
  return (
    <Reveal priority={RevealPriority.HIGH}>
      <Card accent="primary" aria-label="Enterprise KPIs"
        className="mt-9 flex flex-col overflow-hidden p-0 shadow-z-2 sm:flex-row">
        {kpis.map((k, i) => (
          <div key={k.id} className={cn('flex-1 px-6 py-5', i > 0 && 'border-t border-z-border sm:border-l sm:border-t-0')}>
            <div className={cn('text-z-kpi tabular-nums',
              k.trend === 'up' ? 'text-z-up' : k.trend === 'down' ? 'text-z-down' : 'text-z-text')}>
              <AnimatedCounter value={k.value} format={k.format} />
            </div>
            <div className="mt-2 text-z-caption text-z-text-3">{k.label}</div>
          </div>
        ))}
      </Card>
    </Reveal>
  );
}
