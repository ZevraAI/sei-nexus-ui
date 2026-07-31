/** ============================================================================
 *  HomePageMapper — PURE transformation of production backend records into the
 *  HomepageViewModel. No React, no api, no side effects → deterministic + testable.
 *  Every field is truthfully derived from real records; empty input → empty output
 *  (a brand-new tenant renders honest empty states).
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
function findingKind(status?: string): StatusKind {
  const v = (status ?? '').toUpperCase();
  if (v.includes('RESOLV') || v.includes('CLOSED')) return 'resolved';
  if (v.includes('CONFIRM') || v.includes('CRIT')) return 'critical';
  return 'warning';
}
export function isActionableFinding(status?: string): boolean {
  const v = (status ?? '').toUpperCase();
  return v === '' || v.includes('OPEN') || v.includes('NEW') || v.includes('CONFIRM') || v.includes('ACTIVE');
}
const fmtDelta = (n: unknown): string | undefined =>
  typeof n === 'number' ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : undefined;

function mapExecutiveSummary(brief: any, base: HomepageViewModel['executiveSummary']): HomepageViewModel['executiveSummary'] {
  if (!brief || (brief.status && String(brief.status).toUpperCase() !== 'READY') || !brief.headline) return base;
  let narrative: Segment[][] = [];
  try {
    const parsed = brief.sectionsJson ? JSON.parse(brief.sectionsJson) : brief.sections;
    narrative = arr(parsed)
      .map((s: any) => (s?.content ?? s?.body ?? '').toString().trim())
      .filter(Boolean)
      .map((text: string) => [{ text }] as Segment[]);
  } catch { narrative = []; }
  return {
    eyebrow: base.eyebrow,
    greeting: base.greeting,
    headline: [{ text: String(brief.headline) }],
    narrative,
    actions: [
      { label: 'Read the full brief', to: '/brief', primary: true },
      { label: 'Open reasoning', to: '/reasoning' },
    ],
  };
}

function mapInvestigations(sessions: any[], nowMs: number): InvestigationVM[] {
  // Collapse repeated investigations of the same question (sessions arrive newest-first,
  // so the most recent occurrence is kept) — the panel shows distinct investigations, not dupes.
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
        area: s.domainKey ?? 'Enterprise',
        owner: s.agentKey ?? 'Zevra',
        phase: s.status ?? (st.live ? 'In progress' : 'Concluded'),
        confidence: pct(s.confidenceScore) ?? 0,
        updatedAt: relativeTime(s.concludedAt ?? s.startedAt, nowMs),
        status: st.kind,
        live: st.live,
        to: '/reasoning',
      };
    });
}

function mapRecommendations(findings: any[]): RecommendationVM[] {
  return findings
    .filter((f) => f && f.title && isActionableFinding(f.status))
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 3)
    .map((f) => ({
      id: f.findingKey ?? String(f.title),
      summary: f.title,
      rationale: f.description ?? f.evidenceSummary ?? '',
      impact: f.evidenceSummary ?? 'Requires review.',
      confidence: pct(f.confidence) ?? 0,
      actionLabel: 'Review finding',
      to: `/reasoning?tab=findings&finding=${encodeURIComponent(f.findingKey ?? '')}`,
    }));
}

function mapSignals(findings: any[], anomalies: any[], nowMs: number): SignalVM[] {
  const fromAnomalies: SignalVM[] = anomalies.slice(0, 3).map((a) => ({
    id: a.anomalyKey ?? String(a.metricName),
    title: a.metricName ?? 'Anomaly',
    area: a.domainKey ?? 'Enterprise',
    severity: severityKind(a.severity),
    state: a.status ?? 'Detected',
    description: `Observed ${a.observedValue ?? '—'} vs baseline ${a.baselineValue ?? '—'}.`,
    confidence: undefined,
    timestamp: relativeTime(a.detectedAt, nowMs),
    deltaLabel: fmtDelta(a.deviationPct),
    deltaTrend: typeof a.deviationPct === 'number' ? (a.deviationPct < 0 ? 'down' : 'up') : undefined,
    to: '/temporal',
  }));
  const fromFindings: SignalVM[] = findings
    .filter((f) => f && f.title && !isActionableFinding(f.status))
    .slice(0, Math.max(0, 3 - fromAnomalies.length))
    .map((f) => ({
      id: f.findingKey ?? String(f.title),
      title: f.title,
      area: f.domainKey ?? f.findingType ?? 'Enterprise',
      severity: findingKind(f.status),
      state: f.status ?? 'Observed',
      description: f.description ?? f.evidenceSummary ?? '',
      confidence: pct(f.confidence),
      timestamp: relativeTime(f.lastConfirmedAt ?? f.firstObservedAt, nowMs),
      to: '/reasoning',
    }));
  return [...fromAnomalies, ...fromFindings].slice(0, 3);
}

function mapActivity(alerts: any[], anomalies: any[], nowMs: number): ActivityVM[] {
  const items: (ActivityVM & { _t: number })[] = [];
  alerts.forEach((a) => items.push({
    id: a.deliveryKey ?? String(a.ruleName),
    title: a.ruleName ?? a.messageText ?? 'Alert',
    detail: (a.messageText ?? a.metricName ?? '').toString().trim(),
    time: relativeTime(a.sentAt, nowMs),
    tone: severityKind(a.severity),
    _t: Date.parse(a.sentAt ?? '') || 0,
  }));
  anomalies.forEach((a) => items.push({
    id: `act-${a.anomalyKey ?? a.metricName}`,
    title: `Anomaly detected — ${a.metricName ?? 'metric'}`,
    detail: `${a.domainKey ?? ''} · deviation ${fmtDelta(a.deviationPct) ?? '—'}`.trim(),
    time: relativeTime(a.detectedAt, nowMs),
    tone: severityKind(a.severity),
    _t: Date.parse(a.detectedAt ?? '') || 0,
  }));
  return items.sort((x, y) => y._t - x._t).slice(0, 6).map(({ _t, ...rest }) => rest);
}

function mapWorkforce(agents: any[]): HomepageViewModel['workforce'] {
  const active = agents.filter((a) => (a.status ?? '').toUpperCase() === 'ACTIVE').length;
  return {
    manageTo: '/agents',
    stats: agents.length
      ? [{ label: 'deployed', value: String(agents.length) }, { label: 'active', value: String(active) }]
      : [],
    agents: agents.map((a) => {
      const running = (a.status ?? '').toUpperCase() === 'ACTIVE';
      const name = a.name ?? a.agentKey ?? 'Agent';
      return {
        id: a.agentKey ?? name,
        name,
        initials: name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        work: a.purpose ?? '—',
        status: (running ? 'running' : 'waiting') as StatusKind,
        statusLabel: running ? 'active' : (a.status ?? 'idle').toLowerCase(),
        live: running,
      };
    }),
  };
}

function computeKpis(counts: { investigations: number; alerts: number; sources: number; findings: number }): HomepageViewModel['kpis'] {
  const n = (v: number) => `${v}`;
  return [
    { id: 'investigations', label: 'Active reasoning', value: counts.investigations, format: n },
    { id: 'alerts', label: 'Open alerts', value: counts.alerts, format: n },
    { id: 'sources', label: 'Connected sources', value: counts.sources, format: n },
    { id: 'findings', label: 'Open findings', value: counts.findings, format: n },
  ];
}

export interface RawHomeData {
  brief: any; sessions: any[]; findings: any[]; anomalies: any[]; alerts: any[]; agents: any[]; connections: any[];
}

/** Pure: production records + identity → HomepageViewModel. */
export function mapToViewModel(
  input: { userName?: string; now?: Date },
  data: RawHomeData,
): HomepageViewModel {
  const nowMs = (input.now ?? new Date()).getTime();
  const base = emptyViewModel(input);
  const sessions = arr(data.sessions);
  const findings = arr(data.findings);
  const anomalies = arr(data.anomalies);
  const alerts = arr(data.alerts);
  const agents = arr(data.agents);
  const connections = arr(data.connections);

  return {
    ...base,
    executiveSummary: mapExecutiveSummary(data.brief, base.executiveSummary),
    kpis: computeKpis({
      investigations: sessions.filter((s) => sessionStatus(s.status).live).length,
      alerts: alerts.filter((a) => (a.status ?? '').toUpperCase() !== 'READ').length,
      sources: connections.length,
      findings: findings.filter((f) => isActionableFinding(f.status)).length,
    }),
    investigations: mapInvestigations(sessions, nowMs),
    recommendations: mapRecommendations(findings),
    signals: mapSignals(findings, anomalies, nowMs),
    workforce: mapWorkforce(agents),
    recentActivity: mapActivity(alerts, anomalies, nowMs),
  };
}
