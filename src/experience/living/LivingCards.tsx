/** Zevra Experience Layer — Living card family (Phase 3.4).
 *  Composition wrappers: Experience Runtime → wrapper → FROZEN DS component. Each adds runtime
 *  behavior by composing existing primitives (Reveal, AnimatedCounter, ConfidenceAnimator,
 *  FreshnessIndicator) and seams (shared-transition, preview). No motion scheduling, no business
 *  logic, no DS modification. Work identically on every page. */
import type { ReactNode } from 'react';
import { Card, MetricCard } from '../../ds';
import type { CardProps, MetricCardProps } from '../../ds';
import type { EntityRef } from '../types';
import { Reveal } from '../motion/react/Reveal';
import { RevealPriority } from '../motion/types';
import type { PresetName } from '../motion/types';
import { AnimatedCounter } from '../primitives/AnimatedCounter';
import { ConfidenceAnimator } from '../primitives/ConfidenceAnimator';
import { FreshnessIndicator } from '../freshness/FreshnessIndicator';
import { seamAttrs } from './seams';
import { useProgressiveDisclosure } from './useProgressiveDisclosure';

/** Runtime intent shared by every living card. */
export interface LivingProps {
  priority?: RevealPriority | number;
  preset?: PresetName;
  /** Opt out of the enter reveal (default reveals). */
  reveal?: boolean;
  /** SharedTransition seam (behavior in a later phase). */
  sharedId?: string;
  /** Preview seam (behavior in Phase 3.6). */
  previewEntity?: EntityRef;
}

function wrap(node: ReactNode, p: LivingProps) {
  return p.reveal === false ? <>{node}</> : <Reveal priority={p.priority} preset={p.preset}>{node}</Reveal>;
}

/** Base living card: Reveal + seams around the frozen DS Card. */
export function LivingCard({ priority, preset, reveal, sharedId, previewEntity, children, ...cardProps }: CardProps & LivingProps) {
  const card = <Card {...cardProps} {...seamAttrs({ sharedId, previewEntity })}>{children}</Card>;
  return wrap(card, { priority, preset, reveal, sharedId, previewEntity });
}

export interface LivingMetricCardProps extends Omit<MetricCardProps, 'value' | 'label'>, LivingProps {
  value: number;
  label: ReactNode;
  format?: (n: number) => string;
  from?: number;
  /** Optional freshness stamp appended to the label. */
  freshnessSince?: number | Date;
}

/** MetricCard → animated value + optional freshness stamp. */
export function LivingMetricCard({
  value, label, trend, format, from, freshnessSince,
  priority, preset, reveal, sharedId, previewEntity, ...rest
}: LivingMetricCardProps) {
  const animated = <AnimatedCounter value={value} format={format} from={from} />;
  const composedLabel = freshnessSince != null
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{label}<FreshnessIndicator since={freshnessSince} className="text-z-text-3" /></span>
    : label;
  const card = <MetricCard value={animated} label={composedLabel} trend={trend} {...seamAttrs({ sharedId, previewEntity })} {...rest} />;
  return wrap(card, { priority, preset, reveal, sharedId, previewEntity });
}

export interface LivingRecommendationCardProps extends CardProps, LivingProps {
  /** 0–100; renders an animated ConfidenceAnimator when present. */
  confidence?: number;
  /** Detail revealed via progressive disclosure. */
  detail?: ReactNode;
}

/** RecommendationCard → confidence animation + progressive disclosure + seams. */
export function LivingRecommendationCard({
  confidence, detail, accent = 'primary',
  priority, preset, reveal, sharedId, previewEntity, children, ...rest
}: LivingRecommendationCardProps) {
  const disc = useProgressiveDisclosure();
  const card = (
    <Card accent={accent} {...seamAttrs({ sharedId, previewEntity })} {...rest}>
      {children}
      {confidence != null && <ConfidenceAnimator value={confidence} className="mt-4" />}
      {detail != null && (
        <div className="mt-4">
          <button type="button" className="text-z-caption font-medium text-z-primary" {...disc.triggerProps}>
            {disc.open ? 'Hide detail' : 'Show detail'}
          </button>
          <div {...disc.contentProps} className="mt-2 text-z-caption text-z-text-2">{detail}</div>
        </div>
      )}
    </Card>
  );
  return wrap(card, { priority, preset, reveal, sharedId, previewEntity });
}

export interface LivingInvestigationCardProps extends CardProps, LivingProps {
  confidence?: number;
}

/** InvestigationCard → confidence animation + interactive + preview/shared seams. */
export function LivingInvestigationCard({
  confidence, interactive = true,
  priority, preset, reveal, sharedId, previewEntity, children, ...rest
}: LivingInvestigationCardProps) {
  const card = (
    <Card interactive={interactive} {...seamAttrs({ sharedId, previewEntity })} {...rest}>
      {children}
      {confidence != null && <ConfidenceAnimator value={confidence} className="mt-4" />}
    </Card>
  );
  return wrap(card, { priority, preset, reveal, sharedId, previewEntity });
}

export interface LivingEntityCardProps extends CardProps, LivingProps {
  entity: EntityRef;
}

/** EntityCard → the preview target for an entity + shared-transition source. */
export function LivingEntityCard({
  entity, interactive = true, priority, preset, reveal, sharedId, children, ...rest
}: LivingEntityCardProps) {
  const card = (
    <Card interactive={interactive} {...seamAttrs({ sharedId, previewEntity: entity })} {...rest}>
      {children}
    </Card>
  );
  return wrap(card, { priority, preset, reveal, sharedId, previewEntity: entity });
}
