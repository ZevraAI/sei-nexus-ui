/** ============================================================================
 *  HomePage — the approved Signature "Command" homepage (the ONLY homepage).
 *
 *  Phase 1 (production data): consumes the Experience Runtime by COMPOSITION only.
 *  Presentation flows from the production HomePageAdapter (real backend); the page
 *  never sees raw API data and never fabricates intelligence. Every section supports
 *  loading, empty, error, and populated states — a brand-new tenant renders honest
 *  empty states rather than simulated activity.
 *
 *  Signature layout (unchanged): hero (eyebrow → Pulse Spine → greeting → verdict →
 *  KPI strip → narrative → actions) → recommended actions → what needs your attention
 *  → active investigations → Enterprise activity (ledger + AI workforce).
 *  ============================================================================ */
import { RevealGroup } from '../../experience';
import { SectionLabel, Grid, ErrorState } from '../../ds';
import { IntelligencePage } from '../../ds/intelligence';
import { useHomepageViewModel } from './HomePageAdapter';
import { ExecutiveHeader } from './HomePageSections/ExecutiveHeader';
import { KPISection } from './HomePageSections/KPISection';
import { Recommendations } from './HomePageSections/Recommendations';
import { BusinessSignals } from './HomePageSections/BusinessSignals';
import { Investigations } from './HomePageSections/Investigations';
import { AIWorkforce } from './HomePageSections/AIWorkforce';
import { RecentActivity } from './HomePageSections/RecentActivity';
import { StripSkeleton, SectionsSkeleton } from './HomePageStates';

export interface HomePageUser {
  full_name?: string;
  name?: string;
  email?: string;
}

export interface HomePageProps {
  user?: HomePageUser | null;
}

export default function HomePage({ user }: HomePageProps) {
  const userName = user?.full_name || user?.name || user?.email?.split('@')[0] || undefined;
  const { vm, loading, error } = useHomepageViewModel({ userName });
  const { capturedAt, executiveSummary, kpis, signals, recommendations, investigations, workforce, recentActivity } = vm;

  return (
    <IntelligencePage measure="wide" className="pt-6 pb-28">
      <RevealGroup>
        <ExecutiveHeader
          vm={executiveSummary}
          loading={loading}
          kpiSlot={loading ? <StripSkeleton /> : <KPISection kpis={kpis} capturedAt={capturedAt} />}
        />

        {error && <ErrorState message={error} className="mt-6" />}

        {loading ? (
          <SectionsSkeleton />
        ) : (
          <>
            <div className="pt-6"><Recommendations recommendations={recommendations} /></div>
            <div className="pt-6"><BusinessSignals signals={signals} /></div>
            <div className="pt-6"><Investigations investigations={investigations} /></div>
            <div className="pt-6">
              <section aria-label="Enterprise activity">
                <SectionLabel>Enterprise activity</SectionLabel>
                <Grid cols={2}>
                  <RecentActivity items={recentActivity} />
                  <AIWorkforce workforce={workforce} />
                </Grid>
              </section>
            </div>
          </>
        )}
      </RevealGroup>
    </IntelligencePage>
  );
}
