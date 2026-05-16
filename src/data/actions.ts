import { Search, Upload, Code2 } from 'lucide-react';
import type { ActionTile } from '../types';

export const actionTiles: ActionTile[] = [
  {
    id: 'scratch',
    title: 'Start from scratch',
    description: 'Create a new investigation from a blank canvas.',
    icon: Search,
    href: '/investigations/new',
  },
  {
    id: 'artifacts',
    title: 'Upload artifacts',
    description: 'Ingest files, logs, or documents to analyze.',
    icon: Upload,
    href: '/investigations/upload',
  },
  {
    id: 'template',
    title: 'Use a template',
    description: 'Use prebuilt workflows for common investigations.',
    icon: Code2,
    href: '/investigations/templates',
  },
];
