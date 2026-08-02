/** Zevra Design Language — Typography. Type does the hierarchy work (TYPOGRAPHY.md). */
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Base = HTMLAttributes<HTMLElement> & { as?: ElementType; children?: ReactNode };

/** Display — the answer/verdict. One per view (max).
 *  Signature: the verdict speaks in the serif voice (font-normal so the serif reads
 *  editorial, not heavy). Size/line-height stay on the token scale; only the face +
 *  weight + tracking evolve. */
export function Display({ as: Tag = 'h1', size = 'lg', className, children, ...rest }: Base & { size?: 'xl' | 'lg' }) {
  return (
    <Tag
      className={cn(
        size === 'xl' ? 'text-z-display-xl' : 'text-z-display-lg',
        'font-z-serif font-normal tracking-[-0.015em] text-z-text',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Heading levels 1–3. */
export function Heading({ level = 2, as, className, children, ...rest }: Base & { level?: 1 | 2 | 3 }) {
  const Tag = (as ?? (`h${level}` as ElementType));
  const size = level === 1 ? 'text-z-h1' : level === 2 ? 'text-z-h2' : 'text-z-h3';
  return <Tag className={cn(size, 'text-z-text', className)} {...rest}>{children}</Tag>;
}

/** Body / caption text with a tone. */
export function Text({
  as: Tag = 'p', size = 'md', tone = 'default', className, children, ...rest
}: Base & { size?: 'lg' | 'md' | 'sm'; tone?: 'default' | 'secondary' | 'tertiary' }) {
  const sizeCls = size === 'lg' ? 'text-z-body-lg' : size === 'sm' ? 'text-z-caption' : 'text-z-body';
  const toneCls = tone === 'secondary' ? 'text-z-text-2' : tone === 'tertiary' ? 'text-z-text-3' : 'text-z-text';
  return <Tag className={cn(sizeCls, toneCls, className)} {...rest}>{children}</Tag>;
}

/** Uppercase micro-label / eyebrow. */
export function Label({ as: Tag = 'span', className, children, ...rest }: Base) {
  return <Tag className={cn('text-z-label uppercase text-z-text-3', className)} {...rest}>{children}</Tag>;
}

/** A KPI figure — always tabular. */
export function Kpi({ as: Tag = 'span', size = 'md', className, children, ...rest }: Base & { size?: 'lg' | 'md' }) {
  return (
    <Tag className={cn(size === 'lg' ? 'text-z-kpi-lg' : 'text-z-kpi', 'text-z-text tabular-nums', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Inline tabular number wrapper. */
export function Num({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { children?: ReactNode }) {
  return <span className={cn('tabular-nums', className)} {...rest}>{children}</span>;
}
