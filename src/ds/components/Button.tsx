/** Zevra Design Language — Buttons. One primary per view (COMPONENTS.md). */
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-medium leading-none whitespace-nowrap select-none ' +
  'rounded-z-pill border border-transparent transition-[transform,background-color,box-shadow,border-color] ' +
  'duration-z-fast ease-z-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring ' +
  'active:scale-[0.985] disabled:cursor-not-allowed disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-z-primary text-z-on-accent shadow-z-1 hover:bg-z-primary-hover hover:-translate-y-px hover:shadow-z-2 ' +
    'active:bg-z-primary-press disabled:bg-z-card-2 disabled:text-z-text-disabled disabled:shadow-none',
  secondary:
    'bg-z-surface text-z-text border-z-border-strong shadow-z-1 hover:bg-z-secondary-hover hover:-translate-y-px ' +
    'disabled:text-z-text-disabled disabled:shadow-none',
  ghost: 'bg-transparent text-z-text hover:bg-z-hover disabled:text-z-text-disabled',
  danger: 'bg-z-critical text-white shadow-z-1 hover:-translate-y-px hover:brightness-105 disabled:opacity-50',
  link: 'bg-transparent text-z-primary rounded-z-sm hover:underline p-0',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'text-z-caption px-3.5 py-[7px]',
  md: 'text-[15px] px-5 py-[11px]',
  lg: 'text-z-body-lg px-[26px] py-3.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leadingIcon, trailingIcon, className, children, disabled, ...rest },
  ref,
) {
  const sizeCls = variant === 'link' ? '' : sizes[size];
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizeCls, loading && 'relative text-transparent', className)}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
      {loading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="h-[15px] w-[15px] animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/** Square 36px toolbar action. `label` is required for accessibility. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, children, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'inline-grid h-9 w-9 place-items-center rounded-z-md border border-transparent text-z-text-2',
        'transition-colors duration-z-fast ease-z-standard hover:bg-z-hover hover:text-z-text',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
