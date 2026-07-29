/** ============================================================================
 *  ZEVRA DESIGN LANGUAGE v1.0 — Production foundation (Phase 1)
 *  The shared UI foundation every Zevra page is built from. Import from here.
 *
 *    import { AppShell, TopBar, Button, Card, Badge } from '@/ds';
 *
 *  Tokens live in ds/tokens.css (imported once in main.jsx) and are exposed as
 *  Tailwind `z-*` utilities (tailwind.config.js). Never hard-code a color,
 *  space, radius, shadow, or type size — consume a token.
 *  ============================================================================ */

export * from './types';

// Theme
export { ThemeProvider, useTheme, ThemeToggle } from './theme';

// Typography
export { Display, Heading, Text, Label, Kpi, Num } from './components/Typography';

// Buttons
export { Button, IconButton } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps } from './components/Button';

// Status
export { Badge, StatusDot } from './components/Badge';
export type { BadgeProps, StatusDotProps } from './components/Badge';

// Cards
export { Card, CardLabel, CardTitle, CardBody, MetricCard, ConfidenceBar } from './components/Card';
export type { CardProps, MetricCardProps, ConfidenceBarProps } from './components/Card';

// Forms
export { Field, Input, Select, Search, Chip, FilterChip, SearchIcon } from './components/Input';
export type { FieldProps, SearchProps, FilterChipProps } from './components/Input';

// Table
export {
  TableWrap, Table, THead, TBody, Th, Tr, Td, RowActions, TableEmpty,
} from './components/Table';
export type { ThProps, TrProps, TdProps, SortDir, TableEmptyProps } from './components/Table';

// Command bar
export { CommandBar } from './components/CommandBar';
export type { CommandBarProps, CommandItem } from './components/CommandBar';

// Layout & navigation
export {
  AppShell, TopBar, Brand, Nav, NavItem, Avatar, Stage, Grid, SectionLabel, Reveal, PulseSpine,
} from './components/AppShell';
export type { NavItemProps } from './components/AppShell';

// Foundation showcase / verification harness (not a product screen)
export { Showcase } from './Showcase';
