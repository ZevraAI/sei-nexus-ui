/** Zevra Design Language — Spinner. For inline async work (buttons, testing, saving).
 *  Use Skeletons for page loading. Accessible (role=status) and reduced-motion aware
 *  (slows rather than stops so the busy state stays legible). Inherits currentColor. */
import { cn } from '../../utils/cn';

const sizeClass = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizeClass;
  className?: string;
  label?: string;
}

export function Spinner({ size = 'sm', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent align-[-0.125em]',
        'motion-reduce:[animation-duration:2s]',
        sizeClass[size],
        className,
      )}
    />
  );
}
