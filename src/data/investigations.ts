import type { Investigation } from '../types';

export const investigations: Investigation[] = [
  {
    id: 'INV-2024-0041',
    title: 'Q2 Financial Anomaly Review',
    owner: 'Jane Doe',
    ownerInitials: 'JD',
    status: 'In Progress',
    updatedAt: '2024-05-20T09:42:00',
  },
  {
    id: 'INV-2024-0038',
    title: 'Vendor Risk Assessment',
    owner: 'Robert Smith',
    ownerInitials: 'RS',
    status: 'Open',
    updatedAt: '2024-05-19T16:08:00',
  },
  {
    id: 'INV-2024-0035',
    title: 'Data Exfiltration Alert Triage',
    owner: 'Aisha Lee',
    ownerInitials: 'AL',
    status: 'In Progress',
    updatedAt: '2024-05-18T11:21:00',
  },
  {
    id: 'INV-2024-0031',
    title: 'Access Review - Privileged Accounts',
    owner: 'Michael Khan',
    ownerInitials: 'MK',
    status: 'Closed',
    updatedAt: '2024-05-17T10:15:00',
  },
  {
    id: 'INV-2024-0028',
    title: 'Third-Party Due Diligence',
    owner: 'Sarah Patel',
    ownerInitials: 'SP',
    status: 'Open',
    updatedAt: '2024-05-16T14:33:00',
  },
];

export const totalInvestigations = 24;
