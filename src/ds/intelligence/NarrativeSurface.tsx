/** Zevra Intelligence Experience — NarrativeSurface. The default (and expected
 *  most-used) Intelligence container: a panel for investigation answers, executive
 *  narrative, findings, recommendations, and markdown.
 *
 *  Composes the base `Card` (its geometry, padding, and accent-spine map) and applies
 *  the Intelligence material via inline style, which robustly overrides the base fill.
 *    material="plain"  → the base Card exactly (opaque, bordered, shadowed).
 *    material="subtle" → opaque surface, hairline Intelligence edge, flat.
 *    material="glass"  → translucent + backdrop-blur, hairline edge, flat. (default)
 *    accent            → the base Card status spine ("none" = no spine).
 *  Defaults are unchanged from the first version (glass, no accent). */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Card } from '../components/Card';
import type { StatusKind } from '../types';

export type SurfaceMaterial = 'plain' | 'subtle' | 'glass';
export type SurfaceAccent = 'none' | 'primary' | StatusKind;

const material: Record<SurfaceMaterial, CSSProperties | undefined> = {
  plain: undefined, // base Card fill — no override
  subtle: {
    background: 'var(--z-card)',
    borderColor: 'var(--z-ai-edge)',
    borderTopColor: 'var(--z-ai-edge-top)',
  },
  glass: {
    background: 'var(--z-ai-surface)',
    backdropFilter: 'blur(var(--z-ai-blur))',
    WebkitBackdropFilter: 'blur(var(--z-ai-blur))',
    borderColor: 'var(--z-ai-edge)',
    borderTopColor: 'var(--z-ai-edge-top)',
  } as CSSProperties,
};

export interface NarrativeSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** The surface finish. `plain` is the base Card; `subtle`/`glass` are Intelligence material. */
  material?: SurfaceMaterial;
  /** The leading status spine (base Card accent). `none` = no spine. */
  accent?: SurfaceAccent;
  /** When the surface is "alive" (e.g. an answer still being reasoned), a glint travels
   *  its accent spine. Needs a non-`none` `accent`; reduced-motion stills it. */
  live?: boolean;
  children?: ReactNode;
}

export function NarrativeSurface({
  material: mat = 'glass', accent = 'none', live = false, className, style, children, ...rest
}: NarrativeSurfaceProps) {
  return (
    <Card
      accent={accent === 'none' ? undefined : accent}
      live={live}
      flat={mat !== 'plain'}               // plain keeps the base shadow; Intelligence materials are flat
      style={{ ...material[mat], ...style }}
      className={className}
      {...rest}
    >
      {children}
    </Card>
  );
}
