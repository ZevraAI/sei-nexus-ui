/** Zevra Experience Layer — Living table pieces (Phase 3.4).
 *  Composition around frozen DS table primitives. Reveal on enter, animated numeric cells (reused
 *  AnimatedCounter), a static skeleton (composition), and row-level preview via the seam.
 *
 *  Note: per-ROW staggered reveal needs the DS `Tr` to forward a ref, which the frozen DS does not.
 *  Rather than fork the DS, `LivingTable` reveals the table as one unit today; per-row stagger is a
 *  later enhancement when the runtime gains a ref-free row registration path. */
import type { ReactNode } from 'react';
import { TableWrap, Table, TBody, Tr, Td } from '../../ds';
import type { TdProps } from '../../ds';
import type { EntityRef } from '../types';
import { Reveal } from '../motion/react/Reveal';
import { RevealPriority } from '../motion/types';
import { AnimatedCounter } from '../primitives/AnimatedCounter';
import { previewAttrs } from './seams';

export interface LivingTableProps {
  children: ReactNode;
  reveal?: boolean;
  priority?: RevealPriority | number;
  className?: string;
}

/** DS TableWrap+Table wrapped in an enter Reveal. */
export function LivingTable({ children, reveal = true, priority, className }: LivingTableProps) {
  const table = <TableWrap className={className}><Table>{children}</Table></TableWrap>;
  return reveal === false ? table : <Reveal priority={priority}>{table}</Reveal>;
}

export interface AnimatedCellProps extends TdProps {
  value: number;
  format?: (n: number) => string;
}

/** A numeric cell whose value counts up via the Motion Runtime. */
export function AnimatedCell({ value, format, ...tdProps }: AnimatedCellProps) {
  return (
    <Td numeric {...tdProps}>
      <AnimatedCounter value={value} format={format} />
    </Td>
  );
}

/** Row-preview seam: spread onto a DS <Tr> to make the row a preview target (Phase 3.6). */
export function rowPreviewProps(entity: EntityRef): Record<string, string> {
  return previewAttrs(entity);
}

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

/** A calm, static skeleton composed from DS Tr/Td + token placeholders (reduced-motion-safe). */
export function TableSkeleton({ rows = 3, cols = 4 }: TableSkeletonProps) {
  return (
    <TBody>
      {Array.from({ length: rows }).map((_, r) => (
        <Tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <Td key={c}>
              <span className="block h-3 w-full max-w-[8rem] rounded-z-xs bg-z-card-2" aria-hidden />
            </Td>
          ))}
        </Tr>
      ))}
    </TBody>
  );
}
