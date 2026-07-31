# ADR-0001 — The Intelligence Experience Layer

- **Status:** Accepted
- **Date:** 2026-07-30
- **Scope:** `sei-nexus-ui` design system (`src/ds/`)
- **Supersedes / relates to:** the Zevra Design Language v3.0 "Signature" token layer (`src/ds/tokens.css`)

---

## 1. Context — why this layer exists

Zevra has two categories of page, with different jobs and therefore different visual languages:

- **Enterprise Application** — Connections, Reports, Configure, Admin, Agents. These are dense, task-oriented tools. They must stay legible, calm, and stable.
- **Intelligence Experiences** — Home, Brief, Investigations, and future Reasoning / Findings. These communicate intelligence and should feel premium, editorial, and alive (the "Signature" language: serif verdict voice, mono micro-labels, the Pulse Spine, translucent material, emerald edge-highlight, atmosphere).

A single global reskin was rejected: pushing the Signature material onto enterprise tools would trade away their legibility and stability, and forking the design system would create parallel implementations that drift.

**Decision:** keep **one** base Design System, and add a thin **Intelligence Experience layer** on top of it — a *composition* layer, not a second design system.

## 2. Relationship to the Base Design System

The architecture is **three layers**, composed strictly bottom-up:

```
Base Design System        (src/ds/components, src/ds/tokens.css, --z-*)   — enterprise-grade, behavior-free foundation
        ▲ composed by
Intelligence Experience   (src/ds/intelligence, --z-ai-*)                 — canonical AI-surface compositions; behavior-free
        ▲ composed by
Experience Behaviors      (src/experience)                                — motion, liveness, preview, shared-element (LivingCard, Reveal, pulse…)
        ▲ composed by
Pages                     (Home, Brief, Investigations, …)                — compose any layer they need
```

- The Intelligence layer **composes** base primitives (`Card`, `Button`, `Input`, `Spine`, …), base geometry/type/motion **tokens** (`rounded-z-lg`, `p-z-card`, `font-z-serif`, `z-mono`, `animate-z-rise`), and adds only the **material** the base intentionally omits (translucency, hairline + emerald edge, editorial verdict metrics, atmosphere).
- The Intelligence layer is **thin**. It contains composition, tokens, spacing, motion orchestration, and reading rhythm — **not** independent widget logic. If an Intelligence primitive starts accumulating behavior, that is a smell (see §7).

## 3. Dependency direction (one-way, enforced)

**Intelligence → Base only. Never Base → Intelligence.**

- Base tokens are `--z-*`. Intelligence tokens are `--z-ai-*`.
- No base component may import from `@/ds/intelligence`.
- No base component or `src/ds/tokens.css` may reference a `--z-ai-*` token.
- `src/ds/intelligence/tokens.css` is imported in `main.jsx` **after** `src/ds/tokens.css`, so `--z-ai-*` may reference base `--z-*`, but not vice-versa.
- The base barrel `@/ds` does **not** re-export the Intelligence layer. Intelligence primitives are imported from `@/ds/intelligence`.

**Success condition:** if the Intelligence layer were deleted tomorrow, only Intelligence pages would break. Every enterprise page would be unaffected.

## 3A. The Experience Behaviors layer (third layer)

`src/experience/` is the **third and topmost shared layer**. It owns *behavior* — motion, liveness, hover-preview, shared-element transitions — and packages it as composable pieces (`LivingCard`, `Reveal`, the pulse/preview runtime, etc.). Home's signal / recommendation / workforce cards are `LivingCard`s from this layer.

**Direction of dependency (strict, one-way, bottom-up):**

```
Experience Behaviors  ──may compose──▶  Intelligence Experience  ──may compose──▶  Base Design System
        │                                        │
        └──may also compose──────────────────────┴──may compose──▶  Base Design System
```

- **Experience Behaviors may compose Intelligence primitives** (and base primitives). A `LivingCard` may wrap a `NarrativeSurface`, add `Reveal`, and hand the result to a page.
- **Intelligence primitives must remain behavior-free.** They are static material + composition + reading rhythm. They must **never** import from `@/experience`, and must not grow motion/liveness/preview logic of their own (they orchestrate only the existing base motion tokens — `animate-z-rise`, `Spine` — never bespoke runtime behavior).
- **The Intelligence layer must never depend on the Experience layer.** `grep -rn "from '.*experience" src/ds/intelligence` must be empty. This is why a behavioral consumer (Home's `LivingCard`) stays in the Experience layer instead of being pulled into `ds/intelligence`.

**Why the boundary matters:** it keeps three clean, independently-removable layers. Remove Experience → pages lose motion/liveness but Intelligence + Base still render. Remove Intelligence → only Intelligence pages break. Remove nothing from Base for enterprise. A primitive that needs behavior belongs in Experience (composing Intelligence), not in Intelligence.

**Consequence for adoption:** Home's cards are `LivingCard` (behavior), so they are **not** replaced by static `NarrativeSurface`/`HighlightSurface`. That is a behavioral boundary, not an aesthetic gap — configuration does not and should not bridge it.

## 3B. Configurability is consumer-driven

Do **not** add configuration to an Intelligence primitive speculatively. When a real adopter needs a variant (e.g. a calmer surface material), that adopter's requirement shapes the API. Rationale: the first real consumer designs a better, minimal API than up-front guessing. (Decision of 2026-07-30: `material`/`accent` configuration for the surfaces is **deferred** until Brief adoption demonstrates the concrete need.)

## 4. Naming conventions

- **Tokens:** base `--z-*`; Intelligence `--z-ai-*`. Tailwind aliases mirror the token name (`z-ai-surface`, `z-ai-edge`, `z-ai-lift`, `text-z-ai-verdict`, `max-w-z-ai-*`).
- **Primitives describe presentation, not business meaning.** `HighlightSurface` (a surface that highlights) — not `InsightSurface` (an "insight" is a business concept that exists elsewhere). `NarrativeSurface`, `ComposerSurface`, `Verdict`, `Eyebrow`, `ReadingColumn`, `IntelligencePage`, `IntelligenceSection` all name a *presentation role*.
- **Directory:** the layer lives at `src/ds/intelligence/` — it is an extension of the design system, never under a feature folder.

## 5. When a primitive belongs in the **Base** Design System

Put it in the base (`src/ds/components`) when **all** hold:

1. It is useful to **enterprise** pages (or both tiers).
2. Its look is calm/legible/stable — no premium material assumptions.
3. It expresses **presentation**, not an AI/intelligence concept.
4. Adding it does not change how existing enterprise pages render (additive, backward-compatible).

Examples that are correctly base: `Card`, `Button`, `Input`, `Field`, `Chip`, `Label`, `Badge`, `MetricCard`, `Dialog`, `SegmentedControl`, `Spinner`, `Table`, and the shared additive `Spine` primitive + `z-mono` utility.

## 6. When a primitive belongs in the **Intelligence** layer

Put it in `src/ds/intelligence/` when **any** hold:

1. It carries the **Signature material** (translucency, atmosphere, emerald edge, editorial verdict metrics).
2. It expresses the **Intelligence voice** (mono `Eyebrow`, serif `Verdict`).
3. It orchestrates the **reading experience** of an intelligence surface (`ReadingColumn`, `IntelligencePage`, `AnswerLayout`).
4. It would be visually wrong on an enterprise tool.

## 7. Rules for future contributors

- **Compose, never fork or duplicate.** There is one `Card`, one `Button`, one `Input`. Intelligence surfaces are *material variants* built on base geometry tokens — not copies of `Card`.
- **Keep the layer thin.** Intelligence primitives orchestrate base primitives + tokens + motion. They must not grow data-fetching, business logic, or bespoke widget behavior. If they do, extract the logic elsewhere or reconsider the primitive.
- **Reuse the existing motion system** (`animate-z-rise`, `Spine`, `z-pulse-ring`, `z-spine-glint*`). Do not introduce new animation primitives; orchestrate the existing ones.
- **Enterprise pages must not import `@/ds/intelligence`** unless they are intentionally becoming an Intelligence Experience.
- **Intelligence pages must keep composing the base** underneath — no duplicated implementations of base primitives.
- **Tokens stay one-way** (§3). A base file referencing `--z-ai-*` is a bug.
- **`AnswerLayout` is reserved** — contract only (see §9). Do not expand it until a real Investigation experience drives it.

## 8. Primitive classification

For each primitive: **Purpose · Allowed adopters · Not intended for · Examples · Expected evolution.**

### `IntelligencePage`
- **Purpose:** the page frame for an Intelligence Experience — scroll canvas + emerald atmosphere + the canonical `ReadingColumn`.
- **Allowed adopters:** Home, Brief, Investigations, future Reasoning / Findings.
- **Not intended for:** any enterprise page (use base `PageContainer`).
- **Examples:** `<IntelligencePage measure="read">…</IntelligencePage>`.
- **Expected evolution:** may gain width/measure options and an optional "no-atmosphere" mode; must not gain page-specific content.

### `ReadingColumn`
- **Purpose:** the canonical reading measure + page gutter for every Intelligence Experience. No page hand-defines reading widths.
- **Allowed adopters:** all Intelligence pages (directly, or via `IntelligencePage`).
- **Not intended for:** enterprise layout (use base `PageContainer`/`Stage`).
- **Examples:** `<ReadingColumn measure="column">` (800px) · `measure="read"` (62ch).
- **Expected evolution:** additional named measures only (e.g. `wide`) — never bespoke per-page widths.

### `IntelligenceSection`
- **Purpose:** a titled section in the mono `Eyebrow` voice with optional entrance motion.
- **Allowed adopters:** Intelligence pages.
- **Not intended for:** enterprise sections (use base `Section` + `SectionLabel`).
- **Examples:** `<IntelligenceSection eyebrow="What needs your attention" reveal>`.
- **Expected evolution:** may add rhythm variants; stays presentational.

### `Eyebrow`
- **Purpose:** the signature mono micro-label voice.
- **Allowed adopters:** Intelligence pages only.
- **Not intended for:** enterprise pages — they keep base `Label` / `SectionLabel` (sans).
- **Examples:** `<Eyebrow dot>Live</Eyebrow>`, section labels, meta lines.
- **Expected evolution:** stable; may add a `tone`.

### `Verdict`
- **Purpose:** the editorial serif executive conclusion.
- **Allowed adopters:** **Home and Brief only** — pages with a genuine executive conclusion.
- **Not intended for:** **Investigations** (answers begin directly in a `NarrativeSurface`), and any enterprise page (use base `Display`).
- **Examples:** `<Verdict>Revenue is running ahead of plan — led by the West.</Verdict>`.
- **Expected evolution:** may gain `size` options for hero vs. inline verdicts; never becomes generic display type.

### `NarrativeSurface`
- **Purpose:** the default Intelligence container — a panel for investigation answers, executive narrative, findings, recommendations, and markdown. Expected to be the **most-used** Intelligence primitive.
- **Implementation:** **composes the base `Card`** (its geometry, padding, and accent-spine map) and applies the Intelligence material via inline `style` (which reliably overrides the base fill). It is a composition, not a copy.
- **Finalized API** (consumer-driven by Brief, 2026-07-30):
  - `material="plain" | "subtle" | "glass"` — **default `glass`**. `plain` is the base `Card` exactly (opaque, bordered, shadowed); `subtle` is opaque + hairline Intelligence edge, flat; `glass` is translucent + backdrop-blur + hairline edge, flat.
  - `accent="none" | "primary" | <StatusKind>` — **default `none`**. Renders the base `Card` status spine (`none` = no spine).
  - (`live` may be added when a conversational adopter needs the reasoning glint — passes through to `Card`.)
- **Allowed adopters:** investigation answers, executive narrative, findings, recommendations, markdown.
- **Not intended for:** enterprise data cards (use base `Card` directly).
- **Examples:** `<NarrativeSurface material="plain" accent="critical">…</NarrativeSurface>` (Brief section) · `<NarrativeSurface>…answer…</NarrativeSurface>` (glass, default).
- **Expected evolution:** may gain slots; stays material-only (no widget behavior).

### `HighlightSurface`
- **Purpose:** an elevated surface that *highlights* intelligence — recommendations, live signals, highlighted findings. NarrativeSurface material **+ an emerald top-edge + lift**.
- **Implementation:** composes the base `Card`, same as `NarrativeSurface`.
- **Finalized API:** same `material` / `accent` scale as `NarrativeSurface` (**defaults `glass` / `none`**); every material adds the emerald top-edge and lift.
- **Allowed adopters:** Intelligence pages.
- **Not intended for:** routine content (use `NarrativeSurface`); enterprise cards (use base `Card`).
- **Examples:** `<HighlightSurface accent="primary">…recommended action…</HighlightSurface>`.
- **Expected evolution:** stays presentational. (Name is presentation-only; carries no business meaning.)

### `ComposerSurface`
- **Purpose:** the signature interaction surface — the command box every conversational Intelligence Experience composes.
- **Allowed adopters:** Investigations, Reasoning, agent conversations, Knowledge Studio assistants.
- **Not intended for:** enterprise forms (use base `Input`/`Field`).
- **Examples:** `<ComposerSurface><input …/><SendButton/></ComposerSurface>`.
- **Expected evolution:** may add attachment/toolbar slots; the field itself stays base `Input`.

## 9. Reserved composition — `AnswerLayout`

Reserved, contract only, **not implemented**. It will one day standardize the presentation order of an investigation answer so no page hand-orders its own layout:

```
Narrative → Metrics → Tables → Visualizations → Sources → Follow-up → Reasoning
```

The stub exports `ANSWER_SLOT_ORDER` and `AnswerLayoutProps`, and throws if composed, so nothing can depend on it before it is built. **Do not expand it** — its implementation will be driven by the real Investigation experience.

## 10. Verification (run before/after any layer change)

1. No base DS component imports Intelligence primitives — `grep -rn "ds/intelligence" src/ds/components src/ds/index.ts` → empty.
2. No base DS component / base tokens reference `--z-ai-*` — `grep -rn "z-ai-" src/ds/components src/ds/tokens.css` → empty.
3. The Intelligence layer imports base only (no cycle) — `grep -rhoE "from '[^']+'" src/ds/intelligence/*.tsx` → base paths only.
4. Build + tests green; new utilities present in the built CSS.

## 11. Consequences

- **Positive:** clean separation; enterprise stability guaranteed; the Signature aesthetic is opt-in per page; one design system (no fork); reviewable dependency direction.
- **Cost:** two barrels to learn (`@/ds` vs `@/ds/intelligence`); contributors must classify new primitives (§5–6).
- **Risk:** translucent material can hurt legibility over busy content — Intelligence surfaces must be reviewed for contrast in both themes on adoption.
