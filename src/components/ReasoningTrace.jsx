import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Technical Investigation — the engineering-detail view of a QUERY_LIVE_DATA answer.
 * Collapsed by default; the executive-facing summary is BusinessUnderstanding.jsx, which
 * renders directly above this component from the same `steps` array. Business language
 * resolutions render there, not here, so the two components never duplicate each other.
 *
 * Props:
 *   steps   — array from ChatResponse.reasoningSteps:
 *             [{stepNo, description, sql, rowCount, rowSummary,
 *               evaluatorDecision, evaluatorRationale, executionMs}]
 *             Entries with {type: 'resolution'|'literal'} are Business Language
 *             Resolutions (PRO-31/PRO-33) — excluded here, shown by BusinessUnderstanding.
 *   loading — true while the answer is still streaming in
 */
export default function ReasoningTrace({ steps = [], loading = false }) {
  const [open,        setOpen]        = useState(false);
  const [expandedSql, setExpandedSql] = useState(null);

  const querySteps = steps.filter(s => s.type !== 'resolution' && s.type !== 'literal');

  if (!loading && querySteps.length === 0) return null;

  const decisionIcon = (decision) => {
    if (!decision)                                                          return <Circle       size={12} style={{ color: 'var(--z-border-strong)' }} />;
    if (decision === 'SUFFICIENT')                                          return <CheckCircle2 size={12} style={{ color: 'var(--z-primary)' }} />;
    if (decision === 'DEAD_END' || decision === 'LITERAL_REJECTED')         return <AlertCircle  size={12} style={{ color: 'var(--z-warning)' }} />;
    if (decision.includes('BLOCK') || decision === 'ERROR')                 return <AlertCircle  size={12} style={{ color: 'var(--z-critical)' }} />;
    return <Loader2 size={12} className="animate-spin" style={{ color: 'var(--z-investigating)' }} />;
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

  const stepBadgeStyle = (d) => {
    if (!d) return {};
    if (d === 'SUFFICIENT')                            return { background: 'var(--z-primary-soft)', color: 'var(--z-primary)' };
    if (d === 'DEAD_END' || d === 'LITERAL_REJECTED')  return { background: 'var(--z-warning-soft)', color: 'var(--z-warning-on)' };
    if (d.includes('BLOCK') || d === 'ERROR')          return { background: 'var(--z-critical-soft)', color: 'var(--z-critical-on)' };
    return { background: 'var(--z-investigating-soft)', color: 'var(--z-investigating-on)' };
  };

  return (
    <div className="mt-2 pt-2 border-t border-z-border">
      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11.5px] font-medium text-z-text-3 hover:text-z-text-2 transition-colors w-full text-left"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {loading
          ? <><Loader2 size={11} className="animate-spin" style={{ color: 'var(--z-investigating)' }} /> Investigating…</>
          : <>Technical Investigation ({querySteps.length} {querySteps.length === 1 ? 'step' : 'steps'})</>
        }
      </button>

      {/* Step list */}
      {open && (
        <div className="mt-3 space-y-2">
          {querySteps.map((step, i) => (
            <div key={step.stepNo ?? i} className="flex gap-3">
              {/* Step number + connector line */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: 'var(--z-card-2)', color: 'var(--z-text-2)' }}>
                  {step.stepNo ?? i + 1}
                </div>
                {i < querySteps.length - 1 && (
                  <div className="w-px flex-1 my-1 min-h-[8px]" style={{ background: 'var(--z-border)' }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-[12.5px] font-medium leading-snug text-z-text">
                    {step.description}
                  </p>
                  {step.evaluatorDecision && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {decisionIcon(step.evaluatorDecision)}
                      <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={stepBadgeStyle(step.evaluatorDecision)}>
                        {decisionLabel(step.evaluatorDecision)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-z-text-3">
                  {step.rowCount != null && (
                    <span>{step.rowCount.toLocaleString()} row{step.rowCount !== 1 ? 's' : ''}</span>
                  )}
                  {step.executionMs != null && step.executionMs > 0 && (
                    <span>{step.executionMs.toLocaleString()}ms</span>
                  )}
                </div>

                {/* Evaluator rationale */}
                {step.evaluatorRationale && (
                  <p className="mt-1 text-[11.5px] italic leading-snug text-z-text-3">
                    {step.evaluatorRationale}
                  </p>
                )}

                {/* SQL toggle */}
                {step.sql && (
                  <>
                    <button
                      onClick={() => setExpandedSql(expandedSql === i ? null : i)}
                      className="mt-1.5 text-[11px] text-z-text-3 transition-colors flex items-center gap-1"
                      style={{ color: undefined }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--z-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                    >
                      {expandedSql === i ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      {expandedSql === i ? 'Hide SQL' : 'Show SQL'}
                    </button>
                    {expandedSql === i && (
                      <pre className="mt-1.5 p-2.5 border rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed"
                        style={{ background: 'var(--z-card-2)', borderColor: 'var(--z-border)', color: 'var(--z-text-2)' }}>
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
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--z-investigating-soft)' }}>
                <Loader2 size={10} className="animate-spin" style={{ color: 'var(--z-investigating)' }} />
              </div>
              <div className="flex-1 pt-0.5 space-y-1.5">
                <div className="h-3 w-40 rounded animate-pulse" style={{ background: 'var(--z-border)' }} />
                <div className="h-2 w-24 rounded animate-pulse" style={{ background: 'var(--z-card-2)' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
