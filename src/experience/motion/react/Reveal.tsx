/** Zevra Experience Layer — Reveal / RevealGroup / useReveal (Phase 3.2, Layer B).
 *  The declarative surface pages use (Rule 2: pages declare intent, the runtime executes).
 *  A page writes `<Reveal priority={RevealPriority.HIGH}>…</Reveal>` — never `motion.play(...)`.
 *  These adapters only translate intent into runtime operations; no orchestration lives here. */
import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef,
} from 'react';
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import type { Unsubscribe } from '../../types';
import { RevealPriority } from '../types';
import type { PresetName } from '../types';
import { RevealController } from '../RevealController';
import { useMotionRuntime } from './OrchestratorProvider';

const RevealGroupContext = createContext<RevealController | null>(null);

export interface RevealOptions {
  priority?: RevealPriority | number;
  preset?: PresetName;
}

/**
 * Register an element into its RevealGroup (or play it solo if none). Returns a ref callback.
 * The runtime owns sequencing, stagger, interruption, and cancellation.
 */
export function useReveal(opts: RevealOptions = {}): (el: Element | null) => void {
  const { priority = RevealPriority.NORMAL, preset = 'rise' } = opts;
  const group = useContext(RevealGroupContext);
  const { engine, orchestrator } = useMotionRuntime();
  const elRef = useRef<Element | null>(null);
  const unregister = useRef<Unsubscribe | undefined>(undefined);

  const setRef = useCallback((el: Element | null) => {
    elRef.current = el;
    if (!group) return;
    unregister.current?.();
    unregister.current = el
      ? group.register(el, { priority, keyframes: engine.presets[preset] })
      : undefined;
  }, [group, engine, priority, preset]);

  // Solo path (no RevealGroup ancestor): play a one-item sequence on mount, cancel on unmount.
  useEffect(() => {
    if (group) return;                       // the group owns play + teardown
    const el = elRef.current;
    if (!el) return;
    const scope = Symbol('reveal-solo');
    orchestrator.play({ items: [{ el, priority, keyframes: engine.presets[preset] }] }, scope);
    return () => orchestrator.cancel(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return setRef;
}

export interface RevealProps extends HTMLAttributes<HTMLElement> {
  priority?: RevealPriority | number;
  preset?: PresetName;
  as?: ElementType;
  children?: ReactNode;
}

/** Declarative reveal wrapper. */
export function Reveal({ priority, preset, as: Tag = 'div', children, ...rest }: RevealProps) {
  const ref = useReveal({ priority, preset });
  return <Tag ref={ref} {...rest}>{children}</Tag>;
}

export interface RevealGroupProps extends HTMLAttributes<HTMLElement> {
  /** Requested stagger step (ms); clamped by the runtime to the completion budget. */
  stagger?: number;
  as?: ElementType;
  children?: ReactNode;
}

/** Groups child <Reveal>s into one governed compose (staggered, priority-ordered). */
export function RevealGroup({ stagger, as: Tag = 'div', children, ...rest }: RevealGroupProps) {
  const { orchestrator } = useMotionRuntime();
  const scopeRef = useRef<symbol>(Symbol('reveal-group'));
  const controllerRef = useRef<RevealController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new RevealController(orchestrator, scopeRef.current, stagger);
  }

  // Children register during commit (bottom-up); by this layout effect they're all present.
  useLayoutEffect(() => {
    const controller = controllerRef.current!;
    controller.play();
    return () => controller.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RevealGroupContext.Provider value={controllerRef.current}>
      <Tag {...rest}>{children}</Tag>
    </RevealGroupContext.Provider>
  );
}

export { RevealPriority };
