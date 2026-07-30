/** Zevra Design Language — Cards. One idea per card; interactive cards lift + lead somewhere. */
import type { HTMLAttributes, ReactNode, CSSProperties } from 'react';
import { cn } from '../../utils/cn';
import type { StatusKind } from '../types';

const accentVar: Record<StatusKind | 'primary', string> = {
  primary: 'var(--z-primary)',
  healthy: 'var(--z-healthy)',
  investigating: 'var(--z-investigating)',
  warning: 'var(--z-warning)',
  critical: 'var(--z-critical)',
  resolved: 'var(--z-resolved)',
  running: 'var(--z-running)',
  completed: 'var(--z-healthy)',
  waiting: 'var(--z-waiting)',
  info: 'var(--z-info)',
  neutral: 'var(--z-neutral)',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  flat?: boolean;
  /** Adds the Pulse Spine (a lit status thread) on the leading edge. */
  accent?: StatusKind | 'primary';
  /** When the card is "alive," a glint travels down the spine (needs `accent`). Reduced-motion hides it. */
  live?: boolean;
  children?: ReactNode;
}

export function Card({ interactive, flat, accent, live, className, style, children, ...rest }: CardProps) {
  const accentStyle: CSSProperties | undefined = accent
    ? { ...style, ['--z-card-accent' as string]: accentVar[accent] }
    : style;
  return (
    <div
      style={accentStyle}
      className={cn(
        'rounded-z-lg border border-z-border bg-z-card p-z-card',
        flat ? 'shadow-none' : 'shadow-z-1',
        'transition-[transform,box-shadow,border-color] duration-z-base ease-z-standard',
        interactive && 'cursor-pointer hover:-translate-y-[3px] hover:shadow-z-2',
        // Signature Pulse Spine: a 2px thread on the leading edge that fades top/bottom
        // and carries a faint glow — the same identity as the hero spine, at rest.
        accent && 'relative overflow-hidden before:pointer-events-none before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[2px] before:rounded-full ' +
          'before:bg-[linear-gradient(180deg,transparent,var(--z-card-accent)_18%,var(--z-card-accent)_82%,transparent)] ' +
          'before:shadow-[0_0_12px_var(--z-spine-glow)]',
        className,
      )}
      {...rest}
    >
      {/* Signature: the travelling glint marks a card whose intelligence is live. */}
      {accent && live && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 z-[2] h-[5px] w-[3px] rounded-full bg-[var(--z-card-accent)] shadow-[0_0_12px_var(--z-spine-glow)] animate-z-spine-glint-y motion-reduce:hidden"
        />
      )}
      {children}
    </div>
  );
}

export function CardLabel({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('text-z-label uppercase text-z-text-3', className)} {...rest}>{children}</span>;
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('mt-2 text-z-h3 text-z-text', className)} {...rest}>{children}</h3>;
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 text-z-body text-z-text-2 leading-[1.55]', className)} {...rest}>{children}</p>;
}

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  label: ReactNode;
  /** Colors the value for trend. */
  trend?: 'up' | 'down';
}

/** A single figure. Composes status strips and "by the numbers" grids. */
export function MetricCard({ value, label, trend, className, ...rest }: MetricCardProps) {
  return (
    <div className={cn('rounded-z-lg border border-z-border bg-z-card p-z-card-sm shadow-z-1', className)} {...rest}>
      <div className={cn('text-z-kpi tabular-nums', trend === 'up' ? 'text-z-up' : trend === 'down' ? 'text-z-down' : 'text-z-text')}>
        {value}
      </div>
      <div className="mt-1.5 text-z-caption text-z-text-3">{label}</div>
    </div>
  );
}

export interface ConfidenceBarProps {
  /** 0–100. */
  value: number;
  className?: string;
}

/** Confidence bar — the "how sure am I" element. Fills on mount. */
export function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-z-caption text-z-text-3">Confidence</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-z-pill border border-z-border bg-z-card-2">
        <span
          className="block h-full rounded-z-pill bg-gradient-to-r from-z-investigating to-z-healthy"
          style={{ width: `${pct}%` }}
        />
      </span>
      <b className="text-z-body text-z-text tabular-nums">{pct}%</b>
    </div>
  );
}
