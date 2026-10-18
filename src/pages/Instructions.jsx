import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Textarea, Spinner } from '../components/Card.jsx';
import { ListChecks, CheckCircle, Archive } from 'lucide-react';

const STATUSES = ['PENDING', 'APPROVED', 'ARCHIVED'];
const STATUS_COLOR = { PENDING: 'yellow', APPROVED: 'green', ARCHIVED: 'gray' };

/** Review of standing instructions proposed in chat with /knowledge. Approved ones are applied to relevant questions. */
export default function Instructions() {
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edits, setEdits] = useState({});
  const [always, setAlways] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.instructions.list(status).then(setItems).catch(e => { setItems([]); setError(e.message || 'Could not load instructions'); })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  const act = async (id, fn) => {
    setBusy(id);
    setError('');
    try { await fn(); load(); } catch (e) { setError(e.message || 'That action failed'); } finally { setBusy(null); }
  };

  const approve = (i) => act(i.instructionId, () => api.instructions.approve(i.instructionId, {
    text: edits[i.instructionId] ?? i.instructionText,
    alwaysApply: always[i.instructionId] ?? i.alwaysApply,
  }));

  return (
    <div className="h-full overflow-auto p-7 bg-transparent">
      <PageHeader
        title="Instructions"
        subtitle="Standing preferences proposed with /knowledge. Once approved, Zevra applies the relevant ones to questions."
        actions={
          <div className="flex gap-1">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                  ${status === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        }
      />

      {error && <p role="alert" className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={ListChecks} title={`No ${status.toLowerCase()} instructions`}
          body="Anyone can propose one in chat, for example: /knowledge Always show the item description on order line items." />
      ) : (
        <div className="space-y-2">
          {items.map(i => (
            <Card key={i.instructionId} className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge label={i.status} color={STATUS_COLOR[i.status] ?? 'gray'} />
                {i.status === 'APPROVED' && i.alwaysApply && <Badge label="ALWAYS APPLIED" color="blue" />}
                <span className="text-xs text-gray-400">
                  {i.submittedBy ? `Proposed by ${i.submittedBy}` : 'Proposed'} {i.createdAt?.split('T')[0]}
                </span>
              </div>

              {i.status === 'ARCHIVED' ? (
                <p className="text-sm text-gray-500">{i.instructionText}</p>
              ) : (
                <>
                  <Textarea label="Instruction (edit before approving if needed)" rows={2}
                    value={edits[i.instructionId] ?? i.instructionText}
                    onChange={e => setEdits(x => ({ ...x, [i.instructionId]: e.target.value }))} />
                  <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                    <input type="checkbox" checked={always[i.instructionId] ?? i.alwaysApply}
                      onChange={e => setAlways(x => ({ ...x, [i.instructionId]: e.target.checked }))} />
                    Always apply (sent with every question; at most 5 instructions)
                  </label>
                  <div className="flex gap-2 mt-3">
                    <Btn variant="teal" size="sm" disabled={busy === i.instructionId} onClick={() => approve(i)}>
                      <CheckCircle size={12} /> {i.status === 'APPROVED' ? 'Save changes' : 'Approve'}
                    </Btn>
                    <Btn variant="ghost" size="sm" disabled={busy === i.instructionId}
                      onClick={() => act(i.instructionId, () => api.instructions.archive(i.instructionId))}>
                      <Archive size={12} /> {i.status === 'APPROVED' ? 'Archive' : 'Reject'}
                    </Btn>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
