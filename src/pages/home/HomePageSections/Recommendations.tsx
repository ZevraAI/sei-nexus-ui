/** Recommended Actions.
 *  Phase 3.5: LivingRecommendationCard (Reveal + accent + preview/shared seams) with the runtime
 *  ConfidenceAnimator. The page declares intent + data only — no timing, no scheduling. */
import { SectionLabel, Grid, CardTitle, CardBody, Button } from '../../../ds';
import { LivingRecommendationCard, RevealPriority } from '../../../experience';
import { EmptyState } from '../../../ds';
import { confidenceBand } from '../../../utils/confidence';
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
    <section aria-label="Decisions for your review">
      <SectionLabel>Requires your decision</SectionLabel>
      <Grid cols={2}>
        {recommendations.map((r) => (
          <LivingRecommendationCard
            key={r.id}
            priority={RevealPriority.HIGH}
            sharedId={r.id}
            previewEntity={{ kind: 'recommendation', id: r.id }}
            className="flex h-full flex-col"
          >
            <div className="text-z-label uppercase tracking-[0.09em] text-z-primary">{r.state ?? 'Decision Required'}</div>
            <CardTitle className="mt-2.5 font-z-serif font-medium">{r.summary}</CardTitle>
            <CardBody className="mt-2 text-z-text-2">{r.rationale}</CardBody>
            {r.impact && (
              <p className="mt-3 text-z-body text-z-text-2">
                <span className="font-medium text-z-text">Zevra recommends</span> — {r.impact}
              </p>
            )}
            <div className="mt-auto pt-6">
              {r.confidence > 0 && (
                <p className="mb-2 text-z-caption text-z-text-3">{confidenceBand(r.confidence)}</p>
              )}
              <Button variant="link" size="sm" onClick={() => go(r.to)}>{r.actionLabel} →</Button>
            </div>
          </LivingRecommendationCard>
        ))}
      </Grid>
    </section>
  );
}
