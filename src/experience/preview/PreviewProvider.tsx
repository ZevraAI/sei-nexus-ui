/** Zevra Experience Layer — PreviewProvider (Phase 3.6, Layer B).
 *  Attaches ONE delegated listener set to the document and drives the PreviewController from the
 *  existing `data-z-preview-*` seams. This is why pages gain previews with no code changes: any
 *  element a Living Component marked becomes a preview target automatically. Leak-free teardown. */
import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useExperienceRuntime } from '../context/ExperienceContext';
import type { EntityKind } from '../types';
import { PreviewController } from './PreviewController';
import { MockPreviewResolver } from './PreviewResolver';
import type { PreviewResolver } from './PreviewResolver';
import { PreviewLayer } from './PreviewLayer';
import type { PreviewTarget } from './types';

const PreviewContext = createContext<PreviewController | null>(null);

export interface PreviewProviderProps {
  /** Injected data boundary. Defaults to a MockPreviewResolver (no backend). */
  resolver?: PreviewResolver;
  openDelayMs?: number;
  closeDelayMs?: number;
  children: ReactNode;
}

function readTarget(node: EventTarget | null): { host: HTMLElement; target: PreviewTarget } | null {
  if (!(node instanceof Element)) return null;
  const host = node.closest('[data-z-preview-kind]') as HTMLElement | null;
  if (!host) return null;
  const r = host.getBoundingClientRect();
  return {
    host,
    target: {
      entity: { kind: host.getAttribute('data-z-preview-kind') as EntityKind, id: host.getAttribute('data-z-preview-id') ?? '' },
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    },
  };
}

export function PreviewProvider({ resolver, openDelayMs, closeDelayMs, children }: PreviewProviderProps) {
  const { bus, clock } = useExperienceRuntime();
  const controller = useMemo(
    () => new PreviewController(resolver ?? new MockPreviewResolver(), bus, clock, { openDelayMs, closeDelayMs }),
    [resolver, bus, clock, openDelayMs, closeDelayMs],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onOver = (e: Event) => { const f = readTarget(e.target); if (f) controller.requestOpen(f.target); };
    const onOut = (e: Event) => {
      const f = readTarget(e.target);
      if (!f) return;
      const to = (e as PointerEvent).relatedTarget as Element | null;
      if (to && (f.host.contains(to) || to.closest?.('[role="dialog"]'))) return; // moved into host/panel
      controller.requestClose();
    };
    const onFocusIn = (e: Event) => { const f = readTarget(e.target); if (f) controller.requestOpen(f.target); };
    const onFocusOut = (e: Event) => { const f = readTarget(e.target); if (f) controller.requestClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') controller.closeNow(); };

    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout', onOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('keydown', onKey, true);
      controller.destroy();
    };
  }, [controller]);

  return (
    <PreviewContext.Provider value={controller}>
      {children}
      <PreviewLayer controller={controller} />
    </PreviewContext.Provider>
  );
}

/** Imperative preview control (programmatic open/close). */
export function usePreview(): { open(target: PreviewTarget): void; close(): void } {
  const c = useContext(PreviewContext);
  if (!c) throw new Error('usePreview must be used within <PreviewProvider>');
  return { open: (t) => c.requestOpen(t), close: () => c.closeNow() };
}
