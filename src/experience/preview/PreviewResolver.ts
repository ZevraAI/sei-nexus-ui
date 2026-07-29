/** Zevra Experience Layer — PreviewResolver (Phase 3.6, business-logic boundary).
 *  The Preview engine consumes ONLY this to turn an EntityRef into a PreviewModel. A real resolver
 *  (governed data) is injected later; `MockPreviewResolver` powers dev/tests deterministically. */
import type { EntityRef } from '../types';
import type { PreviewModel } from './types';

export interface PreviewResolver {
  resolve(entity: EntityRef): Promise<PreviewModel>;
}

/** Deterministic, representative previews per entity kind. No network. */
export class MockPreviewResolver implements PreviewResolver {
  resolve(entity: EntityRef): Promise<PreviewModel> {
    return Promise.resolve(build(entity));
  }
}

function build(entity: EntityRef): PreviewModel {
  const id = entity.id;
  switch (entity.kind) {
    case 'supplier':
      return { title: 'Northgate Foods', subtitle: 'Supplier', facts: [
        { label: 'SKUs', value: '41' }, { label: 'Missed inbound', value: '2 overnight' },
      ], timeline: [{ label: 'Inbound not received', time: '23:00' }] };
    case 'store':
      return { title: `Store ${id}`, subtitle: 'Southwest', facts: [
        { label: 'On-hand', value: '−8.2%' }, { label: 'Status', value: 'At risk' },
      ] };
    case 'investigation':
      return { title: 'Southwest inventory drop', subtitle: 'Investigation', confidence: 91, facts: [
        { label: 'Phase', value: 'Impact · 4/6' }, { label: 'Owner', value: 'Inventory Investigator' },
      ], to: '/reasoning' };
    case 'recommendation':
      return { title: 'Expedite replenishment', subtitle: 'Recommendation', confidence: 91, facts: [
        { label: 'Impact', value: '$418K recoverable' }, { label: 'Scope', value: '4 stores' },
      ], to: '/reasoning' };
    case 'invoice':
      return { title: `Invoice ${id}`, subtitle: 'Finance', facts: [
        { label: 'Status', value: 'Reconciled' }, { label: 'Amount', value: '$2.4M batch' },
      ] };
    default:
      return { title: id || 'Entity', subtitle: entity.kind, facts: [] };
  }
}
