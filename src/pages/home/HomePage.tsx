/** ============================================================================
 *  HomePage — the approved Signature "Command" homepage (the ONLY homepage).
 *
 *  Consumes the Experience Runtime by COMPOSITION only. No animation, timing, scheduling, or
 *  orchestration code lives here — the runtime owns all of it. Presentation flows from the
 *  HomepageViewModel; the page never sees raw API data.
 *
 *  Signature layout (matches signature-motif-home): hero (eyebrow → Pulse Spine → greeting →
 *  verdict → KPI strip → narrative → actions) → recommended actions → active investigations →
 *  Enterprise activity (ledger + AI workforce, side by side). The KPI strip is passed into the
 *  hero as a slot so it sits between the verdict and the narrative.
 *  ============================================================================ */
import { RevealGroup } from '../../experience';
import { SectionLabel, Grid } from '../../ds';
import { useHomepageViewModel } from './HomePageAdapter';
import { ExecutiveHeader } from './HomePageSections/ExecutiveHeader';
import { KPISection } from './HomePageSections/KPISection';
import { Recommendations } from './HomePageSections/Recommendations';
import { BusinessSignals } from './HomePageSections/BusinessSignals';
import { Investigations } from './HomePageSections/Investigations';
import { AIWorkforce } from './HomePageSections/AIWorkforce';
import { RecentActivity } from './HomePageSections/RecentActivity';

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
  const vm = useHomepageViewModel({ userName });
  const { capturedAt, executiveSummary, kpis, signals, recommendations, investigations, workforce, recentActivity } = vm;

  // Own scroll container + DS canvas (the host Layout is overflow-hidden + transparent).
  // Section spacing is layout only; the reveal cascade is entirely runtime-owned.
  return (
    <div className="h-full overflow-y-auto bg-z-bg">
      <RevealGroup className="mx-auto w-full max-w-[1280px] px-z-page pt-12 pb-28">
        <ExecutiveHeader
          vm={executiveSummary}
          kpiSlot={<KPISection kpis={kpis} capturedAt={capturedAt} />}
        />
        {recommendations.length > 0 && <div className="pt-6"><Recommendations recommendations={recommendations} /></div>}
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
      </RevealGroup>
    </div>
  );
}
