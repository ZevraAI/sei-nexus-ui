/** Zevra Design Language — InlineAlert. In-context messaging & validation (not empty states).
 *  Variants map to the semantic color language. Optional dismiss. Platform-wide. */
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

const variantClass = {
  info: 'border-z-info bg-z-info-soft text-z-info-on',
  success: 'border-z-healthy bg-z-healthy-soft text-z-healthy-on',
  warning: 'border-z-warning bg-z-warning-soft text-z-warning-on',
  error: 'border-z-critical bg-z-critical-soft text-z-critical-on',
} as const;

export interface InlineAlertProps {
  variant?: keyof typeof variantClass;
  title?: ReactNode;
  className?: string;
  children?: ReactNode;
  /** When provided, renders a dismiss button. Backward-compatible (omit to keep the old behavior). */
  onDismiss?: () => void;
}

export function InlineAlert({ variant = 'info', title, className, children, onDismiss }: InlineAlertProps) {
  return (
    <div role="alert" className={cn('relative rounded-z-md border px-4 py-3', onDismiss && 'pr-10', variantClass[variant], className)}>
      {title && <p className="text-z-body font-medium">{title}</p>}
      {children && <p className={cn('text-z-caption', title && 'mt-0.5')}>{children}</p>}
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="absolute right-2.5 top-2.5 inline-grid h-6 w-6 place-items-center rounded-z-sm text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
