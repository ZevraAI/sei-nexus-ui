// TEMPORARY, DEV-ONLY visual verification harness — not part of the production route table,
// not linked from any nav, tree-shaken out of production builds (see main.jsx's
// `import.meta.env.DEV` guard). Mounts the REAL IntelligenceResponse renderer from Chat.jsx
// with representative mock ChatResponse/ResponseArtifacts data, entirely bypassing
// authentication. Structurally mirrors the REAL page chrome exactly (global nav height,
// chat header height, pinned composer) so height measurements taken against this harness are
// trustworthy — an earlier version of this file used a thin mock toolbar instead of the real
// 64px global nav + 48px chat header, which understated how much vertical budget the
// investigation content actually has to fit within. Delete this file (and the main.jsx branch
// that loads it) once visual verification is complete.
import { useEffect, useMemo, useState } from 'react';
import { IntelligenceResponse, composeResponse } from '../Chat.jsx';
import { ReadingColumn } from '../../ds/intelligence';
import InvestigationComposer from '../../components/InvestigationComposer.jsx';

const SIMPLE = [
  { role: 'user', content: 'What is our current inventory value?' },
  {
    role: 'assistant',
    loading: false,
    startedAt: Date.now() - 45000,
    content: 'Current inventory value is $2.4M across 184 locations.',
    queryData: [{ location: 'Dallas DC', value: 412000 }, { location: 'Atlanta DC', value: 298000 }],
    reasoningSteps: [],
    quickRefinements: [],
    artifacts: {
      understanding: 'Current inventory value is $2.4M across 184 locations.',
      key_findings: [],
      related_facts: [],
      recommendation: null,
      next_steps: [],
      evidence: [{ kind: 'DATASET', label: 'Dataset', row_count: 2 }],
      metrics: [{ label: 'total value', value: '$2.4M' }],
      trail: [],
    },
  },
];

const ANALYTICAL = [
  { role: 'user', content: 'Why did fulfillment performance decline last month?' },
  {
    role: 'assistant',
    loading: false,
    startedAt: Date.now() - 120000,
    agentName: 'Data Analyst',
    decisionType: 'QUERY_LIVE_DATA',
    runKey: 'run-preview-1',
    content:
      'Fulfillment performance declined 8.4% last month, with the decline concentrated in three distribution regions. Backorders increased 17% during the same period. We recommend reviewing supplier lead times for the top five affected suppliers this week.',
    queryData: Array.from({ length: 12 }).map((_, i) => ({
      week: `2024-W${String(i + 1).padStart(2, '0')}`,
      fulfillment_rate: 96 - i * 0.6 - (i > 7 ? 4 : 0),
      backorders: 40 + i * 3,
    })),
    reasoningSteps: [
      { stepNo: 0, type: 'resolution', description: '"fulfillment" → orders.fulfillment_rate', surface: 'fulfillment', kind: 'COLUMN', target: 'orders.fulfillment_rate', tier: 'company', businessObjects: ['Orders'] },
      { stepNo: 1, description: 'Querying fulfillment rate by week', sql: 'SELECT week, fulfillment_rate FROM orders_weekly', rowCount: 12, rowSummary: '12 weeks retrieved', evaluatorDecision: 'SUFFICIENT', evaluatorRationale: '', executionMs: 214 },
    ],
    quickRefinements: [
      { label: 'Break down by region', prompt: 'Break down the fulfillment decline by region', requires_input: false },
      { label: 'Compare to last quarter', prompt: 'Compare this to last quarter', requires_input: false },
    ],
    artifacts: {
      understanding: 'Fulfillment performance declined 8.4% last month, with the decline concentrated in three distribution regions.',
      key_findings: [
        'Backorders increased 17% during the same period.',
        'Region North America West contributed 42% of the decline.',
        '3 orders changed status to delayed in the last 24 hours.',
      ],
      related_facts: [
        'Expected delivery dates extend into next quarter for the affected orders.',
        'The affected regions share the same third-party logistics provider.',
      ],
      recommendation: 'Review supplier lead times for the top five affected suppliers this week.',
      next_steps: [
        { label: 'Show overdue orders', prompt: 'Show overdue orders' },
        { label: 'Break down by supplier', prompt: 'Break down fulfillment by supplier' },
        { label: 'Compare last 30 days', prompt: 'Compare fulfillment over the last 30 days' },
      ],
      evidence: [
        { kind: 'DATASET', label: 'Dataset', row_count: 12 },
        { kind: 'CHART', label: 'Trend over time', chart_type: 'area', x_key: 'week', y_keys: ['fulfillment_rate', 'backorders'], row_count: 12 },
      ],
      metrics: [
        { label: 'fulfillment rate', value: '87.6%' },
        { label: 'vs. prior period', value: '-8.4%' },
        { label: 'affected regions', value: '3' },
      ],
      trail: [],
    },
  },
];

const AGENT = [
  { role: 'user', content: 'Investigate why supplier delivery performance has deteriorated.' },
  {
    role: 'assistant',
    loading: false,
    startedAt: Date.now() - 90000,
    agentName: 'Supply Chain Agent',
    agentSessionId: 'sess-preview-1',
    decisionType: 'ZEVRA_AGENT',
    content:
      'Two suppliers show a sustained drop in on-time delivery over the last six weeks, concentrated in the Southwest region. Combined, they represent 28% of total order volume.',
    queryData: [
      { supplier: 'Meridian Freight', on_time_rate: 61, region: 'Southwest' },
      { supplier: 'Atlas Logistics', on_time_rate: 68, region: 'Southwest' },
      { supplier: 'Pinnacle Distribution', on_time_rate: 94, region: 'Northeast' },
    ],
    reasoningSteps: [],
    quickRefinements: [],
    artifacts: {
      understanding: 'Two suppliers show a sustained drop in on-time delivery over the last six weeks, concentrated in the Southwest region.',
      key_findings: [
        'Meridian Freight and Atlas Logistics account for 28% of total order volume.',
        'Both suppliers share the same regional distribution hub.',
      ],
      related_facts: ['Weather-related disruptions were reported in the Southwest region during this window.'],
      recommendation: 'Escalate a performance review with Meridian Freight and Atlas Logistics.',
      next_steps: [
        { label: 'Compare against contract SLAs', prompt: 'Compare supplier performance against contract SLAs' },
        { label: 'Show affected orders', prompt: 'Show orders affected by delayed suppliers' },
      ],
      evidence: [
        { kind: 'DATASET', label: 'Dataset', row_count: 3 },
        { kind: 'CHART', label: 'Distribution', chart_type: 'bar', x_key: 'supplier', y_keys: ['on_time_rate'], row_count: 3 },
      ],
      metrics: [{ label: 'suppliers at risk', value: '2' }, { label: 'order volume affected', value: '28%' }],
      trail: [
        { type: 'CONTEXT_RESOLVE', label: 'Resolved business context (2 business objects)', outcome: null },
        { type: 'TOOL_CALL', label: 'Called query_supplier_performance', outcome: null },
        { type: 'FINAL_ANSWER', label: 'Composed final answer', outcome: null },
      ],
      agent_context: { agent_key: 'supply-chain-agent', agent_name: 'Supply Chain Agent', session_id: 'sess-preview-1', iterations_used: 3 },
    },
  },
];

const SCENARIOS = { simple: SIMPLE, analytical: ANALYTICAL, agent: AGENT };

function initialParam(name, fallback) {
  const v = new URLSearchParams(window.location.search).get(name);
  return v || fallback;
}

export default function WorkspacePreview() {
  const [scenario, setScenario] = useState(() => initialParam('scenario', 'analytical'));
  const [dark, setDark] = useState(() => initialParam('theme', 'dark') !== 'light');
  const [draft, setDraft] = useState('');
  const composerSuggestions = useMemo(() => {
    const msgs = SCENARIOS[scenario];
    const last = [...msgs].reverse().find((m) => m.role === 'assistant' && !m.loading);
    return last ? composeResponse(last, null, null).nextSteps : [];
  }, [scenario]);

  // Matches real production behavior (src/ds/theme.tsx sets [data-theme] on <html>, not a
  // nested element) — a nested-div toggle was a preview-only inaccuracy.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    return () => document.documentElement.removeAttribute('data-theme');
  }, [dark]);

  return (
    // h-screen + overflow-hidden at the root, exactly like the real app's <div className="flex
    // h-full overflow-hidden"> — the ONLY scroll boundary is the flex-1 content region below,
    // matching production so height measurements against this harness are trustworthy.
    <div className="flex h-screen flex-col overflow-hidden bg-z-bg">
      {/* Real global nav height (src/components/Layout.jsx: `h-16`) — a thin mock toolbar here
          previously understated the actual chrome budget. Scenario/theme switches are dev-only
          controls layered into that same real height, not extra chrome. */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-z-border bg-z-card px-4">
        <span className="mr-2 text-[13px] font-semibold text-z-text">Zevra</span>
        {Object.keys(SCENARIOS).map((k) => (
          <button
            key={k}
            onClick={() => setScenario(k)}
            className={`rounded-z-sm px-2.5 py-1 text-[12px] ${scenario === k ? 'bg-z-primary text-z-on-accent' : 'text-z-text-2'}`}
          >
            {k}
          </button>
        ))}
        <button onClick={() => setDark((d) => !d)} className="ml-auto rounded-z-sm border border-z-border px-2.5 py-1 text-[12px] text-z-text-2">
          {dark ? 'Dark' : 'Light'}
        </button>
      </div>

      {/* Real chat-page toolbar height (Chat.jsx: `h-12`). */}
      <div className="flex h-12 shrink-0 items-center border-b border-z-border px-6 text-z-caption text-z-text-3">
        Investigation
      </div>

      {/* The ONE scroll region — identical structure to Chat.jsx's real content wrapper. */}
      <div className="relative min-h-0 flex-1 overflow-y-auto scroll-smooth">
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[image:var(--z-ai-atmo)]" />
        <ReadingColumn measure="wide" className="relative z-[1] py-5">
          <IntelligenceResponse finding={null} messages={SCENARIOS[scenario]} onAsk={() => {}} />
        </ReadingColumn>
      </div>

      {/* Pinned composer — shrink-0, exactly like Chat.jsx's real docked composer bar; never
          part of the scrollable content, exactly matching production. */}
      <div className="shrink-0 border-t border-z-border bg-z-card px-6 py-3">
        {composerSuggestions.length > 0 && (
          <div className="mx-auto mb-2 flex max-w-[1280px] flex-wrap gap-2">
            {composerSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="rounded-z-pill border border-z-border px-3 py-1.5 text-z-caption text-z-text-2 transition-colors hover:border-z-primary hover:text-z-primary"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <InvestigationComposer
          className="mx-auto max-w-[1280px]"
          value={draft}
          onChange={setDraft}
          onSubmit={() => {}}
          placeholder="Ask a follow-up…"
          disabled
        />
        <p className="mt-1.5 text-center font-z-mono text-[11px] text-z-text-3">
          Zevra queries approved data sources only · Results may require validation
        </p>
      </div>
    </div>
  );
}
