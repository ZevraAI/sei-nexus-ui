# Preview Framework (Phase 3.6)

A reusable runtime engine. Hovering (or focusing) an entity opens a contextual micro-panel. It
attaches to the existing `data-z-preview-*` seams via ONE document-delegated listener set, so any
page whose Living Components emit those markers gains previews **with no page code**.

## What it owns / doesn't

Owns: positioning, lifecycle (dwell-open / grace-close / switch), keyboard + Escape, accessibility,
mobile bottom-sheet, entrance motion (through the Motion Runtime), Event Bus publication.
Does **not** own: business logic, entity loading, routing, page layout — those enter only through the
injected `PreviewResolver`.

## Pieces

| Part | Layer | Role |
|---|---|---|
| `PreviewController` | runtime (no React) | lifecycle state machine; delayed open/close via the clock; publishes `PreviewOpened`/`PreviewClosed`. |
| `computePosition` | runtime (pure) | collision-aware placement (flip above/below, shift into viewport). |
| `PreviewResolver` / `MockPreviewResolver` | boundary | EntityRef → PreviewModel (injected; mock for dev/tests). |
| `PreviewProvider` | React | ONE delegated listener set on `document` reading the seams; provides the controller; renders the layer. |
| `PreviewLayer` | React | the single floating panel / mobile sheet; positions, animates entrance via `MotionEngine`, renders the model, non-modal `role="dialog"`. |
| `HoverPreview` | React | explicit opt-in wrapper (emits the seam for non-Living children). |
| `usePreview` | React | imperative open/close. |

## Motion & governance

Entrance runs through `MotionEngine.animate` (Rule: never WAAPI/rAF directly). Reduced-motion and the
kill-switch make it instant automatically. All delays use the clock seam (deterministic in tests).
Teardown removes every listener and destroys the controller (leak-free).

## Injection

```tsx
<ExperienceProvider previewResolver={realResolver}> … </ExperienceProvider>
```

Default is `MockPreviewResolver` (no backend). The engine is unchanged when the real resolver lands.
