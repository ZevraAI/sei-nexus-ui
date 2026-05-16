import { Bot, Database, Lock, ShieldCheck } from 'lucide-react';
import type { InvestigationContext } from '../types';

export const investigationContext: InvestigationContext = {
  title: 'Investigation context',
  fields: [
    {
      id: 'agent',
      label: 'Agent',
      icon: Bot,
      value: 'Evidence Analyst',
      valueVariant: 'accent',
      version: 'v2.4.1',
      isOnline: true,
    },
    {
      id: 'sources',
      label: 'Sources',
      icon: Database,
      value: '12 connected',
      valueVariant: 'accent',
      linkLabel: 'View all',
    },
    {
      id: 'classification',
      label: 'Security classification',
      icon: Lock,
      value: 'Confidential',
      pillVariant: 'confidential',
    },
    {
      id: 'approval',
      label: 'Approval state',
      icon: ShieldCheck,
      value: 'Pending review',
      pillVariant: 'pending',
    },
  ],
};
