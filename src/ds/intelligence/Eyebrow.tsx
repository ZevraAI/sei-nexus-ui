/** Zevra Intelligence Experience — Eyebrow. The signature mono micro-label voice.
 *  Only Intelligence Experiences use it; enterprise pages keep the base Label. */
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface EyebrowProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** A leading emerald pulse dot — marks a "live" eyebrow. */
  dot?: boolean;
  children?: ReactNode;
}

export function Eyebrow({ as: Tag = 'span', dot = false, className, children, ...rest }: EyebrowProps) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-2 font-z-mono text-[10.5px] uppercase tracking-[0.14em] text-z-text-3',
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-z-primary shadow-[0_0_8px_var(--z-spine-glow)]" />}
      {children}
    </Tag>
  );
}
