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
    expect(screen.queryByText('Evidence')).toBeNull();
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
      artifacts: {
        understanding: 'Two suppliers show elevated risk.',
        key_findings: [],
        related_facts: [],
        recommendation: null,
        next_steps: [],
        sections: [{
          type: 'DATASET', title: 'Supplier Risk', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 1, rows: [{ supplier: 'Acme', risk_score: 8 }] }],
        }],
        evidence: [{ kind: 'DATASET', label: 'Dataset', row_count: 1 }],
        metrics: [{ label: 'result', value: '1' }],
        trail: [{ type: 'TOOL_CALL', label: 'Called query_data', outcome: null }],
        agent_context: { agent_key: 'supply-agent', agent_name: 'Supply Chain Agent', session_id: 'sess-1', iterations_used: 2 },
      },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);

    expect(screen.getByText('Two suppliers show elevated risk.')).toBeTruthy();
    expect(screen.getByText('Evidence')).toBeTruthy();
    expect(screen.getByText('Supplier Risk')).toBeTruthy();
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText(/Investigated by Supply Chain Agent/)).toBeTruthy();
    // Investigation context only shows real fields — "Answered by" here, never a fabricated
    // Scope/Business context/Data sources block the response never stated.
    expect(screen.getByText('Investigation context')).toBeTruthy();
    expect(screen.getByText('Answered by')).toBeTruthy();
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

// ═══════════════════════════════════════════════════════════════════════════════════════════
// artifacts.sections — the authoritative semantic response structure. These tests prove the
// frontend renders exactly what Agent Brain supplied, in the order supplied, with no legacy
// queryData/quickRefinements/column-name fallback ever substituting for absent content.
// ═══════════════════════════════════════════════════════════════════════════════════════════
describe('artifacts.sections — authoritative rendering', () => {
  function poRow(n) { return { po_number: `PO-${n}`, supplier: 'Acme', amount: 1000 + n }; }

  it('renders a single DATASET section', () => {
    const messages = answered({
      artifacts: { sections: [{
        type: 'DATASET', title: 'Open Purchase Orders', purpose: 'All open purchase orders',
        display: true, items: [], content: null,
        datasets: [{ step_no: 1, rows: [poRow(1), poRow(2)] }],
      }] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.getByText('Evidence')).toBeTruthy();
    expect(screen.getByText('Open Purchase Orders')).toBeTruthy();
    expect(screen.getByText('All open purchase orders')).toBeTruthy();
    expect(screen.getByText('PO-1')).toBeTruthy();
  });

  it('renders two DATASET sections independently, never merged, never reduced to one by row count', () => {
    const messages = answered({
      artifacts: { sections: [
        {
          type: 'DATASET', title: 'Open Purchase Orders', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 1, rows: [poRow(1), poRow(2), poRow(3), poRow(4), poRow(5)] }],
        },
        {
          type: 'DATASET', title: 'Most Ordered Item', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 5, rows: [{ name: 'Men\'s Leather Chelsea Boot', sku: 'ABC-123' }] }],
        },
      ] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.getByText('Open Purchase Orders')).toBeTruthy();
    expect(screen.getByText('Most Ordered Item')).toBeTruthy();
    expect(screen.getByText('PO-1')).toBeTruthy();
    expect(screen.getByText("Men's Leather Chelsea Boot")).toBeTruthy();
    // Both survive — neither the 5-row dataset nor the 1-row "final" dataset wins alone.
    expect(screen.queryByText('Dataset (5)')).toBeNull();
  });

  it('renders three DATASET sections independently', () => {
    const messages = answered({
      artifacts: { sections: [
        { type: 'DATASET', title: 'First Dataset', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 1, rows: [{ a: 1 }] }] },
        { type: 'DATASET', title: 'Second Dataset', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 3, rows: [{ b: 2 }] }] },
        { type: 'DATASET', title: 'Third Dataset', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 5, rows: [{ c: 3 }] }] },
      ] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.getByText('First Dataset')).toBeTruthy();
    expect(screen.getByText('Second Dataset')).toBeTruthy();
    expect(screen.getByText('Third Dataset')).toBeTruthy();
  });

  it('preserves the model-supplied section order (DATASET then HIGHLIGHT, not grouped by type)', () => {
    const messages = answered({
      artifacts: { sections: [
        { type: 'HIGHLIGHT', title: 'Leads with the highlight', purpose: null, display: true, items: [],
          content: 'Narrative first.', datasets: [{ step_no: 1, rows: [{ a: 1 }] }] },
        { type: 'DATASET', title: 'Dataset second', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 2, rows: [{ b: 2 }] }] },
      ] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    const evidence = screen.getByText('Evidence').closest('section');
    const html = evidence.innerHTML;
    expect(html.indexOf('Leads with the highlight')).toBeLessThan(html.indexOf('Dataset second'));
  });

  it('preserves dataset identity (step number) and never flattens two datasets into one', () => {
    const messages = answered({
      artifacts: { sections: [{
        type: 'HIGHLIGHT', title: 'Combined claim', purpose: null, display: true, items: [],
        content: 'Grounded in two datasets.',
        datasets: [
          { step_no: 3, rows: [{ product_id: 'X', qty: 1500 }] },
          { step_no: 5, rows: [{ name: 'Widget A' }] },
        ],
      }] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.getByText(/step-3/)).toBeTruthy();
    expect(screen.getByText(/step-5/)).toBeTruthy();
  });

  it('a section with display:false is not rendered', () => {
    const messages = answered({
      artifacts: { sections: [{
        type: 'DATASET', title: 'Hidden dataset', purpose: null, display: false, items: [], content: null,
        datasets: [{ step_no: 1, rows: [{ a: 1 }] }],
      }] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.queryByText('Hidden dataset')).toBeNull();
  });

  it('renders FINDINGS, RELATED_FACTS, RECOMMENDATION, and NEXT_STEPS directly from sections', () => {
    const messages = answered({
      artifacts: { sections: [
        { type: 'FINDINGS', title: null, purpose: null, display: null, content: null,
          items: ['Widget A has the highest ordered quantity.'] },
        { type: 'RELATED_FACTS', title: null, purpose: null, display: null, content: null,
          items: ['Orders are distributed among three buyers.'] },
        { type: 'RECOMMENDATION', title: null, purpose: null, display: null, items: [],
          content: 'Review inventory for Widget A.' },
      ] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.getByText('Widget A has the highest ordered quantity.')).toBeTruthy();
    expect(screen.getByText('Orders are distributed among three buyers.')).toBeTruthy();
    expect(screen.getByText('Review inventory for Widget A.')).toBeTruthy();
  });

  it('NEXT_STEPS from sections reach composeResponse for the composer bar', () => {
    const msg = {
      role: 'assistant', loading: false, content: 'a',
      artifacts: { sections: [
        { type: 'NEXT_STEPS', title: null, purpose: null, display: null, content: null,
          items: ['Break down by supplier'] },
      ] },
    };
    const r = composeResponse(msg, null, 'q');
    expect(r.nextSteps).toEqual([{ label: 'Break down by supplier', prompt: 'Break down by supplier' }]);
  });

  it('Case B — no NEXT_STEPS section produces an empty nextSteps array, never quickRefinements-derived suggestions', () => {
    const msg = {
      role: 'assistant', loading: false, content: 'a',
      quickRefinements: [
        { label: 'Show exceptions only', prompt: 'a — show only exceptions', requires_input: false },
        { label: 'Filter by date', prompt: 'a — for date:', requires_input: true },
        { label: 'Run in background', prompt: '/async a', requires_input: false },
      ],
      artifacts: { sections: [
        { type: 'DATASET', title: 'Open Orders', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 1, rows: [poRow(1)] }] },
      ] },
    };
    const r = composeResponse(msg, null, 'q');
    expect(r.nextSteps).toEqual([]);
    expect(r.nextSteps.some((s) => s.label === 'Run in background')).toBe(false);
  });

  it('quickRefinements never populate NEXT_STEPS even when the model list is present but empty', () => {
    const msg = {
      role: 'assistant', loading: false, content: 'a',
      quickRefinements: [{ label: 'Show exceptions only', prompt: 'a — show only exceptions' }],
      artifacts: { sections: [
        { type: 'NEXT_STEPS', title: null, purpose: null, display: null, content: null, items: [] },
      ] },
    };
    const r = composeResponse(msg, null, 'q');
    expect(r.nextSteps).toEqual([]);
  });

  it('fields analyzed come from the rendered DATASET sections, never queryData[0]', () => {
    const msg = {
      role: 'assistant', loading: false, content: 'a',
      queryData: [{ decoy_column: 'should not appear' }],
      artifacts: { sections: [
        { type: 'DATASET', title: 'Open Orders', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 1, rows: [{ po_number: 'PO-1', ordered_qty: 3 }] }] },
      ] },
    };
    const r = composeResponse(msg, null, 'q');
    expect(r.fieldsAnalyzed).toContain('Po Number');
    expect(r.fieldsAnalyzed).not.toContain('Decoy Column');
  });

  it('does not fabricate "Filters: None applied"', () => {
    const messages = answered({
      artifacts: { sections: [
        { type: 'DATASET', title: 'Open Orders', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 1, rows: [poRow(1)] }] },
      ] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.queryByText('Filters')).toBeNull();
    expect(screen.queryByText('None applied')).toBeNull();
  });

  it('legacy queryData does not affect section rendering when sections are present', () => {
    const messages = answered({
      queryData: [{ decoy: 'legacy dataset — must not render' }],
      artifacts: { sections: [
        { type: 'DATASET', title: 'Real Dataset', purpose: null, display: true, items: [], content: null,
          datasets: [{ step_no: 1, rows: [poRow(1)] }] },
      ] },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);
    expect(screen.getByText('Real Dataset')).toBeTruthy();
    expect(screen.queryByText('legacy dataset — must not render')).toBeNull();
  });

  // ── The exact acceptance scenario: "Show me all open purchase orders. Which item did I
  //    order the most?" — both the 5-row open-orders dataset and the 1-row most-ordered-item
  //    dataset must reach and render in the UI, alongside the grounded HIGHLIGHT. ────────────
  it('end-to-end: 5 open purchase orders + most-ordered-item highlight both render', () => {
    const messages = answered({
      content: 'You have 5 open purchase orders. The most ordered item is the Men\'s Leather Chelsea Boot.',
      artifacts: {
        sections: [
          {
            type: 'DATASET', title: 'Open Purchase Orders', purpose: 'All open purchase orders',
            display: true, items: [], content: null,
            datasets: [{ step_no: 1, rows: [poRow(1), poRow(2), poRow(3), poRow(4), poRow(5)] }],
          },
          {
            type: 'DATASET', title: 'Most Ordered Item', purpose: 'The item ordered in the greatest quantity',
            display: true, items: [], content: null,
            datasets: [{ step_no: 5, rows: [{ name: "Men's Leather Chelsea Boot", sku: 'CHB-001' }] }],
          },
          {
            type: 'HIGHLIGHT', title: 'Most Ordered Item', purpose: null, display: true, items: [],
            content: "Men's Leather Chelsea Boot was ordered most, with 1,500 units.",
            datasets: [
              { step_no: 3, rows: [{ product_id: 'p1', total_ordered_qty: 1500 }] },
              { step_no: 5, rows: [{ name: "Men's Leather Chelsea Boot", sku: 'CHB-001' }] },
            ],
          },
          { type: 'NEXT_STEPS', title: null, purpose: null, display: null, content: null,
            items: ['Review supplier lead times for this item'] },
        ],
      },
    });
    render(<IntelligenceResponse finding={null} messages={messages} onAsk={() => {}} />);

    expect(screen.getByText('Open Purchase Orders')).toBeTruthy();
    // "Most Ordered Item" titles both the DATASET section and the HIGHLIGHT section — both
    // must survive independently.
    expect(screen.getAllByText('Most Ordered Item').length).toBe(2);
    expect(screen.getByText('PO-1')).toBeTruthy();
    expect(screen.getByText(/Men's Leather Chelsea Boot was ordered most/)).toBeTruthy();
    expect(screen.queryByText('Dataset (5)')).toBeNull();

    const r = composeResponse(messages[1], null, 'q');
    expect(r.nextSteps).toEqual([
      { label: 'Review supplier lead times for this item', prompt: 'Review supplier lead times for this item' },
    ]);
  });
});
