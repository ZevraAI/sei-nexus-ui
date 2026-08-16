/** ============================================================================
 *  HomePageViewModel — the business-friendly shape the homepage renders.
 *  The page and its sections consume ONLY this. They never see raw API
 *  responses; the HomePageAdapter maps backend data into this model.
 *  (Zevra UI Phase 2 — Homepage migration, approved A1 design.)
 *  ============================================================================ */
import type { StatusKind } from '../../ds';

/** A run of text with optional emphasis/tone — lets the ViewModel own copy
 *  (including which words are highlighted) instead of the components. */
export interface Segment {
  text: string;
  strong?: boolean;
  tone?: 'good' | 'warn' | 'up' | 'ok';
}

export type Trend = 'up' | 'down' | 'flat';

export interface ExecutiveSummaryVM {
  /** Eyebrow line — "Understood live · … · coverage". */
  eyebrow: string;
  /** "Good morning, Daniel." (name comes from the authenticated user). */
  greeting: string;
  /** The one-line verdict headline, as tone-marked segments. */
  headline: Segment[];
  /** Short narrative paragraphs (each an array of segments). */
  narrative: Segment[][];
  /** Primary/secondary calls to action. */
  actions: { label: string; to: string; primary?: boolean }[];
  /** Shown beneath the headline ONLY when there is no verdict yet (headline is empty).
   *  Owned by the mapper, not the component, so the wording can honestly reflect WHY
   *  there's no verdict (no connection yet, vs. connected but no brief generated yet)
   *  instead of the component guessing from a single boolean. */
  emptyMessage: string;
  /** The call-to-action shown alongside emptyMessage. Absent when there's nothing
   *  useful for the user to do right now (e.g. connected, just waiting on the brief). */
  emptyAction?: { label: string; to: string };
}

export interface KpiVM {
  id: string;
  label: string;
  /** Numeric so the runtime AnimatedCounter can count it up; presentation via `format`. */
  value: number;
  format: (n: number) => string;
  trend?: Trend;
}

export interface SignalVM {
  id: string;
  title: string;
  area: string;
  severity: StatusKind;
  state: string;          // human label, e.g. "Forming"
  description: string;
  confidence?: number;    // 0–100
  timestamp: string;
  deltaLabel?: string;
  deltaTrend?: Trend;
  to?: string;            // navigation target (hash route)
}

export interface RecommendationVM {
  id: string;
  summary: string;
  rationale: string;
  impact: string;
  confidence: number;     // 0–100
  actionLabel: string;
  to?: string;
  /** Executive sign-off shown as the card's eyebrow (e.g. "Decision Required"). */
  state?: string;
}

export interface InvestigationVM {
  id: string;
  title: string;
  area: string;
  owner: string;
  phase: string;
  confidence: number;     // 0–100
  updatedAt: string;
  status: StatusKind;
  live?: boolean;
  to?: string;
}

export interface AgentVM {
  id: string;
  name: string;
  initials: string;
  work: string;
  status: StatusKind;
  statusLabel: string;
  live?: boolean;
}

export interface WorkforceVM {
  stats: { label: string; value: string; trend?: Trend }[];
  agents: AgentVM[];
  manageTo: string;
}

export interface ActivityVM {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: StatusKind;
}

export interface HomepageViewModel {
  /** When this understanding was captured — the base for freshness indicators. */
  capturedAt: number;
  executiveSummary: ExecutiveSummaryVM;
  kpis: KpiVM[];
  signals: SignalVM[];
  recommendations: RecommendationVM[];
  investigations: InvestigationVM[];
  workforce: WorkforceVM;
  recentActivity: ActivityVM[];
}
