/** ============================================================================
 *  HomePageAdapter — the ONLY place that knows about data sources.
 *
 *      Production backend  →  HomePageAdapter  →  HomepageViewModel  →  Homepage
 *
 *  ALWAYS fetches real backend data — local development behaves exactly like
 *  production. Nothing is fabricated; a brand-new tenant (no brief / sessions /
 *  findings / agents) yields empty sections → honest empty states. The representative
 *  fixture (HomePageDemoData) is used ONLY by tests / Storybook / visual-regression;
 *  it is never referenced at application startup.
 *
 *  Endpoints (all pre-existing): /brief, /reasoning/sessions, /reasoning/findings,
 *  /temporal/anomalies, /alerts, /agents, /connections.
 *  ============================================================================ */
import { useEffect, useMemo, useState } from 'react';
// @ts-ignore — api.js is untyped production JS
import { api } from '../../api.js';
import type { HomepageViewModel } from './HomePageViewModel';
import { emptyViewModel } from './HomePageBaseline';
import { mapToViewModel, arr } from './HomePageMapper';

export interface HomepageAdapterInput {
  userName?: string;
  now?: Date;
}

export interface HomepageResult {
  vm: HomepageViewModel;
  loading: boolean;
  error: string | null;
}

/** Swallow a single endpoint failure so one bad section never blanks the whole page. */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

/**
 * The backend serializes responses in snake_case; the view-model mapper reads camelCase.
 * Deep-convert keys so every field (metric_name → metricName, initial_question →
 * initialQuestion, sections_json → sectionsJson, …) reaches the mapper as it expects.
 * Values are untouched (a JSON string like sections_json stays a string for the mapper to parse).
 */
const toCamel = (s: string): string => s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
function deepCamel<T = any>(x: any): T {
  if (Array.isArray(x)) return x.map(deepCamel) as unknown as T;
  if (x && typeof x === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(x)) out[toCamel(k)] = deepCamel((x as Record<string, unknown>)[k]);
    return out as T;
  }
  return x as T;
}

/** Hook the page uses. Fetches production data on mount; empty baseline while loading. */
export function useHomepageViewModel(input: HomepageAdapterInput = {}): HomepageResult {
  const { userName } = input;
  const baseline = useMemo(() => emptyViewModel({ userName }), [userName]);

  const [vm, setVm] = useState<HomepageViewModel>(baseline);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      const [brief, sessions, findings, anomalies, alerts, agents, connections] = await Promise.all([
        safe(() => api.brief.today()),
        safe(() => api.reasoning.sessions()),
        safe(() => api.reasoning.findings()),
        safe(() => api.temporal.anomalies()),
        safe(() => api.alerts.list(50)),
        safe(() => api.agents.list()),
        safe(() => api.connections.list()),
      ]);
      if (cancelled) return;
      const allFailed = brief === null &&
        [sessions, findings, anomalies, alerts, agents, connections].every((x) => x === null);
      if (allFailed) { setError('Zevra is unreachable. Retrying shortly.'); setLoading(false); return; }
      setVm(mapToViewModel({ userName }, {
        brief: deepCamel(brief),
        sessions: deepCamel(arr(sessions)),
        findings: deepCamel(arr(findings)),
        anomalies: deepCamel(arr(anomalies)),
        alerts: deepCamel(arr(alerts)),
        agents: deepCamel(arr(agents)),
        connections: deepCamel(arr(connections)),
      }));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userName]);

  return { vm, loading, error };
}
