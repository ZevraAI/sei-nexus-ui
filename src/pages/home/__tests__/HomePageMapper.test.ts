import { describe, it, expect } from 'vitest';
import { mapToViewModel, sessionStatus, isActionableFinding } from '../HomePageMapper';

const NOW = new Date('2026-07-29T12:00:00Z');
const emptyData = { brief: null, sessions: [], findings: [], anomalies: [], alerts: [], agents: [], connections: [] };

describe('HomePageMapper — brand-new tenant (zero intelligence)', () => {
  it('produces empty sections and zeroed platform KPIs — no fabrication', () => {
    const vm = mapToViewModel({ userName: 'Murali Test', now: NOW }, emptyData);
    expect(vm.executiveSummary.greeting).toMatch(/Murali/);
    expect(vm.executiveSummary.headline).toHaveLength(0);   // no brief → no verdict
    expect(vm.investigations).toHaveLength(0);
    expect(vm.recommendations).toHaveLength(0);
    expect(vm.signals).toHaveLength(0);
    expect(vm.recentActivity).toHaveLength(0);
    expect(vm.workforce.agents).toHaveLength(0);
    // KPI strip = real platform counts, all zero for a new tenant
    expect(vm.kpis.map((k) => k.value)).toEqual([0, 0, 0, 0]);
  });
});

describe('HomePageMapper — populated tenant', () => {
  it('maps a READY brief to the verdict + narrative', () => {
    const brief = { status: 'READY', headline: 'Operations are stable.', sectionsJson: JSON.stringify([{ content: 'All connected sources are healthy.' }]) };
    const vm = mapToViewModel({ now: NOW }, { ...emptyData, brief });
    expect(vm.executiveSummary.headline[0].text).toBe('Operations are stable.');
    expect(vm.executiveSummary.narrative[0][0].text).toBe('All connected sources are healthy.');
  });

  it('maps reasoning sessions to investigations and counts active ones', () => {
    const sessions = [
      { sessionKey: 's1', initialQuestion: 'Why did revenue dip?', status: 'ACTIVE', confidenceScore: 0.82, domainKey: 'Finance', startedAt: NOW.toISOString() },
      { sessionKey: 's2', initialQuestion: 'Vendor risk?', status: 'CONCLUDED', confidenceScore: 0.6 },
    ];
    const vm = mapToViewModel({ now: NOW }, { ...emptyData, sessions, connections: [{ status: 'CONNECTED' }] });
    expect(vm.investigations).toHaveLength(2);
    expect(vm.investigations[0].title).toBe('Why did revenue dip?');
    expect(vm.investigations[0].live).toBe(true);
    expect(vm.investigations[0].confidence).toBe(82);
    expect(vm.kpis.find((k) => k.id === 'investigations')!.value).toBe(1); // only ACTIVE counts
    expect(vm.kpis.find((k) => k.id === 'sources')!.value).toBe(1);
  });

  it('derives recommendations only from actionable (open) findings, highest confidence first', () => {
    const findings = [
      { findingKey: 'f1', title: 'Low', status: 'OPEN', confidence: 0.4, description: 'a', evidenceSummary: 'e1' },
      { findingKey: 'f2', title: 'High', status: 'OPEN', confidence: 0.9, description: 'b', evidenceSummary: 'e2' },
      { findingKey: 'f3', title: 'Resolved one', status: 'RESOLVED', confidence: 0.95 },
    ];
    const vm = mapToViewModel({ now: NOW }, { ...emptyData, findings });
    expect(vm.recommendations.map((r) => r.summary)).toEqual(['High', 'Low']); // resolved excluded, sorted
    expect(vm.recommendations[0].confidence).toBe(90);
  });

  it('does not fabricate agents — real agents map through, empty stays empty', () => {
    const agents = [{ agentKey: 'a1', name: 'Finance Watcher', status: 'ACTIVE', purpose: 'Watches finance' }];
    const vm = mapToViewModel({ now: NOW }, { ...emptyData, agents });
    expect(vm.workforce.agents).toHaveLength(1);
    expect(vm.workforce.agents[0].name).toBe('Finance Watcher');
    expect(vm.workforce.agents[0].live).toBe(true);
  });
});

describe('status helpers', () => {
  it('classifies session status', () => {
    expect(sessionStatus('ACTIVE').live).toBe(true);
    expect(sessionStatus('CONCLUDED').kind).toBe('resolved');
    expect(sessionStatus('FAILED').kind).toBe('critical');
  });
  it('treats open/new findings as actionable, resolved as not', () => {
    expect(isActionableFinding('OPEN')).toBe(true);
    expect(isActionableFinding('RESOLVED')).toBe(false);
  });
});
