/** Zevra Intelligence Experience — ReadingColumn. The canonical wrapper for every
 *  Intelligence Experience. No page should hand-define reading widths; they compose
 *  this. Token-only (base page gutter + IE reading measures). */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

const measures = {
  read: 'max-w-z-ai-read',       // 62ch — prose / narrative
  column: 'max-w-z-ai-column',   // 800px — conversation / workspace
  narrow: 'max-w-z-narrow',      // 900px — wider intelligence pages
  wide: 'max-w-[1280px]',        // 1280px — dashboard-scale intelligence pages (Home)
} as const;

export interface ReadingColumnProps extends HTMLAttributes<HTMLDivElement> {
  measure?: keyof typeof measures;
  children?: ReactNode;
}

export function ReadingColumn({ measure = 'read', className, children, ...rest }: ReadingColumnProps) {
  return (
    <div className={cn('mx-auto w-full px-z-page', measures[measure], className)} {...rest}>
      {children}
    </div>
  );
}
