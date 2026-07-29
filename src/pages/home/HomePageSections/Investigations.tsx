/** Active Investigations.
 *  Phase 3.5: LivingInvestigationCard supplies Reveal + animated confidence + preview/shared seams.
 *  Navigation only. No animation code on the page. */
import { SectionLabel, Grid, CardTitle } from '../../../ds';
import { LivingInvestigationCard, LivingBadge, RevealPriority } from '../../../experience';
import type { InvestigationVM } from '../HomePageViewModel';

export function Investigations({ investigations }: { investigations: InvestigationVM[] }) {
  if (!investigations.length) return null;
  return (
    <section aria-label="Active investigations">
      <SectionLabel>Active investigations</SectionLabel>
      <Grid cols={2}>
        {investigations.map((inv) => {
          const card = (
            <LivingInvestigationCard
              priority={RevealPriority.NORMAL}
              confidence={inv.confidence}
              accent={inv.status}
              sharedId={inv.id}
              previewEntity={{ kind: 'investigation', id: inv.id }}
              className="h-full"
            >
              <div className="flex items-center justify-between">
                <LivingBadge status={inv.status} dot live={inv.live}>{inv.phase}</LivingBadge>
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
