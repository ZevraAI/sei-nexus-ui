import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Btn, EmptyState, Input, Select, Textarea, Spinner } from '../components/Card.jsx';
import { Bot, Plus, Pencil, Trash2, Sparkles, CheckCircle, BarChart2 } from 'lucide-react';

// ── Gradient palettes for agent icon tiles ────────────────────────────────
const TILE_GRADIENTS = [
  { bg: 'linear-gradient(135deg,#D1FAE5,#6EE7B7)', stroke: '#059669', fill: '#ECFDF5' },
  { bg: 'linear-gradient(135deg,#FFEDD5,#FDB986)', stroke: '#EA580C', fill: '#FFF7ED' },
  { bg: 'linear-gradient(135deg,#DBEAFE,#93C5FD)', stroke: '#3B82F6', fill: '#EFF6FF' },
  { bg: 'linear-gradient(135deg,#EDE9FE,#C4B5FD)', stroke: '#7C3AED', fill: '#F5F3FF' },
  { bg: 'linear-gradient(135deg,#FCE7F3,#F9A8D4)', stroke: '#DB2777', fill: '#FDF4FF' },
  { bg: 'linear-gradient(135deg,#CFFAFE,#67E8F9)', stroke: '#0891B2', fill: '#F0F9FF' },
];

// ── helpers ───────────────────────────────────────────────────────────────
function agentKeyOf(a)       { return a.agentKey ?? a.agent_key; }
function domainKeysOf(a)     { return a.domainKeys ?? a.domain_keys ?? ''; }
function connectionKeysOf(a) { return a.connectionKeys ?? a.connection_keys ?? ''; }
function actionScopeOf(a)    { return a.actionScope ?? a.action_scope ?? 'READ_ONLY'; }
function versionOf(a)        { return a.versionNo ?? a.version_no ?? 1; }

function emptyForm() {
  return { agentKey: '', name: '', purpose: '', domainKeys: '', connectionKeys: '',
           systemPromptOverride: '', actionScope: 'READ_ONLY', status: 'ACTIVE' };
}

// ── Agent Card ────────────────────────────────────────────────────────────
function AgentCard({ agent, idx, onEdit, onDelete }) {
  const tile   = TILE_GRADIENTS[idx % TILE_GRADIENTS.length];
  const scope  = actionScopeOf(agent);
  const ver    = versionOf(agent);
  const status = agent.status ?? 'ACTIVE';

  const statusBadge = {
    ACTIVE:   'bg-[#DCFCE7] text-[#15803D]',
    INACTIVE: 'bg-[#F3F4F6] text-[#374151]',
    DRAFT:    'bg-[#FEF9C3] text-[#A16207]',
  }[status] ?? 'bg-[#F3F4F6] text-[#374151]';

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70
                    p-5 cursor-pointer transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]
                    hover:-translate-y-[1px] flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
               style={{ background: tile.bg }}>
            <Sparkles size={18} style={{ color: tile.stroke }} strokeWidth={1.6} />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#111827]">{agent.name}</div>
            <div className="text-[11.5px] text-[#9CA3AF] mt-[1px]">
              {domainKeysOf(agent) || 'No domain'}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge}`}>
          {status}
        </span>
      </div>

      {/* Purpose */}
      <p className="text-[12.5px] text-[#6B7280] leading-[1.55]">{agent.purpose || '—'}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Connections', value: connectionKeysOf(agent) ? connectionKeysOf(agent).split(',').length : 0 },
          { label: 'Scope',  value: scope === 'READ_ONLY' ? 'RO' : 'RW' },
          { label: 'Version', value: `v${ver}` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center py-2.5 px-2 bg-[#F9FAFB] rounded-[8px]">
            <div className="text-[18px] font-bold text-[#111827]">{value}</div>
            <div className="text-[10.5px] text-[#9CA3AF] mt-[2px]">{label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[#374151]">
          {scope}
        </span>
        <div className="flex-1" />
        <button onClick={e => { e.stopPropagation(); onEdit(agent); }}
          className="text-[12px] font-medium text-[#6B7280] hover:text-[#111827] px-2.5 py-1
                     rounded-[6px] hover:bg-gray-100 transition-colors flex items-center gap-1">
          <Pencil size={12} /> Edit
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(agentKeyOf(agent)); }}
          className="text-[12px] font-medium text-red-400 hover:text-red-600 px-2.5 py-1
                     rounded-[6px] hover:bg-red-50 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Add placeholder card ──────────────────────────────────────────────────
function AddCard({ onClick }) {
  return (
    <div onClick={onClick}
      className="bg-white/60 backdrop-blur-sm rounded-xl border border-dashed border-gray-300
                 flex flex-col items-center justify-center gap-3 min-h-[220px] cursor-pointer
                 hover:border-gray-400 hover:bg-white/80 transition-all">
      <div className="w-[44px] h-[44px] rounded-[12px] border border-dashed border-gray-300
                      flex items-center justify-center">
        <Plus size={18} className="text-gray-400" strokeWidth={1.6} />
      </div>
      <div className="text-center">
        <div className="text-[13.5px] font-medium text-[#374151] mb-1">Create new agent</div>
        <div className="text-[12px] text-[#9CA3AF]">Scope it to a domain and connection</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
const AGENT_TYPES = ['OPERATIONAL_INVESTIGATOR', 'ANALYTICAL', 'COMPLIANCE', 'EXECUTIVE', 'DOMAIN_EXPERT'];

export default function Agents() {
  const [agents, setAgents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form, setForm]             = useState(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = () => api.agents.list()
    .then(r => setAgents((r ?? []).filter(a => a.status !== 'ARCHIVED')))
    .catch(() => setAgents([]));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const openAdd = () => { setEditingAgent(null); setForm(emptyForm()); setError(''); setShowModal(true); };

  const openEdit = (agent) => {
    setEditingAgent(agent);
    setForm({
      agentKey:             agentKeyOf(agent),
      name:                 agent.name || '',
      purpose:              agent.purpose || '',
      domainKeys:           domainKeysOf(agent),
      connectionKeys:       connectionKeysOf(agent),
      systemPromptOverride: '',
      actionScope:          actionScopeOf(agent),
      status:               agent.status || 'ACTIVE',
    });
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.agents.create(form);
      await load();
      setShowModal(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deleteAgent = async (key) => {
    if (!key || !confirm('Archive this agent?')) return;
    try { await api.agents.delete(key); await load(); }
    catch (e) { setError(e.message || 'Failed to archive agent'); }
  };

  return (
    <div className="flex-1 overflow-auto p-7 bg-transparent">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[20px] font-bold text-[#111827] tracking-[-0.025em]">Agents</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">Configured AI investigators scoped to your data domains</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-[14px] py-[7px] bg-[#111827] text-white
                     text-[13px] font-medium rounded-[8px] hover:bg-[#1F2937] transition-colors shadow-sm">
          <Plus size={13} /> New Agent
        </button>
      </div>

      {error && !showModal && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : agents.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">
          <AddCard onClick={openAdd} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {agents.map((a, i) => (
            <AgentCard key={agentKeyOf(a)} agent={a} idx={i} onEdit={openEdit} onDelete={deleteAgent} />
          ))}
          <AddCard onClick={openAdd} />
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingAgent(null); setError(''); }}
             title={editingAgent ? `Edit — ${editingAgent.name}` : 'New Agent'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Agent Key" placeholder="data-analyst" value={form.agentKey}
              disabled={!!editingAgent} onChange={e => set('agentKey', e.target.value)} />
            <Input label="Display Name" placeholder="Data Analyst" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          <Textarea label="Purpose" rows={2} placeholder="Investigates operational data…"
            value={form.purpose} onChange={e => set('purpose', e.target.value)} />
          <Input label="Domain Keys (comma-separated)" placeholder="PLATFORM,logistics"
            value={form.domainKeys} onChange={e => set('domainKeys', e.target.value)} />
          <Input label="Connection Keys (comma-separated)" placeholder="conn-abc123"
            value={form.connectionKeys} onChange={e => set('connectionKeys', e.target.value)} />
          <Textarea label="System Prompt Override (optional)" rows={3}
            placeholder="You are a specialist in…"
            value={form.systemPromptOverride} onChange={e => set('systemPromptOverride', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Action Scope" value={form.actionScope} onChange={e => set('actionScope', e.target.value)}>
              {['READ_ONLY', 'READ_WRITE', 'FULL'].map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
              {['ACTIVE', 'INACTIVE', 'DRAFT'].map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" onClick={() => { setShowModal(false); setEditingAgent(null); }}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.agentKey || !form.name}>
              {saving ? <Spinner size={4} /> : <Plus size={13} />}
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Modal component inline since it's not in Card.jsx scope here
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-200/70">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-[#111827]">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
