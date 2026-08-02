/** Zevra Experience Layer — OrchestratorProvider (Phase 3.2, Layer B: React adapter).
 *  Constructs the MotionEngine + AnimationOrchestrator from the runtime config/clock and provides
 *  them via context. Wires global interruption (user input finishes an in-flight compose) and
 *  cancel-all teardown. Contains NO orchestration logic — the runtime classes own that. */
import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useExperienceRuntime } from '../../context/ExperienceContext';
import { prefersReducedMotion } from '../../a11y/useReducedMotion';
import { MotionEngine } from '../MotionEngine';
import { AnimationOrchestrator } from '../AnimationOrchestrator';

interface MotionRuntime {
  engine: MotionEngine;
  orchestrator: AnimationOrchestrator;
}
const MotionContext = createContext<MotionRuntime | null>(null);

export function useMotionRuntime(): MotionRuntime {
  const v = useContext(MotionContext);
  if (!v) throw new Error('useMotionRuntime must be used within <OrchestratorProvider>');
  return v;
}
export const useOrchestrator = (): AnimationOrchestrator => useMotionRuntime().orchestrator;
export const useMotionEngine = (): MotionEngine => useMotionRuntime().engine;

export function OrchestratorProvider({ children }: { children: ReactNode }) {
  const { config, clock } = useExperienceRuntime();

  const value = useMemo<MotionRuntime>(() => {
    const engine = new MotionEngine({
      budgets: config.budgets,
      isEnabled: () => config.enabled,
      isReduced: () => config.respectReducedMotion && prefersReducedMotion(),
    });
    return { engine, orchestrator: new AnimationOrchestrator(engine, config.budgets, clock) };
  }, [config, clock]);

  // Interruption: any user input completes an in-flight compose (never a half-animated page).
  // Teardown cancels everything (Invariant 10: leak-free).
  useEffect(() => {
    if (!config.enabled || typeof window === 'undefined') return;
    const onInput = () => value.orchestrator.interruptAll();
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onInput));
      value.orchestrator.cancelAll();
    };
  }, [value, config.enabled]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
