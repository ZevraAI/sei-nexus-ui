/** Zevra Experience Layer — ConfidenceAnimator (Confidence Engine primitive, Phase 3.4).
 *  Composition, not modification: it wraps the frozen DS `ConfidenceBar`, feeding it a value that
 *  animates 0→target via the Motion Runtime (useTweenedValue → MotionEngine.tween). The DS component
 *  is unchanged; the "arriving at certainty" motion is entirely runtime-owned and budget-governed. */
import { ConfidenceBar } from '../../ds';
import { useTweenedValue } from './useTweenedValue';

export interface ConfidenceAnimatorProps {
  /** Target confidence, 0–100. */
  value: number;
  className?: string;
  duration?: number;
}

export function ConfidenceAnimator({ value, className, duration }: ConfidenceAnimatorProps) {
  const animated = useTweenedValue(value, { duration });
  return <ConfidenceBar value={Math.round(animated)} className={className} />;
}
