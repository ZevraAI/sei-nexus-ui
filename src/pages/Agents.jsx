import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Spinner } from '../components/Card.jsx';
import { Bot, Plus, Pencil, Trash2, MessageSquare, Database, Zap } from 'lucide-react';
import { navigate } from '../App.jsx';
import AgentFormModal from '../components/agents/AgentFormModal.jsx';

const TILE_GRADIENTS = [
  { bg: 'linear-gradient(135deg,#D1FAE5,#6EE7B7)', stroke: '#059669' },
  { bg: 'linear-gradient(135deg,#DBEAFE,#93C5FD)', stroke: '#3B82F6' },
  { bg: 'linear-gradient(135deg,#EDE9FE,#C4B5FD)', stroke: '#7C3AED' },
  { bg: 'linear-gradient(135deg,#FFEDD5,#FDB986)', stroke: '#EA580C' },
  { bg: 'linear-gradient(135deg,#FCE7F3,#F9A8D4)', stroke: '#DB2777' },
  { bg: 'linear-gradient(135deg,#CFFAFE,#67E8F9)', stroke: '#0891B2' },
];

function statusBadge(status) {
  return {
    ACTIVE:   'bg-[#DCFCE7] text-[#15803D]',
    DRAFT:    'bg-[#FEF9C3] text-[#A16207]',
    ARCHIVED: 'bg-[#F3F4F6] text-[#6B7280]',
  }[status] ?? 'bg-[#F3F4F6] text-[#6B7280]';
}

function AgentCard({ agent, idx, onEdit, onDelete }) {
  const tile = TILE_GRADIENTS[idx % TILE_GRADIENTS.length];
  const connCount = (agent.connection_keys ?? agent.connectionKeys ?? []).length;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70 p-5
                    flex flex-col gap-4 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]
                    hover:-translate-y-[1px] transition-all">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
               style={{ background: tile.bg }}>
            <Bot size={18} style={{ color: tile.stroke }} strokeWidth={1.6} />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#111827]">{agent.name}</div>
            <div className="text-[11.5px] text-[#9CA3AF] mt-[1px]">
              {connCount} connection{connCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(agent.status)}`}>
          {agent.status}
        </span>
      </div>

      {/* Goal */}
      <p className="text-[12.5px] text-[#6B7280] leading-[1.55] line-clamp-2">
        {agent.goal || '—'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F9FAFB] rounded-lg">
          <Database size={12} className="text-[#9CA3AF]" />
          <span className="text-[12px] text-[#374151]">{connCount} connection{connCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F9FAFB] rounded-lg">
          <Zap size={12} className="text-[#9CA3AF]" />
          <span className="text-[12px] text-[#374151]">max {agent.max_iterations ?? agent.maxIterations ?? 10} steps</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => navigate(`/agents/${agent.id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                     bg-[#111827] text-white text-[12px] font-medium rounded-[7px]
                     hover:bg-[#1F2937] transition-colors">
          <MessageSquare size={12} /> Chat
        </button>
        <button onClick={() => onEdit(agent)}
          className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-gray-100
                     rounded-[7px] transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(agent.id)}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50
                     rounded-[7px] transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

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
        <div className="text-[12px] text-[#9CA3AF]">Give it a goal and data connections</div>
      </div>
    </div>
  );
}

export default function Agents() {
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [error, setError]         = useState('');

  const load = () =>
    api.zevraAgents.list()
      .then(r => setAgents(r ?? []))
      .catch(() => setAgents([]));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const openAdd  = () => { setEditing(null); setError(''); setShowModal(true); };
  const openEdit = (a) => { setEditing(a);   setError(''); setShowModal(true); };

  const handleDelete = async (id) => {
    if (!confirm('Archive this agent?')) return;
    try { await api.zevraAgents.remove(id); await load(); }
    catch (e) { setError(e.message || 'Failed to archive'); }
  };

  const handleSaved = () => { setShowModal(false); setEditing(null); load(); };

  return (
    <div className="flex-1 overflow-auto p-7 bg-transparent">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[20px] font-bold text-[#111827] tracking-[-0.025em]">Agents</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Autonomous AI agents that reason over your data — no workflow to draw
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-[14px] py-[7px] bg-[#111827] text-white
                     text-[13px] font-medium rounded-[8px] hover:bg-[#1F2937] transition-colors shadow-sm">
          <Plus size={13} /> New Agent
        </button>
      </div>

      {error && (
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
            <AgentCard key={a.id} agent={a} idx={i} onEdit={openEdit} onDelete={handleDelete} />
          ))}
          <AddCard onClick={openAdd} />
        </div>
      )}

      {showModal && (
        <AgentFormModal
          agent={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
