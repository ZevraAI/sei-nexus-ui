import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Zap, Database, Brain, Camera, GitBranch, Shuffle, SendHorizonal,
} from 'lucide-react';

// ── Shared node shell ─────────────────────────────────────────────────────────

const NODE_META = {
  TRIGGER:       { label: 'Trigger',        Icon: Zap,           color: 'emerald' },
  DB_QUERY:      { label: 'Database Query', Icon: Database,      color: 'blue'    },
  AI_REASON:     { label: 'AI Reasoning',   Icon: Brain,         color: 'purple'  },
  IMAGE_ANALYSE: { label: 'Image Analysis', Icon: Camera,        color: 'pink'    },
  CONDITION:     { label: 'Condition',      Icon: GitBranch,     color: 'amber'   },
  TRANSFORM:     { label: 'Transform',      Icon: Shuffle,       color: 'cyan'    },
  RESPONSE:      { label: 'Response',       Icon: SendHorizonal, color: 'rose'    },
};

const COLOR_CLASSES = {
  emerald: {
    ring:   'ring-emerald-500/40',
    header: 'bg-emerald-600',
    badge:  'bg-emerald-100 text-emerald-700',
  },
  blue: {
    ring:   'ring-blue-500/40',
    header: 'bg-blue-600',
    badge:  'bg-blue-100 text-blue-700',
  },
  purple: {
    ring:   'ring-purple-500/40',
    header: 'bg-purple-600',
    badge:  'bg-purple-100 text-purple-700',
  },
  pink: {
    ring:   'ring-pink-500/40',
    header: 'bg-pink-600',
    badge:  'bg-pink-100 text-pink-700',
  },
  amber: {
    ring:   'ring-amber-500/40',
    header: 'bg-amber-500',
    badge:  'bg-amber-100 text-amber-700',
  },
  cyan: {
    ring:   'ring-cyan-500/40',
    header: 'bg-cyan-600',
    badge:  'bg-cyan-100 text-cyan-700',
  },
  rose: {
    ring:   'ring-rose-500/40',
    header: 'bg-rose-600',
    badge:  'bg-rose-100 text-rose-700',
  },
};

function NodeShell({ type, data, children, selected,
                     hasTarget = true, hasSource = true, sourceHandles = null }) {
  const meta   = NODE_META[type] ?? { label: type, Icon: Zap, color: 'blue' };
  const colors = COLOR_CLASSES[meta.color];
  const { Icon } = meta;
  const label = data?.label || meta.label;

  return (
    <div
      className={`w-[220px] rounded-xl bg-white shadow-lg ring-2 transition-all
                  ${selected ? colors.ring : 'ring-gray-200/60'}
                  overflow-hidden font-sans`}
    >
      {/* Header */}
      <div className={`${colors.header} px-3 py-2 flex items-center gap-2`}>
        <Icon size={13} className="text-white/90 shrink-0" />
        <span className="text-white text-[12px] font-semibold truncate flex-1">{label}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
          {type}
        </span>
      </div>

      {/* Body */}
      {children && (
        <div className="px-3 py-2.5 text-[11px] text-gray-500 space-y-1">
          {children}
        </div>
      )}

      {/* Handles */}
      {hasTarget && (
        <Handle type="target" position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !rounded-full" />
      )}
      {hasSource && !sourceHandles && (
        <Handle type="source" position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !rounded-full" />
      )}
      {sourceHandles && sourceHandles.map(({ id, label: hl, left }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={Position.Bottom}
          style={{ left: left + '%' }}
          className="!w-3 !h-3 !border-2 !border-white !rounded-full !bg-gray-400"
        >
          <span
            className="absolute top-4 text-[9px] font-semibold text-gray-500 -translate-x-1/2 left-1/2 whitespace-nowrap"
          >{hl}</span>
        </Handle>
      ))}
    </div>
  );
}

function Preview({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-1">
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className="text-gray-600 truncate">{String(value).slice(0, 40)}</span>
    </div>
  );
}

// ── Node implementations ──────────────────────────────────────────────────────

export function TriggerNode({ data, selected }) {
  return (
    <NodeShell type="TRIGGER" data={data} selected={selected} hasTarget={false}>
      <Preview label="type" value={data?.triggerType || 'WEBHOOK'} />
      <div className="text-[10px] text-emerald-600 font-medium">Entry point</div>
    </NodeShell>
  );
}

export function DbQueryNode({ data, selected }) {
  return (
    <NodeShell type="DB_QUERY" data={data} selected={selected}>
      <Preview label="conn"  value={data?.connectionKey} />
      <Preview label="sql"   value={data?.sql} />
      <Preview label="rows"  value={data?.maxRows ? `max ${data.maxRows}` : undefined} />
    </NodeShell>
  );
}

export function AiReasonNode({ data, selected }) {
  return (
    <NodeShell type="AI_REASON" data={data} selected={selected}>
      <Preview label="prompt" value={data?.userPrompt} />
      <Preview label="output" value={data?.outputFormat || 'text'} />
    </NodeShell>
  );
}

export function ImageAnalyseNode({ data, selected }) {
  return (
    <NodeShell type="IMAGE_ANALYSE" data={data} selected={selected}>
      <Preview label="question" value={data?.question} />
      <Preview label="image"    value={data?.imageRef} />
    </NodeShell>
  );
}

export function ConditionNode({ data, selected }) {
  return (
    <NodeShell
      type="CONDITION"
      data={data}
      selected={selected}
      sourceHandles={[
        { id: 'true',  label: 'TRUE',  left: 30 },
        { id: 'false', label: 'FALSE', left: 70 },
      ]}
    >
      <Preview label="left" value={data?.leftValue} />
      <Preview label="op"   value={data?.operator} />
      <Preview label="right" value={data?.rightValue} />
    </NodeShell>
  );
}

export function TransformNode({ data, selected }) {
  const count = Array.isArray(data?.mappings) ? data.mappings.length : 0;
  return (
    <NodeShell type="TRANSFORM" data={data} selected={selected}>
      <div className="text-gray-500">{count} field mapping{count !== 1 ? 's' : ''}</div>
    </NodeShell>
  );
}

export function ResponseNode({ data, selected }) {
  const count = Array.isArray(data?.fields) ? data.fields.length : 0;
  return (
    <NodeShell type="RESPONSE" data={data} selected={selected} hasSource={false}>
      <div className="text-gray-500">{count > 0 ? `${count} output field${count !== 1 ? 's' : ''}` : 'Pass-through output'}</div>
      <div className="text-[10px] text-rose-500 font-medium">Terminal node</div>
    </NodeShell>
  );
}

// ── nodeTypes map for ReactFlow ───────────────────────────────────────────────

export const NODE_TYPES = {
  TRIGGER:       TriggerNode,
  DB_QUERY:      DbQueryNode,
  AI_REASON:     AiReasonNode,
  IMAGE_ANALYSE: ImageAnalyseNode,
  CONDITION:     ConditionNode,
  TRANSFORM:     TransformNode,
  RESPONSE:      ResponseNode,
};

export { NODE_META };
