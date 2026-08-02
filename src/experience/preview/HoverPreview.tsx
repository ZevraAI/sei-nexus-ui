/** Zevra Experience Layer — HoverPreview (Phase 3.6).
 *  Explicit opt-in wrapper: marks its children as a preview target (the same `data-z-preview-*`
 *  seam Living Components emit), so the delegated PreviewProvider handles everything. `display:
 *  contents` keeps layout unchanged. Thin — no behavior lives here. */
import type { ReactNode } from 'react';
import type { EntityRef } from '../types';

export function HoverPreview({ entity, children }: { entity: EntityRef; children: ReactNode }) {
  return (
    <span style={{ display: 'contents' }} data-z-preview-kind={entity.kind} data-z-preview-id={entity.id}>
      {children}
    </span>
  );
}
