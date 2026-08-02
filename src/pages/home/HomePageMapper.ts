/** ============================================================================
 *  HomePageMapper — the Executive Brief projection.
 *
 *  PURE transformation of existing backend records into the HomepageViewModel.
 *  No React, no api, no side effects → deterministic + testable. The homepage is
 *  the Executive Brief: it does not display business data, it projects the WORK
 *  the agents already completed into one executive voice, ending in executive
 *  states (Decision Required · Being Monitored · Verified · Needs Investigation).
 *
 *  Every value is truthfully derived from real records — no invented facts, no
 *  fabricated "verified" counts. Empty input → honest empty output. Specialists,
 *  confidence and evidence stay supporting; drill-down reaches them.
 *  ============================================================================ */
import type {
  HomepageViewModel, InvestigationVM, RecommendationVM, SignalVM, ActivityVM, Segment,
} from './HomePageViewModel';
import type { StatusKind } from '../../ds';
import { emptyViewModel } from './HomePageBaseline';

export const arr = (x: unknown): any[] => (Array.isArray(x) ? x : []);
const pct = (c: unknown): number | undefined =>
  typeof c === 'number' ? Math.round((c <= 1 ? c * 100 : c)) : undefined;

export function relativeTime(iso?: string | null, nowMs = Date.now()): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((nowMs - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** A wall-clock time like "6:04 AM" — used for briefing-completion language. */
function clockTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function sessionStatus(s?: string): { kind: StatusKind; live: boolean } {
  const v = (s ?? '').toUpperCase();
  if (v.includes('CONCLUD') || v === 'DONE' || v === 'COMPLETE' || v === 'COMPLETED') return { kind: 'resolved', live: false };
  if (v.includes('FAIL') || v.includes('ERROR')) return { kind: 'critical', live: false };
  if (v.includes('ACTIVE') || v.includes('RUN') || v.includes('INVEST') || v.includes('REASON')) return { kind: 'investigating', live: true };
  return { kind: 'neutral', live: false };
}
function severityKind(sev?: string): StatusKind {
  const v = (sev ?? '').toUpperCase();
  if (v.includes('CRIT') || v === 'HIGH') return 'critical';
  if (v.includes('WARN') || v === 'MEDIUM') return 'warning';
  if (v.includes('RESOLV') || v === 'CLEARED') return 'resolved';
  return 'info';
}
export function isActionableFinding(status?: string): boolean {
  const v = (status ?? '').toUpperCase();
  return v === '' || v.includes('OPEN') || v.includes('NEW') || v.includes('CONFIRM') || v.includes('ACTIVE');
}
const fmtDelta = (n: unknown): string | undefined =>
  typeof n === 'number' ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : undefined;

/** A readable business-area label from an agent/domain key — never an internal id.
 *  "inventory-health" → "Inventory Health"; "data-analyst"/"PLATFORM" → "Enterprise". */
function areaLabel(key?: string): string {
  const k = String(key ?? '').trim();
  if (!k) return 'Enterprise';
  if (/^(ag-|platform$|data-analyst$)/i.test(k)) return 'Enterprise';
  const cleaned = k.replace(/\bagents?\b/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Enterprise';
  // Title-case slug words; leave already-cased words (e.g. "Store & Warehouse Ops") intact.
  return cleaned.replace(/\b([a-z])(\w*)/g, (_m, a, b) => a.toUpperCase() + b);
}

/** First sentence(s) of a body, for a scannable rationale — the agent's own words. */
function lead(text?: string, max = 260): string {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const dot = cut.lastIndexOf('. ');
  return (dot > 80 ? cut.slice(0, dot + 1) : cut.trim() + '…');
}

/** Pull the agent's own recommendation sentence from its conclusion, if it made one.
 *  Never fabricated — returns '' when the agent did not phrase explicit advice (so the
 *  "Zevra recommends" line is hidden rather than echoing the conclusion). */
function recommendationFrom(text?: string): string {
  const sentences = String(text ?? '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
  const rec = sentences.find((s) => /\b(recommend|prioriti[sz]e|consider|suggest|advis|renegotiat|you should|should be)\b/i.test(s));
  return rec ? rec.trim() : '';
}

/** The elaboration beneath the conclusion: the description with its leading (title) sentence
 *  removed, so the card's body doesn't repeat the headline. */
function detail(description?: string, title?: string): string {
  const full = String(description ?? '').trim();
  const t = String(title ?? '').trim().replace(/[.…]+$/, '');
  if (t && full.toLowerCase().startsWith(t.toLowerCase().slice(0, Math.min(t.length, 50)))) {
    const rest = full.replace(/^[^.!?]*[.!?]+\s*/, '').trim();
    if (rest.length > 30) return lead(rest, 150);
  }
  return lead(full, 150);
}

// ── Executive hero: completed-work provenance + collective verdict ──────────
function mapExecutiveSummary(
  brief: any,
  base: HomepageViewModel['executiveSummary'],
  meta: { completedAt: string; areasReviewed: number; decisions: number },
): HomepageViewModel['executiveSummary'] {
  if (!brief || (brief.status && String(brief.status).toUpperCase() !== 'READY') || !brief.headline) return base;

  // Supporting narrative: 1–2 concise sentences beneath the verdict — not the full brief.
  let narrative: Segment[][] = [];
  try {
    const parsed = brief.sectionsJson ? JSON.parse(brief.sectionsJson) : brief.sections;
    narrative = arr(parsed)
      .map((s: any) => (s?.content ?? s?.body ?? '').toString().trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((text: string) => [{ text: lead(text, 160) }] as Segment[]);
  } catch { narrative = []; }

  // Completion + coverage, in executive language — never headcount ("N specialists").
  const parts: string[] = [];
  parts.push(meta.completedAt ? `Morning briefing completed at ${meta.completedAt}` : 'Morning briefing completed');
  if (meta.areasReviewed > 0) parts.push(`${meta.areasReviewed} business area${meta.areasReviewed === 1 ? '' : 's'} reviewed`);
  parts.push(meta.decisions > 0
    ? `${meta.decisions} decision${meta.decisions === 1 ? '' : 's'} require${meta.decisions === 1 ? 's' : ''} your attention`
    : 'nothing requires your decision');

  return {
    eyebrow: parts.join('  ·  '),
    greeting: base.greeting,
    headline: [{ text: String(brief.headline) }],
    narrative,
    actions: [
      { label: 'Read the full brief', to: '/brief', primary: true },
      { label: 'Review supporting analysis', to: '/reasoning' },
    ],
  };
}

// ── Supporting evidence: the completed investigations (drill-down only) ─────
function mapInvestigations(sessions: any[], nowMs: number): InvestigationVM[] {
  const seen = new Set<string>();
  return sessions
    .filter((s) => s && (s.initialQuestion || s.conclusion))
    .filter((s) => {
      const key = String(s.initialQuestion ?? s.conclusion ?? '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4)
    .map((s) => {
      const st = sessionStatus(s.status);
      return {
        id: s.sessionKey ?? s.runKey ?? String(s.initialQuestion),
        title: s.initialQuestion ?? s.conclusion ?? 'Investigation',
        area: areaLabel(s.agentKey ?? s.domainKey),
        owner: 'Zevra',
        phase: st.live ? 'In progress' : 'Analysis complete',
        confidence: pct(s.confidenceScore) ?? 0,
        updatedAt: relativeTime(s.concludedAt ?? s.startedAt, nowMs),
        status: st.kind,
        live: st.live,
        to: '/reasoning',
      };
    });
}

// ── Decisions queue: the conclusions that need the executive ────────────────
function mapRecommendations(findings: any[]): RecommendationVM[] {
  return findings
    .filter((f) => f && f.title && isActionableFinding(f.status))
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 4)
    .map((f) => ({
      id: f.findingKey ?? String(f.title),
      summary: f.title,                        // what was concluded
      rationale: detail(f.description, f.title),// why it matters (elaboration, not the headline)
      impact: recommendationFrom(f.description),// what Zevra recommends (empty if none — never faked)
      confidence: pct(f.confidence) ?? 0,
      state: 'Decision Required',
      actionLabel: 'Review the analysis',
      // Open the exact investigation that produced this finding, in Report Mode. Lineage
      // (the conversation) is carried on the finding; fall back to the findings tab if a
      // legacy finding predates lineage capture.
      to: f.relatedEntityKeys
        ? `/chat?report=${encodeURIComponent(f.relatedEntityKeys)}&finding=${encodeURIComponent(f.findingKey ?? '')}`
        : `/reasoning?tab=findings&finding=${encodeURIComponent(f.findingKey ?? '')}`,
    }));
}

// ── Under active monitoring: what Zevra is watching against its baselines ───
function mapSignals(anomalies: any[], nowMs: number): SignalVM[] {
  return anomalies.slice(0, 3).map((a) => {
    const observed = a.observedValue ?? '—';
    const baseline = a.baselineValue ?? '—';
    return {
      id: a.anomalyKey ?? String(a.metricName),
      title: a.metricName ?? 'Tracked metric',
      area: areaLabel(a.domainKey),
      severity: severityKind(a.severity),
      state: 'Being monitored',
      description: `Zevra is tracking this against its established baseline — now ${observed} versus a baseline of ${baseline}.`,
      confidence: undefined,
      timestamp: relativeTime(a.detectedAt, nowMs),
      deltaLabel: fmtDelta(a.deviationPct),
      deltaTrend: typeof a.deviationPct === 'number' ? (a.deviationPct < 0 ? 'down' : 'up') : undefined,
      to: '/temporal',
    };
  });
}

// ── Completed work ledger: the analyses the team finished, per area ─────────
function mapActivity(sessions: any[], nowMs: number): ActivityVM[] {
  const seen = new Set<string>();
  const items: (ActivityVM & { _t: number })[] = [];
  for (const s of sessions) {
    if (!s || !(s.initialQuestion || s.conclusion)) continue;
    const key = String(s.initialQuestion ?? s.conclusion ?? '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const area = areaLabel(s.agentKey ?? s.domainKey);
    items.push({
      id: s.sessionKey ?? key,
      title: `${area} analysis completed`,
      detail: lead(s.conclusion ?? s.initialQuestion, 90),
      time: relativeTime(s.concludedAt ?? s.startedAt, nowMs),
      tone: 'resolved',
      _t: Date.parse(s.concludedAt ?? s.startedAt ?? '') || 0,
    });
  }
  return items.sort((x, y) => y._t - x._t).slice(0, 6).map(({ _t, ...rest }) => rest);
}

// ── Enterprise coverage: the business areas that were reviewed (not agent health).
//    No status, no "online/standing by" — just the areas the enterprise was reviewed across.
function mapWorkforce(agents: any[]): HomepageViewModel['workforce'] {
  const list = agents.filter((a) => (a.status ?? '').toUpperCase() === 'ACTIVE');
  return {
    manageTo: '/agents',
    stats: [],
    agents: list.map((a) => {
      const name = areaLabel(a.name ?? a.agentKey ?? 'Area');
      return {
        id: a.agentKey ?? name,
        name,
        initials: '',
        work: 'Reviewed',
        status: 'resolved' as StatusKind,
        statusLabel: 'Reviewed',
        live: false,
      };
    }),
  };
}

function computeKpis(counts: { decisions: number; areas: number; monitored: number; analyses: number }): HomepageViewModel['kpis'] {
  const n = (v: number) => `${v}`;
  return [
    { id: 'decisions',  label: 'Decisions required',     value: counts.decisions, format: n, trend: counts.decisions > 0 ? 'up' : undefined },
    { id: 'areas',      label: 'Business areas reviewed', value: counts.areas,     format: n },
    { id: 'monitored',  label: 'Being monitored',        value: counts.monitored, format: n },
    { id: 'analyses',   label: 'Analyses completed',     value: counts.analyses,  format: n },
  ];
}

export interface RawHomeData {
  brief: any; sessions: any[]; findings: any[]; anomalies: any[]; alerts: any[]; agents: any[]; connections: any[];
}

/** Pure: production records + identity → the Executive Brief view model. */
export function mapToViewModel(
  input: { userName?: string; now?: Date },
  data: RawHomeData,
): HomepageViewModel {
  const nowMs = (input.now ?? new Date()).getTime();
  const base = emptyViewModel(input);
  const sessions = arr(data.sessions);
  const findings = arr(data.findings);
  const anomalies = arr(data.anomalies);
  const agents = arr(data.agents);

  // Distinct completed investigations (dedupe repeated questions) → "analyses completed".
  const distinctSessions = new Set(
    sessions.filter((s) => s?.initialQuestion || s?.conclusion)
      .map((s) => String(s.initialQuestion ?? s.conclusion).trim().toLowerCase()),
  );
  // Distinct business areas that actually produced work today → truthful "coverage".
  const reviewedAreas = new Set(
    sessions.map((s) => String(s.agentKey ?? '').toLowerCase()).filter((k) => k && !/^(platform|data-analyst)$/.test(k)),
  );
  const decisions = findings.filter((f) => isActionableFinding(f.status)).length;

  return {
    ...base,
    executiveSummary: mapExecutiveSummary(data.brief, base.executiveSummary, {
      completedAt: clockTime(data.brief?.generatedAt),
      areasReviewed: reviewedAreas.size,
      decisions,
    }),
    kpis: computeKpis({
      decisions,
      areas: reviewedAreas.size,
      monitored: anomalies.filter((a) => (a.status ?? 'OPEN').toUpperCase() !== 'RESOLVED').length,
      analyses: distinctSessions.size,
    }),
    investigations: mapInvestigations(sessions, nowMs),
    recommendations: mapRecommendations(findings),
    signals: mapSignals(anomalies, nowMs),
    workforce: mapWorkforce(agents),
    recentActivity: mapActivity(sessions, nowMs),
  };
}
