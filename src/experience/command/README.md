# Command Experience (Phase 3.7)

⌘K as a reusable runtime engine — the primary interface between the user and Zevra. Not a search
box, not a modal feature: a platform surface every page consumes identically through the provider.

## Owns / doesn't

Owns (interaction only): keyboard shortcut, session lifecycle, context awareness, intent reflection,
streaming presentation, conversation history, accessibility, navigation handoff.
Does **not** own: business reasoning, LLM logic, Agent Brain, SQL, routing. All enterprise
understanding enters through the injected `IntentInterpreter` (Rule 3); routing is a `onNavigate` seam.

## Pieces

| Part | Layer | Role |
|---|---|---|
| `CommandController` | runtime (no React) | lifecycle, query, `submit` (interpret→reflect→reason→stream), history, Event Bus, nav seam. Clock-driven reasoning progression; leak-free. |
| `IntentInterpreter` / `MockIntentInterpreter` | boundary | `suggest` · `interpret` · `run` — the only place business concepts live. |
| `CommandProvider` | React | global ⌘K/Ctrl-K + Escape; derives `CommandContext` from `ExperienceContext` (no page wiring); renders the experience once. |
| `CommandExperience` | React | overlay: input + intent reflection + suggestions + `ReasoningProgress` + `StreamingRenderer`; entrance via the Motion Runtime; `role="dialog"`, focus + Escape. |
| `useCommand` | React | imperative open/close. |
| `StreamingRenderer`, `ReasoningProgress` | primitives | the single streaming + reasoning mechanisms (reused here and by the Investigation experience). |

## Governance

Motion only via `MotionEngine.animate` (entrance) — never WAAPI/rAF. All delays use the clock seam
(deterministic tests). Cross-engine comms only via the Event Bus (`CommandOpened`, `CommandClosed`,
`CommandSubmitted`, `IntentRecognized`, `InvestigationRequested`, `CommandExecuted`). Teardown removes
the shortcut listener and destroys the controller.

## Injection

```tsx
<ExperienceProvider intentInterpreter={realInterpreter} onCommandNavigate={(to) => navigate(to)}>
  … every page now has ⌘K …
</ExperienceProvider>
```

Defaults: `MockIntentInterpreter`, no navigation. The engine is unchanged when the real interpreter
and router land.
