// @vitest-environment jsdom
// The backend's own visualization intent (ResponseArtifacts.Evidence: chartType/xKey/yKeys) was
// previously computed and then ignored — DataViz always recomputed chart type itself. These
// tests pin the new behavior: the hint is preferred when it's still valid against the actual
// rows, and DataViz falls back to its own inference when the hint is absent, incomplete, or
// stale (references a column the response doesn't actually have).
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import DataViz from '../DataViz.jsx';

afterEach(cleanup);

const trendRows = [
  { month: '2024-01', revenue: 1000, region: 'North' },
  { month: '2024-02', revenue: 1200, region: 'North' },
  { month: '2024-03', revenue: 900, region: 'South' },
];

describe('DataViz — backend visualization hint', () => {
  it('renders the backend-hinted chart type (area) even though the frontend heuristic would agree here too', () => {
    render(<DataViz queryData={trendRows} chartHint={{ chartType: 'area', xKey: 'month', yKeys: ['revenue'] }} />);
    expect(screen.getByText('Trend over time')).toBeTruthy();
  });

  it('prefers the hinted chart type over the frontend heuristic when they disagree', () => {
    // The frontend's own heuristic would pick "area" here (date + numeric, 2+ rows) — the
    // backend hint explicitly says "bar" (e.g. it knows this is a comparison, not a trend).
    // The hint wins.
    render(<DataViz queryData={trendRows} chartHint={{ chartType: 'bar', xKey: 'region', yKeys: ['revenue'] }} />);
    expect(screen.getByText('Distribution')).toBeTruthy();
  });

  it('falls back to its own inference when the hint references a column the rows do not have', () => {
    render(<DataViz queryData={trendRows} chartHint={{ chartType: 'bar', xKey: 'supplier', yKeys: ['revenue'] }} />);
    // supplier doesn't exist on these rows — the stale hint is ignored, not trusted blindly.
    expect(screen.getByText('Trend over time')).toBeTruthy();
  });

  it('falls back to its own inference when no hint is provided at all (legacy response)', () => {
    render(<DataViz queryData={trendRows} />);
    expect(screen.getByText('Trend over time')).toBeTruthy();
  });

  it('renders nothing when there is no chart-worthy shape and no hint', () => {
    const { container } = render(<DataViz queryData={[{ id: 'a' }, { id: 'b' }]} />);
    expect(container.textContent).toBe('');
  });
});
