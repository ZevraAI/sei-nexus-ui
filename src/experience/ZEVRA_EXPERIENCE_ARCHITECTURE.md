# Zevra Experience Architecture (Phase 3)

The frontend platform that makes Zevra **feel alive** — the runtime equivalent of the backend
architecture. Motion, liveness, previews, command, and ambient intelligence are built **once**, as
governed engines, and every screen (Homepage, Investigation, Executive Brief, Reports, Knowledge,
and everything future) inherits them.

> **Source of truth:** Zevra Experience Layer v1.0 (approved). This document is how we *build* it.
> **Prime directive:** experiences are infrastructure, not page-specific animations. No page hand-codes
> motion. Every interaction is defined here, implemented once, and reused everywhere.

---

## 0. Principles & engineering stance

1. **Platform, not pages.** Pages declare *intent* ("reveal these in priority order", "this card is
   live", "preview this entity"); the engines execute it. A new page inherits the full interaction
   language with near-zero interaction code.
2. **Governed by tokens.** Every duration, easing, and stagger resolves to a design token
   (`--z-dur-*`, `--z-ease-*`). The Experience Layer never invents a timing. Change a token → the whole
   platform re-times.
3. **Dependency-light core.** The core is built on **platform primitives** — CSS token animations +
   keyframes, the **Web Animations API (WAAPI)**, `IntersectionObserver`, `ResizeObserver`, and
   `requestAnimationFrame`. No animation library is added to `sei-nexus-ui` by default (it has none
   today). `framer-motion` is permitted *only* as an optional, lazy-loaded adapter for Phase-3
   shared-element transitions if WAAPI proves insufficient — never as the core.
4. **Independent of business logic.** Engines consume data through **source interfaces**
   (`PulseSource`, `IntelligenceFeed`, `IntentInterpreter`, `PreviewResolver`) — the same
   ViewModel/Adapter discipline as the backend. An engine never calls an API, knows a route, or holds
   business rules. Sources are injected; a `MockSource` powers dev/tests.
5. **Accessible & reduced-motion-first.** Every engine honors `prefers-reduced-motion` at the
   orchestrator level — motion collapses to instant state, meaning is never gated behind animation,
   focus is always visible, live regions announce ambient changes.
6. **Theme-agnostic.** Because everything resolves to tokens, light/dark is automatic. No engine
   branches on theme.
7. **Testable & deterministic.** A ` clock` abstraction and an `ExperienceConfig.enabled` kill-switch
   make every animation deterministic and disableable under test (`jsdom` has no WAAPI/RAF — engines
   degrade to instant + expose imperative `complete()`).

**The runtime analogy**

| Backend | Experience Layer |
|---|---|
| Governed SQL Runtime | **Motion Orchestrator** (schedules, prioritizes, cancels) |
| Execution Strategy Selector | **Experience Registry** (what liveness a surface gets) |
| ViewModel / Adapter | **Source interfaces** (`PulseSource`, `IntelligenceFeed`) |
| Tokens / contracts | **Design tokens** (`--z-dur-*`, `--z-ease-*`) |
| Deterministic execution | **reduced-motion / config / clock** governance |

---

## 1. Architecture (Deliverable 1)

```
ExperienceProvider  (root; composes all engines, wraps existing ThemeProvider)
│
├── Motion Engine ............ token→runtime bridge; the vocabulary of motion (durations, easings, keyframes)
├── Reveal Engine ............ declarative on-enter composition (register elements → sequenced arrival)
├── Transition Manager ....... route/view + shared-element ("this came from that") continuity
├── Pulse Engine ............. the Enterprise Pulse: coverage · freshness · reasoning · heartbeat
├── Animation Orchestrator ... THE scheduler — priority, sequencing, interruption, cancellation, idle
├── Counter Engine ........... animated numeric transitions (count-up, roll, delta)
├── Confidence Engine ........ confidence fills & increases ("arriving at certainty")
├── Freshness Engine ......... "updated Ns ago" ticking + soft re-baseline on refresh
├── Preview Engine ........... hover/focus contextual micro-panels (entities, signals, investigations)
├── Timeline Engine .......... compact event timelines revealed on demand
├── Activity Engine .......... batched, calm insertion of live business events
├── Command Experience ....... ⌘K as an application platform (intent, streaming, launch, history)
├── Ambient Intelligence ..... the always-on liveness fabric (reasoning progress, workforce, events)
├── Shared Navigation Motion . drill-down/back with origin preservation
└── Experience Registry ...... per-surface configuration: which engines a screen opts into, and how
```

### Module responsibilities

| Module | Responsibility | Consumes | Exposes |
|---|---|---|---|
| **Motion Engine** | Single source of motion vocabulary. Reads `--z-dur-*`/`--z-ease-*` into JS, owns the keyframe registry, provides `animate(el, keyframes, opts)` over WAAPI with token defaults + reduced-motion short-circuit. | tokens | `motion.animate`, `motion.dur`, `motion.ease`, keyframe presets |
| **Animation Orchestrator** | The runtime scheduler. Accepts *sequences* of animation intents with priority; guarantees ordering, staggering, **interruption** (user input completes the compose), **cancellation** (unmount/route change), and **idle** hand-off. One per provider; pages never coordinate timing. | Motion Engine, reduced-motion, clock | `orchestrator.play(sequence)`, `.interrupt()`, `.cancel(scope)`, `.onIdle()` |
| **Reveal Engine** | Declarative composition-on-enter. Elements register via `useReveal()`/`<Reveal>`; the engine hands a sequence to the Orchestrator in priority order (verdict → KPIs → signals …). Uses `IntersectionObserver` for below-the-fold. | Orchestrator | `<Reveal priority>`, `useReveal()` |
| **Transition Manager** | View/route transitions + **shared-element** handoff (a card morphs into its detail). Sits above the hash router; captures FLIP rects and animates continuity. | Motion Engine, Orchestrator | `useSharedTransition(id)`, `<TransitionScope>` |
| **Counter Engine** | RAF-driven numeric interpolation with tabular-safe formatting, count-up on first paint, roll + tint on change. | Motion Engine | `<AnimatedCounter>`, `useAnimatedNumber()` |
| **Confidence Engine** | Animates confidence bars/among 0→value on mount and delta on increase; couples fill + number roll. | Counter, Motion | `<ConfidenceAnimator>` |
| **Freshness Engine** | Global "time since" ticking (one shared interval, not N timers) + soft re-baseline cross-fade when a source refreshes. | Pulse/Ambient clock | `<FreshnessIndicator>`, `useFreshness(ts)` |
| **Pulse Engine** | The signature heartbeat. Aggregates coverage/freshness/reasoning-load/activity from a `PulseSource` into one calm, breathing, global signal. | `PulseSource` | `<EnterprisePulse>`, `usePulse()` |
| **Preview Engine** | First-class hover/focus previews: delayed open, smart positioning, progressive disclosure, keyboard + mobile behavior. Content resolved by a `PreviewResolver` per entity type. | `PreviewResolver`, Motion | `<HoverPreview>`, `usePreview()` |
| **Timeline Engine** | Renders + animates compact event timelines (activity item → mini-timeline). | Motion | `<TimelineAnimator>` |
| **Activity Engine** | Calm, **batched** insertion of live events into streams (rate-limited, deduped, ordered). | `IntelligenceFeed` | `<ActivityStream>`, `useActivityStream()` |
| **Command Experience** | ⌘K as a platform: contextual suggestions, intent reflection, streaming reasoning, launch/navigation, history, recent context. | `IntentInterpreter`, `CommandContext` | `<CommandExperience>`, `useCommand()` |
| **Ambient Intelligence** | The liveness fabric: subscribes to `IntelligenceFeed`, dispatches reasoning-progress / workforce / confidence / recommendation / investigation events to consumers, governs cadence globally. | `IntelligenceFeed` | `<AmbientProvider>`, `useAmbient(selector)` |
| **Shared Navigation Motion** | Drill-down/back preserving spatial origin (works with Transition Manager). | Transition Manager | `useDrilldown()` |
| **Experience Registry** | Declares, per surface, which engines apply and their config (e.g. Homepage = compose+pulse+ambient+preview; Reports = compose+counter). The "strategy selector" of the experience layer. | config | `registerSurface()`, `useSurfaceExperience()` |

---

## 2. Reusable primitives (Deliverable 2)

All primitives live in `src/experience/` and are reusable across **every** page. Contracts (not
implementations) below.

```ts
// motion/Motion.ts — the vocabulary
interface Motion {
  dur(name: 'instant'|'fast'|'base'|'slow'|'deliberate'): number;   // reads --z-dur-*
  ease(name: 'standard'|'entrance'|'exit'): string;
  animate(el: Element, keyframes: Keyframe[], opts?: MotionOptions): MotionHandle; // WAAPI + reduced-motion
  preset: Record<'rise'|'riseScale'|'fillWidth'|'pulseRing', Keyframe[]>;
}

// motion/Orchestrator.ts — the scheduler
interface AnimationOrchestrator {
  play(seq: RevealSequence, scope?: symbol): Promise<void>;
  interrupt(scope?: symbol): void;   // finish-now on user input
  cancel(scope?: symbol): void;      // unmount/route change
  onIdle(cb: () => void): Unsubscribe;
  readonly reducedMotion: boolean;
}
interface RevealItem { el: Element; priority: number; preset: keyof Motion['preset']; }
interface RevealSequence { items: RevealItem[]; stagger?: number; }

// motion/useReveal.ts — declarative composition (pages use this, not raw orchestrator)
function useReveal(opts?: { priority?: number; group?: string }): (el: Element|null) => void;

// motion/SharedTransition.ts
function useSharedTransition(id: string): { ref: Ref<Element>; capture(): void };

// primitives
function AnimatedCounter(p: { value: number; format?: (n:number)=>string; from?: number }): JSX.Element;
function ConfidenceAnimator(p: { value: number }): JSX.Element;          // wraps DS ConfidenceBar
function FreshnessIndicator(p: { since: number|Date; label?: string }): JSX.Element;
function SkeletonComposer(p: { of: 'card'|'metric'|'table'|'signal'; count?: number }): JSX.Element;
function StreamingRenderer(p: { stream: AsyncIterable<string>; onDone?: ()=>void }): JSX.Element;
function ReasoningProgress(p: { steps: ReasoningStep[]; activeIndex: number }): JSX.Element;
function TimelineAnimator(p: { events: TimelineEvent[] }): JSX.Element;

// pulse
function EnterprisePulse(p?: { compact?: boolean }): JSX.Element;
function usePulse(): PulseState;

// preview
function HoverPreview(p: { entity: EntityRef; children: ReactNode }): JSX.Element;

// command
function CommandExperience(): JSX.Element;   // rendered once by provider; opened via ⌘K or useCommand()
function useCommand(): { open(seed?: string): void; close(): void };

// ambient
function ActivityStream(p: { channel: string; render: (e: ActivityEvent)=>ReactNode }): JSX.Element;
function useAmbient<T>(selector: (s: AmbientState)=>T): T;
```

**Source interfaces** (business-logic boundary — injected at the provider; `Mock*` for dev/tests):

```ts
interface PulseSource { subscribe(cb: (s: PulseState)=>void): Unsubscribe; }         // coverage, freshness, reasoningLoad, activityRate
interface IntelligenceFeed { channel(name: string): AsyncIterable<ActivityEvent>; }  // reasoning/workforce/confidence/recommendation/investigation/activity
interface IntentInterpreter { interpret(text: string, ctx: CommandContext): Promise<Intent>; run(intent: Intent): AsyncIterable<CommandChunk>; }
interface PreviewResolver { resolve(entity: EntityRef): Promise<PreviewModel>; }      // supplier/store/invoice/product/recommendation/investigation
```

---

## 3. Component Enhancement Matrix (Deliverable 3)

How each **frozen** DS component becomes *living* — via composition/wrappers and engine hooks, **not**
by editing the component (the DS stays frozen; the Experience Layer decorates it).

| Component | Current | Living behavior (engine) | How (no visual redesign) |
|---|---|---|---|
| **Card** | static | hover-lift (Motion), reveal-on-enter (Reveal), shared-origin drill-down (Transition), optional live badge | wrap in `<Reveal>` + `useSharedTransition`; hover already tokenized |
| **MetricCard** | static | animated value (Counter), delta tint + roll on change, freshness stamp, hover preview, drill-down | `<AnimatedCounter>` for value; `<FreshnessIndicator>`; `<HoverPreview>` |
| **RecommendationCard** | static | arrival choreography (Orchestrator entrance), expandable rationale (progressive disclosure), "new" affordance, confidence animate | Reveal priority + `ConfidenceAnimator` + disclosure hook |
| **InvestigationCard** | static | live status pulse, reasoning-progress preview on hover, confidence creep, "just opened" state, drill-down | `useAmbient` for progress; `<HoverPreview kind=investigation>`; `ConfidenceAnimator` |
| **Badge** | static | live→pulsing (running), calm severity-change transition | already supports `live`; add transition via Motion on status change |
| **Button** | static | press micro-feedback, loading→streaming affordance, success settle | states already tokenized; hook completion into Motion |
| **StatusDot** | static/pulse | canonical heartbeat unit for Pulse & live states | already has `live` pulse ring; Pulse Engine reuses it |
| **Table** | static | staggered row reveal, live cell updates (Counter), row hover preview, skeleton loading, sort transition | `SkeletonComposer of='table'`; per-cell `AnimatedCounter`; `HoverPreview` on row |
| **EntityCard** | static | hover preview target, shared-element source into detail | `HoverPreview` + `useSharedTransition` |
| **Search** | static | focus-forward, inline suggestion reveal | Motion focus; suggestions via Reveal |
| **Command Palette** | opens as modal | becomes the **Command Experience** platform (D7) | replaced by `<CommandExperience>` infra |

Rule: enhancement is **opt-in and additive**. A page gets living components by composing engine
primitives around DS components; the DS components themselves are never forked.

---

## 4. Motion Orchestration (Deliverable 4)

The **Animation Orchestrator** is the runtime scheduler — the single authority for coordinated motion.
No page manually sequences animations.

**Capabilities**

- **Page composition** — a surface registers reveal items; the orchestrator emits the storyboard
  sequence (verdict → KPIs → signals → confidence → pulse) in one governed pass.
- **Staggered reveal** — stagger interval is a token multiple; computed centrally, not per page.
- **Priority** — items carry a priority; the orchestrator orders arrival so the *answer* lands first.
- **Interruption** — any user input (scroll, click, ⌘K) calls `interrupt(scope)` → in-flight reveals
  **complete immediately** (never a half-animated page). Choreography, not a gate.
- **Cancellation** — route change / unmount calls `cancel(scope)`; WAAPI handles are cancelled, no
  orphaned animations, no memory leaks.
- **Reduced motion** — a single check at the top: all sequences resolve to final state instantly;
  `onIdle` fires immediately.
- **Sequencing** — promise-based `play()` composes multi-stage flows (e.g. drill-down: exit list →
  navigate → enter detail from origin).
- **Idle mode** — after composition, the orchestrator hands to the ambient/idle loop; only live
  elements keep moving ("live moves, settled rests").

**Design**: a framework-agnostic `Orchestrator` class (testable in isolation) + a React
`OrchestratorProvider` exposing `useReveal()`/`useOrchestrator()`. Uses a `scope: symbol` per
mounted surface so cancellation is precise. A `clock` seam (real RAF in prod, virtual in tests) makes
sequences deterministic.

---

## 5. Enterprise Pulse (Deliverable 5) — the signature capability

A **globally available** system, consumed identically by every page. It is Zevra's "it's alive" organ.

**State** (from a `PulseSource`, business-logic-agnostic):

```ts
interface PulseState {
  coverage: number;        // % of operations understood
  freshness: number;       // ms since last full understanding pass
  reasoningLoad: number;   // active investigations / agents working now
  activityRate: number;    // recent event cadence (drives heartbeat tempo)
  confidenceTrend: 'up'|'flat'|'down';
  status: 'watching'|'reasoning'|'degraded';
}
```

**Behavior**
- A **breathing heartbeat** whose tempo subtly reflects `reasoningLoad` (more minds working → very
  slightly livelier; still calm). Built on `StatusDot`'s pulse — one canonical heartbeat unit.
- **Coverage + freshness** rendered via `AnimatedCounter` + `FreshnessIndicator` (shared tick).
- **`degraded`** state (source stalled/offline) surfaces honestly and calmly — "reconnecting" — never
  a fake-alive lie. Trust > theater.
- Two form factors from the same engine: `<EnterprisePulse />` (full, e.g. homepage eyebrow) and
  `<EnterprisePulse compact />` (a persistent header presence on every screen).

**Governance**: one `PulseProvider` at app root; one subscription; all consumers read via `usePulse()`.
Reduced-motion → static readout that still updates values. Theme-aware via tokens.

---

## 6. Preview Framework (Deliverable 6)

Hovering an entity becomes a first-class, reusable experience — **one framework, many entity types.**

**Architecture**: a single `PreviewProvider` owns one floating layer, positioning, timers, and a11y;
content is produced by a registered `PreviewResolver` per `EntityRef.kind`.

```ts
type EntityKind = 'supplier'|'store'|'invoice'|'product'|'recommendation'|'investigation';
interface EntityRef { kind: EntityKind; id: string }
interface PreviewModel { title: string; facts: Fact[]; timeline?: TimelineEvent[]; confidence?: number; to?: string }
```

**Framework guarantees (uniform for every kind):**
- **Delayed opening** — open after an intent dwell (~`--z-dur-slow`), close on leave with grace; no
  flicker on transit. Cancels if the pointer keeps moving.
- **Positioning** — collision-aware (flip/shift) via a small positioning util; anchored to the target,
  never off-screen.
- **Shared transitions** — the preview can morph into the full detail on click (Transition Manager).
- **Progressive disclosure** — summary first; expand reveals lineage/timeline in place.
- **Keyboard accessibility** — focus opens the preview; `role="dialog"`/`aria-describedby`; `Esc`
  closes; fully operable without a pointer.
- **Mobile behavior** — hover has no meaning on touch → long-press / tap opens a bottom-sheet variant
  of the same `PreviewModel` (one content model, two presentations).

Entity resolvers (`SupplierPreview`, `StorePreview`, `InvoicePreview`, `ProductPreview`,
`RecommendationPreview`, `InvestigationPreview`) are thin — they map data → `PreviewModel`; all
motion/positioning/a11y is the framework's.

---

## 7. Command Experience (Deliverable 7) — an application platform

⌘K is **not a modal search box**. It is a platform surface for *addressing the enterprise's
intelligence*, reused everywhere.

**Provider-level** (`CommandProvider`, rendered once): global ⌘K/Ctrl-K capture, focus management,
history, and `CommandContext` (what the user is currently looking at — route, selected entity,
active investigation).

**Capabilities**
- **Contextual suggestions** — opens *already knowing*: suggestions derived from `CommandContext` +
  Pulse state, before a keystroke.
- **Intent understanding** — as the user types, `IntentInterpreter.interpret()` returns a structured
  `Intent` that is **reflected back** ("Investigate → Inventory → Southwest · governed") — the visible
  comprehension moment.
- **Streaming reasoning** — `interpret→run` yields `CommandChunk`s rendered by `StreamingRenderer`
  (phrase-level, calm), with an "AI thinking" state between.
- **Investigation launch** — an intent can hand off to a new investigation with **shared-origin**
  motion (the command surface becomes the investigation).
- **Entity navigation** — intents resolve to entities/routes via the injected navigator (no hard-coded
  routes in the engine).
- **Conversation continuation** — a command session persists as a thread; follow-ups keep context.
- **Command history + recent context** — per-user recents, keyboard-navigable.

**Boundary**: the engine owns interaction, streaming, history, a11y. The `IntentInterpreter`
(LLM/back-end) and the navigator are injected — the platform has zero business logic.

---

## 8. Ambient Intelligence (Deliverable 8)

The always-on fabric that makes the enterprise feel *continuously understanding itself*. One provider,
one governed cadence, many consumers.

**Channels** (from `IntelligenceFeed`): `reasoning-progress`, `ai-workforce`, `background-investigations`,
`confidence-changes`, `activity`, `recommendation-generation`, `investigation-creation`.

**Governance (the hard part — cadence):**
- **Batching & rate-limiting** — a central scheduler drips updates (e.g. ≤1 visible insertion / few
  seconds), coalescing bursts so the UI is a *calm feed*, never a ticker.
- **Peripheral by contract** — ambient updates render at the edge (in-card, in-stream, in-pulse) —
  **never** toasts/modals. The API makes the calm path the only path.
- **Priority & suppression** — a critical event may surface a touch sooner; low-value churn is dropped.
- **Accessibility** — ambient changes announce via a polite `aria-live` region; reduced-motion →
  value changes without motion.
- **Idle integration** — Ambient owns the post-composition idle loop (breathing dots, ticking
  freshness, occasional event) via the Orchestrator's `onIdle`.

Consumers subscribe with `useAmbient(selector)` (selector-based to avoid re-render storms) or drop in
`<ActivityStream channel=… />`. Backing source is swappable: polling → SSE → WebSocket, all behind
`IntelligenceFeed`.

---

## 9. Cross-cutting architecture

**Provider tree** (app root; wraps the existing `ThemeProvider`, changes nothing about it):

```
<ThemeProvider>                    (existing)
  <ExperienceProvider config>      (new — composes the RUNTIME SUBSTRATE + engines)
    ── Runtime substrate (always present; see §9.1) ──
      • Experience Event Bus       (sole cross-engine channel)
      • ExperienceContext          (surface · interactionMode · focusedEntity ·
                                     activeInvestigation · idle · navigation · phase)
      • Experience Registry        (per-surface engine opt-in)
      • Telemetry bridge           (Bus → ExperienceTelemetrySink; experience-only)
    ── Engines (added phase by phase) ──
    <OrchestratorProvider>
      <PulseProvider source>
        <AmbientProvider feed>
          <PreviewProvider resolvers>
            <CommandProvider interpreter navigator>
              {app}
              <CommandExperience/>   (single instance)
              <PreviewLayer/>        (single floating layer)
              <AmbientLiveRegion/>   (a11y)
```

**Folder layout**

```
src/experience/
  ZEVRA_EXPERIENCE_ARCHITECTURE.md   ← this doc
  index.ts                           ← public surface (barrel)
  ExperienceProvider.tsx
  config.ts                          ← ExperienceConfig (flags, cadence, PERFORMANCE BUDGETS, kill-switch)
  context/  ExperienceContext.tsx  useExperienceContext.ts            ← runtime substrate (§9.1)
  events/   ExperienceEventBus.ts  events.ts  useExperienceEvents.ts  ← runtime substrate (§9.1)
  telemetry/ TelemetrySink.ts  telemetryBridge.ts
  registry/ExperienceRegistry.ts
  a11y/useReducedMotion.ts  clock.ts
  motion/    Motion.ts  Orchestrator.ts  OrchestratorProvider.tsx  useReveal.ts  SharedTransition.tsx  presets.ts
  primitives/ AnimatedCounter.tsx  ConfidenceAnimator.tsx  FreshnessIndicator.tsx  SkeletonComposer.tsx
              StreamingRenderer.tsx  ReasoningProgress.tsx  TimelineAnimator.tsx
  pulse/     PulseProvider.tsx  EnterprisePulse.tsx  usePulse.ts  PulseSource.ts  MockPulseSource.ts
  preview/   PreviewProvider.tsx  HoverPreview.tsx  PreviewLayer.tsx  usePreview.ts  resolvers/*
  command/   CommandProvider.tsx  CommandExperience.tsx  useCommand.ts  IntentInterpreter.ts  MockInterpreter.ts
  ambient/   AmbientProvider.tsx  ActivityStream.tsx  useAmbient.ts  IntelligenceFeed.ts  MockFeed.ts
```

**Config & governance** — `ExperienceConfig`: global `enabled` (kill-switch), per-engine flags,
cadence limits, stagger multiple, `respectReducedMotion` (default true). Consumed by all engines;
overridable per-surface via the Registry.

**Testing** — engines are framework-light classes with a `clock` seam → unit-testable deterministically
(Orchestrator ordering/interruption/cancellation; Counter interpolation; Ambient batching). Hand-rolled
`Mock*` sources (no network) power component tests, matching the repo's no-Mockito, fakes-first
convention. Under `jsdom` (no WAAPI/RAF), Motion degrades to instant + exposes `complete()`.

**Independence** — the entire layer builds and runs with `Mock*` sources and **no backend**. Wiring a
real `PulseSource`/`IntelligenceFeed`/`IntentInterpreter` is a later, isolated step — engines don't
change.

---

## 9.1 Runtime Substrate (hardening — Required, frozen)

Three foundational objects sit beneath every engine. They are additive to the cross-cutting layer;
they change no engine's structure. Everything else the hardening review raised (Attention, Telemetry,
lifecycle) is a cheap policy or seam *on top of these*.

### (a) Experience Context — the shared runtime read-model

The single source of "where the user is and what they're doing." Engines **read** it; a small writer
set (Registry, router observer, idle detector, Orchestrator) **writes**. Lean read-model, not a god
object.

```ts
type InteractionMode = 'executive' | 'investigation' | 'presenting';
type ExperiencePhase = 'bootstrapping' | 'composing' | 'ready' | 'idle';

interface ExperienceContextState {
  surface: string;                       // current surface id (e.g. 'home', 'investigation')
  interactionMode: InteractionMode;      // executive vs investigation vs presenting
  phase: ExperiencePhase;                // lifecycle (§3 — lightweight, NOT a formal FSM)
  focusedEntity: EntityRef | null;       // what the user is looking at
  activeInvestigation: string | null;    // id of the investigation in focus, if any
  idle: boolean;                         // no user activity for config.idleAfterMs
  navigation: { path: string; from: string | null };
  lastActivityAt: number;
}
// Writers (narrow, intentional): setSurface, setInteractionMode, setPhase,
// setFocusedEntity, setActiveInvestigation. idle + navigation are derived internally.
```

### (b) Experience Event Bus — the sole cross-engine channel

Typed, in-memory, synchronous/microtask pub-sub. The **only** way engines communicate. No engine
imports or calls another engine. The event union is designed to be **telemetry- and
attention-complete** from day one.

```ts
type ExperienceEvent =
  | { type: 'PulseUpdated'; state: PulseState }
  | { type: 'ConfidenceChanged'; target: EntityRef; from: number; to: number }
  | { type: 'InvestigationStarted'; id: string; origin?: EntityRef }
  | { type: 'PreviewOpened'; entity: EntityRef } | { type: 'PreviewClosed'; entity: EntityRef }
  | { type: 'RecommendationGenerated'; id: string }
  | { type: 'CommandExecuted'; intent: string }
  | { type: 'RevealCompleted'; surface: string }
  | { type: 'ActivityInserted'; channel: string; id: string }
  | { type: 'EmphasisRequested'; source: string; priority: number };   // Attention seam (§4)

interface ExperienceEventBus {
  publish(e: ExperienceEvent): void;
  subscribe<T extends ExperienceEvent['type']>(
    type: T | '*', handler: (e: Extract<ExperienceEvent, { type: T }>) => void,
  ): Unsubscribe;
}
```

Attention (§4) and Telemetry (§6) are just Bus subscribers — no engine changes required to add them.

### (c) Performance Budgets — architectural constants in `ExperienceConfig`

Budgets are *constraints*, not implementation details. Enforced at the chokepoints we build anyway
(Orchestrator concurrency, single Freshness interval, Ambient rate-limit); the rest are targets
validated by tests/telemetry.

```ts
interface PerformanceBudgets {
  maxConcurrentForeground: number;   // default 2 — foreground emphasis at once
  maxAnimationMs: number;            // = --z-dur-deliberate (560) — no animation exceeds this
  staggerMs: number;                 // reveal stagger step (token-derived)
  revealCompleteTargetMs: number;    // 3500 — full compose, interruptible
  previewOpenLatencyMs: number;      // 120 — resolve+position budget
  commandLaunchLatencyMs: number;    // 150 — ⌘K open budget
  pulseTickMs: number;               // 1000 — shared freshness/pulse cadence (one interval)
  ambientMinIntervalMs: number;      // 3000 — min gap between visible ambient insertions
}
interface ExperienceConfig {
  enabled: boolean;                  // global kill-switch
  respectReducedMotion: boolean;     // default true
  budgets: PerformanceBudgets;
  engines: Record<string, boolean>;  // per-engine flags
}
```

---

## 9.2 Runtime Invariants

The architectural rules **every** current and future experience engine must obey. These are the
contract of the platform — a change that violates an invariant is a bug, not a feature. Reviews and
tests enforce them.

1. **Tokens are the only source of timing.** No engine invents a duration, easing, or stagger — all
   resolve to `--z-dur-*` / `--z-ease-*` (or a budget derived from them). Change a token → the platform
   re-times.
2. **All foreground emphasis is scheduled by the Orchestrator.** No engine calls WAAPI/CSS animation
   directly for foreground effects. This is what lets the Attention policy arbitrate from one place.
3. **Cross-engine communication is only via the Event Bus.** Engines never import, reference, or call
   one another. If two engines must coordinate, they publish/subscribe events.
4. **Shared state is read only from `ExperienceContext`.** Engines never re-derive surface, mode,
   focus, active investigation, or idle from ad hoc sources.
5. **No business logic in an engine.** An engine never calls an API, hard-codes a route, or holds
   business rules. Data enters only through injected **Source interfaces**; navigation only through the
   injected navigator.
6. **Reduced-motion and the kill-switch are honored centrally.** `prefers-reduced-motion` collapses
   motion to instant final state; `ExperienceConfig.enabled === false` fully disables the layer. Meaning
   is never gated behind motion.
7. **Theme-agnostic.** Everything resolves through tokens; no engine branches on light/dark.
8. **Performance budgets are constraints.** Engines respect `ExperienceConfig.budgets` (concurrency,
   frequency, latency, max duration), enforced at the chokepoints.
9. **Liveness is peripheral by contract.** Ambient/live updates render in place (in-card, in-stream,
   in-pulse) and announce via a polite `aria-live` region — never toasts or modals.
10. **Cancellable and leak-free.** Every timer, RAF, observer, and animation is tied to a scope and
    torn down on unmount/route change. No orphaned loops.
11. **Testable and deterministic.** Engines take a `clock` seam and injected `Mock*` sources; they never
    depend on the wall clock or the network. The layer builds and runs with no backend.
12. **Telemetry rides the Bus only.** Experience telemetry is emitted from Bus events into a separate
    `ExperienceTelemetrySink`; it never mixes with business analytics.

---

## 10. Implementation Roadmap (Deliverable 9)

Each phase is independently shippable and production-ready (behind `ExperienceConfig`, so partial
rollout is safe). Dependencies flow downward.

| Phase | Deliverable | Contents | Depends on | Exit criteria |
|---|---|---|---|---|
| **3.1** | Experience Infrastructure | `ExperienceProvider`, `config`, `Registry`, `useReducedMotion`, `clock`, provider tree, `Mock*` sources | — | Provider mounts app-wide; kill-switch works; tests green |
| **3.2** | Motion Engine + Orchestrator | `Motion`, `Orchestrator`(+tests), `useReveal`, `presets`, reduced-motion | 3.1 | A page reveals via `useReveal`; interruption/cancellation proven in tests |
| **3.3** | Enterprise Pulse | `PulseProvider`, `EnterprisePulse`, `FreshnessIndicator`, `AnimatedCounter`, `usePulse` | 3.2 | `<EnterprisePulse>` renders globally from `MockPulseSource`, both form factors, both themes |
| **3.4** | Living Components | Enhancement wrappers for MetricCard/Card/Recommendation/Investigation/Table (Counter, Confidence, Freshness, Reveal, SharedTransition) | 3.2–3.3 | Matrix (§3) realized as opt-in wrappers; DS untouched |
| **3.5** | Homepage Integration | Homepage adopts Reveal storyboard + Pulse + living MetricCards/signals — **zero page-level animation code** | 3.2–3.4 | Storyboard (Blueprint D1) runs via orchestrator; homepage has no bespoke motion |
| **3.6** | Preview Framework | `PreviewProvider`, `HoverPreview`, positioning, a11y, mobile sheet, entity resolvers | 3.2 | Hovering signals/entities on homepage opens governed previews |
| **3.7** | Command Experience | `CommandProvider`, `CommandExperience`, streaming, intent reflection, history, context | 3.2, `MockInterpreter` | ⌘K opens contextual, reflects intent, streams; launches investigation via shared transition |
| **3.8** | Ambient Intelligence | `AmbientProvider`, `ActivityStream`, cadence governor, idle loop, live regions, wire real sources | 3.2–3.3 | Batched live events + reasoning progress + freshness feel continuous & calm |
| **(3.9)** | Investigation Integration | Investigation experience inherits Reveal + ReasoningProgress + Pulse + Command + Ambient | 3.2–3.8 | New screen inherits full language with minimal code (the DoD proof) |

Recommended immediate build order: **3.1 → 3.2 → 3.3** (the foundation + the scheduler + the signature),
then 3.4/3.5 to prove reuse on the homepage, then 3.6–3.8.

---

## 11. Definition of Done — how this architecture satisfies it

| Requirement | Satisfied by |
|---|---|
| Every page inherits the same experience layer | `ExperienceProvider` + Registry; pages declare intent via hooks |
| Motion orchestrated centrally | Animation Orchestrator; no page-level timing |
| Living Intelligence is a reusable platform | Ambient + Pulse + Freshness engines |
| Enterprise Pulse available globally | `PulseProvider` at root; `usePulse()` everywhere |
| Rich interactions implemented once, reused everywhere | Primitives (§2) + Enhancement Matrix (§3) |
| Future pages need minimal interaction code | `useReveal`, `usePulse`, `useAmbient`, `HoverPreview`, `useCommand` |
| Unique interaction language vs dashboards | The whole layer — composition-not-loading, live-moves-settled-rests, peripheral ambience |
| Reusable · configurable · testable · a11y · reduced-motion · themed · no duplication · business-logic-independent · integrates with DS | §0 stance + §9 cross-cutting |

**This document is the blueprint.** Implementation proceeds phase by phase (§10); each phase produces
production-ready software governed by `ExperienceConfig`, tested with `Mock*` sources, and built on the
frozen Design System and tokens — no visual redesign, ever.
