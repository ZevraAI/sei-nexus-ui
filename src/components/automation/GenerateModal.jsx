import React, { useState } from 'react';
import { api } from '../../api.js';
import { navigate } from '../../App.jsx';
import {
  Sparkles, X, ArrowLeft, Loader2, Database, Check,
} from 'lucide-react';

/**
 * Multi-step AI workflow generation modal.
 *
 * Props:
 *   isDark            - theme flag
 *   onClose()         - called when the modal is dismissed
 *   workflowId        - if set, regenerates the graph of an existing workflow
 *                       instead of creating a new one
 *   initialRequirement- pre-fills the text area (used when re-editing)
 *   onSuccess(w)      - called with the saved AutomationWorkflow on completion.
 *                       If omitted, defaults to navigating to the editor.
 */
export default function GenerateModal({
  isDark,
  onClose,
  workflowId,
  initialRequirement = '',
  onSuccess,
}) {
  const isRegen = !!workflowId;

  const [step, setStep]             = useState(1);
  const [requirement, setReq]       = useState(initialRequirement);
  const [analysis, setAnalysis]     = useState(null);
  const [selectedConns, setConns]   = useState([]);
  const [selectedTables, setTables] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const overlay = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  const modal   = isDark
    ? 'bg-[#1A1F2B] border border-[#252E3F] text-[#E2E8F0] w-full max-w-xl rounded-2xl shadow-2xl'
    : 'bg-white border border-gray-200 text-gray-900 w-full max-w-xl rounded-2xl shadow-2xl';
  const input   = isDark
    ? 'w-full bg-[#0F1117] border border-[#252E3F] text-[#E2E8F0] placeholder-[#4B5563] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none'
    : 'w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 resize-none';
  const sub     = isDark ? 'text-[#64748B]' : 'text-gray-500';
  const card    = isDark ? 'bg-[#0F1117] border-[#252E3F]' : 'bg-gray-50 border-gray-200';

  const analyze = async () => {
    if (!requirement.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.automations.analyze({ requirement });
      setAnalysis(result);
      setConns(result.suggestedConnections ?? []);
      setTables(result.suggestedTables ?? []);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    setStep(3);
    setLoading(true);
    setError(null);
    try {
      const w = await api.automations.generate({
        requirement,
        summary: analysis?.summary ?? requirement,
        selectedConnections: selectedConns,
        selectedTables,
        workflowId: workflowId ?? null,
      });
      onClose();
      if (onSuccess) {
        onSuccess(w);
      } else {
        navigate(`/automations/${w.id}/edit`);
      }
    } catch (e) {
      setError(e.message || 'Generation failed');
      setLoading(false);
      setStep(2);
    }
  };

  const toggleItem = (list, setList, value) =>
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  return (
    <div className={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={modal}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200/10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-500" />
            <span className="text-[15px] font-bold">
              {isRegen ? 'Regenerate Workflow with AI' : 'Generate Workflow with AI'}
            </span>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-[#252E3F]' : 'hover:bg-gray-100'}`}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200/10">
          {['Describe', 'Review', isRegen ? 'Rebuild' : 'Generate'].map((label, i) => {
            const active = step === i + 1;
            const done   = step > i + 1;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                    ${done || active ? 'bg-emerald-500 text-white' : isDark ? 'bg-[#252E3F] text-[#4B5563]' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? <Check size={10} /> : i + 1}
                  </div>
                  <span className={`text-[11px] font-medium ${active ? (isDark ? 'text-[#E2E8F0]' : 'text-gray-900') : sub}`}>{label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px ${isDark ? 'bg-[#252E3F]' : 'bg-gray-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">

          {/* Step 1 — Describe */}
          {step === 1 && (
            <>
              {isRegen && (
                <div className={`rounded-xl border p-3 text-[12px] ${isDark ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  This will replace the current workflow graph. Your name, slug, and status are kept.
                </div>
              )}
              <div>
                <p className={`text-[12px] font-semibold mb-1 ${isDark ? 'text-[#E2E8F0]' : 'text-gray-700'}`}>
                  {isRegen ? 'Describe the corrected workflow' : 'Describe what you want this workflow to do'}
                </p>
                <p className={`text-[11px] mb-3 ${sub}`}>
                  Be specific — mention the trigger, what data to query, any conditions, and what the output should look like.
                </p>
                <textarea
                  className={`${input} h-36`}
                  placeholder="e.g. When a webhook fires with an order_id, look up the order in the database, use AI to determine if it needs expedited shipping, then return the recommendation."
                  value={requirement}
                  onChange={e => setReq(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-[12px]">{error}</p>}
            </>
          )}

          {/* Step 2 — Review */}
          {step === 2 && analysis && (
            <>
              <div className={`rounded-xl border p-3 ${card}`}>
                <p className={`text-[11px] font-semibold mb-1 ${sub}`}>AI Summary</p>
                <p className="text-[13px]">{analysis.summary}</p>
              </div>

              {analysis.proposedSteps?.length > 0 && (
                <div>
                  <p className={`text-[11px] font-semibold mb-2 ${sub}`}>Proposed workflow steps</p>
                  <ol className="space-y-1">
                    {analysis.proposedSteps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 text-[11px] font-bold shrink-0 mt-0.5">{i + 1}.</span>
                        <span className="text-[12px]">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {analysis.suggestedConnections?.length > 0 && (
                <div>
                  <p className={`text-[11px] font-semibold mb-2 ${sub}`}>Connections <span className="font-normal">(tap to toggle)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedConnections.map(conn => (
                      <button
                        key={conn}
                        onClick={() => toggleItem(selectedConns, setConns, conn)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-medium transition-colors
                          ${selectedConns.includes(conn)
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600'
                            : isDark ? 'border-[#252E3F] text-[#64748B] hover:border-[#374151]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        <Database size={11} />
                        {conn}
                        {selectedConns.includes(conn) && <Check size={10} className="text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {analysis.suggestedTables?.length > 0 && (
                <div>
                  <p className={`text-[11px] font-semibold mb-2 ${sub}`}>Tables <span className="font-normal">(tap to toggle)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedTables.map(tbl => (
                      <button
                        key={tbl}
                        onClick={() => toggleItem(selectedTables, setTables, tbl)}
                        className={`px-2.5 py-1 rounded-lg border text-[12px] font-mono transition-colors
                          ${selectedTables.includes(tbl)
                            ? 'bg-blue-500/10 border-blue-500 text-blue-600'
                            : isDark ? 'border-[#252E3F] text-[#64748B] hover:border-[#374151]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        {tbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {analysis.clarifications?.length > 0 && (
                <div className={`rounded-xl border p-3 ${isDark ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
                  <p className="text-[11px] font-semibold text-amber-600 mb-1">Things to clarify (you can adjust after generation)</p>
                  <ul className="space-y-0.5">
                    {analysis.clarifications.map((q, i) => (
                      <li key={i} className="text-[12px] text-amber-700">• {q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {error && <p className="text-red-500 text-[12px]">{error}</p>}
            </>
          )}

          {/* Step 3 — Generating */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={32} className="animate-spin text-emerald-500" />
              <p className="text-[13px] font-semibold">
                {isRegen ? 'Rebuilding your workflow…' : 'Building your workflow…'}
              </p>
              <p className={`text-[12px] ${sub}`}>GPT-4o is designing the nodes and connections</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="flex items-center justify-between px-5 pb-5 pt-2 gap-3">
            <button
              onClick={step === 1 ? onClose : () => setStep(1)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors
                ${isDark ? 'text-[#64748B] hover:bg-[#252E3F] hover:text-[#E2E8F0]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              {step === 2 && <ArrowLeft size={13} />}
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step === 1 && (
              <button
                onClick={analyze}
                disabled={loading || !requirement.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-xl transition-colors"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {loading ? 'Analysing…' : 'Analyse with AI'}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-xl transition-colors"
              >
                <Sparkles size={13} />
                {isRegen ? 'Rebuild Workflow' : 'Generate Workflow'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
