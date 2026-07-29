# Motion Engine & Animation Orchestrator (Phase 3.2)

The Experience Runtime's execution + scheduling layer. Built like the backend runtime: governed,
deterministic, testable, business-logic-free. Two layers.

## Layer A — Runtime (no React, unit-testable in isolation)

| Class | Responsibility |
|---|---|
| `MotionEngine` | **The only WAAPI caller** (Rule 5). Resolves timing from tokens (`tokens.ts`), clamps to `maxAnimationMs`, honors reduced-motion + kill-switch, degrades to instant when WAAPI is absent. |
| `AnimationHandle` | One animation's lifecycle: `finished` promise, `finish()` (interruption), `dispose()`/`cancel()` (cancellation). |
| `AnimationOrchestrator` | **The single scheduling authority** (Rule 1). `play(sequence, scope)` composes; `emphasize()` for single foreground animations; `interrupt`/`cancel`/`onIdle`. Depends on a `MotionEngineLike` (faked in tests). |
| `PriorityResolver` | Priority ordering + stagger clamped to `revealCompleteTargetMs`. |
| `AnimationQueue` | Concurrency-limited runner — enforces `maxConcurrentForeground`. |
| `CancellationManager` | Per-scope tracking + teardown (leak-free). |
| `InterruptionManager` | Finish-now (vs cancel) on user input. |
| `IdleCoordinator` | Hand-off to the idle loop when all composes complete (coalesced on the clock). |
| `RevealController` | Per-group: collects reveal registrations → one `RevealSequence` → the Orchestrator. |

## Layer B — React adapters (thin translators only)

| API | Role |
|---|---|
| `OrchestratorProvider` | Builds the `MotionEngine` + `AnimationOrchestrator` from runtime config/clock; wires global interruption on user input + cancel-all teardown. |
| `useReveal(opts)` | Ref callback: registers an element into its `RevealGroup` (or plays solo). |
| `<Reveal priority preset>` | Declarative reveal wrapper — pages write this, never `motion.play(...)`. |
| `<RevealGroup stagger>` | Groups child reveals into one governed, staggered compose. |

## Usage (available now; homepage integration is Phase 3.5)

```tsx
import { RevealGroup, Reveal, RevealPriority } from '@/experience';

<RevealGroup>
  <Reveal priority={RevealPriority.CRITICAL}><Verdict/></Reveal>
  <Reveal priority={RevealPriority.HIGH}><KpiStrip/></Reveal>
  <Reveal priority={RevealPriority.NORMAL}><Signals/></Reveal>
</RevealGroup>
```

The page declares priority + intent; the runtime owns ordering, stagger, interruption,
cancellation, reduced-motion, and idle. Governed entirely by tokens + `ExperienceConfig.budgets`.
