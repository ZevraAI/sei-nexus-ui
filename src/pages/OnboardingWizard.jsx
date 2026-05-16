import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import {
  Database, Check, ChevronRight, Sparkles, ArrowRight,
  AlertCircle, Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Pencil,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function safeArray(v) { return Array.isArray(v) ? v : []; }

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80);
}

// ── Step progress bar ────────────────────────────────────────────────────────

const STEP_LABELS = ['Welcome', 'Connect', 'Tables', 'Analysing', 'Review', 'Done'];

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEP_LABELS.map((label, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done    ? 'bg-emerald-600 text-white' :
                current ? 'bg-[#0d2e24] border-2 border-emerald-500 text-emerald-400' :
                          'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${
                current ? 'text-[#0d2e24]' : done ? 'text-emerald-600' : 'text-gray-400'
              }`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 ${
                i < step ? 'bg-emerald-500' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Field components ──────────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full h-10 border border-gray-200 rounded-lg px-3.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-300"
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full h-10 border border-gray-200 rounded-lg px-3.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 bg-white"
    >
      {children}
    </select>
  );
}

// ── Step 1 — Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ user, onNext }) {
  const name = user?.display_name?.split(' ')[0] || 'there';
  return (
    <div className="text-center max-w-md mx-auto">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mb-6">
        <Sparkles size={28} className="text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Welcome to Zevra, {name} 👋
      </h2>
      <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
        Let's set up your workspace in a few steps. Connect your database,
        pick your tables, and Zevra will learn your data — then you can ask
        questions in plain English and get answers from your live data.
      </p>
      <p className="text-[13px] text-gray-400 mb-8">
        Takes about <span className="font-semibold text-gray-600">5 minutes</span>.
      </p>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Get started <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ── Step 2 — Connect database ─────────────────────────────────────────────────

const CONN_TYPES = ['POSTGRES', 'ORACLE', 'REST_API'];
const JDBC_HINT  = {
  POSTGRES: 'jdbc:postgresql://host:5432/dbname',
  ORACLE:   'jdbc:oracle:thin:@host:1521:ORCL',
  REST_API: 'https://api.example.com/v1',
};

function StepConnect({ onNext }) {
  const [form, setForm]       = useState({ name: '', connectionType: 'POSTGRES', jdbcUrl: '', username: '', secret: '' });
  const [testing, setTesting] = useState(false);
  const [tested, setTested]   = useState(null); // null | 'ok' | 'fail'
  const [testMsg, setTestMsg] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setTested(null); };

  const testConnection = async () => {
    if (!form.jdbcUrl || !form.name) return;
    setTesting(true); setTested(null); setTestMsg('');
    try {
      // Create connection first, then test it
      const created = await api.connections.create({
        name: form.name, connectionType: form.connectionType,
        jdbcUrl: form.jdbcUrl, username: form.username, secret: form.secret,
      });
      const connKey = created.connection_key;
      const result  = await api.connections.test(connKey);
      if (result?.success === false || result?.status === 'FAILED') {
        setTested('fail');
        setTestMsg(result?.message || 'Connection test failed');
        await api.connections.delete(connKey).catch(() => {});
      } else {
        setTested('ok');
        setTestMsg(result?.message || 'Connection successful');
        onNext({ connectionKey: connKey, schemaName: 'public' });
      }
    } catch (e) {
      setTested('fail');
      setTestMsg(e.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Connect your database</h2>
      <p className="text-[14px] text-gray-500 mb-7">
        Zevra connects directly to your database to read live data. Your credentials
        are stored encrypted and never returned to the UI.
      </p>

      <div className="space-y-4">
        <Field label="Display name" hint="A friendly name for this connection, e.g. Production DB">
          <Input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="My Database" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={form.connectionType} onChange={e => set('connectionType', e.target.value)}>
              {CONN_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Schema" hint="Default: public">
            <Input value={form.schemaName || 'public'} onChange={e => set('schemaName', e.target.value)}
              placeholder="public" />
          </Field>
        </div>

        <Field label={form.connectionType === 'REST_API' ? 'Base URL' : 'JDBC URL'}
               hint={JDBC_HINT[form.connectionType]}>
          <Input value={form.jdbcUrl} onChange={e => set('jdbcUrl', e.target.value)}
            placeholder={JDBC_HINT[form.connectionType]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Username">
            <Input value={form.username} onChange={e => set('username', e.target.value)}
              placeholder="db_user" />
          </Field>
          <Field label="Password">
            <Input type="password" value={form.secret} onChange={e => set('secret', e.target.value)}
              placeholder="••••••••" />
          </Field>
        </div>

        {tested === 'ok' && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm">
            <CheckCircle2 size={16} /> {testMsg}
          </div>
        )}
        {tested === 'fail' && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm">
            <XCircle size={16} /> {testMsg}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={testConnection}
          disabled={testing || !form.name || !form.jdbcUrl}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {testing ? (
            <><RefreshCw size={15} className="animate-spin" /> Testing connection…</>
          ) : (
            <><Database size={15} /> Test &amp; Connect</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 3 — Select tables ────────────────────────────────────────────────────

function StepSelectTables({ connectionKey, schemaName, onNext, onBack }) {
  const [tables, setTables]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    api.onboarding.scan({ connectionKey, schemaName })
      .then(r => {
        const t = safeArray(r.tables);
        setTables(t);
        setSelected(new Set(t.map(x => x.table_name)));
      })
      .catch(e => setError(e.message || 'Could not load tables'))
      .finally(() => setLoading(false));
  }, [connectionKey, schemaName]);

  const filtered = tables.filter(t =>
    !search || t.table_name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (name) => setSelected(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(t => t.table_name)));

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Select tables to import</h2>
      <p className="text-[14px] text-gray-500 mb-6">
        Choose the tables Zevra should learn about. You can always add more later.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
          <RefreshCw size={16} className="animate-spin" /> Scanning database…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {!loading && tables.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter tables…"
                className="w-full h-9 border border-gray-200 rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <button onClick={toggleAll}
              className="text-xs text-emerald-600 hover:underline whitespace-nowrap">
              {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto mb-6">
            {filtered.map(t => (
              <label key={t.table_name}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                <input type="checkbox" checked={selected.has(t.table_name)}
                  onChange={() => toggle(t.table_name)}
                  className="accent-emerald-600 w-4 h-4" />
                <span className="text-sm font-mono text-gray-700 flex-1">{t.table_name}</span>
                <span className="text-xs text-gray-400">{t.column_count} cols</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600">
              ← Back
            </button>
            <button
              onClick={() => onNext(Array.from(selected))}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-2 h-10 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Analyse {selected.size} table{selected.size !== 1 ? 's' : ''} with AI
              <Sparkles size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 4 — Analysing (auto-advance) ────────────────────────────────────────

function StepAnalysing({ connectionKey, schemaName, domainKey, tableNames, onNext, onError }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let timer = setInterval(() => {
      setCurrent(c => Math.min(c + 1, tableNames.length - 1));
    }, 1800);

    api.onboarding.analyze({ connectionKey, schemaName, domainKey, tableNames })
      .then(r => { clearInterval(timer); onNext(safeArray(r.tables)); })
      .catch(e => { clearInterval(timer); onError(e.message); });

    return () => clearInterval(timer);
  }, []);

  const pct = Math.round(((current + 1) / tableNames.length) * 100);

  return (
    <div className="max-w-sm mx-auto text-center">
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
        <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
        <Sparkles size={22} className="absolute text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Zevra is reading your schema</h2>
      <p className="text-[14px] text-gray-500 mb-6">
        Analysing {tableNames.length} table{tableNames.length !== 1 ? 's' : ''} —
        generating entity definitions, vocabulary, and suggested questions…
      </p>

      <div className="text-xs font-mono text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2 mb-5 inline-block">
        {tableNames[current]}
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
          style={{ width: pct + '%' }} />
      </div>
      <p className="text-xs text-gray-400 mt-2">{pct}% complete</p>
    </div>
  );
}

// ── Step 5 — Review & approve ────────────────────────────────────────────────

function EntityCard({ suggestion, approved, onToggle, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [entityName, setEntityName] = useState(suggestion.entityName || '');
  const [purpose, setPurpose]       = useState(suggestion.purpose || '');

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      approved ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 opacity-50'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        <input type="checkbox" checked={approved} onChange={onToggle}
          className="accent-emerald-600 w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{entityName || suggestion.entityName}</span>
            <span className="text-xs text-gray-400 font-mono">{suggestion.table_name}</span>
            {suggestion.readinessScore != null && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                suggestion.readinessScore >= 0.8 ? 'bg-green-100 text-green-700' :
                suggestion.readinessScore >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'}`}>
                {Math.round(suggestion.readinessScore * 100)}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{purpose || suggestion.purpose}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {expanded && approved && (
        <div className="px-4 py-4 space-y-3 border-t border-gray-100">
          {suggestion.error ? (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={13} /> {suggestion.error}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Entity name
                  </label>
                  <input value={entityName} onChange={e => {
                    setEntityName(e.target.value);
                    onEdit({ entityName: e.target.value });
                  }} className="w-full h-8 border border-gray-200 rounded-lg px-3 text-xs focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Entity key (ID)
                  </label>
                  <input value={slugify(entityName)} readOnly
                    className="w-full h-8 border border-gray-100 rounded-lg px-3 text-xs font-mono bg-gray-50 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Purpose
                </label>
                <textarea value={purpose} rows={2}
                  onChange={e => { setPurpose(e.target.value); onEdit({ purpose: e.target.value }); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-emerald-500" />
              </div>

              {safeArray(suggestion.vocabularySuggestions).length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Vocabulary ({safeArray(suggestion.vocabularySuggestions).length} terms)
                  </p>
                  <div className="space-y-1.5">
                    {safeArray(suggestion.vocabularySuggestions).map((v, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs bg-white border border-gray-100 rounded-lg px-3 py-2">
                        <span className="font-semibold text-gray-700 shrink-0">{v.term}</span>
                        <span className="text-gray-500">— {v.definition}</span>
                        {v.sqlEquivalent && (
                          <code className="ml-auto text-emerald-600 font-mono shrink-0">{v.sqlEquivalent}</code>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {safeArray(suggestion.suggestedQuestions).length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Suggested questions
                  </p>
                  {safeArray(suggestion.suggestedQuestions).map((q, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5 mb-1">
                      <span className="text-emerald-500 mt-0.5">→</span> {q}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StepReview({ suggestions, connectionKey, schemaName, domainKey, onNext, onBack }) {
  const [entities, setEntities] = useState(() =>
    suggestions.map(s => ({
      ...s,
      approved:   !s.error,
      entityKey:  slugify(s.entityName || s.table_name),
      entityName: s.entityName || s.table_name,
      purpose:    s.purpose || '',
      vocabulary: safeArray(s.vocabularySuggestions).map(v => ({ ...v, approved: true })),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const toggle   = (i) => setEntities(es => es.map((e, j) => j === i ? { ...e, approved: !e.approved } : e));
  const edit     = (i, patch) => setEntities(es => es.map((e, j) => j === i ? { ...e, ...patch } : e));
  const approved = entities.filter(e => e.approved).length;

  const handleImport = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        connectionKey, schemaName, domainKey,
        entities: entities.map(e => ({
          approved:             e.approved,
          tableName:            e.table_name,
          entityKey:            slugify(e.entityName),
          entityName:           e.entityName,
          purpose:              e.purpose,
          operationalMeaning:   e.operationalMeaning || '',
          investigationHints:   e.investigationHints || '',
          suggestedQuestions:   safeArray(e.suggestedQuestions),
          vocabulary:           safeArray(e.vocabulary),
        })),
      };
      const result = await api.onboarding.apply(payload);
      const done   = await api.onboarding.complete();
      onNext(safeArray(done.suggested_questions || result.suggested_questions));
    } catch (e) {
      setError(e.message || 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-gray-900">Review AI suggestions</h2>
        <span className="text-sm text-gray-400">{approved} of {entities.length} selected</span>
      </div>
      <p className="text-[14px] text-gray-500 mb-6">
        Zevra has analysed your schema. Edit any names or descriptions, then import.
        You can always change these later in the Semantic Layer.
      </p>

      <div className="space-y-3 mb-6">
        {entities.map((e, i) => (
          <EntityCard key={e.table_name} suggestion={e} approved={e.approved}
            onToggle={() => toggle(i)}
            onEdit={(patch) => edit(i, patch)} />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600">
          ← Back
        </button>
        <button
          onClick={handleImport}
          disabled={saving || approved === 0}
          className="inline-flex items-center gap-2 h-11 px-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? <><RefreshCw size={15} className="animate-spin" /> Importing…</> :
                    <><Check size={15} /> Import {approved} entit{approved !== 1 ? 'ies' : 'y'}</>}
        </button>
      </div>
    </div>
  );
}

// ── Step 6 — Done ────────────────────────────────────────────────────────────

function StepDone({ suggestedQuestions, onFinish }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">You're ready!</h2>
      <p className="text-[14px] text-gray-500 mb-8">
        Zevra has learnt your data. Start by asking one of these questions
        or type your own.
      </p>

      {safeArray(suggestedQuestions).length > 0 && (
        <div className="text-left space-y-2.5 mb-8">
          {safeArray(suggestedQuestions).map((q, i) => (
            <button key={i} onClick={() => onFinish(q)}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-sm text-gray-700 transition-all group flex items-center gap-2">
              <ChevronRight size={14} className="text-emerald-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              {q}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => onFinish(null)}
        className="inline-flex items-center gap-2 h-11 px-8 bg-[#0d2e24] hover:bg-[#0a2720] text-white text-sm font-semibold rounded-lg transition-colors">
        Open Zevra <ArrowRight size={15} />
      </button>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep]                   = useState(0);
  const [connection, setConnection]       = useState(null);
  const [selectedTables, setSelectedTables] = useState([]);
  const [suggestions, setSuggestions]     = useState([]);
  const [suggested, setSuggested]         = useState([]);
  const [analyseError, setAnalyseError]   = useState('');

  const schemaName = connection?.schemaName || 'public';
  const domainKey  = 'PLATFORM';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0faf5] via-white to-[#f5f9ff] flex items-start justify-center pt-12 pb-16 px-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <svg viewBox="0 0 32 32" className="w-7 h-7 text-emerald-600" aria-hidden="true">
            <path d="M16 1.8l2.7 9.5 9.5 2.7-9.5 2.7-2.7 9.5-2.7-9.5-9.5-2.7 9.5-2.7L16 1.8Z"
              fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M25.5 3.5l.9 3.2 3.1.8-3.1.9-.9 3.1-.9-3.1-3.1-.9 3.1-.8.9-3.2Z" fill="currentColor" />
          </svg>
          <span className="text-lg font-bold text-gray-900">Zevra</span>
          <span className="text-gray-300 ml-auto text-sm">Setup wizard</span>
        </div>

        <StepBar step={step} />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-8 min-h-[420px] flex flex-col justify-center">

          {analyseError && (
            <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <AlertCircle size={15} /> Analysis failed: {analyseError}.
              <button onClick={() => { setAnalyseError(''); setStep(2); }}
                className="ml-auto text-red-600 underline text-xs">Try again</button>
            </div>
          )}

          {step === 0 && <StepWelcome user={user} onNext={() => setStep(1)} />}

          {step === 1 && (
            <StepConnect
              onNext={conn => { setConnection(conn); setStep(2); }}
            />
          )}

          {step === 2 && connection && (
            <StepSelectTables
              connectionKey={connection.connectionKey}
              schemaName={schemaName}
              onNext={tables => { setSelectedTables(tables); setStep(3); }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepAnalysing
              connectionKey={connection.connectionKey}
              schemaName={schemaName}
              domainKey={domainKey}
              tableNames={selectedTables}
              onNext={results => { setSuggestions(results); setStep(4); }}
              onError={msg => { setAnalyseError(msg); setStep(2); }}
            />
          )}

          {step === 4 && (
            <StepReview
              suggestions={suggestions}
              connectionKey={connection.connectionKey}
              schemaName={schemaName}
              domainKey={domainKey}
              onNext={qs => { setSuggested(qs); setStep(5); }}
              onBack={() => setStep(2)}
            />
          )}

          {step === 5 && (
            <StepDone
              suggestedQuestions={suggested}
              onFinish={question => onComplete(question)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
