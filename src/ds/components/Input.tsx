/** Zevra Design Language — Form controls. Focus = border + 3px ring, always. */
import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

const controlBase =
  'w-full rounded-z-md border border-z-border-strong bg-z-surface px-3.5 py-2.5 text-z-body text-z-text ' +
  'placeholder:text-z-text-muted transition-[border-color,box-shadow] duration-z-fast ease-z-standard ' +
  'hover:border-z-text-muted focus:outline-none focus:border-z-primary focus:ring-[3px] focus:ring-z-focus-ring ' +
  'disabled:bg-z-card-2 disabled:text-z-text-disabled disabled:cursor-not-allowed';

export interface FieldProps extends HTMLAttributes<HTMLLabelElement> {
  label?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, className, children, ...rest }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-2', className)} {...rest}>
      {label && <span className="text-z-caption font-medium text-z-text-2">{label}</span>}
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(controlBase, className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return <select ref={ref} className={cn(controlBase, 'appearance-none pr-9', className)} {...rest}>{children}</select>;
  },
);

export interface SearchProps extends InputHTMLAttributes<HTMLInputElement> {
  kbd?: string;
  containerClassName?: string;
  icon?: ReactNode;
}

/** Search / command-bar input shell. Focus highlights the whole shell. */
export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  { className, containerClassName, kbd, icon, ...rest }, ref,
) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-z-md border border-z-border bg-z-surface px-3.5 py-2.5 text-z-text-3 shadow-z-1',
        'transition-[border-color,box-shadow] duration-z-fast ease-z-standard',
        'focus-within:border-z-primary focus-within:ring-[3px] focus-within:ring-z-focus-ring',
        containerClassName,
      )}
    >
      {icon ?? <SearchIcon />}
      <input
        ref={ref}
        className={cn('flex-1 border-none bg-transparent text-z-body text-z-text outline-none placeholder:text-z-text-muted', className)}
        {...rest}
      />
      {kbd && <kbd className="rounded-z-xs border border-z-border bg-z-card-2 px-1.5 py-0.5 text-[11px] text-z-text-3">{kbd}</kbd>}
    </div>
  );
});

export function Chip({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-z-xs border border-z-border bg-z-card-2 px-2.5 py-1 text-z-caption text-z-text-2', className)} {...rest}>
      {children}
    </span>
  );
}

export interface FilterChipProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function FilterChip({ active, className, children, ...rest }: FilterChipProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-z-pill border px-3 py-1.5 text-z-caption font-medium',
        'transition-colors duration-z-fast ease-z-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring',
        active
          ? 'border-z-primary bg-z-primary-soft text-z-primary'
          : 'border-z-border-strong bg-z-surface text-z-text-2 hover:border-z-text-muted hover:text-z-text',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </svg>
  );
}
