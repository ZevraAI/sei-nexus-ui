/** Zevra Experience Layer — FreshnessIndicator (Phase 3.3).
 *  Reusable "updated Ns ago" readout backed by the shared FreshnessClock. Presentation is
 *  token-only; a consuming surface supplies the timestamp. */
import type { HTMLAttributes } from 'react';
import { useFreshness } from './FreshnessProvider';

export interface FreshnessIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  since: number | Date;
  prefix?: string;
}

export function FreshnessIndicator({ since, prefix = 'updated', className, ...rest }: FreshnessIndicatorProps) {
  const { label } = useFreshness(since);
  return (
    <span className={className} {...rest}>
      {prefix} {label}
    </span>
  );
}
