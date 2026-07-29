/** Zevra Experience Layer — PulseProvider + usePulse (Phase 3.3, Layer B).
 *  Constructs the PulseEngine from an injected PulseSource + the runtime (bus, clock). One
 *  subscription; every page reads identically via `usePulse()` (useSyncExternalStore → no
 *  duplicate renders). The source is the business boundary; default is the MockPulseSource. */
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useExperienceRuntime } from '../context/ExperienceContext';
import { PulseEngine } from './PulseEngine';
import { MockPulseSource } from './PulseSource';
import type { PulseSource } from './PulseSource';
import type { PulseState } from '../types';

const PulseContext = createContext<PulseEngine | null>(null);

export interface PulseProviderProps {
  /** Injected data boundary (Rule 2). Defaults to a static MockPulseSource (no backend). */
  source?: PulseSource;
  children: ReactNode;
}

export function PulseProvider({ source, children }: PulseProviderProps) {
  const { bus, clock } = useExperienceRuntime();
  const engine = useMemo(() => new PulseEngine(source ?? new MockPulseSource(), bus, clock), [source, bus, clock]);

  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);

  return <PulseContext.Provider value={engine}>{children}</PulseContext.Provider>;
}

function usePulseEngine(): PulseEngine {
  const v = useContext(PulseContext);
  if (!v) throw new Error('usePulse must be used within <PulseProvider>');
  return v;
}

/** The current pulse state (null until the first source emission). Efficient, shared. */
export function usePulse(): PulseState | null {
  const engine = usePulseEngine();
  return useSyncExternalStore(
    (onChange) => engine.subscribe(onChange),
    () => engine.getState(),
    () => null,
  );
}

/** Clock time of the last pulse update — the freshness base for indicators. */
export function usePulseLastUpdate(): number {
  const engine = usePulseEngine();
  // Re-reads on each render; usePulse() drives re-renders on update.
  return engine.lastUpdate();
}
