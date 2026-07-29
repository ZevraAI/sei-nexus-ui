/** Zevra Experience Layer — ExperienceContext (§9.1a) + runtime access.
 *  Two React contexts:
 *    • Runtime  — bus, registry, config, clock (stable for the app's life)
 *    • State    — the read-model: surface, interactionMode, phase, focus, idle, navigation
 *  Engines READ state; a narrow writer set (here + Orchestrator later) WRITES.
 *  Perf: activity does NOT re-render the tree (Invariant 8) — only true idle transitions do. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { EntityRef, ExperiencePhase, InteractionMode } from '../types';
import type { ExperienceConfig } from '../config';
import type { Clock } from '../clock';
import type { ExperienceEventBus } from '../events/ExperienceEventBus';
import type { ExperienceRegistry, SurfaceExperience } from '../registry/ExperienceRegistry';

// ── Runtime (stable services) ──────────────────────────────────────────────
export interface ExperienceRuntime {
  bus: ExperienceEventBus;
  registry: ExperienceRegistry;
  config: ExperienceConfig;
  clock: Clock;
}
const RuntimeContext = createContext<ExperienceRuntime | null>(null);

export function useExperienceRuntime(): ExperienceRuntime {
  const v = useContext(RuntimeContext);
  if (!v) throw new Error('useExperienceRuntime must be used within <ExperienceProvider>');
  return v;
}
export const useExperienceBus = (): ExperienceEventBus => useExperienceRuntime().bus;
export const useExperienceConfig = (): ExperienceConfig => useExperienceRuntime().config;

// ── State (the read-model) ─────────────────────────────────────────────────
export interface ExperienceContextState {
  surface: string;
  interactionMode: InteractionMode;
  phase: ExperiencePhase;
  focusedEntity: EntityRef | null;
  activeInvestigation: string | null;
  idle: boolean;
  navigation: { path: string; from: string | null };
  lastActivityAt: number;
}
export interface ExperienceActions {
  setSurface(surface: string): void;
  setInteractionMode(mode: InteractionMode): void;
  setPhase(phase: ExperiencePhase): void;
  setFocusedEntity(entity: EntityRef | null): void;
  setActiveInvestigation(id: string | null): void;
}
const StateContext = createContext<ExperienceContextState | null>(null);
const ActionsContext = createContext<ExperienceActions | null>(null);

export function useExperienceContext(): ExperienceContextState {
  const v = useContext(StateContext);
  if (!v) throw new Error('useExperienceContext must be used within <ExperienceProvider>');
  return v;
}
export function useExperienceActions(): ExperienceActions {
  const v = useContext(ActionsContext);
  if (!v) throw new Error('useExperienceActions must be used within <ExperienceProvider>');
  return v;
}
/** Resolve the current (or given) surface's engine opt-ins. */
export function useSurfaceExperience(surfaceId?: string): SurfaceExperience {
  const { registry } = useExperienceRuntime();
  const { surface } = useExperienceContext();
  return registry.get(surfaceId ?? surface);
}

// ── Providers ──────────────────────────────────────────────────────────────
function surfaceFromPath(path: string): string {
  const seg = path.replace(/^#/, '').replace(/^\//, '').split(/[/?]/)[0];
  return seg || 'home';
}
function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.hash.replace('#', '') || '/';
}

export function RuntimeProvider({ value, children }: { value: ExperienceRuntime; children: ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function ExperienceStateProvider({ children }: { children: ReactNode }) {
  const { config, clock } = useExperienceRuntime();

  const [state, setState] = useState<ExperienceContextState>(() => {
    const path = currentPath();
    return {
      surface: surfaceFromPath(path),
      interactionMode: 'executive',
      phase: 'bootstrapping',
      focusedEntity: null,
      activeInvestigation: null,
      idle: false,
      navigation: { path, from: null },
      lastActivityAt: clock.now(),
    };
  });

  // Actions — narrow, intentional writers.
  const actions = useMemo<ExperienceActions>(() => ({
    setSurface: (surface) => setState((s) => (s.surface === surface ? s : { ...s, surface })),
    setInteractionMode: (interactionMode) => setState((s) => ({ ...s, interactionMode })),
    setPhase: (phase) => setState((s) => (s.phase === phase ? s : { ...s, phase })),
    setFocusedEntity: (focusedEntity) => setState((s) => ({ ...s, focusedEntity })),
    setActiveInvestigation: (activeInvestigation) => setState((s) => ({ ...s, activeInvestigation })),
  }), []);

  // Lifecycle: bootstrapping → ready after first mount (Orchestrator drives 'composing' later).
  useEffect(() => {
    setState((s) => (s.phase === 'bootstrapping' ? { ...s, phase: 'ready' } : s));
  }, []);

  // Navigation + surface, from the existing hash router (no routing change).
  useEffect(() => {
    if (!config.enabled || typeof window === 'undefined') return;
    const onHash = () => {
      const path = currentPath();
      setState((s) => (s.navigation.path === path ? s
        : { ...s, navigation: { path, from: s.navigation.path }, surface: surfaceFromPath(path) }));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [config.enabled]);

  // Idle detection — perf-guarded: activity updates a ref and only re-renders on idle↔active flip.
  useEffect(() => {
    if (!config.enabled || typeof window === 'undefined') return;
    let timer: number | null = null;
    let lastArm = 0;
    const arm = () => {
      if (timer !== null) clock.clearTimeout(timer);
      timer = clock.setTimeout(() => {
        setState((s) => (s.idle ? s : { ...s, idle: true, phase: s.phase === 'ready' ? 'idle' : s.phase }));
      }, config.idleAfterMs);
    };
    const onActivity = () => {
      const now = clock.now();
      setState((s) => (s.idle ? { ...s, idle: false, phase: s.phase === 'idle' ? 'ready' : s.phase, lastActivityAt: now } : s));
      if (now - lastArm > 1000) { lastArm = now; arm(); }   // throttle timer churn
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm();
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (timer !== null) clock.clearTimeout(timer);
    };
  }, [config.enabled, config.idleAfterMs, clock]);

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}
