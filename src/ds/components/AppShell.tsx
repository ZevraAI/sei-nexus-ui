/** Zevra Design Language — global layout, navigation, and shared layout utilities. */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/** Page wrapper — sets the app background + base text on the token surface. */
export function AppShell({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-screen bg-z-bg text-z-text font-sans antialiased', className)} {...rest}>{children}</div>;
}

/** Sticky top navigation bar. Compose Brand, CommandBar, Nav, actions as children. */
export function TopBar({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={cn('sticky top-0 z-40 flex items-center gap-7 border-b border-z-border bg-z-bg px-z-page py-4', className)}
      {...rest}
    >
      {children}
    </header>
  );
}

export function Brand({ label = 'ZEVRA', className, ...rest }: HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-[14px] font-bold tracking-[0.2em] text-z-text', className)} {...rest}>
      <span
        className="h-[19px] w-[19px] rounded-z-xs"
        style={{ background: 'linear-gradient(135deg, var(--z-primary), color-mix(in srgb, var(--z-investigating) 70%, var(--z-primary)))' }}
        aria-hidden
      />
      {label}
    </div>
  );
}

export function Nav({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return <nav className={cn('flex gap-0.5', className)} {...rest}>{children}</nav>;
}

export interface NavItemProps extends HTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  href?: string;
}

export function NavItem({ active, className, children, ...rest }: NavItemProps) {
  return (
    <a
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative cursor-pointer rounded-z-md px-4 py-2.5 text-z-caption text-z-text-2 no-underline',
        'transition-colors duration-z-fast ease-z-standard hover:bg-z-hover hover:text-z-text',
        active && 'font-medium text-z-text after:absolute after:inset-x-4 after:-bottom-px after:h-0.5 after:rounded-full after:bg-z-primary',
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Avatar({ initials, className, ...rest }: HTMLAttributes<HTMLDivElement> & { initials: string }) {
  return (
    <div
      className={cn(
        'grid h-[34px] w-[34px] place-items-center rounded-z-round bg-z-primary text-[12px] font-semibold text-z-on-accent',
        className,
      )}
      {...rest}
    >
      {initials}
    </div>
  );
}

/* ── Shared layout utilities ─────────────────────────────────────────────── */

/** Centered content column with page margins. `narrow` for reading/brief views. */
export function Stage({ narrow, className, children, ...rest }: HTMLAttributes<HTMLElement> & { narrow?: boolean }) {
  return (
    <main
      className={cn('mx-auto px-z-page pb-24 pt-12', narrow ? 'max-w-z-narrow' : 'max-w-z-stage', className)}
      {...rest}
    >
      {children}
    </main>
  );
}

export function Grid({ cols = 3, className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { cols?: 2 | 3 }) {
  return (
    <div className={cn('grid gap-z-gutter', cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionLabel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Signature: a short Pulse Spine tick leads every section label (page rhythm).
        'relative mb-5 mt-z-section pl-3.5 text-z-label uppercase text-z-text-3',
        'before:absolute before:left-0 before:top-[1px] before:h-[11px] before:w-[2px] before:rounded-full before:bg-z-spine-strong',
        className,
      )}
      {...rest}
    >{children}</div>
  );
}

/** Fade-and-rise reveal wrapper — communicates "intelligence composing" (MOTION.md). */
export function Reveal({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-z-rise', className)} {...rest}>{children}</div>;
}

/** PulseSpine — the signature thread of intelligence. A horizontal hairline of emerald
 *  light that carries a single travelling glint while `live` (honoured by reduced-motion,
 *  which stills the glint). Pure CSS driven by the DS keyframe — no runtime scheduling,
 *  no new animation system. Used in the hero; the same identity that rests on every card. */
export function PulseSpine({
  live = true, className, ...rest
}: HTMLAttributes<HTMLDivElement> & { live?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative h-px w-full max-w-[640px] rounded-full',
        'bg-[linear-gradient(90deg,var(--z-spine-strong),var(--z-spine)_40%,transparent)]',
        className,
      )}
      {...rest}
    >
      {live && (
        <span className="absolute -top-[2px] left-0 h-[5px] w-[5px] rounded-full bg-z-spine-strong shadow-[0_0_10px_var(--z-spine-glow)] animate-z-spine-glint motion-reduce:animate-none motion-reduce:left-[34%]" />
      )}
    </div>
  );
}
