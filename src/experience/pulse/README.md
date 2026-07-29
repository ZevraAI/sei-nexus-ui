# Enterprise Pulse (Phase 3.3)

The signature "it's alive" capability, as a reusable runtime engine. Every page consumes the same
Pulse; it is completely independent of business logic and operates only through the substrate
(Event Bus, clock, config) and the Motion Runtime.

## Runtime (Layer A — no React)

| Class | Owns |
|---|---|
| `PulseEngine` | subscription lifecycle (ONE source subscription), state, last-update timestamp, local subscribers, **Event Bus publication** (`PulseUpdated` / `PulseStatusChanged` / `PulseFreshnessChanged`). No motion, no business logic, no presentation. |
| `PulseSource` (interface) | the business boundary — injected. `MockPulseSource` drives dev/tests deterministically (`emit(...)`). |
| `FreshnessClock` | reusable, NOT Pulse-specific — ONE shared ticking source for all "updated Ns ago" readouts. Ticks only while subscribed. |

## React (Layer B — thin adapters)

| API | Role |
|---|---|
| `PulseProvider source={…}` | builds the engine, one subscription; mounted once (in `ExperienceProvider`). |
| `usePulse()` | current `PulseState \| null` via `useSyncExternalStore` (no duplicate renders). |
| `EnterprisePulse` / `compact` | reads state, composes DS `StatusDot` + `AnimatedCounter` + `FreshnessIndicator`. |
| `FreshnessProvider` / `useFreshness` / `FreshnessIndicator` | shared-clock relative time. |
| `AnimatedCounter` | count-up via `MotionEngine.tween` — inherits reduced-motion/kill/budget automatically. |

## Motion

The only animation is the coverage count-up, executed through the Motion Runtime
(`MotionEngine.tween`, the single RAF in the app). The heartbeat is the DS `StatusDot` pulse,
which Pulse switches off under reduced-motion. Pulse never calls WAAPI/RAF or schedules motion.

## Usage (available now; page wiring is later phases)

```tsx
import { EnterprisePulse } from '@/experience';
<EnterprisePulse />            // full: dot · "Understood live" · coverage · updated Ns ago
<EnterprisePulse compact />    // dot + coverage
```

Inject a real source at the app root when it exists:
`<ExperienceProvider pulseSource={realPulseSource}>` — the engine is unchanged.
