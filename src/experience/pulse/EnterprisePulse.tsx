/** Zevra Experience Layer — EnterprisePulse (Phase 3.3).
 *  The signature "it's alive" readout. Two form factors from one engine: full + compact. It only
 *  READS pulse state (usePulse) and composes existing pieces — DS StatusDot (heartbeat), the
 *  AnimatedCounter (coverage, via the Motion Runtime), and the shared FreshnessIndicator. It never
 *  schedules motion or holds business logic. Reduced-motion stops the heartbeat honestly. */
import { StatusDot } from '../../ds';
import type { StatusKind } from '../../ds';
import { useReducedMotion } from '../a11y/useReducedMotion';
import { AnimatedCounter } from '../primitives/AnimatedCounter';
import { FreshnessIndicator } from '../freshness/FreshnessIndicator';
import { usePulse, usePulseLastUpdate } from './PulseProvider';
import type { PulseState } from '../types';

export interface EnterprisePulseProps {
  compact?: boolean;
  className?: string;
}

const pct = (n: number): string => `${Math.round(n)}%`;

function dotStatus(status: PulseState['status']): StatusKind {
  if (status === 'reasoning') return 'running';       // the intelligence is working (indigo)
  if (status === 'degraded') return 'warning';        // honest, calm
  return 'healthy';                                    // watching
}

function statusLabel(status: PulseState['status']): string {
  if (status === 'reasoning') return 'Reasoning';
  if (status === 'degraded') return 'Reconnecting…';
  return 'Understood live';
}

export function EnterprisePulse({ compact = false, className }: EnterprisePulseProps) {
  const state = usePulse();
  const lastUpdate = usePulseLastUpdate();
  const reduced = useReducedMotion();

  // Placeholder before the first emission — calm, never a spinner.
  if (!state) {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <StatusDot status="neutral" />
        <span className="text-z-caption text-z-text-3">Connecting…</span>
      </span>
    );
  }

  const live = !reduced && state.status !== 'degraded';
  const dot = <StatusDot status={dotStatus(state.status)} live={live} />;
  const coverage = <AnimatedCounter value={state.coverage} format={pct} className="text-z-text-2 tabular-nums" />;

  if (compact) {
    return (
      <span className={className ?? ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} aria-label={`${statusLabel(state.status)}, coverage ${pct(state.coverage)}`}>
        {dot}
        <span className="text-z-caption text-z-text-3">{coverage}</span>
      </span>
    );
  }

  return (
    <span
      className={`text-z-caption text-z-text-3 ${className ?? ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      aria-label={`${statusLabel(state.status)}, coverage ${pct(state.coverage)}`}
    >
      {dot}
      <span>{statusLabel(state.status)}</span>
      <span aria-hidden>·</span>
      <span>coverage {coverage}</span>
      {state.status !== 'degraded' && (
        <>
          <span aria-hidden>·</span>
          <FreshnessIndicator since={lastUpdate} />
        </>
      )}
    </span>
  );
}
