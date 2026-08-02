/** Zevra Design Language — SegmentedControl. Single-select segmented button group.
 *  Platform-wide (scheduling, view switching, lightweight filters, settings…). Accessible:
 *  role="radiogroup", roving tabindex, arrow-key navigation, aria-checked. Signature styling. */
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

const sizeClass = {
  sm: 'text-z-caption gap-1.5 px-3 py-1.5',
  md: 'text-z-body gap-2 px-4 py-2',
} as const;

export function SegmentedControl({
  options, value, onChange, size = 'md', className, 'aria-label': ariaLabel,
}: SegmentedControlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = options.findIndex((o) => o.value === value);

  const move = (dir: number) => {
    const n = options.length;
    if (!n) return;
    let i = idx < 0 ? 0 : idx;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (!options[i].disabled) {
        onChange(options[i].value);
        const next = i;
        requestAnimationFrame(() => {
          ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
        });
        return;
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn('inline-flex rounded-z-md border border-z-border bg-z-card-2 p-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => !o.disabled && onChange(o.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-z-sm font-medium',
              'transition-colors duration-z-fast ease-z-standard',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring',
              sizeClass[size],
              active ? 'bg-z-primary text-z-on-accent shadow-z-1' : 'text-z-text-2 hover:text-z-text',
              o.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
