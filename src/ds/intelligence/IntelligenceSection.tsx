/** Zevra Intelligence Experience — IntelligenceSection. A titled section in the
 *  mono Eyebrow voice, with optional entrance (reusing the base z-rise motion). */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Eyebrow } from './Eyebrow';

export interface IntelligenceSectionProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: ReactNode;
  /** Play the base entrance motion (honours reduced-motion via the shared system). */
  reveal?: boolean;
  children?: ReactNode;
}

export function IntelligenceSection({ eyebrow, reveal = false, className, children, ...rest }: IntelligenceSectionProps) {
  return (
    <section className={cn(reveal && 'animate-z-rise', className)} {...rest}>
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      {children}
    </section>
  );
}
