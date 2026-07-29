/** Zevra Experience Layer — CommandExperience (Phase 3.7, Layer B).
 *  The overlay surface. Reads the controller; renders input, intent reflection, contextual
 *  suggestions, ReasoningProgress + StreamingRenderer (reused primitives), and history. Entrance runs
 *  through the Motion Runtime (never WAAPI directly). Non-modal-safe dialog with focus + Escape. */
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { SearchIcon } from '../../ds';
import { useMotionEngine } from '../motion/react/OrchestratorProvider';
import { StreamingRenderer } from '../primitives/StreamingRenderer';
import { ReasoningProgress } from '../primitives/ReasoningProgress';
import type { CommandController } from './CommandController';

export function CommandExperience({ controller }: { controller: CommandController }) {
  const engine = useMotionEngine();
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (state.open) setTimeout(() => inputRef.current?.focus(), 0); }, [state.open]);
  useLayoutEffect(() => {
    if (state.open && panelRef.current) engine.animate(panelRef.current, engine.presets.riseScale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open]);

  if (!state.open || typeof document === 'undefined') return null;
  const steps = state.intent?.steps;
  const suggestions = controller.getSuggestions();

  const overlay = (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center bg-[var(--z-overlay)] pt-[14vh] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) controller.close(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ask Zevra"
        className="h-fit w-[min(640px,92vw)] overflow-hidden rounded-z-xl border border-z-border bg-z-surface shadow-z-4"
        style={{ opacity: 0 }}
      >
        <div className="flex items-center gap-3 border-b border-z-border px-5 py-4">
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            value={state.query}
            onChange={(e) => controller.setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); controller.submit(); } }}
            placeholder="Ask the enterprise, or start an investigation…"
            className="flex-1 bg-transparent text-z-body-lg text-z-text outline-none placeholder:text-z-text-muted"
          />
        </div>

        {state.intent && (
          <div className="px-5 pt-3 text-z-caption font-medium text-z-investigating">{state.intent.label}</div>
        )}

        {state.phase === 'thinking' && (
          <div className="px-5 py-4 text-z-caption text-z-text-3">Zevra is reasoning…</div>
        )}

        {steps && steps.length > 0 && state.phase !== 'thinking' && (
          <div className="px-5 py-3">
            <ReasoningProgress steps={steps} activeIndex={state.phase === 'reasoning' ? state.reasoningIndex : steps.length} />
          </div>
        )}

        {(state.phase === 'streaming' || state.phase === 'done') && state.currentRun && (
          <div className="px-5 pb-4 text-z-body leading-relaxed text-z-text-2">
            <StreamingRenderer stream={state.currentRun} onDone={() => controller.finishStreaming()} />
          </div>
        )}

        {state.phase === 'idle' && (
          <div className="py-1">
            <div className="px-5 pb-1 pt-3 text-z-label uppercase text-z-text-3">Suggested</div>
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => { controller.setQuery(s.seed); controller.submit(); }}
                className="block w-full px-5 py-2.5 text-left text-z-body text-z-text-2 transition-colors hover:bg-z-selected hover:text-z-text"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {state.phase === 'done' && state.intent?.to && (
          <div className="border-t border-z-border px-5 py-3">
            <button onClick={() => controller.handoff()} className="text-z-caption font-medium text-z-primary">
              Open {state.intent.kind === 'investigate' ? 'investigation' : 'brief'} →
            </button>
          </div>
        )}

        <div className="border-t border-z-border bg-z-card-2 px-5 py-3 text-z-caption text-z-text-3">
          Reasoned over governed business data · every answer traceable
        </div>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}
