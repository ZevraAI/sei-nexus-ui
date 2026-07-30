/** ============================================================================
 *  EmptyPreviewResolver — production-safe PreviewResolver (business-logic boundary).
 *
 *  Until a real preview API exists (Phase 2), production must not render the
 *  representative MockPreviewResolver data (e.g. "Northgate Foods"). This resolver
 *  returns a truthful, minimal preview — the entity's own reference, with NO
 *  fabricated facts. Injected in production; MockPreviewResolver is used only in
 *  dev-preview.
 *  ============================================================================ */
import type { PreviewResolver } from '../experience/preview/PreviewResolver';
import type { PreviewModel } from '../experience/preview/types';
import type { EntityRef } from '../experience/types';

export class EmptyPreviewResolver implements PreviewResolver {
  resolve(entity: EntityRef): Promise<PreviewModel> {
    return Promise.resolve({
      title: entity.id || entity.kind,
      subtitle: entity.kind,
      facts: [],
    });
  }
}
