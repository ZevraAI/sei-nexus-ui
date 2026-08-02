/** Zevra Experience Layer — Freshness React adapters (Phase 3.3). Thin translators over the
 *  shared FreshnessClock. `useFreshness` recomputes a label on each shared tick; no local timers. */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useExperienceRuntime } from '../context/ExperienceContext';
import { FreshnessClock, formatSince } from './FreshnessClock';

const FreshnessContext = createContext<FreshnessClock | null>(null);

export function FreshnessProvider({ children }: { children: ReactNode }) {
  const { clock, config } = useExperienceRuntime();
  const freshness = useMemo(() => new FreshnessClock(clock, config.budgets.pulseTickMs), [clock, config]);
  return <FreshnessContext.Provider value={freshness}>{children}</FreshnessContext.Provider>;
}

export function useFreshnessClock(): FreshnessClock {
  const v = useContext(FreshnessContext);
  if (!v) throw new Error('useFreshness must be used within <FreshnessProvider>');
  return v;
}

/** Relative "time since" for a timestamp, updated on the shared tick. */
export function useFreshness(since: number | Date): { ms: number; label: string } {
  const clock = useFreshnessClock();
  const base = since instanceof Date ? since.getTime() : since;
  const compute = () => { const ms = Math.max(0, clock.now() - base); return { ms, label: formatSince(ms) }; };
  const [value, setValue] = useState(compute);

  useEffect(() => {
    setValue(compute());                          // resync immediately on base change
    return clock.subscribe(() => setValue(compute()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, base]);

  return value;
}
