import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle, ChevronDown, ChevronRight, Languages } from 'lucide-react';

/**
 * Collapsible panel that shows the iterative reasoning steps Zevra took
 * to answer a QUERY_LIVE_DATA question.
 *
 * Props:
 *   steps   — array from ChatResponse.reasoningSteps:
 *             [{stepNo, description, sql, rowCount, rowSummary,
 *               evaluatorDecision, evaluatorRationale, executionMs}]
 *             Entries with {type: 'resolution'} are Business Language
 *             Resolutions (PRO-31): {surface, kind, target, tier, source} —
 *             rendered as a "Business language" section above the steps so
 *             users can see exactly how their terms were interpreted.
 *   loading — true while the answer is still streaming in
 */
export default function ReasoningTrace({ steps = [], loading = false }) {
  const [open,        setOpen]        = useState(false);
  const [expandedSql, setExpandedSql] = useState(null);

  if (!loading && steps.length === 0) return null;

  // 'resolution' = deterministic BLR mapping; 'literal' = AI-chosen literal
  // validated against a persisted value domain (PRO-33). Both render in the
  // Business language section with their provenance badge.
  const resolutions = steps.filter(s => s.type === 'resolution' || s.type === 'literal');
  const querySteps  = steps.filter(s => s.type !== 'resolution' && s.type !== 'literal');

  const decisionIcon = (decision) => {
    if (!decision)                                                          return <Circle       size={12} className="text-gray-300" />;
    if (decision === 'SUFFICIENT')                                          return <CheckCircle2 size={12} className="text-emerald-500" />;
    if (decision === 'DEAD_END' || decision === 'LITERAL_REJECTED')         return <AlertCircle  size={12} className="text-amber-500" />;
    if (decision.includes('BLOCK') || decision === 'ERROR')                 return <AlertCircle  size={12} className="text-red-400" />;
    return <Loader2 size={12} className="text-blue-400 animate-spin" />;
  };

  const decisionLabel = (d) => ({
    SUFFICIENT:              'Sufficient',
    NEED_MORE_DATA:          'Needed more data',
    NEED_DIFFERENT_APPROACH: 'Changed approach',
    DEAD_END:                'Dead end',
    BLOCKED:                 'Blocked',
    CONTRACT_BLOCKED:        'Contract blocked',
    LITERAL_REJECTED:        'Invalid value rejected',
    LITERAL_BLOCKED:         'Invalid value blocked',
    ERROR:                   'Error',
  }[d] ?? d ?? '');

  const stepBadge = (d) => {
    if (!d) return '';
    if (d === 'SUFFICIENT')                              return 'bg-emerald-50 text-emerald-700';
    if (d === 'DEAD_END' || d === 'LITERAL_REJECTED')   return 'bg-amber-50 text-amber-700';
    if (d.includes('BLOCK') || d === 'ERROR')           return 'bg-red-50 text-red-600';
    return 'bg-blue-50 text-blue-600';
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11.5px] font-medium text-gray-400 hover:text-gray-600 transition-colors w-full text-left"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {loading
          ? <><Loader2 size={11} className="animate-spin text-blue-400" /> Investigating…</>
          : <>How Zevra investigated this ({querySteps.length} {querySteps.length === 1 ? 'step' : 'steps'}{resolutions.length > 0 ? `, ${resolutions.length} term${resolutions.length !== 1 ? 's' : ''} resolved` : ''})</>
        }
      </button>

      {/* Business language resolutions (PRO-31) — how the user's terms were
          mapped to this tenant's canonical names/values, and from which tier */}
      {open && resolutions.length > 0 && (
        <div className="mt-3 p-2.5 bg-gray-50 border border-gray-100 rounded-lg space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide">
            <Languages size={11} className="text-emerald-600" />
            Business language
          </div>
          {resolutions.map((r, i) => (
            <div key={`res-${i}`} className="flex items-center gap-2 flex-wrap text-[11.5px]">
              <span className="font-semibold text-gray-700">"{r.surface}"</span>
              <span className="text-gray-400">→</span>
              <code className="px-1 py-0.5 bg-white border border-gray-100 rounded text-[10.5px] text-gray-600 font-mono">
                {r.target}
              </code>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700"
                    title={`Resolution kind: ${r.kind}`}>
                {r.source || r.tier}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Step list */}
      {open && (
        <div className="mt-3 space-y-2">
          {querySteps.map((step, i) => (
            <div key={step.stepNo ?? i} className="flex gap-3">
              {/* Step number + connector line */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                  {step.stepNo ?? i + 1}
                </div>
                {i < querySteps.length - 1 && (
                  <div className="w-px flex-1 bg-gray-100 my-1 min-h-[8px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-[12.5px] font-medium text-gray-700 leading-snug">
                    {step.description}
                  </p>
                  {step.evaluatorDecision && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {decisionIcon(step.evaluatorDecision)}
                      <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full ${stepBadge(step.evaluatorDecision)}`}>
                        {decisionLabel(step.evaluatorDecision)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                  {step.rowCount != null && (
                    <span>{step.rowCount.toLocaleString()} row{step.rowCount !== 1 ? 's' : ''}</span>
                  )}
                  {step.executionMs != null && step.executionMs > 0 && (
                    <span>{step.executionMs.toLocaleString()}ms</span>
                  )}
                </div>

                {/* Evaluator rationale */}
                {step.evaluatorRationale && (
                  <p className="mt-1 text-[11.5px] text-gray-400 italic leading-snug">
                    {step.evaluatorRationale}
                  </p>
                )}

                {/* SQL toggle */}
                {step.sql && (
                  <>
                    <button
                      onClick={() => setExpandedSql(expandedSql === i ? null : i)}
                      className="mt-1.5 text-[11px] text-gray-400 hover:text-emerald-600 transition-colors flex items-center gap-1"
                    >
                      {expandedSql === i ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      {expandedSql === i ? 'Hide SQL' : 'Show SQL'}
                    </button>
                    {expandedSql === i && (
                      <pre className="mt-1.5 p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-[11px] text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                        {step.sql}
                      </pre>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Loading skeleton for in-progress step */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Loader2 size={10} className="text-blue-400 animate-spin" />
              </div>
              <div className="flex-1 pt-0.5 space-y-1.5">
                <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-24 bg-gray-50 rounded animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
