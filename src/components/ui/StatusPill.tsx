import type { InvestigationStatus, StatusBadgeConfig } from '../../types';
import { cn } from '../../utils/cn';

const statusConfig: Record<InvestigationStatus, StatusBadgeConfig> = {
  'In Progress': {
    label: 'In Progress',
    dotClass: 'bg-ok',
    textClass: 'text-z-text',
  },
  Open: {
    label: 'Open',
    dotClass: 'bg-note',
    textClass: 'text-z-text',
  },
  Closed: {
    label: 'Closed',
    dotClass: 'bg-off-fg',
    textClass: 'text-z-text-2',
  },
  Draft: {
    label: 'Draft',
    dotClass: 'bg-dim-fg',
    textClass: 'text-z-text-2',
  },
  'In Review': {
    label: 'In Review',
    dotClass: 'bg-note',
    textClass: 'text-z-text',
  },
  Active: {
    label: 'Active',
    dotClass: 'bg-ok',
    textClass: 'text-z-text',
  },
  Escalated: {
    label: 'Escalated',
    dotClass: 'bg-caution',
    textClass: 'text-z-text',
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
      <span className={cn('text-z-body-sm', config.textClass)}>{config.label}</span>
    </span>
  );
}
