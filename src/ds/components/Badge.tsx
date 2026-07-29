/** Zevra Design Language — Status language. Color = business meaning (COLORS.md).
 *  Badge pairs color + word; StatusDot is for dense rows. Only live states pulse. */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { StatusKind } from '../types';

// Static class maps (full strings) so Tailwind's content scanner keeps them.
const badgeTone: Record<StatusKind, string> = {
  healthy: 'bg-z-healthy-soft text-z-healthy-on',
  investigating: 'bg-z-investigating-soft text-z-investigating-on',
  warning: 'bg-z-warning-soft text-z-warning-on',
  critical: 'bg-z-critical-soft text-z-critical-on',
  resolved: 'bg-z-resolved-soft text-z-resolved-on',
  running: 'bg-z-running-soft text-z-running-on',
  completed: 'bg-z-healthy-soft text-z-healthy-on',
  waiting: 'bg-z-waiting-soft text-z-waiting-on',
  info: 'bg-z-info-soft text-z-info-on',
  neutral: 'bg-z-neutral-soft text-z-neutral-on',
};

const dotSolid: Record<StatusKind, string> = {
  healthy: 'bg-z-healthy',
  investigating: 'bg-z-investigating',
  warning: 'bg-z-warning',
  critical: 'bg-z-critical',
  resolved: 'bg-z-resolved',
  running: 'bg-z-running',
  completed: 'bg-z-healthy',
  waiting: 'bg-z-waiting',
  info: 'bg-z-info',
  neutral: 'bg-z-neutral',
};

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusKind;
  /** Live/running states pulse; settled states stay static (motion = happening now). */
  live?: boolean;
}

export function StatusDot({ status, live = false, className, ...rest }: StatusDotProps) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 flex-none', className)} aria-hidden {...rest}>
      <span className={cn('h-2 w-2 rounded-full', dotSolid[status])} />
      {live && (
        <span className={cn('absolute inset-0 rounded-full animate-z-pulse-ring', dotSolid[status])} />
      )}
    </span>
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusKind;
  /** Show a leading dot (pulsing when `live`). */
  dot?: boolean;
  live?: boolean;
  children: ReactNode;
}

export function Badge({ status, dot = false, live = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-z-xs px-2.5 py-1 text-z-label uppercase tracking-[0.03em]',
        badgeTone[status],
        className,
      )}
      {...rest}
    >
      {dot && <StatusDot status={status} live={live} className="h-1.5 w-1.5" />}
      {children}
    </span>
  );
}
