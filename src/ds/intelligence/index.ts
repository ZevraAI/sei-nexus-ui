/** ============================================================================
 *  ZEVRA INTELLIGENCE EXPERIENCE LAYER — barrel
 *  A lightweight layer on top of the base Design System for Zevra's Intelligence
 *  Experiences (Home, Brief, Investigations, future Reasoning/Findings). These
 *  primitives COMPOSE base primitives + base geometry/type/motion tokens and add
 *  the namespaced `--z-ai-*` material. They never fork or mutate the base.
 *
 *    import { IntelligencePage, ReadingColumn, NarrativeSurface } from '@/ds/intelligence';
 *
 *  Enterprise pages must NOT import from here; Intelligence pages must NOT reach
 *  around these into raw --z-ai-* details. The dependency direction is one-way.
 *  ============================================================================ */

export { IntelligencePage } from './IntelligencePage';
export type { IntelligencePageProps } from './IntelligencePage';

export { ReadingColumn } from './ReadingColumn';
export type { ReadingColumnProps } from './ReadingColumn';

export { IntelligenceSection } from './IntelligenceSection';
export type { IntelligenceSectionProps } from './IntelligenceSection';

export { Eyebrow } from './Eyebrow';
export type { EyebrowProps } from './Eyebrow';

export { Verdict } from './Verdict';
export type { VerdictProps } from './Verdict';

export { NarrativeSurface } from './NarrativeSurface';
export type { NarrativeSurfaceProps, SurfaceMaterial, SurfaceAccent } from './NarrativeSurface';

export { HighlightSurface } from './HighlightSurface';
export type { HighlightSurfaceProps } from './HighlightSurface';

export { ComposerSurface } from './ComposerSurface';
export type { ComposerSurfaceProps } from './ComposerSurface';

// Reserved — contract only, not implemented.
export { AnswerLayout, ANSWER_SLOT_ORDER } from './AnswerLayout';
export type { AnswerLayoutProps, AnswerSlot } from './AnswerLayout';
