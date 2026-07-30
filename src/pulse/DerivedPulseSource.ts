/** ============================================================================
 *  DerivedPulseSource — production PulseSource (business-logic boundary, Rule 2).
 *
 *  The Pulse engine consumes ONLY the PulseSource interface. This implementation
 *  derives REAL platform health from existing endpoints — no fabricated business
 *  confidence:
 *    coverage      ← share of connected data sources that are healthy
 *    reasoning/    ← count of active reasoning sessions
 *    activityRate
 *    freshness     ← whether today's brief has been generated
 *    status        ← "reasoning" when sessions are active, else "watching"
 *
 *  A brand-new tenant (no connections, no sessions) yields coverage 0 / status
 *  "watching" — an honest, calm baseline. Refinements (SSE, richer health) follow
 *  in Phase 2. The engine never changes.
 *  ============================================================================ */
import type { PulseSource } from '../experience/pulse/PulseSource';
import type { PulseState, Unsubscribe } from '../experience/types';
// @ts-ignore — api.js is untyped production JS
import { api } from '../api.js';

const INITIAL: PulseState = {
  coverage: 0, freshness: 0, reasoningLoad: 0, activityRate: 0, confidenceTrend: 'flat', status: 'watching',
};

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}
const arr = (x: unknown): any[] => (Array.isArray(x) ? x : []);
const isActive = (s?: string): boolean => {
  const v = (s ?? '').toUpperCase();
  return v.includes('ACTIVE') || v.includes('RUN') || v.includes('INVEST') || v.includes('REASON');
};

export class DerivedPulseSource implements PulseSource {
  private state: PulseState = { ...INITIAL };
  private readonly subs = new Set<(s: PulseState) => void>();
  private started = false;

  subscribe(cb: (state: PulseState) => void): Unsubscribe {
    this.subs.add(cb);
    cb(this.state);
    if (!this.started) { this.started = true; void this.refresh(); }
    return () => { this.subs.delete(cb); };
  }

  private emit(next: Partial<PulseState>): void {
    this.state = { ...this.state, ...next };
    for (const cb of [...this.subs]) cb(this.state);
  }

  private async refresh(): Promise<void> {
    const [connections, brief, sessions] = await Promise.all([
      safe(() => api.connections.list()),
      safe(() => api.brief.today()),
      safe(() => api.reasoning.sessions()),
    ]);
    const conns = arr(connections);
    const healthy = conns.filter((c) => {
      const s = (c?.status ?? '').toUpperCase();
      return s === 'CONNECTED' || s === 'OK' || s === 'HEALTHY' || c?.healthy === true;
    }).length;
    const coverage = conns.length ? Math.round((healthy / conns.length) * 100) : 0;
    const active = arr(sessions).filter((s) => isActive(s?.status)).length;
    const b = brief as any;
    const hasBrief = !!(b && (b.generatedAt || b.createdAt));

    this.emit({
      coverage,
      reasoningLoad: active,
      activityRate: active,
      freshness: hasBrief ? 100 : 0,
      status: active > 0 ? 'reasoning' : 'watching',
    });
  }
}
