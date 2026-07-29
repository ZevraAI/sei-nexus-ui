/** Zevra Experience Layer — AnimatedCounter (Counter Engine primitive, Phase 3.3).
 *  Animates a number to its value via the Motion Runtime (`MotionEngine.tween`) — it therefore
 *  inherits reduced-motion, kill-switch, and the duration budget automatically, with NO duplicate
 *  animation logic and NO direct RAF. Updates the text via ref (no per-frame re-renders). */
import { useEffect, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import { useMotionEngine } from '../motion/react/OrchestratorProvider';
import type { TweenHandle } from '../motion/types';

export interface AnimatedCounterProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Format the numeric value to text. Default rounds to an integer. */
  format?: (n: number) => string;
  /** Where the count-up starts on first mount (default 0). */
  from?: number;
  /** Override the tween duration (ms). Defaults to the deliberate token, budget-clamped. */
  duration?: number;
}

const defaultFormat = (n: number): string => String(Math.round(n));

export function AnimatedCounter({
  value, format = defaultFormat, from = 0, duration, className, ...rest
}: AnimatedCounterProps) {
  const engine = useMotionEngine();
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef<number>(from);
  const handle = useRef<TweenHandle | null>(null);

  useEffect(() => {
    handle.current?.cancel();
    const start = current.current;
    handle.current = engine.tween({
      from: start,
      to: value,
      duration,
      onUpdate: (v) => { current.current = v; if (ref.current) ref.current.textContent = format(v); },
      onComplete: () => { current.current = value; },
    });
    return () => handle.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Initial paint shows the starting value; the effect animates to `value`.
  return <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }} {...rest}>{format(from)}</span>;
}
