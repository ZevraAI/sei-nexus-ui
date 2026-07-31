/** Zevra Intelligence Experience — Verdict. The editorial executive conclusion,
 *  in the serif voice at a light weight. Reserved exclusively for pages that
 *  genuinely communicate a conclusion (Home, Brief) — never Investigations. */
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface VerdictProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: ElementType;
  /** `md` — the inline answer verdict (28px). `lg`/`xl` — the hero executive
   *  verdict, matching the base Display scale so a hero verdict is pixel-equal to
   *  `Display size="lg|xl"` (serif, weight 400). */
  size?: 'md' | 'lg' | 'xl';
  children?: ReactNode;
}

const sizeClass = {
  md: 'text-z-ai-verdict max-w-z-ai-verdict',
  lg: 'text-z-display-lg',
  xl: 'text-z-display-xl',
} as const;

export function Verdict({ as: Tag = 'h1', size = 'md', className, children, ...rest }: VerdictProps) {
  return (
    <Tag
      className={cn('font-z-serif font-normal tracking-[-0.015em] text-z-text', sizeClass[size], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
