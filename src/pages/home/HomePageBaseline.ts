/** ============================================================================
 *  HomePageBaseline — PRODUCTION baseline for the homepage ViewModel.
 *
 *  `emptyViewModel` is the honest starting point for every production render: the
 *  greeting is real (user + local time); every intelligence section is empty. A
 *  brand-new tenant renders from this directly. This module contains NO
 *  representative/fabricated business data — that lives in HomePageDemoData, which
 *  production never executes.
 *  ============================================================================ */
import type { HomepageViewModel } from './HomePageViewModel';

export interface HomeInput {
  userName?: string;
  now?: Date;
}

export function salutation(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstNameOf(userName?: string): string {
  return (userName ?? '').trim().split(/\s+/)[0] || 'there';
}

/** The honest baseline: greeting is real; every intelligence section is empty. */
export function emptyViewModel(input: HomeInput = {}): HomepageViewModel {
  const now = input.now ?? new Date();
  const firstName = firstNameOf(input.userName);
  return {
    capturedAt: now.getTime(),
    executiveSummary: {
      eyebrow: '',
      greeting: `${salutation(now)}, ${firstName}.`,
      headline: [],
      narrative: [],
      actions: [],
      // Default (no connection yet known) — HomePageMapper overrides this once it knows
      // whether the tenant actually has a connection, so a connected-but-briefless tenant
      // never sees this "connect a data source" copy.
      emptyMessage: 'Connect a data source and start your first investigation — your enterprise brief, '
        + 'recommendations, and live intelligence will appear here as Zevra learns your business.',
      emptyAction: { label: 'Connect a data source', to: '/connections' },
    },
    kpis: [],
    signals: [],
    recommendations: [],
    investigations: [],
    workforce: { manageTo: '/agents', stats: [], agents: [] },
    recentActivity: [],
  };
}
