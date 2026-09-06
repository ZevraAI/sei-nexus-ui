// @vitest-environment jsdom
// Characterization tests for the universal Zevra Intelligence Response renderer's data-shape
// handling — none existed before this file. Covers a simple factual answer (no fabricated empty
// sections), a response with backend-composed `artifacts` (preferred), a response without them
// (falls back to the original client-side derivation), the metric-count composition rules
// (0/1/2-4), and a Zevra-Agent-routed response — all rendered by the SAME component, none of
// which should collapse or throw regardless of which fields are present.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { IntelligenceResponse, composeResponse } from '../Chat.jsx';

afterEach(cleanup);

function answered(overrides = {}) {
  return [
    { role: 'user', content: 'Show me all open orders' },
    {
      role: 'assistant',
      content: 'Three orders are currently open.',
      loading: false,
      queryData: null,
      reasoningSteps: [],
      quickRefinements: [],
      startedAt: Date.now(),
      ...overrides,
    },
  ];
}

describe('IntelligenceResponse — universal, artifact-driven composition', () => {
  it('renders a simple factual answer with no fabricated empty sections', () => {
    render(<IntelligenceResponse finding={null} messages={answered()} onAsk={() => {}} />);
    expect(screen.getAllByText('Show me all open orders').length).toBeGreaterThan(0);
    // No evidence, no findings, no trail — none of these render even a header when there is
    // genuinely nothing to show (no placeholder sentence, no empty section).
    expect(screen.queryByText('Primary evidence')).toBeNull();
    expect(screen.queryByText('Key findings')).toBeNull();
    expect(screen.queryByText('Investigation trail')).toBeNull();
    // "Investigation context" still shows — "Last updated" is genuinely known (a real client
    // timestamp) — but it must not contain fabricated Scope/Business context/Data sources rows.
    expect(screen.queryByText('Answered by')).toBeNull();
    expect(screen.queryByText('Fields analyzed')).toBeNull();
  });

  it('prefers backend-composed artifacts over client-side derivation when present', () => {
    const messages = answered({
      content: 'Three purchase orders are partially received, representing $125,750 in value.',
      artifacts: {
        understanding: 'Three purchase orders are partially received.',
        key_findings: ['Backend-derived finding: 12 suppliers show delayed receipt patterns.'],
        related_facts: ['Backend-derived fact: expected delivery dates extend into next quarter.'],
        recommendation: 'Review the top five affected suppliers this week.',
        next_steps: [{ label: 'Show overdue orders', prompt: 'Show overdue orders' }],
        evidence: [{ kind: 'DATASET', label: 'Dataset', row_count: 3 }],
        metrics: [{ label: 'results', value: '3' }],
        trail: [],
      },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);

    expect(screen.getAllByText(/12 suppliers show delayed receipt patterns/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/expected delivery dates extend into next quarter/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Review the top five affected suppliers this week\./).length).toBeGreaterThan(0);
    // Tactical next-step chips are NOT rendered inside the workspace body — they belong to the
    // "Continue investigation" composer bar (Chat.jsx lifts composeResponse(...).nextSteps there
    // directly); the right panel shows only the strategic `recommendation` prose.
    expect(screen.queryByText('Show overdue orders')).toBeNull();
    expect(screen.getByText('Recommendation')).toBeTruthy();
  });

  it('exposes nextSteps via composeResponse for the composer bar to render, independent of the workspace body', () => {
    const msg = {
      role: 'assistant', loading: false, content: 'a',
      artifacts: { next_steps: [{ label: 'Show overdue orders', prompt: 'Show overdue orders' }] },
    };
    const r = composeResponse(msg, null, 'q');
    expect(r.nextSteps).toEqual([{ label: 'Show overdue orders', prompt: 'Show overdue orders' }]);
  });

  it('emphasizes a single real metric rather than hiding it, and shows a strip for 2-4', () => {
    const one = answered({ artifacts: { metrics: [{ label: 'open orders', value: '1,284' }] } });
    render(<IntelligenceResponse finding={null} messages={one} onAsk={() => {}} />);
    expect(screen.getByText('1,284')).toBeTruthy();
    expect(screen.getByText('open orders')).toBeTruthy();
    cleanup();

    const many = answered({
      artifacts: { metrics: [{ label: 'results', value: '3' }, { label: 'total value', value: '350' }] },
    });
    render(<IntelligenceResponse finding={null} messages={many} onAsk={() => {}} />);
    expect(screen.getByText('results')).toBeTruthy();
    expect(screen.getByText('total value')).toBeTruthy();
  });

  it('renders zero metrics without any metric-shaped output', () => {
    const messages = answered({ artifacts: { metrics: [] } });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.queryByText(/results|total value/)).toBeNull();
  });

  it('falls back to client-side derivation when artifacts is absent (older response shape)', () => {
    const messages = answered({
      content: 'Availability declined by 42% this month. We recommend reviewing supplier contracts.',
      artifacts: null,
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);

    // No crash, and the regex-derived recommendation still surfaces via the old path.
    expect(screen.getAllByText(/We recommend reviewing supplier contracts\./).length).toBeGreaterThan(0);
  });

  it('renders a Zevra-Agent-routed response through the SAME renderer, with a quiet attribution line', () => {
    const messages = answered({
      agentName: 'Supply Chain Agent',
      agentSessionId: 'sess-1',
      queryData: [{ supplier: 'Acme', risk_score: 8 }],
      artifacts: {
        understanding: 'Two suppliers show elevated risk.',
        key_findings: [],
        related_facts: [],
        recommendation: null,
        next_steps: [],
        evidence: [{ kind: 'DATASET', label: 'Dataset', row_count: 1 }],
        metrics: [{ label: 'result', value: '1' }],
        trail: [{ type: 'TOOL_CALL', label: 'Called query_data', outcome: null }],
        agent_context: { agent_key: 'supply-agent', agent_name: 'Supply Chain Agent', session_id: 'sess-1', iterations_used: 2 },
      },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);

    expect(screen.getByText('Two suppliers show elevated risk.')).toBeTruthy();
    expect(screen.getByText('Primary evidence')).toBeTruthy();
    expect(screen.getByText(/Investigated by Supply Chain Agent/)).toBeTruthy();
    // Investigation context only shows real fields — "Answered by" here, never a fabricated
    // Scope/Business context/Data sources block the response never stated.
    expect(screen.getByText('Investigation context')).toBeTruthy();
    expect(screen.getByText('Answered by')).toBeTruthy();
  });

  it('renders a chart using the backend visualization hint when the columns match', () => {
    const messages = answered({
      queryData: [
        { month: '2024-01', revenue: 1000 },
        { month: '2024-02', revenue: 1200 },
      ],
      artifacts: {
        evidence: [
          { kind: 'DATASET', label: 'Dataset', row_count: 2 },
          { kind: 'CHART', label: 'Trend over time', chart_type: 'area', x_key: 'month', y_keys: ['revenue'], row_count: 2 },
        ],
      },
    });
    expect(() =>
      render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />),
    ).not.toThrow();
    expect(screen.getByText('Primary evidence')).toBeTruthy();
  });

  it('does not throw when a turn has no queryData, no reasoningSteps, and no artifacts at all', () => {
    const messages = [
      { role: 'user', content: 'What is our return policy?' },
      { role: 'assistant', content: 'Returns are accepted within 30 days.', loading: false, startedAt: Date.now() },
    ];
    expect(() =>
      render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />),
    ).not.toThrow();
  });
});
