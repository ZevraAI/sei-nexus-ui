import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api.js';
import { Plus, Trash2, Pencil } from 'lucide-react';

const EMPTY = { name: '', whenToUse: '', steps: '', evidenceOrder: '', escalation: '' };

const field = 'w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827]';

/**
 * Playbooks of one agent: named, reusable ways of investigating a kind of question. The model reads
 * them at run time and decides whether one applies (see AgentRunner.renderPlaybooks).
 */
export default function PlaybookEditor({ agentId }) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(null);   // null = closed; { id?, ...fields } = open
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const load = useCallback(() => {
    api.zevraAgents.playbooks(agentId)
      .then(r => setItems(r ?? []))
      .catch(e => setError(e.message || 'Could not load playbooks'));
  }, [agentId]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const edit = (p) => setDraft({
    id: p.id, name: p.name, whenToUse: p.whenToUse ?? p.when_to_use ?? '', steps: p.steps ?? '',
    evidenceOrder: p.evidenceOrder ?? p.evidence_order ?? '', escalation: p.escalation ?? '',
  });

  const save = async () => {
    if (!draft.name.trim() || !draft.whenToUse.trim() || !draft.steps.trim()) {
      setError('Name, "Use when" and Steps are required.');
      return;
    }
    setBusy(true); setError('');
    try {
      const { id, ...body } = draft;
      if (id) await api.zevraAgents.updatePlaybook(agentId, id, body);
      else await api.zevraAgents.createPlaybook(agentId, body);
      setDraft(null); load();
    } catch (e) { setError(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Archive playbook "${p.name}"?`)) return;
    try { await api.zevraAgents.deletePlaybook(agentId, p.id); load(); }
    catch (e) { setError(e.message || 'Archive failed'); }
  };

  return (
    <div data-testid="playbook-editor">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[12px] font-medium text-[#374151]">
          Playbooks
          <span className="text-[#9CA3AF] font-normal ml-1">— approved ways to investigate a kind of question</span>
        </label>
        {!draft && (
          <button type="button" onClick={() => { setError(''); setDraft({ ...EMPTY }); }}
            className="flex items-center gap-1 text-[12px] font-medium text-[#111827] hover:underline">
            <Plus size={12} /> Add
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#9CA3AF] mb-2">
        The agent reads these on every run and decides for itself whether one applies. It follows the steps in order and names the playbook in its answer.
      </p>

      {items.length === 0 && !draft && <p className="text-[12px] text-[#9CA3AF]">No playbooks yet.</p>}

      <div className="space-y-1.5">
        {items.map(p => (
          <div key={p.id} className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200">
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#111827]">{p.name}</div>
              <div className="text-[11px] text-[#6B7280]">Use when: {p.whenToUse ?? p.when_to_use}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button type="button" aria-label={`Edit ${p.name}`} onClick={() => edit(p)}
                className="p-1 text-gray-400 hover:text-gray-700"><Pencil size={13} /></button>
              <button type="button" aria-label={`Archive ${p.name}`} onClick={() => remove(p)}
                className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <div className="mt-2 space-y-2 p-3 rounded-lg border border-gray-200 bg-[#F8F9FA]">
          <input aria-label="Playbook name" className={field} placeholder="Name, e.g. Stock-out triage"
            value={draft.name} onChange={e => set('name', e.target.value)} />
          <textarea aria-label="Use when" rows={2} className={`${field} resize-none`}
            placeholder="Use when: the kind of question this applies to"
            value={draft.whenToUse} onChange={e => set('whenToUse', e.target.value)} />
          <textarea aria-label="Steps" rows={4} className={`${field} resize-none`}
            placeholder="Steps, in order: 1. Find the item  2. Check stock by location  3. ..."
            value={draft.steps} onChange={e => set('steps', e.target.value)} />
          <input aria-label="Evidence order" className={field}
            placeholder="Evidence order (optional), e.g. inventory first, then orders"
            value={draft.evidenceOrder} onChange={e => set('evidenceOrder', e.target.value)} />
          <input aria-label="Escalate when" className={field} placeholder="Escalate / flag when (optional)"
            value={draft.escalation} onChange={e => set('escalation', e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setDraft(null); setError(''); }}
              className="px-3 py-1.5 text-[12px] border border-gray-200 rounded-lg bg-white">Cancel</button>
            <button type="button" onClick={save} disabled={busy}
              className="px-3 py-1.5 text-[12px] text-white bg-[#111827] rounded-lg disabled:opacity-50">
              {draft.id ? 'Save playbook' : 'Add playbook'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
