import { describe, it, expect } from 'vitest';
import { sharedTransitionAttrs, previewAttrs, seamAttrs } from '../seams';
import type { EntityRef } from '../../types';

const supplier: EntityRef = { kind: 'supplier', id: 'northgate' };

describe('Living seams (integration points only)', () => {
  it('sharedTransitionAttrs marks an element by id, empty when absent', () => {
    expect(sharedTransitionAttrs('inv-1')).toEqual({ 'data-z-shared': 'inv-1' });
    expect(sharedTransitionAttrs()).toEqual({});
  });

  it('previewAttrs marks an entity target, empty when absent', () => {
    expect(previewAttrs(supplier)).toEqual({ 'data-z-preview-kind': 'supplier', 'data-z-preview-id': 'northgate' });
    expect(previewAttrs()).toEqual({});
  });

  it('seamAttrs merges both seams', () => {
    expect(seamAttrs({ sharedId: 's1', previewEntity: supplier })).toEqual({
      'data-z-shared': 's1',
      'data-z-preview-kind': 'supplier',
      'data-z-preview-id': 'northgate',
    });
    expect(seamAttrs({})).toEqual({});
  });
});
