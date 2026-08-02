/** Zevra Experience Layer — Living Component seams (Phase 3.4).
 *  Integration POINTS only — no behavior. Later phases attach behavior via these markers:
 *    • SharedTransition (Transition Manager) finds elements by `data-z-shared`.
 *    • Preview (Phase 3.6) finds targets by `data-z-preview-*`.
 *  Pure functions → deterministically unit-testable, zero runtime coupling. */
import type { EntityRef } from '../types';

/** Mark an element as a shared-transition endpoint. */
export function sharedTransitionAttrs(id?: string): Record<string, string> {
  return id ? { 'data-z-shared': id } : {};
}

/** Mark an element as a preview target for an entity (Phase 3.6 attaches the behavior). */
export function previewAttrs(entity?: EntityRef): Record<string, string> {
  return entity ? { 'data-z-preview-kind': entity.kind, 'data-z-preview-id': entity.id } : {};
}

/** Convenience: both seams merged. */
export function seamAttrs(opts: { sharedId?: string; previewEntity?: EntityRef }): Record<string, string> {
  return { ...sharedTransitionAttrs(opts.sharedId), ...previewAttrs(opts.previewEntity) };
}
