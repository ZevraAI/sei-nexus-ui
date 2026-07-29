/** Zevra Design Language — shared types for the foundation. */

/** The semantic status language (see design-system/COLORS.md). Color = business meaning. */
export type StatusKind =
  | 'healthy'
  | 'investigating'
  | 'warning'
  | 'critical'
  | 'resolved'
  | 'running'
  | 'completed'
  | 'waiting'
  | 'info'
  | 'neutral';
