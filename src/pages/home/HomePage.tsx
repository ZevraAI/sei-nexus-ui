/** ============================================================================
 *  HomePage — the approved Signature "Command" homepage (the ONLY homepage).
 *
 *  Phase 1 (production data): consumes the Experience Runtime by COMPOSITION only.
 *  Presentation flows from the production HomePageAdapter (real backend); the page
 *  never sees raw API data and never fabricates intelligence. Every section supports
 *  loading, empty, error, and populated states — a brand-new tenant renders honest
 *  empty states rather than simulated activity.
 *
 *  Home answers exactly one question: "what should I spend my next 10 minutes on?"
 *  Hero (Pulse Spine → greeting → briefing status line → verdict → actions) → recommended
 *  actions (the decision queue — first viewport) → what needs your attention (active monitoring).
 *  Coverage stats, supporting analysis, completed analyses, and AI workforce detail are NOT
 *  next-action material — they live on the Brief page ("what happened while you were away"),
 *  not here. See Brief.jsx.
 *  ============================================================================ */
import { RevealGroup } from '../../experience';
import { ErrorState } from '../../ds';
import { IntelligencePage } from '../../ds/intelligence';
import { useHomepageViewModel } from './HomePageAdapter';
import { ExecutiveHeader } from './HomePageSections/ExecutiveHeader';
import { Recommendations } from './HomePageSections/Recommendations';
import { BusinessSignals } from './HomePageSections/BusinessSignals';
import { SectionsSkeleton } from './HomePageStates';

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
  const { executiveSummary, signals, recommendations } = vm;

  return (
    <IntelligencePage measure="wide" className="pt-6 pb-28">
      <RevealGroup>
        <ExecutiveHeader vm={executiveSummary} loading={loading} />

        {error && <ErrorState message={error} className="mt-6" />}

        {loading ? (
          <SectionsSkeleton />
        ) : (
          <>
            <div className="pt-6"><Recommendations recommendations={recommendations} /></div>
            <div className="pt-6"><BusinessSignals signals={signals} /></div>
          </>
        )}
      </RevealGroup>
    </IntelligencePage>
  );
}
