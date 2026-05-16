import {
  MessageSquare,
  BookOpen,
  GitMerge,
  Map,
  Layers,
  Bot,
  ClipboardList,
} from 'lucide-react';
import type { NavItem } from '../types';

export const navItems: NavItem[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    href: '/chat',
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: BookOpen,
    href: '/knowledge',
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: GitMerge,
    href: '/connections',
  },
  {
    id: 'enterprise-map',
    label: 'Enterprise Map',
    icon: Map,
    href: '/enterprise-map',
  },
  {
    id: 'semantic-layer',
    label: 'Semantic Layer',
    icon: Layers,
    href: '/semantic-layer',
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: Bot,
    href: '/agents',
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: ClipboardList,
    href: '/audit-logs',
  },
];

export const activeNavId = 'investigations';
