/** Zevra Experience Layer — Preview types (Phase 3.6). Contracts only; no business logic. */
import type { EntityRef } from '../types';

export interface Fact { label: string; value: string; }
export interface TimelineEvent { label: string; time?: string; }

/** What the Preview engine renders for an entity. Produced by an injected PreviewResolver. */
export interface PreviewModel {
  title: string;
  subtitle?: string;
  facts: Fact[];
  timeline?: TimelineEvent[];
  confidence?: number;   // 0–100
  to?: string;           // navigation target (hash route) — resolved by the consumer, not the engine
}

export interface RectLike { top: number; left: number; width: number; height: number; }
export interface Size { width: number; height: number; }
export type Placement = 'top' | 'bottom';

export interface PreviewTarget { entity: EntityRef; rect: RectLike; }

export interface PreviewState {
  phase: 'idle' | 'open';
  entity: EntityRef | null;
  rect: RectLike | null;
  model: PreviewModel | null;
}
