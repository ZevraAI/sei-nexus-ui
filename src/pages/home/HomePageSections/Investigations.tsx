/** Active Investigations.
 *  Phase 3.5: LivingInvestigationCard supplies Reveal + animated confidence + preview/shared seams.
 *  Navigation only. No animation code on the page. */
import { SectionLabel, Grid, CardTitle } from '../../../ds';
import { LivingInvestigationCard, RevealPriority } from '../../../experience';
import { EmptyState } from '../../../ds';
import type { InvestigationVM } from '../HomePageViewModel';
import type { StatusKind } from '../../../ds';

function stateTone(k: StatusKind) {
  return k === 'critical' ? 'text-z-down' : k === 'warning' ? 'text-z-warning'
    : k === 'resolved' ? 'text-z-up' : 'text-z-text-3';
}

export function Investigations({ investigations }: { investigations: InvestigationVM[] }) {
  if (!investigations.length) {
    return (
      <EmptyState
        label="Supporting analysis"
        title="No active reasoning yet"
        hint="Ask Zevra a question and its reasoning sessions will appear here as it works. Resume past investigations from the workspace history."
        ctaLabel="Start an investigation"
        ctaTo="/chat"
      />
    );
  }
  return (
    <section aria-label="Supporting analysis">
      <SectionLabel>Supporting analysis</SectionLabel>
      <Grid cols={2}>
        {investigations.map((inv) => {
          const card = (
            <LivingInvestigationCard
              priority={RevealPriority.NORMAL}
              accent={inv.status}
              live={inv.live}
              sharedId={inv.id}
              previewEntity={{ kind: 'investigation', id: inv.id }}
              className="h-full"
            >
              <div className="flex items-center justify-between">
                <span className={`text-z-label uppercase tracking-[0.09em] ${stateTone(inv.status)}`}>{inv.phase}</span>
                <span className="text-z-caption text-z-text-3">{inv.updatedAt}</span>
              </div>
              <CardTitle className="font-z-serif font-medium">{inv.title}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-z-caption text-z-text-3">
                <span>{inv.area}</span>
                <span aria-hidden>·</span>
                <span>{inv.owner}</span>
              </div>
            </LivingInvestigationCard>
          );
          return inv.to ? (
            <a
              key={inv.id}
              href={`#${inv.to}`}
              aria-label={`Open investigation: ${inv.title}`}
              className="group block rounded-z-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring"
            >
              {card}
            </a>
          ) : (
            <div key={inv.id}>{card}</div>
          );
        })}
      </Grid>
    </section>
  );
}
