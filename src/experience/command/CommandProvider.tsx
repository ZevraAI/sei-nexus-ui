/** Zevra Experience Layer — CommandProvider (Phase 3.7, Layer B).
 *  Global ⌘K/Ctrl-K capture (no page-level keyboard handling), builds the CommandController, and
 *  renders the CommandExperience once. Context is derived from ExperienceContext automatically —
 *  no page wiring. Navigation is a handoff seam (`onNavigate`). Leak-free teardown. */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useExperienceRuntime, useExperienceContext } from '../context/ExperienceContext';
import { CommandController } from './CommandController';
import { MockIntentInterpreter } from './IntentInterpreter';
import type { IntentInterpreter } from './IntentInterpreter';
import type { CommandContext } from './types';
import { CommandExperience } from './CommandExperience';

const Ctx = createContext<CommandController | null>(null);

export interface CommandProviderProps {
  /** Injected business boundary (Rule 3). Defaults to a MockIntentInterpreter (no backend/LLM). */
  interpreter?: IntentInterpreter;
  /** Navigation handoff seam — later phases connect real routing. */
  onNavigate?: (to: string) => void;
  children: ReactNode;
}

export function CommandProvider({ interpreter, onNavigate, children }: CommandProviderProps) {
  const { bus, clock } = useExperienceRuntime();
  const contextState = useExperienceContext();

  // Keep the latest ExperienceContext available to the controller without re-creating it.
  const ctxRef = useRef(contextState);
  ctxRef.current = contextState;

  const controller = useMemo(() => new CommandController({
    interpreter: interpreter ?? new MockIntentInterpreter(),
    bus,
    clock,
    getContext: (): CommandContext => ({
      surface: ctxRef.current.surface,
      interactionMode: ctxRef.current.interactionMode,
      focusedEntity: ctxRef.current.focusedEntity,
      activeInvestigation: ctxRef.current.activeInvestigation,
    }),
    onNavigate,
  }), [interpreter, bus, clock, onNavigate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); controller.toggle(); }
      else if (e.key === 'Escape' && controller.getState().open) { controller.close(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); controller.destroy(); };
  }, [controller]);

  return (
    <Ctx.Provider value={controller}>
      {children}
      <CommandExperience controller={controller} />
    </Ctx.Provider>
  );
}

export function useCommandController(): CommandController {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCommand must be used within <CommandProvider>');
  return c;
}
