# Living Components (Phase 3.4)

The integration layer between the frozen Design System and the frozen Experience Runtime. Every
enhancement is **composition, never modification**:

```
Experience Runtime → Living wrapper → frozen Design System component
   (behavior)                              (presentation)
```

Wrappers own behavior by composing **existing** runtime primitives only — they never schedule
motion, never touch WAAPI/RAF, and hold no business logic. They work identically on every page.

## Wrappers

| Living | Wraps DS | Composes (runtime) |
|---|---|---|
| `LivingCard` | `Card` | `Reveal` + shared/preview seams |
| `LivingMetricCard` | `MetricCard` | `AnimatedCounter` (value) + `FreshnessIndicator` + `Reveal` |
| `LivingRecommendationCard` | `Card` (accent) | `ConfidenceAnimator` + `useProgressiveDisclosure` + `Reveal` |
| `LivingInvestigationCard` | `Card` | `ConfidenceAnimator` + preview/shared seams + `Reveal` |
| `LivingEntityCard` | `Card` | preview seam (entity) + shared seam + `Reveal` |
| `LivingTable` / `AnimatedCell` / `TableSkeleton` | `TableWrap`/`Table`/`Td`/`Tr` | `Reveal` + `AnimatedCounter` + static skeleton |
| `LivingBadge` / `LivingStatusDot` | `Badge` / `StatusDot` | reduced-motion propagation (heartbeat honesty) |
| `LivingSearch` / `LivingButton` | `Search` / `Button` | stable seams (Command/feedback phases enhance in place) |

## Runtime capabilities (reused, never duplicated)

`Reveal` · `AnimatedCounter` · `ConfidenceAnimator` (new primitive → `MotionEngine.tween`) ·
`FreshnessIndicator` (shared clock) · reduced-motion. Pulse is consumed as-is via `EnterprisePulse`
(no duplicate heartbeat/freshness/counter logic anywhere).

## Seams (integration points only — behavior lands later)

- **SharedTransition** → `data-z-shared` (`sharedTransitionAttrs`) — Transition Manager attaches behavior.
- **Preview** → `data-z-preview-kind` / `-id` (`previewAttrs`) — Phase 3.6 attaches behavior.

## Usage

```tsx
import { LivingMetricCard, LivingRecommendationCard, RevealPriority } from '@/experience';

<LivingMetricCard value={94.2} label="Inventory health" format={(n)=>`${n.toFixed(1)}%`}
                  freshnessSince={lastScan} priority={RevealPriority.HIGH} />

<LivingRecommendationCard confidence={91} detail={<Rationale/>}>
  <CardLabel>Recommended action</CardLabel><CardTitle>Expedite replenishment</CardTitle>
</LivingRecommendationCard>
```

Note: per-row staggered table reveal awaits a ref-free row path (the DS `Tr` is frozen and not
forwardRef); `LivingTable` reveals the table as a unit today.
