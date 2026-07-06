import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Spinner } from '../components/Card.jsx';
import { Package, CheckCircle2, AlertCircle, ChevronRight, X, Database, BookOpen, Bot, Zap } from 'lucide-react';

// ── System icon pill ─────────────────────────────────────────────────────────
function SystemIcon({ icon, color }) {
  return (
    <div className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center text-[15px]
                    font-bold text-white shrink-0"
         style={{ background: color }}>
      {icon}
    </div>
  );
}

const SYSTEM_COLORS = {
  SN:   '#293E40',
  SF:   '#00A1E0',
  SAP:  '#0070F2',
  JIRA: '#0052CC',
  HS:   '#FF7A59',
};

// ── Template card ─────────────────────────────────────────────────────────────
function TemplateCard({ template, isApplied, onUse }) {
  const color    = SYSTEM_COLORS[template.icon] ?? '#374151';
  const entities = (template.entities ?? []).length;
  const vocab    = (template.vocabulary ?? []).length;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70 p-5
                    flex flex-col gap-4 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]
                    hover:-translate-y-[1px] transition-all">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SystemIcon icon={template.icon ?? '?'} color={color} />
          <div>
            <div className="text-[14px] font-semibold text-[#111827]">{template.displayName}</div>
            <div className="text-[11.5px] text-[#9CA3AF] mt-[1px]">{template.tagline}</div>
          </div>
        </div>
        {isApplied && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                           text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D] shrink-0">
            <CheckCircle2 size={10} /> Applied
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[12.5px] text-[#6B7280] leading-[1.55] line-clamp-3">
        {template.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#F9FAFB] rounded-lg">
          <Database size={11} className="text-[#9CA3AF]" />
          <span className="text-[11.5px] text-[#374151]">{entities} entities</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#F9FAFB] rounded-lg">
          <BookOpen size={11} className="text-[#9CA3AF]" />
          <span className="text-[11.5px] text-[#374151]">{vocab} terms</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#F9FAFB] rounded-lg">
          <Bot size={11} className="text-[#9CA3AF]" />
          <span className="text-[11.5px] text-[#374151]">Agent</span>
        </div>
      </div>

      {/* Sample questions */}
      {(template.whatYouCanAsk ?? []).slice(0, 2).map((q, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-[#F0FDF4] rounded-lg">
          <Zap size={11} className="text-[#16A34A] mt-[2px] shrink-0" />
          <span className="text-[11.5px] text-[#15803D] italic">"{q}"</span>
        </div>
      ))}

      {/* Action */}
      <button
        onClick={() => onUse(template)}
        disabled={isApplied}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[8px]
                    text-[12.5px] font-medium transition-colors
                    ${isApplied
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#111827] text-white hover:bg-[#1F2937]'}`}>
        {isApplied ? 'Already applied' : 'Use template'}
        {!isApplied && <ChevronRight size={13} />}
      </button>
    </div>
  );
}

// ── Apply wizard modal ────────────────────────────────────────────────────────
function ApplyModal({ template, onClose, onApplied }) {
  const [step, setStep]             = useState(1); // 1=pick conn  2=validate  3=confirm
  const [connections, setConns]     = useState([]);
  const [selectedConn, setConn]     = useState('');
  const [coverage, setCoverage]     = useState(null);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying]     = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    api.connections.list().then(r => {
      const list = Array.isArray(r) ? r : (r?.connections ?? []);
      setConns(list);
      if (list.length === 1) setConn(list[0].connection_key ?? list[0].key ?? '');
    }).catch(() => {});
  }, []);

  const validate = async () => {
    if (!selectedConn) { setError('Please select a connection.'); return; }
    setError('');
    setValidating(true);
    try {
      const result = await api.integrationTemplates.validate(template.packId, selectedConn);
      setCoverage(result);
      setStep(2);
    } catch (e) {
      setError(e?.message ?? 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    setError('');
    try {
      await api.integrationTemplates.apply(template.packId, {
        connection_key: selectedConn,
        domain_key: template.packId.replace(/-v\d+$/, '').replace(/-/g, '_'),
      });
      onApplied();
    } catch (e) {
      setError(e?.message ?? 'Apply failed');
      setApplying(false);
    }
  };

  const color = SYSTEM_COLORS[template.icon] ?? '#374151';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <SystemIcon icon={template.icon} color={color} />
            <div>
              <div className="text-[14px] font-semibold text-[#111827]">{template.displayName}</div>
              <div className="text-[12px] text-[#9CA3AF]">Integration template</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-[#6B7280]" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-50">
          {['Select connection', 'Validate tables', 'Apply'].map((label, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 text-[11.5px] font-medium
                              ${step >= i + 1 ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                                ${step > i + 1 ? 'bg-[#16A34A] text-white'
                                  : step === i + 1 ? 'bg-[#111827] text-white'
                                  : 'bg-gray-100 text-[#9CA3AF]'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                {label}
              </div>
              {i < 2 && <ChevronRight size={12} className="text-gray-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-5 flex flex-col gap-4 min-h-[200px]">

          {/* Step 1: pick connection */}
          {step === 1 && (
            <>
              <p className="text-[13px] text-[#374151]">
                Which database connection holds your {template.system} data?
              </p>
              <div className="flex flex-col gap-2">
                {connections.length === 0 && (
                  <p className="text-[12.5px] text-[#9CA3AF]">Loading connections…</p>
                )}
                {connections.map(c => {
                  const key = c.connection_key ?? c.key ?? c.connectionKey ?? '';
                  const name = c.name ?? c.display_name ?? key;
                  return (
                    <label key={key}
                           className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border cursor-pointer
                                       transition-colors ${selectedConn === key
                                         ? 'border-[#111827] bg-gray-50'
                                         : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="conn" value={key}
                             checked={selectedConn === key}
                             onChange={() => { setConn(key); setError(''); }}
                             className="accent-[#111827]" />
                      <div>
                        <div className="text-[13px] font-medium text-[#111827]">{name}</div>
                        {key !== name && <div className="text-[11.5px] text-[#9CA3AF]">{key}</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11.5px] text-[#6B7280]">
                Works with both a direct ServiceNow JDBC connection and a data warehouse mirror (Snowflake, BigQuery, etc.)
              </p>
            </>
          )}

          {/* Step 2: coverage results */}
          {step === 2 && coverage && (
            <>
              <div className="flex items-center gap-2">
                <div className={`text-[13px] font-semibold ${coverage.coveragePct >= 60 ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
                  {Math.round(coverage.coveragePct)}% table coverage
                </div>
                <span className="text-[12px] text-[#9CA3AF]">
                  ({coverage.matchedCount}/{coverage.totalCount} entities found)
                </span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
                {(coverage.entities ?? []).map(e => (
                  <div key={e.entityName}
                       className={`flex items-center justify-between px-3 py-2 rounded-lg
                                   ${e.found ? 'bg-[#F0FDF4]' : 'bg-[#FFF7ED]'}`}>
                    <span className="text-[12.5px] font-medium text-[#111827]">{e.entityName}</span>
                    {e.found
                      ? <span className="flex items-center gap-1 text-[11.5px] text-[#16A34A]">
                          <CheckCircle2 size={12} /> {e.matchedTable}
                        </span>
                      : <span className="flex items-center gap-1 text-[11.5px] text-[#D97706]">
                          <AlertCircle size={12} /> table not found
                        </span>
                    }
                  </div>
                ))}
              </div>
              {coverage.coveragePct < 40 && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle size={14} className="text-amber-600 mt-[1px] shrink-0" />
                  <p className="text-[12px] text-amber-800">
                    Low table coverage. Make sure your connection points to the correct schema.
                    The template will still apply — missing entities will be created without a table mapping.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Step 3: confirm */}
          {step === 3 && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-[#374151]">
                Applying <strong>{template.displayName}</strong> will create:
              </p>
              <ul className="flex flex-col gap-2">
                {[
                  `${(template.entities ?? []).length} business entities in the Knowledge Graph`,
                  `${(template.vocabulary ?? []).length} vocabulary terms in the Semantic Layer`,
                  'A pre-built IT Operations Agent connected to your data',
                  'Morning brief configuration for SLA and incident metrics',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-[#374151]">
                    <CheckCircle2 size={13} className="text-[#16A34A] shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-[11.5px] text-[#6B7280] mt-1">
                This will not overwrite existing vocabulary terms or entities with the same name.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <span className="text-[12px] text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
                  className="px-4 py-2 text-[13px] text-[#6B7280] hover:text-[#111827]
                             hover:bg-gray-100 rounded-[8px] transition-colors">
            Cancel
          </button>

          {step === 1 && (
            <button onClick={validate} disabled={!selectedConn || validating}
                    className="px-5 py-2 bg-[#111827] text-white text-[13px] font-medium
                               rounded-[8px] hover:bg-[#1F2937] disabled:opacity-50
                               disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              {validating && <Spinner size={14} />}
              {validating ? 'Checking…' : 'Check tables'}
            </button>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)}
                      className="px-4 py-2 text-[13px] text-[#374151] hover:bg-gray-100
                                 rounded-[8px] transition-colors">
                Back
              </button>
              <button onClick={() => setStep(3)}
                      className="px-5 py-2 bg-[#111827] text-white text-[13px] font-medium
                                 rounded-[8px] hover:bg-[#1F2937] transition-colors">
                Continue
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button onClick={() => setStep(2)}
                      className="px-4 py-2 text-[13px] text-[#374151] hover:bg-gray-100
                                 rounded-[8px] transition-colors">
                Back
              </button>
              <button onClick={apply} disabled={applying}
                      className="px-5 py-2 bg-[#111827] text-white text-[13px] font-medium
                                 rounded-[8px] hover:bg-[#1F2937] disabled:opacity-50
                                 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {applying && <Spinner size={14} />}
                {applying ? 'Applying…' : 'Apply template'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Templates() {
  const [templates, setTemplates]   = useState([]);
  const [applied, setApplied]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [success, setSuccess]       = useState('');

  const load = async () => {
    const [tpls, app] = await Promise.allSettled([
      api.integrationTemplates.list(),
      api.integrationTemplates.applied(),
    ]);
    setTemplates(tpls.status === 'fulfilled' ? (tpls.value ?? []) : []);
    setApplied(app.status === 'fulfilled' ? (app.value ?? []) : []);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const appliedKeys = new Set(applied.map(a => a.pack_key ?? a.packKey ?? ''));

  const handleApplied = () => {
    setSelected(null);
    setSuccess('Template applied successfully. Check Agents and Semantic Layer.');
    load();
    setTimeout(() => setSuccess(''), 5000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Page header */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-1">
            <Package size={18} className="text-[#374151]" />
            <h1 className="text-[18px] font-semibold text-[#111827]">Integration Templates</h1>
          </div>
          <p className="text-[13px] text-[#6B7280]">
            Pre-built intelligence packs for enterprise systems. Connect a system and get working
            agents, vocabulary, and insights in minutes.
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-[#F0FDF4]
                          border border-[#BBF7D0] rounded-[10px]">
            <CheckCircle2 size={15} className="text-[#16A34A] shrink-0" />
            <span className="text-[13px] text-[#15803D]">{success}</span>
          </div>
        )}

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={36} className="text-gray-300 mb-3" strokeWidth={1.2} />
            <p className="text-[14px] text-[#374151] font-medium mb-1">No templates available</p>
            <p className="text-[12.5px] text-[#9CA3AF]">
              Integration templates appear here when the server loads pack definitions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {templates.map(t => (
              <TemplateCard
                key={t.packId}
                template={t}
                isApplied={appliedKeys.has(t.packId)}
                onUse={setSelected}
              />
            ))}
          </div>
        )}

        {/* Applied section */}
        {applied.length > 0 && (
          <div className="mt-10">
            <h2 className="text-[14px] font-semibold text-[#111827] mb-3">Applied templates</h2>
            <div className="flex flex-col gap-2">
              {applied.map(a => (
                <div key={a.pack_key}
                     className="flex items-center justify-between px-4 py-3
                                bg-white/80 border border-gray-200 rounded-[10px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#16A34A]" />
                    <span className="text-[13px] font-medium text-[#111827]">
                      {a.display_name ?? a.pack_key}
                    </span>
                  </div>
                  <span className="text-[11.5px] text-[#9CA3AF]">
                    Applied by {a.applied_by ?? 'system'}
                    {a.applied_at ? ` · ${new Date(a.applied_at).toLocaleDateString()}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <ApplyModal
          template={selected}
          onClose={() => setSelected(null)}
          onApplied={handleApplied}
        />
      )}
    </div>
  );
}
