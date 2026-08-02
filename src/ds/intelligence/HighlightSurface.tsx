/** Zevra Intelligence Experience — HighlightSurface. An elevated surface that
 *  *highlights* intelligence — recommendations, live signals, highlighted findings.
 *  Same material scale + accent as NarrativeSurface, plus its signature: an emerald
 *  top-edge and lift. Composes the base `Card`; material applied via inline style.
 *  ("Highlight" names the presentation role; it carries no business meaning.)
 *    material="plain"  → opaque base fill + emerald top-edge + lift.
 *    material="subtle" → opaque Intelligence surface + emerald top-edge + lift.
 *    material="glass"  → translucent + blur + emerald top-edge + lift. (default) */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Card } from '../components/Card';
import type { SurfaceMaterial, SurfaceAccent } from './NarrativeSurface';

const material: Record<SurfaceMaterial, CSSProperties> = {
  plain: {
    borderTopColor: 'var(--z-ai-edge-em)',
    boxShadow: 'var(--z-ai-lift)',
  },
  subtle: {
    background: 'var(--z-card)',
    borderColor: 'var(--z-ai-edge)',
    borderTopColor: 'var(--z-ai-edge-em)',
    boxShadow: 'var(--z-ai-lift)',
  },
  glass: {
    background: 'var(--z-ai-surface)',
    backdropFilter: 'blur(var(--z-ai-blur))',
    WebkitBackdropFilter: 'blur(var(--z-ai-blur))',
    borderColor: 'var(--z-ai-edge)',
    borderTopColor: 'var(--z-ai-edge-em)',
    boxShadow: 'var(--z-ai-lift)',
  } as CSSProperties,
};

export interface HighlightSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  material?: SurfaceMaterial;
  accent?: SurfaceAccent;
  children?: ReactNode;
}

export function HighlightSurface({
  material: mat = 'glass', accent = 'none', className, style, children, ...rest
}: HighlightSurfaceProps) {
  return (
    <Card
      accent={accent === 'none' ? undefined : accent}
      flat                                  // the lift comes from the inline boxShadow, not the base shadow
      style={{ ...material[mat], ...style }}
      className={className}
      {...rest}
    >
      {children}
    </Card>
  );
}
