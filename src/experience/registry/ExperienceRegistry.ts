/** Zevra Experience Layer — Experience Registry (§1).
 *  Declares, per surface, which engines apply and the surface's default interaction mode.
 *  The "strategy selector" of the experience layer. Pure data; no engine coupling. */
import type { InteractionMode } from '../types';

export interface SurfaceExperience {
  /** Engine ids this surface opts into (e.g. ['reveal','pulse','ambient','preview']). */
  engines: string[];
  /** Default interaction mode when this surface is active. */
  interactionMode?: InteractionMode;
}

export class ExperienceRegistry {
  private readonly surfaces = new Map<string, SurfaceExperience>();
  private fallback: SurfaceExperience = { engines: [], interactionMode: 'executive' };

  register(surfaceId: string, cfg: SurfaceExperience): this {
    this.surfaces.set(surfaceId, cfg);
    return this;
  }

  /** Set the config returned for unregistered surfaces. */
  setFallback(cfg: SurfaceExperience): this {
    this.fallback = cfg;
    return this;
  }

  has(surfaceId: string): boolean {
    return this.surfaces.has(surfaceId);
  }

  /** Resolve a surface's experience config, falling back for unknown surfaces. */
  get(surfaceId: string): SurfaceExperience {
    return this.surfaces.get(surfaceId) ?? this.fallback;
  }

  /** True when the given surface opts into the given engine. */
  usesEngine(surfaceId: string, engine: string): boolean {
    return this.get(surfaceId).engines.includes(engine);
  }
}
