import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { NODE_META } from '../components/automation/FlowNodes.jsx';
import GenerateModal from '../components/automation/GenerateModal.jsx';
import {
  Plus, Pencil, Trash2, Play, Clock, CheckCircle2,
  XCircle, Loader2, Zap, Sparkles, ChevronRight,
} from 'lucide-react';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    DRAFT:    { color: 'bg-gray-100 text-gray-600',     label: 'Draft'    },
    ACTIVE:   { color: 'bg-emerald-100 text-emerald-700', label: 'Active' },
    ARCHIVED: { color: 'bg-red-50 text-red-500',          label: 'Archived' },
  }[status] ?? { color: 'bg-gray-100 text-gray-500', label: status };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
  );
}

// ── Execution status icon ─────────────────────────────────────────────────────

function ExecIcon({ status }) {
  if (status === 'SUCCESS')  return <CheckCircle2 size={12} className="text-emerald-500" />;
  if (status === 'FAILED')   return <XCircle size={12} className="text-red-500" />;
  if (status === 'RUNNING')  return <Loader2 size={12} className="animate-spin text-blue-500" />;
  return <Clock size={12} className="text-gray-400" />;
}

// ── Workflow card ─────────────────────────────────────────────────────────────

function WorkflowCard({ workflow, onDelete, isDark }) {
  const [running, setRunning]       = useState(false);
  const [lastExec, setLastExec]     = useState(null);
  const [execLoaded, setExecLoaded] = useState(false);

  useEffect(() => {
    api.automations.executions(workflow.id).then(execs => {
      if (execs && execs.length > 0) setLastExec(execs[0]);
    }).catch(() => {}).finally(() => setExecLoaded(true));
  }, [workflow.id]);

  const run = async (e) => {
    e.stopPropagation();
    setRunning(true);
    try {
      const exec = await api.automations.run(workflow.id, {});
      setLastExec(exec);
    } catch (_) {
    } finally {
      setRunning(false);
    }
  };

  const card = isDark
    ? 'bg-[#1A1F2B] border-[#252E3F] hover:border-[#374151]'
    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md';

  const graphNodeCount = (() => {
    try {
      // Jackson SNAKE_CASE: graphJson → graph_json
      const g = typeof workflow.graph_json === 'object'
        ? workflow.graph_json
        : JSON.parse(workflow.graph_json);
      return g?.nodes?.length ?? 0;
    } catch { return 0; }
  })();

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all group ${card}`}
      onClick={() => navigate(`/automations/${workflow.id}/edit`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-emerald-500 shrink-0" />
            <span className={`text-[14px] font-semibold truncate ${isDark ? 'text-[#F0F4F8]' : 'text-gray-900'}`}>
              {workflow.name}
            </span>
            <StatusBadge status={workflow.status} />
          </div>
          {workflow.description && (
            <p className={`text-[12px] truncate mt-0.5 ${isDark ? 'text-[#64748B]' : 'text-gray-500'}`}>
              {workflow.description}
            </p>
          )}
          <div className={`flex items-center gap-3 mt-2 text-[11px] ${isDark ? 'text-[#4B5563]' : 'text-gray-400'}`}>
            <span className="font-mono">/{workflow.slug}</span>
            <span>·</span>
            <span>{graphNodeCount} node{graphNodeCount !== 1 ? 's' : ''}</span>
            {execLoaded && lastExec && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <ExecIcon status={lastExec.status} />
                  Last: {lastExec.status}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={run}
            disabled={running}
            title="Run now"
            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); navigate(`/automations/${workflow.id}/edit`); }}
            title="Edit"
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#64748B] hover:bg-[#252E3F] hover:text-[#E2E8F0]' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(workflow.id); }}
            title="Archive"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}



// ── Main Automations page ─────────────────────────────────────────────────────

export default function Automations() {
  const { isDark } = useTheme();
  const [workflows,     setWorkflows]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showGenerate,  setShowGenerate]  = useState(false);

  const load = () => {
    setLoading(true);
    api.automations.list()
      .then(setWorkflows)
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Archive this workflow? It will no longer accept webhook triggers.')) return;
    await api.automations.delete(id).catch(() => {});
    setWorkflows(ws => ws.filter(w => w.id !== id));
  };

  const surface = isDark ? 'bg-[#0F1117]' : 'bg-[#F8FAFC]';
  const heading = isDark ? 'text-[#F0F4F8]' : 'text-gray-900';
  const sub     = isDark ? 'text-[#64748B]' : 'text-gray-500';
  const card    = isDark ? 'bg-[#1A1F2B] border-[#252E3F]' : 'bg-white border-gray-200';

  return (
    <div className={`flex flex-col h-full ${surface} overflow-y-auto`}>
      {showGenerate && (
        <GenerateModal
          isDark={isDark}
          onClose={() => { setShowGenerate(false); load(); }}
        />
      )}

      <div className="max-w-5xl mx-auto w-full px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-[22px] font-bold ${heading}`}>Automations</h1>
            <p className={`text-[13px] mt-0.5 ${sub}`}>
              Build visual workflows that connect your data, AI, and business logic.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGenerate(true)}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-xl border transition-colors
                ${isDark
                  ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
            >
              <Sparkles size={14} /> Generate with AI
            </button>
            <button
              onClick={() => navigate('/automations/new/edit')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-colors"
            >
              <Plus size={14} /> New Workflow
            </button>
          </div>
        </div>

        {/* Demo callout */}
        <div className={`rounded-xl border p-4 mb-6 ${card}`}>
          <p className={`text-[12px] font-semibold ${heading} mb-1`}>Demo Workflows Available</p>
          <p className={`text-[12px] ${sub}`}>
            Two pre-built demo workflows ship with Zevra: <span className="font-mono font-medium">order-fulfillment</span> and{' '}
            <span className="font-mono font-medium">damage-claim-processor</span>. Open them to explore the canvas and run a live test.
          </p>
        </div>

        {/* List */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-xl">{error}</div>
        )}

        {!loading && !error && workflows.length === 0 && (
          <div className={`rounded-xl border border-dashed flex flex-col items-center justify-center py-20 gap-4 ${isDark ? 'border-[#252E3F]' : 'border-gray-200'}`}>
            <Zap size={32} className="text-gray-300" />
            <div className="text-center">
              <p className={`text-[14px] font-semibold ${heading}`}>No workflows yet</p>
              <p className={`text-[12px] mt-1 ${sub}`}>Create your first workflow or run the Flyway migration to load the demo workflows.</p>
            </div>
            <button
              onClick={() => navigate('/automations/new/edit')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-lg transition-colors"
            >
              <Plus size={13} /> Create Workflow
            </button>
          </div>
        )}

        {!loading && workflows.length > 0 && (
          <div className="grid gap-3">
            {workflows.map(w => (
              <WorkflowCard key={w.id} workflow={w} onDelete={handleDelete} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
