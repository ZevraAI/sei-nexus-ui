/** Zevra Experience Layer — PreviewLayer (Phase 3.6, Layer B).
 *  The single floating surface. Subscribes to the controller, positions collision-aware (desktop) or
 *  as a bottom-sheet (touch), animates entrance THROUGH the Motion Runtime (never WAAPI directly),
 *  and renders the PreviewModel. Non-modal dialog semantics; Escape handled by the provider. */
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useMotionEngine } from '../motion/react/OrchestratorProvider';
import { ConfidenceAnimator } from '../primitives/ConfidenceAnimator';
import { computePosition } from './positioning';
import type { PreviewController } from './PreviewController';
import type { PreviewModel } from './types';

function useIsCoarsePointer(): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none)').matches;
  const [coarse] = useState(get);
  return coarse;
}

export function PreviewLayer({ controller }: { controller: PreviewController }) {
  const engine = useMotionEngine();
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const coarse = useIsCoarsePointer();
  const key = state.entity ? `${state.entity.kind}:${state.entity.id}` : null;

  useLayoutEffect(() => {
    if (state.phase !== 'open' || !ref.current) return;
    if (!coarse && state.rect) {
      const b = ref.current.getBoundingClientRect();
      const p = computePosition(
        state.rect,
        { width: b.width || 300, height: b.height || 160 },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setPos({ top: p.top, left: p.left });
    }
    engine.animate(ref.current, engine.presets.riseScale); // reduced-motion/kill → instant (engine)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, coarse]);

  if (state.phase !== 'open' || !state.model || typeof document === 'undefined') return null;

  const panel = (
    <div
      ref={ref}
      role="dialog"
      aria-label={state.model.title}
      onPointerEnter={() => controller.cancelClose()}
      onPointerLeave={() => controller.requestClose()}
      className={coarse
        ? 'fixed inset-x-0 bottom-0 z-[120] rounded-t-z-xl border-t border-z-border bg-z-surface p-z-card shadow-z-4'
        : 'fixed z-[120] w-[300px] rounded-z-lg border border-z-border bg-z-surface p-z-card-sm shadow-z-3'}
      style={coarse ? { opacity: 0 } : { top: pos?.top ?? state.rect?.top ?? 0, left: pos?.left ?? state.rect?.left ?? 0, opacity: 0 }}
    >
      <PreviewContent model={state.model} />
    </div>
  );
  return createPortal(panel, document.body);
}

function PreviewContent({ model }: { model: PreviewModel }) {
  return (
    <div>
      <div className="text-z-label uppercase text-z-text-3">{model.subtitle}</div>
      <div className="mt-1 text-z-h3 text-z-text">{model.title}</div>
      {model.facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {model.facts.map((f) => (
            <div key={f.label}>
              <dt className="text-z-caption text-z-text-3">{f.label}</dt>
              <dd className="text-z-body font-medium text-z-text tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {typeof model.confidence === 'number' && <ConfidenceAnimator value={model.confidence} className="mt-3" />}
      {model.timeline && model.timeline.length > 0 && (
        <ul className="mt-3 space-y-1">
          {model.timeline.map((e, i) => (
            <li key={i} className="flex justify-between text-z-caption text-z-text-3">
              <span>{e.label}</span>{e.time && <span className="tabular-nums">{e.time}</span>}
            </li>
          ))}
        </ul>
      )}
      {model.to && (
        <a href={`#${model.to}`} className="mt-3 inline-block text-z-caption font-medium text-z-primary">Open →</a>
      )}
    </div>
  );
}
