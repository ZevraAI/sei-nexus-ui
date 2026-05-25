import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  Panel, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { NODE_TYPES, NODE_META } from '../components/automation/FlowNodes.jsx';
import GenerateModal from '../components/automation/GenerateModal.jsx';
import {
  ArrowLeft, Save, Play, ChevronRight, ChevronDown, X,
  Plus, Loader2, CheckCircle2, XCircle, Clock, Sparkles,
} from 'lucide-react';

// ── Node palette definition ───────────────────────────────────────────────────

const PALETTE = [
  { type: 'TRIGGER',       hint: 'Entry point — webhook or manual' },
  { type: 'DB_QUERY',      hint: 'Run SQL against a connection' },
  { type: 'AI_REASON',     hint: 'Ask the LLM to analyse or decide' },
  { type: 'IMAGE_ANALYSE', hint: 'Vision model — analyse an image' },
  { type: 'CONDITION',     hint: 'Branch on a true/false condition' },
  { type: 'TRANSFORM',     hint: 'Reshape data with field mappings' },
  { type: 'RESPONSE',      hint: 'Return the final output' },
];

const COLOR_HEX = {
  emerald: '#10b981', blue: '#3b82f6', purple: '#a855f7',
  pink: '#ec4899', amber: '#f59e0b', cyan: '#06b6d4', rose: '#f43f5e',
};

function nodeColor(type) {
  const meta = NODE_META[type];
  return meta ? COLOR_HEX[meta.color] ?? '#6b7280' : '#6b7280';
}

let _idSeq = 1;
function newNodeId() { return `node-${Date.now()}-${_idSeq++}`; }

// ── Config panel fields per node type ────────────────────────────────────────

function TriggerConfig({ data, onChange }) {
  return (
    <Field label="Label">
      <input className={INPUT} value={data.label ?? ''} onChange={e => onChange('label', e.target.value)} />
    </Field>
  );
}

function DbQueryConfig({ data, onChange }) {
  return <>
    <Field label="Label">
      <input className={INPUT} value={data.label ?? ''} onChange={e => onChange('label', e.target.value)} />
    </Field>
    <Field label="Connection Key">
      <input className={INPUT} placeholder="e.g. nexus-local" value={data.connectionKey ?? ''} onChange={e => onChange('connectionKey', e.target.value)} />
    </Field>
    <Field label="SQL">
      <textarea className={`${INPUT} h-28 resize-none font-mono text-[11px]`} placeholder="SELECT * FROM demo_order WHERE order_id = '{{trigger.order_id}}'" value={data.sql ?? ''} onChange={e => onChange('sql', e.target.value)} />
    </Field>
    <Field label="Max Rows">
      <input className={INPUT} type="number" placeholder="100" value={data.maxRows ?? ''} onChange={e => onChange('maxRows', e.target.value)} />
    </Field>
  </>;
}

function AiReasonConfig({ data, onChange }) {
  return <>
    <Field label="Label">
      <input className={INPUT} value={data.label ?? ''} onChange={e => onChange('label', e.target.value)} />
    </Field>
    <Field label="System Prompt (optional)">
      <textarea className={`${INPUT} h-20 resize-none text-[11px]`} placeholder="You are a logistics analyst…" value={data.systemPrompt ?? ''} onChange={e => onChange('systemPrompt', e.target.value)} />
    </Field>
    <Field label="User Prompt">
      <textarea className={`${INPUT} h-28 resize-none text-[11px]`} placeholder="Analyse order {{nodes.step1.rows[0].status}}…" value={data.userPrompt ?? ''} onChange={e => onChange('userPrompt', e.target.value)} />
    </Field>
    <Field label="Output Format">
      <select className={INPUT} value={data.outputFormat ?? 'text'} onChange={e => onChange('outputFormat', e.target.value)}>
        <option value="text">Text</option>
        <option value="json">JSON</option>
      </select>
    </Field>
  </>;
}

function ImageAnalyseConfig({ data, onChange }) {
  return <>
    <Field label="Label">
      <input className={INPUT} value={data.label ?? ''} onChange={e => onChange('label', e.target.value)} />
    </Field>
    <Field label="Question">
      <textarea className={`${INPUT} h-20 resize-none text-[11px]`} placeholder="Describe the damage visible in this image." value={data.question ?? ''} onChange={e => onChange('question', e.target.value)} />
    </Field>
    <Field label="Image Ref ({{variable}} path)">
      <input className={INPUT} placeholder="{{nodes.step1.rows[0].image_base64}}" value={data.imageRef ?? ''} onChange={e => onChange('imageRef', e.target.value)} />
    </Field>
    <Field label="MIME Type">
      <select className={INPUT} value={data.mimeType ?? 'image/jpeg'} onChange={e => onChange('mimeType', e.target.value)}>
        <option value="image/jpeg">image/jpeg</option>
        <option value="image/png">image/png</option>
        <option value="image/webp">image/webp</option>
      </select>
    </Field>
  </>;
}

function ConditionConfig({ data, onChange }) {
  return <>
    <Field label="Label">
      <input className={INPUT} value={data.label ?? ''} onChange={e => onChange('label', e.target.value)} />
    </Field>
    <Field label="Left Value">
      <input className={INPUT} placeholder="{{nodes.step1.rows[0].status}}" value={data.leftValue ?? ''} onChange={e => onChange('leftValue', e.target.value)} />
    </Field>
    <Field label="Operator">
      <select className={INPUT} value={data.operator ?? 'eq'} onChange={e => onChange('operator', e.target.value)}>
        <option value="eq">equals</option>
        <option value="neq">not equals</option>
        <option value="contains">contains</option>
        <option value="gt">greater than</option>
        <option value="lt">less than</option>
        <option value="gte">≥</option>
        <option value="lte">≤</option>
        <option value="isEmpty">is empty</option>
        <option value="isNotEmpty">is not empty</option>
      </select>
    </Field>
    <Field label="Right Value">
      <input className={INPUT} placeholder="PENDING" value={data.rightValue ?? ''} onChange={e => onChange('rightValue', e.target.value)} />
    </Field>
  </>;
}

function MappingListConfig({ data, onChange, fieldKey, addLabel, keyPlaceholder, valPlaceholder }) {
  const items = Array.isArray(data[fieldKey]) ? data[fieldKey] : [];
  const update = (idx, k, v) => {
    const next = items.map((m, i) => i === idx ? { ...m, [k]: v } : m);
    onChange(fieldKey, next);
  };
  const add = () => onChange(fieldKey, [...items, { key: '', value: '' }]);
  const remove = idx => onChange(fieldKey, items.filter((_, i) => i !== idx));
  return (
    <div className="space-y-2">
      {items.map((m, idx) => (
        <div key={idx} className="flex gap-1 items-start">
          <input className={`${INPUT} flex-1`} placeholder={keyPlaceholder} value={m.key ?? ''} onChange={e => update(idx, 'key', e.target.value)} />
          <input className={`${INPUT} flex-1 font-mono text-[11px]`} placeholder={valPlaceholder} value={m.value ?? ''} onChange={e => update(idx, 'value', e.target.value)} />
          <button onClick={() => remove(idx)} className="mt-0.5 text-gray-400 hover:text-red-500"><X size={12} /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium">
        <Plus size={11} />{addLabel}
      </button>
    </div>
  );
}

function TransformConfig({ data, onChange }) {
  return <>
    <Field label="Label">
      <input className={INPUT} value={data.label ?? ''} onChange={e => onChange('label', e.target.value)} />
    </Field>
    <Field label="Field Mappings">
      <MappingListConfig data={data} onChange={onChange} fieldKey="mappings" addLabel="Add mapping" keyPlaceholder="output key" valPlaceholder="{{variable}}" />
    </Field>
  </>;
}

function ResponseConfig({ data, onChange }) {
  return <>
    <Field label="Label">
      <input className={INPUT} value={data.label ?? ''} onChange={e => onChange('label', e.target.value)} />
    </Field>
    <Field label="Output Fields (optional)">
      <p className="text-[10px] text-gray-400 mb-1.5">Leave empty to pass the last node's output through.</p>
      <MappingListConfig data={data} onChange={onChange} fieldKey="fields" addLabel="Add field" keyPlaceholder="field name" valPlaceholder="{{variable}}" />
    </Field>
  </>;
}

const CONFIG_PANELS = {
  TRIGGER:       TriggerConfig,
  DB_QUERY:      DbQueryConfig,
  AI_REASON:     AiReasonConfig,
  IMAGE_ANALYSE: ImageAnalyseConfig,
  CONDITION:     ConditionConfig,
  TRANSFORM:     TransformConfig,
  RESPONSE:      ResponseConfig,
};

// ── Shared form primitives ────────────────────────────────────────────────────

const INPUT = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white';

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

// ── Test panel ────────────────────────────────────────────────────────────────

function TestPanel({ workflowId, onClose, isDark }) {
  const [payload, setPayload]   = useState('{\n  "order_id": "ORD-2024-001"\n}');
  const [running, setRunning]   = useState(false);
  const [result,  setResult]    = useState(null);
  const [error,   setError]     = useState(null);
  const [expanded, setExpanded] = useState({});

  const run = async () => {
    setRunning(true); setResult(null); setError(null);
    try {
      let parsed;
      try { parsed = JSON.parse(payload); } catch { parsed = {}; }
      const exec = await api.automations.run(workflowId, parsed);
      setResult(exec);
    } catch (e) {
      setError(e.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  // Jackson SNAKE_CASE: stepTracesJson → step_traces_json, errorMessage → error_message
  const traces = Array.isArray(result?.step_traces_json)
    ? result.step_traces_json
    : (parseJsonField(result?.step_traces_json) ?? []);

  const panel = isDark ? 'bg-[#1A1F2B] border-[#252E3F] text-[#E2E8F0]' : 'bg-white border-gray-200 text-gray-900';
  const sub   = isDark ? 'text-[#94A3B8]' : 'text-gray-500';

  return (
    <div className={`flex flex-col h-full border-l ${panel}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-[#252E3F]' : 'border-gray-100'}`}>
        <span className="text-[13px] font-semibold">Test Run</span>
        <button onClick={onClose} className={`${sub} hover:text-red-500`}><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Field label="Trigger Payload (JSON)">
          <textarea
            className={`${INPUT} h-28 resize-none font-mono text-[11px]`}
            value={payload}
            onChange={e => setPayload(e.target.value)}
          />
        </Field>

        <button
          onClick={run}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {running ? 'Running…' : 'Run Workflow'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] px-3 py-2.5 rounded-lg">{error}</div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.status === 'SUCCESS'
                ? <CheckCircle2 size={14} className="text-emerald-500" />
                : <XCircle size={14} className="text-red-500" />}
              <span className="text-[12px] font-semibold">{result.status}</span>
              {result.error_message && (
                <span className="text-red-500 text-[11px]">{result.error_message}</span>
              )}
            </div>

            {traces.map((trace, i) => {
              const open = expanded[i];
              const ok   = trace.status === 'SUCCESS';
              return (
                <div key={i} className={`rounded-lg border overflow-hidden ${isDark ? 'border-[#252E3F]' : 'border-gray-100'}`}>
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [i]: !open }))}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity ${isDark ? 'bg-[#252E3F]' : 'bg-gray-50'}`}
                  >
                    {ok ? <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                        : <XCircle size={11} className="text-red-500 shrink-0" />}
                    <span className="text-[11px] font-medium flex-1 truncate">{trace.node_label || trace.node_type}</span>
                    <span className={`text-[10px] ${sub} mr-1`}>{trace.duration_ms}ms</span>
                    {open ? <ChevronDown size={10} className={sub} /> : <ChevronRight size={10} className={sub} />}
                  </button>
                  {open && (
                    <div className={`px-3 py-2 text-[10px] font-mono space-y-1.5 ${isDark ? 'bg-[#13171F]' : 'bg-white'}`}>
                      {trace.sql_executed && (
                        <div><span className={`${sub} font-sans`}>SQL: </span>{trace.sql_executed}</div>
                      )}
                      {trace.error_message && (
                        <div className="text-red-500">Error: {trace.error_message}</div>
                      )}
                      <div className={sub}>Output:</div>
                      <pre className="overflow-auto max-h-40 text-[10px] leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main AutomationEditor ─────────────────────────────────────────────────────

const DEFAULT_EDGE_OPTS = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#94a3b8' },
  style: { stroke: '#94a3b8', strokeWidth: 1.5 },
  animated: false,
};

export default function AutomationEditor({ workflowId }) {
  const { isDark } = useTheme();
  const isNew = !workflowId || workflowId === 'new';

  const [workflow,      setWorkflow]      = useState(null);
  const [loading,       setLoading]       = useState(!isNew);
  const [saving,        setSaving]        = useState(false);
  const [saveMsg,       setSaveMsg]       = useState('');
  const [selectedNode,  setSelectedNode]  = useState(null);
  const [showTest,      setShowTest]      = useState(false);
  const [showRegenerate,setShowRegenerate]= useState(false);

  // Workflow meta fields
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [slug,        setSlug]        = useState('');
  const [status,      setStatus]      = useState('DRAFT');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef(null);
  const rfInstance       = useRef(null);   // React Flow instance for manual fitView

  const onRfInit = useCallback((instance) => {
    rfInstance.current = instance;
    // Nodes may already be loaded before ReactFlow mounted (async load resolved first).
    // fitView() here handles that case; the useEffect below handles nodes loading after mount.
    requestAnimationFrame(() => instance.fitView({ padding: 0.15 }));
  }, []);

  // ── Load workflow ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    api.automations.get(workflowId).then(w => {
      setWorkflow(w);
      setName(w.name || '');
      setDescription(w.description || '');
      setSlug(w.slug || '');
      setStatus(w.status || 'DRAFT');
      // Jackson SNAKE_CASE naming: record field graphJson → response key graph_json
      const raw = w.graph_json ?? null;
      const graph = parseGraph(raw);
      setNodes(graph.nodes || []);
      setEdges(graph.edges || []);
    }).catch(() => navigate('/automations'))
      .finally(() => setLoading(false));
  }, [workflowId]);

  // Fit view after nodes are loaded (fitView prop only fires on initial mount)
  useEffect(() => {
    if (nodes.length > 0) {
      const id = requestAnimationFrame(() => rfInstance.current?.fitView({ padding: 0.15 }));
      return () => cancelAnimationFrame(id);
    }
  }, [nodes.length]);

  // ── Edge connect ──────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, ...DEFAULT_EDGE_OPTS }, eds)),
    [setEdges]
  );

  // ── Drop node from palette ────────────────────────────────────────────────
  const onDragOver = useCallback(e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback(e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/nexus-node-type');
    if (!type) return;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    const pos = { x: e.clientX - bounds.left - 110, y: e.clientY - bounds.top - 40 };
    const id = newNodeId();
    setNodes(ns => [...ns, {
      id,
      type,
      position: pos,
      data: { label: NODE_META[type]?.label ?? type },
    }]);
  }, [setNodes]);

  // ── Node click → open config ──────────────────────────────────────────────
  const onNodeClick = useCallback((_, node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const updateNodeData = useCallback((key, value) => {
    if (!selectedNode) return;
    setNodes(ns => ns.map(n =>
      n.id === selectedNode.id
        ? { ...n, data: { ...n.data, [key]: value } }
        : n
    ));
    setSelectedNode(sn => sn ? { ...sn, data: { ...sn.data, [key]: value } } : null);
  }, [selectedNode, setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes(ns => ns.filter(n => n.id !== selectedNode.id));
    setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true); setSaveMsg('');
    const graphJson = JSON.stringify({ nodes, edges });
    try {
      const body = { name, description, slug, status, graph: graphJson };
      if (isNew) {
        const w = await api.automations.create(body);
        navigate(`/automations/${w.id}/edit`);
      } else {
        const w = await api.automations.update(workflowId, body);
        setWorkflow(w);
      }
      setSaveMsg('Saved');
    } catch (e) {
      setSaveMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  // ── Reload after AI regeneration ─────────────────────────────────────────
  const onRegenerated = useCallback((w) => {
    const graph = parseGraph(w.graph_json ?? null);
    setWorkflow(w);
    setName(w.name || '');
    setDescription(w.description || '');
    setSlug(w.slug || '');
    setStatus(w.status || 'DRAFT');
    setNodes(graph.nodes || []);
    setEdges(graph.edges || []);
    setSelectedNode(null);
    requestAnimationFrame(() => rfInstance.current?.fitView({ padding: 0.15 }));
    setSaveMsg('Regenerated');
    setTimeout(() => setSaveMsg(''), 3000);
  }, [setNodes, setEdges]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const surface = isDark ? 'bg-[#0F1117] text-[#E2E8F0]' : 'bg-[#F8FAFC] text-gray-900';
  const panel   = isDark ? 'bg-[#1A1F2B] border-[#252E3F]' : 'bg-white border-gray-200';
  const sub     = isDark ? 'text-[#94A3B8]' : 'text-gray-500';

  if (loading) return (
    <div className={`flex items-center justify-center h-full ${surface}`}>
      <Loader2 size={28} className="animate-spin text-emerald-500" />
    </div>
  );

  const ConfigPanel = selectedNode ? CONFIG_PANELS[selectedNode.type] : null;

  return (
    <div className={`flex flex-col h-full ${surface}`}>

      {showRegenerate && !isNew && (
        <GenerateModal
          isDark={isDark}
          workflowId={workflowId}
          initialRequirement={description}
          onClose={() => setShowRegenerate(false)}
          onSuccess={onRegenerated}
        />
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className={`h-[52px] shrink-0 flex items-center px-4 gap-3 border-b ${panel}`}>
        <button onClick={() => navigate('/automations')}
          className={`flex items-center gap-1.5 text-[12px] ${sub} hover:text-emerald-500 transition-colors`}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="w-px h-5 bg-gray-200 dark:bg-[#252E3F]" />

        <input
          className={`text-[14px] font-semibold bg-transparent border-none outline-none flex-1 min-w-0 ${isDark ? 'text-[#F0F4F8] placeholder:text-[#4B5563]' : 'text-gray-900 placeholder:text-gray-300'}`}
          placeholder="Workflow name…"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className={`text-[11px] font-medium border rounded-lg px-2 py-1 ${isDark ? 'bg-[#1A1F2B] border-[#252E3F] text-[#94A3B8]' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {saveMsg && (
            <span className={`text-[11px] ${saveMsg === 'Saved' ? 'text-emerald-500' : 'text-red-500'}`}>{saveMsg}</span>
          )}

          {!isNew && (
            <button
              onClick={() => setShowRegenerate(true)}
              title="Re-describe this workflow to rebuild it with AI"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors
                ${isDark ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
            >
              <Sparkles size={12} /> Regenerate
            </button>
          )}

          <button
            onClick={() => setShowTest(t => !t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors
              ${isDark ? 'border-[#252E3F] text-[#94A3B8] hover:bg-[#252E3F]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Play size={12} /> Test
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      {/* ── Workspace row ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Palette */}
        <div className={`w-[180px] shrink-0 flex flex-col border-r ${panel} overflow-y-auto py-3 px-2 gap-1`}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest px-1 mb-2 ${sub}`}>Nodes</p>
          {PALETTE.map(({ type, hint }) => {
            const meta = NODE_META[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={e => e.dataTransfer.setData('application/nexus-node-type', type)}
                title={hint}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing text-[11px] font-medium
                           transition-colors select-none
                           ${isDark ? 'hover:bg-[#252E3F] text-[#CBD5E1]' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: nodeColor(type) }} />
                {meta?.label ?? type}
              </div>
            );
          })}
        </div>

        {/* Canvas — must have explicit h-full so React Flow can measure offsetHeight */}
        <div ref={reactFlowWrapper} className="flex-1 min-w-0 h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={onRfInit}
            defaultEdgeOptions={DEFAULT_EDGE_OPTS}
            proOptions={{ hideAttribution: true }}
          >
            <Background color={isDark ? '#1E293B' : '#E2E8F0'} gap={20} />
            <Controls />
            <MiniMap
              nodeColor={n => nodeColor(n.type)}
              style={{ background: isDark ? '#1A1F2B' : '#F8FAFC' }}
            />
            <Panel position="top-center">
              <p className={`text-[10px] ${sub} select-none`}>
                Drag nodes from the palette · Connect by dragging between handles · Click a node to configure it
              </p>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config drawer */}
        {selectedNode && ConfigPanel && (
          <div className={`w-[280px] shrink-0 flex flex-col border-l ${panel}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-[#252E3F]' : 'border-gray-100'}`}>
              <span className="text-[13px] font-semibold">Configure node</span>
              <div className="flex items-center gap-2">
                <button onClick={deleteSelectedNode} className="text-red-400 hover:text-red-600 text-[10px] font-medium">Delete</button>
                <button onClick={() => setSelectedNode(null)} className={`${sub} hover:text-red-500`}><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <ConfigPanel data={selectedNode.data} onChange={updateNodeData} />
            </div>
          </div>
        )}

        {/* Test panel */}
        {showTest && !isNew && (
          <div className="w-[320px] shrink-0">
            <TestPanel workflowId={workflowId} onClose={() => setShowTest(false)} isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseGraph(graphData) {
  if (!graphData) return { nodes: [], edges: [] };
  // @JsonRawValue makes the backend embed the graph as a JSON object, not an escaped string.
  // Handle both: object (new) and string (legacy / other serialisers).
  if (typeof graphData === 'object') {
    return { nodes: graphData.nodes || [], edges: graphData.edges || [] };
  }
  try {
    const parsed = JSON.parse(graphData);
    return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function parseJsonField(field) {
  if (field === null || field === undefined) return null;
  if (typeof field !== 'string') return field;
  try { return JSON.parse(field); } catch { return null; }
}
