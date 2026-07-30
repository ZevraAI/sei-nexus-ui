/** Recommended Actions.
 *  Phase 3.5: LivingRecommendationCard (Reveal + accent + preview/shared seams) with the runtime
 *  ConfidenceAnimator. The page declares intent + data only — no timing, no scheduling. */
import { SectionLabel, Grid, CardTitle, CardBody, Button } from '../../../ds';
import { LivingRecommendationCard, ConfidenceAnimator, RevealPriority } from '../../../experience';
import { EmptyState } from '../../../ds';
import type { RecommendationVM } from '../HomePageViewModel';

function go(to?: string) {
  if (to) window.location.hash = to;
}

export function Recommendations({ recommendations }: { recommendations: RecommendationVM[] }) {
  if (!recommendations.length) {
    return (
      <EmptyState
        label="Recommended actions"
        title="No recommendations yet"
        hint="Zevra surfaces recommended actions from operational findings once it has reasoned over your connected enterprise data."
      />
    );
  }
  return (
    <section aria-label="Recommended actions">
      <SectionLabel>Recommended actions</SectionLabel>
      <Grid cols={2}>
        {recommendations.map((r) => (
          <LivingRecommendationCard
            key={r.id}
            priority={RevealPriority.HIGH}
            sharedId={r.id}
            previewEntity={{ kind: 'recommendation', id: r.id }}
          >
            <div className="flex items-center gap-2 text-z-label uppercase text-z-primary">
              <span aria-hidden className="text-[8px] leading-none">◆</span>Recommended action
            </div>
            <CardTitle className="font-z-serif font-medium">{r.summary}</CardTitle>
            <CardBody>{r.rationale}</CardBody>
            <p className="mt-3 text-z-body text-z-text">
              <span className="font-semibold">Expected impact:</span> {r.impact}
            </p>
            <ConfidenceAnimator value={r.confidence} className="mt-4" />
            <div className="mt-5">
              <Button size="sm" onClick={() => go(r.to)}>{r.actionLabel}</Button>
            </div>
          </LivingRecommendationCard>
        ))}
      </Grid>
    </section>
  );
}
