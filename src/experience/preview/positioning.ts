/** Zevra Experience Layer — collision-aware positioning (Phase 3.6).
 *  Pure function → deterministically testable. Prefers below the anchor; flips above when there
 *  isn't room; shifts/clamps so the panel is never off-screen. Owns geometry only. */
import type { Placement, RectLike, Size } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function computePosition(
  anchor: RectLike,
  panel: Size,
  viewport: Size,
  gap = 8,
): { top: number; left: number; placement: Placement } {
  const spaceBelow = viewport.height - (anchor.top + anchor.height);
  const spaceAbove = anchor.top;

  // Flip: below when it fits (or when there's simply more room below).
  const placement: Placement =
    spaceBelow >= panel.height + gap || spaceBelow >= spaceAbove ? 'bottom' : 'top';

  let top = placement === 'bottom'
    ? anchor.top + anchor.height + gap
    : anchor.top - panel.height - gap;
  top = clamp(top, gap, viewport.height - panel.height - gap);

  // Shift: align to the anchor's left edge, clamped within the viewport.
  const left = clamp(anchor.left, gap, viewport.width - panel.width - gap);

  return { top, left, placement };
}
