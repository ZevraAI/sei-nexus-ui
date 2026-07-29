/** Zevra Experience Layer — ExperienceProvider (Phase 3.1).
 *  Composes the runtime SUBSTRATE (Event Bus, ExperienceContext, Registry, config, clock)
 *  and the Telemetry bridge. Engines (Orchestrator, Pulse, …) are layered in later phases.
 *
 *  In Phase 3.1 this provider is INERT visually — it renders children unchanged and only
 *  establishes the runtime every future engine reads from. Safe to mount app-wide today. */
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { resolveConfig } from './config';
import { realClock } from './clock';
import { ExperienceEventBus } from './events/ExperienceEventBus';
import { ExperienceRegistry } from './registry/ExperienceRegistry';
import { RuntimeProvider, ExperienceStateProvider } from './context/ExperienceContext';
import type { ExperienceRuntime } from './context/ExperienceContext';
import { noopSink, bridgeTelemetry } from './telemetry/TelemetrySink';
import type { ExperienceTelemetrySink } from './telemetry/TelemetrySink';
import { OrchestratorProvider } from './motion/react/OrchestratorProvider';
import { FreshnessProvider } from './freshness/FreshnessProvider';
import { PulseProvider } from './pulse/PulseProvider';
import type { PulseSource } from './pulse/PulseSource';
import { PreviewProvider } from './preview/PreviewProvider';
import type { PreviewResolver } from './preview/PreviewResolver';
import { CommandProvider } from './command/CommandProvider';
import type { IntentInterpreter } from './command/IntentInterpreter';

export interface ExperienceProviderProps {
  /** Partial config override; merged over DEFAULT_CONFIG (budgets merged field-wise). */
  config?: Parameters<typeof resolveConfig>[0];
  /** Experience-only telemetry sink (default no-op). */
  telemetry?: ExperienceTelemetrySink;
  /** Pre-built registry; defaults to the seeded surface map below. */
  registry?: ExperienceRegistry;
  /** Injected Pulse data boundary (Rule 2). Defaults to a static MockPulseSource (no backend). */
  pulseSource?: PulseSource;
  /** Injected Preview data boundary. Defaults to a MockPreviewResolver (no backend). */
  previewResolver?: PreviewResolver;
  /** Injected Command business boundary (Rule 3). Defaults to a MockIntentInterpreter. */
  intentInterpreter?: IntentInterpreter;
  /** Command navigation handoff seam (later phases connect routing). */
  onCommandNavigate?: (to: string) => void;
  children: ReactNode;
}

/** Seeds each surface's intended engine opt-ins (§3). Engines activate as later phases land. */
function defaultRegistry(): ExperienceRegistry {
  return new ExperienceRegistry()
    .setFallback({ engines: ['reveal'], interactionMode: 'executive' })
    .register('home', { engines: ['reveal', 'pulse', 'ambient', 'preview', 'counter'], interactionMode: 'executive' })
    .register('investigation', { engines: ['reveal', 'pulse', 'ambient', 'reasoning', 'command'], interactionMode: 'investigation' })
    .register('brief', { engines: ['reveal', 'pulse', 'counter'], interactionMode: 'executive' })
    .register('reports', { engines: ['reveal', 'counter'], interactionMode: 'executive' })
    .register('knowledge', { engines: ['reveal', 'preview'], interactionMode: 'executive' });
}

export function ExperienceProvider({
  config, telemetry = noopSink, registry, pulseSource, previewResolver,
  intentInterpreter, onCommandNavigate, children,
}: ExperienceProviderProps) {
  // Build the runtime ONCE — it is stable for the app's life (Invariant 11 boundary).
  const runtime = useMemo<ExperienceRuntime>(() => ({
    bus: new ExperienceEventBus(),
    registry: registry ?? defaultRegistry(),
    config: resolveConfig(config),
    clock: realClock,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Telemetry bridge: one Bus subscriber → sink. Torn down with the bus (leak-free).
  useEffect(() => {
    if (!runtime.config.enabled) return;
    const off = bridgeTelemetry(runtime.bus, telemetry);
    return () => { off(); runtime.bus.clear(); };
  }, [runtime, telemetry]);

  return (
    <RuntimeProvider value={runtime}>
      <ExperienceStateProvider>
        <OrchestratorProvider>
          <FreshnessProvider>
            <PulseProvider source={pulseSource}>
              <PreviewProvider resolver={previewResolver}>
                <CommandProvider interpreter={intentInterpreter} onNavigate={onCommandNavigate}>
                  {children}
                </CommandProvider>
              </PreviewProvider>
            </PulseProvider>
          </FreshnessProvider>
        </OrchestratorProvider>
      </ExperienceStateProvider>
    </RuntimeProvider>
  );
}
