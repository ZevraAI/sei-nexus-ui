import React, { useState } from 'react';
import { Database, Image, ChevronDown, ChevronRight, CheckCircle, Loader, AlertCircle } from 'lucide-react';

const STEP_META = {
  SCHEMA_LOAD:  { icon: Database,      label: 'Schema loaded',   color: '#6B7280' },
  TOOL_CALL:    { icon: Database,      label: 'Tool call',       color: '#3B82F6' },
  FINAL_ANSWER: { icon: CheckCircle,   label: 'Final answer',    color: '#059669' },
};

function formatOutput(val) {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
}

function StepRow({ step, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const meta  = STEP_META[step.type] ?? { icon: AlertCircle, label: step.type, color: '#9CA3AF' };
  const Icon  = step.type === 'TOOL_CALL' && step.tool === 'analyze_image' ? Image : meta.icon;
  const label = step.type === 'TOOL_CALL' ? (step.tool ?? 'Tool call') : meta.label;
  const ms    = step.durationMs;

  const hasDetail = step.type === 'TOOL_CALL' || step.type === 'FINAL_ANSWER';

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left
                    ${hasDetail ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
                    bg-white transition-colors`}>
        <Icon size={14} style={{ color: meta.color }} />
        <span className="flex-1 text-[12.5px] font-medium text-[#374151]">{label}</span>
        {ms != null && (
          <span className="text-[11px] text-[#9CA3AF] bg-[#F9FAFB] px-2 py-0.5 rounded-full">
            {ms}ms
          </span>
        )}
        {hasDetail && (open
          ? <ChevronDown size={13} className="text-gray-400" />
          : <ChevronRight size={13} className="text-gray-400" />)}
      </button>

      {open && hasDetail && (
        <div className="border-t border-gray-100 bg-[#F9FAFB] px-4 py-3 space-y-2">
          {/* Tool input (SQL or question) */}
          {step.type === 'TOOL_CALL' && step.input && (
            <div>
              <div className="text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">Input</div>
              <pre className="text-[11.5px] text-[#374151] whitespace-pre-wrap font-mono
                              bg-white border border-gray-200 rounded-lg px-3 py-2 overflow-x-auto">
                {formatOutput(step.input)}
              </pre>
            </div>
          )}

          {/* Tool output */}
          {step.type === 'TOOL_CALL' && step.output != null && (
            <div>
              <div className="text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">
                Result
                {Array.isArray(step.output) && (
                  <span className="ml-1 normal-case font-normal">({step.output.length} row{step.output.length !== 1 ? 's' : ''})</span>
                )}
              </div>
              <pre className="text-[11.5px] text-[#374151] whitespace-pre-wrap font-mono
                              bg-white border border-gray-200 rounded-lg px-3 py-2 overflow-x-auto max-h-48">
                {formatOutput(step.output)}
              </pre>
            </div>
          )}

          {/* Final answer */}
          {step.type === 'FINAL_ANSWER' && step.answer && (
            <div className="text-[13px] text-[#111827] leading-[1.6]">{step.answer}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentStepTrace({ steps, status }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-[12.5px] text-[#9CA3AF] text-center py-6">
        {status === 'RUNNING' ? (
          <div className="flex items-center justify-center gap-2">
            <Loader size={14} className="animate-spin text-[#6B7280]" />
            Running…
          </div>
        ) : 'No steps recorded.'}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <StepRow
          key={i}
          step={step}
          defaultOpen={step.type === 'FINAL_ANSWER'}
        />
      ))}
    </div>
  );
}
