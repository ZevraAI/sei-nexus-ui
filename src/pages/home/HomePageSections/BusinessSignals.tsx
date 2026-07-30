/** Business Signals — "what needs your attention".
 *  Phase 3.5: LivingCard (Reveal + accent + preview/shared seams) + LivingBadge (reduced-motion
 *  aware). Navigation only. No animation code on the page. */
import { CardTitle, CardBody, SectionLabel, Grid } from '../../../ds';
import { LivingCard, LivingBadge, RevealPriority } from '../../../experience';
import { EmptyState } from '../../../ds';
import type { SignalVM } from '../HomePageViewModel';

function trendClass(t?: SignalVM['deltaTrend']) {
  return t === 'up' ? 'text-z-up' : t === 'down' ? 'text-z-down' : 'text-z-text-3';
}

export function BusinessSignals({ signals }: { signals: SignalVM[] }) {
  if (!signals.length) {
    return (
      <EmptyState
        label="What needs your attention"
        title="No signals yet"
        hint="Anomalies, findings, and alerts will surface here as Zevra monitors your connected sources."
      />
    );
  }
  return (
    <section aria-label="Business signals">
      <SectionLabel>What needs your attention</SectionLabel>
      <Grid cols={3}>
        {signals.map((s) => {
          const card = (
            <LivingCard
              priority={RevealPriority.NORMAL}
              interactive
              accent={s.severity}
              className="h-full"
              sharedId={s.id}
              previewEntity={{ kind: 'investigation', id: s.id }}
            >
              <div className="flex items-center justify-between gap-3">
                <LivingBadge status={s.severity} dot live={s.severity === 'running'}>{s.state}</LivingBadge>
                <span className="truncate text-z-caption text-z-text-3">{s.area} · {s.timestamp}</span>
              </div>
              <CardTitle className="font-z-serif font-medium">{s.title}</CardTitle>
              <CardBody className="min-h-[42px]">{s.description}</CardBody>
              <div className="mt-4 flex items-center justify-between">
                {typeof s.confidence === 'number'
                  ? <span className="text-z-caption text-z-text-3">Confidence {s.confidence}%</span>
                  : <span />}
                {s.deltaLabel && <span className={`text-z-body font-semibold tabular-nums ${trendClass(s.deltaTrend)}`}>{s.deltaLabel}</span>}
              </div>
            </LivingCard>
          );
          return s.to ? (
            <a
              key={s.id}
              href={`#${s.to}`}
              aria-label={`${s.title} — ${s.state}`}
              className="group block rounded-z-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring"
            >
              {card}
            </a>
          ) : (
            <div key={s.id}>{card}</div>
          );
        })}
      </Grid>
    </section>
  );
}
