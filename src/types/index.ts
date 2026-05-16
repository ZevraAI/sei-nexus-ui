import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface ActionTile {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export type InvestigationStatus =
  | 'In Progress'
  | 'Open'
  | 'Closed'
  | 'Draft'
  | 'In Review'
  | 'Active'
  | 'Escalated';

export interface Investigation {
  id: string;
  title: string;
  owner: string;
  ownerInitials: string;
  status: InvestigationStatus;
  updatedAt: string;
}

export interface ContextField {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  valueVariant?: 'accent' | 'default';
  version?: string;
  isOnline?: boolean;
  linkLabel?: string;
  pillVariant?: 'confidential' | 'pending';
}

export interface InvestigationContext {
  title: string;
  fields: ContextField[];
}

export interface StatusBadgeConfig {
  label: string;
  dotClass: string;
  textClass: string;
}
