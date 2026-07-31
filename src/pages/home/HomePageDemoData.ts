/** ============================================================================
 *  HomePageDemoData — representative dataset for DEVELOPMENT & UI regression ONLY.
 *
 *  NEVER served in production. The production adapter reaches this module only from
 *  a branch guarded by `import.meta.env.DEV` (see HomePageAdapter.isDemoMode), so a
 *  production build dead-code-eliminates this generator entirely. The honest
 *  production baseline (`emptyViewModel`) lives in HomePageBaseline, not here.
 *  ============================================================================ */
import type { HomepageViewModel } from './HomePageViewModel';
import { salutation, firstNameOf, type HomeInput } from './HomePageBaseline';

/** Fully-populated representative dataset — DEV / TEST ONLY. */
export function buildDemoViewModel(input: HomeInput = {}): HomepageViewModel {
  const now = input.now ?? new Date();
  const firstName = firstNameOf(input.userName);

  return {
    capturedAt: now.getTime(),
    executiveSummary: {
      eyebrow: 'Understood live · 98.6% of operations covered',
      greeting: `${salutation(now)}, ${firstName}.`,
      headline: [
        { text: 'Operations are ' },
        { text: 'healthy', tone: 'good' },
        { text: ' — one situation is ' },
        { text: 'forming', tone: 'warn' },
        { text: '.' },
      ],
      narrative: [
        [
          { text: 'Overnight, ' },
          { text: 'on-hand inventory fell 8.2%', strong: true },
          { text: ' across ' },
          { text: '12 stores', strong: true },
          { text: " in the Southwest — concentrated in a single supplier's SKUs. I've opened an investigation." },
        ],
        [
          { text: 'Everything else is on track. Revenue is ' },
          { text: 'running +3.1%', strong: true, tone: 'up' },
          { text: ' to plan, and the invoice backlog you flagged Friday has ' },
          { text: 'fully cleared', tone: 'ok' },
          { text: '.' },
        ],
      ],
      actions: [
        { label: 'Open the investigation', to: '/reasoning', primary: true },
        { label: 'Read the full brief', to: '/brief' },
      ],
    },
    kpis: [
      { id: 'investigations', label: 'Active reasoning', value: 4, format: (n) => `${Math.round(n)}`, trend: 'up' },
      { id: 'alerts', label: 'Open alerts', value: 2, format: (n) => `${Math.round(n)}`, trend: 'flat' },
      { id: 'sources', label: 'Connected sources', value: 24, format: (n) => `${Math.round(n)}`, trend: 'up' },
      { id: 'findings', label: 'Open findings', value: 7, format: (n) => `${Math.round(n)}`, trend: 'flat' },
      { id: 'coverage', label: 'Coverage', value: 98.6, format: (n) => `${n.toFixed(1)}%`, trend: 'up' },
    ],
    signals: [
      {
        id: 'sig-inv', title: 'Inventory drop · Southwest', area: 'Supply chain',
        severity: 'critical', state: 'Forming',
        description: '8.2% decline across 12 stores, isolated to supplier Northgate Foods.',
        confidence: 91, timestamp: 'began 02:10', deltaLabel: '−8.2%', deltaTrend: 'down',
        to: '/reasoning',
      },
      {
        id: 'sig-margin', title: 'Gross margin · West', area: 'Finance',
        severity: 'warning', state: 'Watching',
        description: 'Margin softening 40bps as promotional mix rises ahead of plan.',
        timestamp: 'rolling 7d', deltaLabel: '−0.4%', deltaTrend: 'down',
        to: '/reasoning',
      },
      {
        id: 'sig-invoice', title: 'Invoice backlog', area: 'Finance',
        severity: 'resolved', state: 'Resolved',
        description: '1,204 invoices reconciled overnight by the Finance agent. Zero exceptions.',
        timestamp: 'cleared 06:40', deltaLabel: 'cleared', deltaTrend: 'up',
        to: '/brief',
      },
    ],
    recommendations: [
      {
        id: 'rec-repl', summary: 'Expedite replenishment to 4 stores',
        rationale: 'On-hand mirrors a missed Northgate inbound at the four highest-velocity stores.',
        impact: 'Prevents an estimated $418K in at-risk sales this week.',
        confidence: 91, actionLabel: 'Review action', to: '/reasoning',
      },
    ],
    investigations: [
      {
        id: 'inv-1', title: 'Why did on-hand inventory fall 8.2% overnight?',
        area: 'Supply chain', owner: 'Inventory Investigator', phase: 'Impact analysis · 4 of 6',
        confidence: 91, updatedAt: '2 min ago', status: 'investigating', live: true, to: '/reasoning',
      },
      {
        id: 'inv-2', title: 'Gross margin erosion in the West district',
        area: 'Finance', owner: 'Margin Monitor', phase: 'Watching · 214 SKUs',
        confidence: 64, updatedAt: '1 hr ago', status: 'warning', to: '/reasoning',
      },
    ],
    workforce: {
      manageTo: '/agents',
      stats: [
        { label: 'active now', value: '3' },
        { label: 'streams watched', value: '47' },
        { label: 'governed', value: '99.8%', trend: 'up' },
      ],
      agents: [
        { id: 'a-in', name: 'Inventory Investigator', initials: 'IN', work: 'Investigating the Southwest drop · step 4 of 6', status: 'running', statusLabel: 'live', live: true },
        { id: 'a-mn', name: 'Margin Monitor', initials: 'MN', work: 'Watching 214 SKUs across West', status: 'running', statusLabel: 'live', live: true },
        { id: 'a-fn', name: 'Finance Reconciler', initials: 'FN', work: 'Idle · next run 18:00', status: 'waiting', statusLabel: 'idle' },
      ],
    },
    recentActivity: [
      { id: 'ac1', title: 'Inventory anomaly detected — Southwest', detail: 'Supplier concentration · confidence 91%', time: '02:10', tone: 'critical' },
      { id: 'ac2', title: 'Reconciliation complete — 1,204 invoices', detail: 'Finance agent · $2.4M settled', time: '06:40', tone: 'healthy' },
      { id: 'ac3', title: 'Weekly plan refreshed — West district', detail: 'Revenue +3.1% to plan', time: '05:02', tone: 'neutral' },
      { id: 'ac4', title: 'Margin watch opened — promotional mix', detail: 'Monitoring agent · −40bps', time: '04:33', tone: 'warning' },
    ],
  };
}
