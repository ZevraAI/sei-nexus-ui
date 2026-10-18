import { describe, it, expect } from 'vitest';
import { briefTitle, hasManyLines } from '../brief.js';

describe('briefTitle', () => {
  it('uses the first non-empty line without trailing punctuation', () => {
    expect(briefTitle('\n  Which lines are at risk?\nRank them by urgency.')).toBe('Which lines are at risk');
  });

  it('cuts a long first line at a word boundary and adds an ellipsis', () => {
    const t = briefTitle('Which open purchase order lines could cause a stock-out at the warehouse they are going to', 40);
    expect(t.length).toBeLessThanOrEqual(40);
    expect(t.endsWith('…')).toBe(true);
    expect(t).not.toMatch(/\s…$/);
  });

  it('is empty for empty input', () => {
    expect(briefTitle('')).toBe('');
    expect(briefTitle(undefined)).toBe('');
  });
});

describe('hasManyLines', () => {
  it('counts explicit lines', () => {
    expect(hasManyLines('a\nb\nc', 6)).toBe(false);
    expect(hasManyLines('1\n2\n3\n4\n5\n6\n7', 6)).toBe(true);
  });
});
