/** Zevra Design Language — InlineAlert. In-context messaging & validation (not empty states).
 *  Variants map to the semantic color language. Platform-wide. */
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
}

export function InlineAlert({ variant = 'info', title, className, children }: InlineAlertProps) {
  return (
    <div role="alert" className={cn('rounded-z-md border px-4 py-3', variantClass[variant], className)}>
      {title && <p className="text-z-body font-medium">{title}</p>}
      {children && <p className={cn('text-z-caption', title && 'mt-0.5')}>{children}</p>}
    </div>
  );
}
