/** ============================================================================
 *  ZEVRA EXPERIENCE LAYER — public surface (Phase 3.1: Runtime Substrate)
 *  The frontend platform that makes Zevra feel alive. Import from here.
 *
 *    import { ExperienceProvider, useExperienceContext, useExperienceBus } from '@/experience';
 *
 *  Phase 3.1 ships the substrate only (Context · Event Bus · Registry · config/budgets ·
 *  clock · reduced-motion · telemetry seam). Engines (Motion, Pulse, Preview, Command,
 *  Ambient) arrive in later phases and slot into the same provider.
 *  See ZEVRA_EXPERIENCE_ARCHITECTURE.md.
 *  ============================================================================ */

// Provider
export { ExperienceProvider } from './ExperienceProvider';
export type { ExperienceProviderProps } from './ExperienceProvider';

// Runtime + context hooks
export {
  useExperienceRuntime, useExperienceBus, useExperienceConfig,
  useExperienceContext, useExperienceActions, useSurfaceExperience,
} from './context/ExperienceContext';
export type { ExperienceRuntime, ExperienceContextState, ExperienceActions } from './context/ExperienceContext';

// Event Bus
export { ExperienceEventBus } from './events/ExperienceEventBus';
export { useExperienceEvents } from './events/useExperienceEvents';
export type { ExperienceEvent, ExperienceEventType, EventOf } from './events/events';

// Registry
export { ExperienceRegistry } from './registry/ExperienceRegistry';
export type { SurfaceExperience } from './registry/ExperienceRegistry';

// Config / budgets
export { DEFAULT_CONFIG, DEFAULT_BUDGETS, resolveConfig } from './config';
export type { ExperienceConfig, PerformanceBudgets } from './config';

// Clock (test seam)
export { realClock, createTestClock } from './clock';
export type { Clock, TestClock } from './clock';

// Accessibility
export { useReducedMotion, prefersReducedMotion } from './a11y/useReducedMotion';

// Telemetry
export { noopSink, consoleSink, bridgeTelemetry } from './telemetry/TelemetrySink';
export type { ExperienceTelemetrySink } from './telemetry/TelemetrySink';

// Shared types
export type {
  EntityRef, EntityKind, InteractionMode, ExperiencePhase, PulseState, Unsubscribe,
} from './types';

// ── Phase 3.2 — Motion Engine + Animation Orchestrator ─────────────────────
// Runtime (framework-independent)
export { MotionEngine } from './motion/MotionEngine';
export { AnimationOrchestrator } from './motion/AnimationOrchestrator';
export { RevealController } from './motion/RevealController';
export { AnimationHandle } from './motion/AnimationHandle';
export {
  PriorityResolver, AnimationQueue, CancellationManager, InterruptionManager, IdleCoordinator,
} from './motion/managers';
export { RevealPriority } from './motion/types';
export type {
  MotionKeyframe, MotionOptions, MotionTarget, PresetName, RevealItem, RevealSequence,
  ScopedAnimation, MotionEngineLike,
} from './motion/types';
export { PRESETS, resolveMotionTokens, FALLBACK_TOKENS } from './motion/tokens';

// React adapters (declarative surface pages use)
export { OrchestratorProvider, useOrchestrator, useMotionEngine, useMotionRuntime } from './motion/react/OrchestratorProvider';
export { Reveal, RevealGroup, useReveal } from './motion/react/Reveal';
export type { RevealProps, RevealGroupProps, RevealOptions } from './motion/react/Reveal';
export type { TweenOptions, TweenHandle, FrameSource } from './motion/types';

// ── Phase 3.3 — Enterprise Pulse + Freshness + Counter ─────────────────────
// Pulse runtime
export { PulseEngine } from './pulse/PulseEngine';
export { PulseProvider, usePulse, usePulseLastUpdate } from './pulse/PulseProvider';
export type { PulseProviderProps } from './pulse/PulseProvider';
export { MockPulseSource, INITIAL_PULSE } from './pulse/PulseSource';
export type { PulseSource } from './pulse/PulseSource';
export { EnterprisePulse } from './pulse/EnterprisePulse';
export type { EnterprisePulseProps } from './pulse/EnterprisePulse';
// Freshness runtime (reusable, not Pulse-specific)
export { FreshnessClock, formatSince } from './freshness/FreshnessClock';
export { FreshnessProvider, useFreshness, useFreshnessClock } from './freshness/FreshnessProvider';
export { FreshnessIndicator } from './freshness/FreshnessIndicator';
export type { FreshnessIndicatorProps } from './freshness/FreshnessIndicator';
// Counter primitive
export { AnimatedCounter } from './primitives/AnimatedCounter';
export type { AnimatedCounterProps } from './primitives/AnimatedCounter';

// ── Phase 3.4 — Living Components (composition: runtime → wrapper → frozen DS) ──
export { ConfidenceAnimator } from './primitives/ConfidenceAnimator';
export type { ConfidenceAnimatorProps } from './primitives/ConfidenceAnimator';
export { useTweenedValue } from './primitives/useTweenedValue';
export { sharedTransitionAttrs, previewAttrs, seamAttrs } from './living/seams';
export { useProgressiveDisclosure } from './living/useProgressiveDisclosure';
export type { Disclosure } from './living/useProgressiveDisclosure';
export {
  LivingCard, LivingMetricCard, LivingRecommendationCard, LivingInvestigationCard, LivingEntityCard,
} from './living/LivingCards';
export type {
  LivingProps, LivingMetricCardProps, LivingRecommendationCardProps,
  LivingInvestigationCardProps, LivingEntityCardProps,
} from './living/LivingCards';
export { LivingStatusDot, LivingBadge, LivingSearch, LivingButton } from './living/LivingControls';
export { LivingTable, AnimatedCell, TableSkeleton, rowPreviewProps } from './living/LivingTable';
export type { LivingTableProps, AnimatedCellProps, TableSkeletonProps } from './living/LivingTable';

// ── Phase 3.6 — Preview Framework ──────────────────────────────────────────
export { PreviewProvider, usePreview } from './preview/PreviewProvider';
export type { PreviewProviderProps } from './preview/PreviewProvider';
export { HoverPreview } from './preview/HoverPreview';
export { PreviewController } from './preview/PreviewController';
export type { PreviewControllerOptions } from './preview/PreviewController';
export { MockPreviewResolver } from './preview/PreviewResolver';
export type { PreviewResolver } from './preview/PreviewResolver';
export { computePosition } from './preview/positioning';
export type { PreviewModel, PreviewState, PreviewTarget, Fact, TimelineEvent, RectLike, Size, Placement } from './preview/types';

// ── Phase 3.7 — Command Experience ─────────────────────────────────────────
export { CommandProvider, useCommandController } from './command/CommandProvider';
export type { CommandProviderProps } from './command/CommandProvider';
export { useCommand } from './command/useCommand';
export { CommandExperience } from './command/CommandExperience';
export { CommandController } from './command/CommandController';
export type { CommandControllerDeps } from './command/CommandController';
export { MockIntentInterpreter } from './command/IntentInterpreter';
export type { IntentInterpreter } from './command/IntentInterpreter';
export type {
  Intent, IntentKind, CommandContext, Suggestion, CommandTurn, CommandPhase, CommandSessionState,
} from './command/types';
// Streaming + reasoning primitives (reusable)
export { StreamingRenderer } from './primitives/StreamingRenderer';
export type { StreamingRendererProps } from './primitives/StreamingRenderer';
export { ReasoningProgress } from './primitives/ReasoningProgress';
export type { ReasoningStep, ReasoningProgressProps } from './primitives/ReasoningProgress';
