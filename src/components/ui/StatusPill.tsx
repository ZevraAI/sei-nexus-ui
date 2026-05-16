import type { InvestigationStatus, StatusBadgeConfig } from '../../types';
import { cn } from '../../utils/cn';

const statusConfig: Record<InvestigationStatus, StatusBadgeConfig> = {
  'In Progress': {
    label: 'In Progress',
    dotClass: 'bg-ok',
    textClass: 'text-foreground',
  },
  Open: {
    label: 'Open',
    dotClass: 'bg-note',
    textClass: 'text-foreground',
  },
  Closed: {
    label: 'Closed',
    dotClass: 'bg-off-fg',
    textClass: 'text-muted-fg',
  },
  Draft: {
    label: 'Draft',
    dotClass: 'bg-dim-fg',
    textClass: 'text-muted-fg',
  },
  'In Review': {
    label: 'In Review',
    dotClass: 'bg-note',
    textClass: 'text-foreground',
  },
  Active: {
    label: 'Active',
    dotClass: 'bg-ok',
    textClass: 'text-foreground',
  },
  Escalated: {
    label: 'Escalated',
    dotClass: 'bg-caution',
    textClass: 'text-foreground',
  },
};

interface StatusPillProps {
  status: InvestigationStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status];

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotClass)}
      />
      <span className={cn('text-[14px]', config.textClass)}>{config.label}</span>
    </span>
  );
}
