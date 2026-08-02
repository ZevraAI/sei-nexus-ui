/** Zevra Experience Layer — useTweenedValue (Phase 3.4 primitive).
 *  Drives a numeric value toward a target through the Motion Runtime (`MotionEngine.tween`), so it
 *  inherits reduced-motion, kill-switch, and the duration budget automatically. Used where the value
 *  must feed a component prop (e.g. the DS ConfidenceBar) rather than raw text. */
import { useEffect, useRef, useState } from 'react';
import { useMotionEngine } from '../motion/react/OrchestratorProvider';
import type { TweenHandle } from '../motion/types';

export function useTweenedValue(target: number, opts?: { from?: number; duration?: number }): number {
  const engine = useMotionEngine();
  const from = opts?.from ?? 0;
  const [value, setValue] = useState(from);
  const current = useRef(from);
  const handle = useRef<TweenHandle | null>(null);

  useEffect(() => {
    handle.current?.cancel();
    handle.current = engine.tween({
      from: current.current,
      to: target,
      duration: opts?.duration,
      onUpdate: (v) => { current.current = v; setValue(v); },
      onComplete: () => { current.current = target; setValue(target); },
    });
    return () => handle.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
