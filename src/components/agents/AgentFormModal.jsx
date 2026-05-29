import React, { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { Spinner } from '../Card.jsx';
import { Plus, X } from 'lucide-react';

export default function AgentFormModal({ agent, onClose, onSaved }) {
  const isEdit = !!agent;

  const [form, setForm]         = useState({
    name:           agent?.name           ?? '',
    description:    agent?.description    ?? '',
    persona:        agent?.persona        ?? '',
    goal:           agent?.goal           ?? '',
    maxIterations:  agent?.max_iterations ?? agent?.maxIterations ?? 10,
    status:         agent?.status         ?? 'DRAFT',
    connectionKeys: agent?.connection_keys ?? agent?.connectionKeys ?? [],
  });
  const [connections, setConnections] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.connections.list().then(r => setConnections(r ?? [])).catch(() => {});
  }, []);

  const toggleConn = (key) =>
    set('connectionKeys', form.connectionKeys.includes(key)
      ? form.connectionKeys.filter(k => k !== key)
      : [...form.connectionKeys, key]);

  const save = async () => {
    if (!form.name.trim() || !form.goal.trim() || !form.persona.trim()) {
      setError('Name, Persona and Goal are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await api.zevraAgents.update(agent.id, form);
      } else {
        await api.zevraAgents.create(form);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl
                      w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-200/70">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-[#111827]">
            {isEdit ? `Edit — ${agent.name}` : 'New Agent'}
          </h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400
                       hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Logistics Operations AI"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-1 focus:ring-[#111827]" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Brief description of what this agent handles"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-1 focus:ring-[#111827]" />
          </div>

          {/* Persona */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Persona *</label>
            <textarea rows={3} value={form.persona} onChange={e => set('persona', e.target.value)}
              placeholder="You are a logistics operations AI specialist. You are precise, data-driven, and focused on operational efficiency."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-1 focus:ring-[#111827] resize-none" />
            <p className="text-[11px] text-[#9CA3AF] mt-1">Who the agent is — its character and expertise.</p>
          </div>

          {/* Goal */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Goal *</label>
            <textarea rows={3} value={form.goal} onChange={e => set('goal', e.target.value)}
              placeholder="Handle customer order complaints and damage claims. Investigate orders, check inventory and shipments, and provide clear recommendations."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-1 focus:ring-[#111827] resize-none" />
            <p className="text-[11px] text-[#9CA3AF] mt-1">What the agent should accomplish in each conversation.</p>
          </div>

          {/* Connections */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-2">
              Data Connections
              <span className="text-[#9CA3AF] font-normal ml-1">— which databases the agent can query</span>
            </label>
            {connections.length === 0 ? (
              <p className="text-[12px] text-[#9CA3AF]">No connections available. Add one in Connections first.</p>
            ) : (
              <div className="space-y-1.5">
                {connections.map(c => {
                  const key     = c.connection_key ?? c.connectionKey;
                  const checked = form.connectionKeys.includes(key);
                  return (
                    <label key={key}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors
                                  ${checked ? 'border-[#111827] bg-[#F8F9FA]' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleConn(key)}
                        className="accent-[#111827]" />
                      <div>
                        <div className="text-[13px] font-medium text-[#111827]">{c.name}</div>
                        <div className="text-[11px] text-[#9CA3AF]">{key} · {c.connection_type ?? c.connectionType}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Max Iterations + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Max Steps
                <span className="text-[#9CA3AF] font-normal ml-1">({form.maxIterations})</span>
              </label>
              <input type="range" min={3} max={20} value={form.maxIterations}
                onChange={e => set('maxIterations', Number(e.target.value))}
                className="w-full accent-[#111827]" />
              <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-0.5">
                <span>3</span><span>20</span>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-1 focus:ring-[#111827]">
                {['DRAFT', 'ACTIVE', 'ARCHIVED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-gray-200
                       rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white
                       bg-[#111827] rounded-lg hover:bg-[#1F2937] disabled:opacity-50 transition-colors">
            {saving ? <Spinner size={4} /> : <Plus size={13} />}
            {isEdit ? 'Save Changes' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
