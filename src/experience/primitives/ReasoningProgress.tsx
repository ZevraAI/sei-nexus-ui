/** Zevra Experience Layer — ReasoningProgress (primitive, Phase 3.7).
 *  The ONE reasoning visualization (reused by Command and the Investigation experience). Renders
 *  steps as done / active / pending; the active node pulses (via DS StatusDot + reduced-motion
 *  awareness — no WAAPI). Presentation only. */
import { StatusDot } from '../../ds';
import type { StatusKind } from '../../ds';
import { useReducedMotion } from '../a11y/useReducedMotion';

export interface ReasoningStep {
  title: string;
  detail?: string;
}

export interface ReasoningProgressProps {
  steps: ReasoningStep[];
  /** Index of the step currently reasoning; earlier are done, later are pending. */
  activeIndex: number;
  className?: string;
}

export function ReasoningProgress({ steps, activeIndex, className }: ReasoningProgressProps) {
  const reduced = useReducedMotion();
  return (
    <ol className={className} aria-label="Reasoning progress">
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const status: StatusKind = done ? 'healthy' : active ? 'running' : 'waiting';
        return (
          <li key={i} className="flex items-start gap-3 py-1.5">
            <StatusDot status={status} live={active && !reduced} className="mt-1.5" />
            <div className="min-w-0">
              <div className={done || active ? 'text-z-body text-z-text' : 'text-z-body text-z-text-3'}>{s.title}</div>
              {s.detail && active && <div className="mt-0.5 text-z-caption text-z-text-3">{s.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
