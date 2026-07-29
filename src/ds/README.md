# Zevra UI Foundation (`src/ds`) — Phase 1

The production implementation of **Zevra Design Language v1.0**. This is the shared UI
foundation every Zevra page is built from. No business functionality lives here — only the
reusable primitives.

The canonical spec is `design-system/` at the repo root (philosophy, tokens, components,
motion). This folder is that spec, implemented for the app.

## How it works

1. **Tokens** — `ds/tokens.css` defines every `--z-*` variable for light (`:root`) and dark
   (`[data-theme="dark"]`). Imported once in `src/main.jsx`. This is the source of truth.
2. **Tailwind** — `tailwind.config.js` exposes those tokens as `z-*` utilities
   (`bg-z-card`, `text-z-text`, `rounded-z-lg`, `shadow-z-1`, `text-z-h1`, `p-z-card`, …).
   Components are built from these utilities, so **every** color/space/radius/shadow/type
   value resolves to an approved token — nothing is hard-coded.
3. **Components** — typed TSX in `ds/components/`, exported from `ds/index.ts`.
4. **Theme** — reuses the app's existing `ThemeProvider` (sets `<html data-theme>`, persists
   to `localStorage`, no flash). One theme state for legacy and new pages alike.

## Usage

```tsx
import { AppShell, TopBar, Brand, Nav, NavItem, CommandBar, ThemeToggle, Avatar,
         Stage, SectionLabel, Grid, Card, CardTitle, CardBody, Button, Badge,
         MetricCard, Display, Text } from '@/ds'; // or relative: '../ds'

function Page() {
  return (
    <AppShell>
      <TopBar>
        <Brand />
        <div className="mx-auto w-full max-w-[520px]"><CommandBar /></div>
        <Nav><NavItem active>Command</NavItem><NavItem>Investigations</NavItem></Nav>
        <ThemeToggle />
        <Avatar initials="DR" />
      </TopBar>
      <Stage>
        <Display>Good morning, Daniel.</Display>
        <SectionLabel>What needs your attention</SectionLabel>
        <Grid cols={3}>
          <Card interactive accent="critical"><CardTitle>Inventory drop</CardTitle><CardBody>…</CardBody></Card>
        </Grid>
      </Stage>
    </AppShell>
  );
}
```

The app must be wrapped once in `<ThemeProvider>` (already the case via the existing context;
`ThemeToggle` and `useTheme` rely on it).

## What's included (Phase 1)

Theme provider · design tokens · global layout (`AppShell`, `Stage`, `Grid`) · navigation
(`TopBar`, `Brand`, `Nav`, `NavItem`, `Avatar`) · typography (`Display`, `Heading`, `Text`,
`Label`, `Kpi`, `Num`) · buttons (`Button`, `IconButton`) · cards (`Card`, `MetricCard`,
`ConfidenceBar`) · tables (`TableWrap`, `Table`, `Th`, `Tr`, `Td`, `RowActions`, `TableEmpty`)
· forms (`Field`, `Input`, `Select`, `Search`, `Chip`, `FilterChip`) · status
(`Badge`, `StatusDot`) · command bar (`CommandBar`) · layout utilities (`SectionLabel`, `Reveal`).

## Verify

`src/ds/Showcase.tsx` renders the whole foundation in both themes. To view it, temporarily
render `<Showcase />` from `App`, flip the theme toggle, and confirm parity with the approved
reference (`design-system/LIGHT_THEME.html` / `DARK_THEME.html`).

## Rules for building on it

- **Never invent** a color, spacing, radius, shadow, or type size. Use a `z-*` utility or a
  foundation component.
- Prefer a component; drop to `z-*` utilities for layout.
- One primary action per view; status color = business meaning; verify light **and** dark.
- Legacy pages keep their old tokens and migrate incrementally — no visual conflict, because
  the foundation is additive.
