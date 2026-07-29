/** Zevra Design Language — the definitive Zevra table. Calm, sticky header,
 *  sortable, selectable, right-aligned tabular numbers, designed empty state. */
import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/** Bordered, rounded, clipped wrapper. Enables the sticky header + overflow. */
export function TableWrap({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-hidden rounded-z-lg border border-z-border bg-z-card shadow-z-1', className)} {...rest}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-z-body', className)} {...rest}>{children}</table>;
}

export function THead({ className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...rest}>{children}</thead>;
}

export function TBody({ className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...rest}>{children}</tbody>;
}

export type SortDir = 'asc' | 'desc' | null;

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  sortable?: boolean;
  sort?: SortDir;
}

export function Th({ numeric, sortable, sort = null, className, children, ...rest }: ThProps) {
  return (
    <th
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
      className={cn(
        'sticky top-0 z-[1] whitespace-nowrap border-b border-z-border bg-z-card-2 px-4 py-3 text-z-caption font-semibold text-z-text-3',
        numeric ? 'text-right tabular-nums' : 'text-left',
        sortable && 'cursor-pointer select-none hover:text-z-text',
        className,
      )}
      {...rest}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && <span aria-hidden className="text-z-text-muted">{sort === 'asc' ? '↑' : sort === 'desc' ? '↓' : '↕'}</span>}
      </span>
    </th>
  );
}

export interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  interactive?: boolean;
}

export function Tr({ selected, interactive, className, children, ...rest }: TrProps) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cn(
        'transition-colors duration-z-fast ease-z-standard [&:not(:last-child)>td]:border-b [&>td]:border-z-border',
        interactive && 'cursor-pointer',
        selected ? 'bg-z-selected' : 'hover:bg-z-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function Td({ numeric, className, children, ...rest }: TdProps) {
  return (
    <td className={cn('px-4 py-3.5 align-middle text-z-text-2', numeric && 'text-right tabular-nums', className)} {...rest}>
      {children}
    </td>
  );
}

/** Reveal-on-row-hover action cluster (place inside a Td). */
export function RowActions({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('opacity-0 transition-opacity duration-z-fast [tr:hover_&]:opacity-100', className)} {...rest}>
      {children}
    </span>
  );
}

export interface TableEmptyProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

/** Every table has a designed empty state — never a blank box. */
export function TableEmpty({ title, description, action }: TableEmptyProps) {
  return (
    <div className="px-7 py-16 text-center">
      <div className="text-z-h3 text-z-text-2">{title}</div>
      {description && <p className="mx-auto mt-2 max-w-z-read text-z-caption text-z-text-3">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
