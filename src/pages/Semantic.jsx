import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Input, Select, Textarea, Spinner } from '../components/Card.jsx';
import {
  Layers, Plus, ChevronDown, ChevronRight,
  ArrowLeftRight, BookOpen, Pencil, Trash2,
  Sparkles, Database, Check, X, ChevronLeft,
  AlertCircle, Search,
} from 'lucide-react';

function safeArray(v) { return Array.isArray(v) ? v : []; }

// ── Entity Card ───────────────────────────────────────────────────────────────

function EntityCard({ entity, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [rels, setRels]         = useState(null);
  const [maps, setMaps]         = useState(null);
  const [loading, setLoading]   = useState(false);

  const entityKey = entity.entity_key;

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        api.semantic.relationships(entityKey).catch(() => []),
        api.semantic.mappings(entityKey).catch(() => []),
      ]);
      setRels(safeArray(r));
      setMaps(safeArray(m));
      setExpanded(true);
    } finally { setLoading(false); }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Expand toggle */}
        <button onClick={toggle} className="mt-0.5 text-gray-400 hover:text-gray-600 shrink-0">
          {loading ? <Spinner size={3} /> : expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-indigo-700">{entity.entity_name}</span>
              <Badge
                label={entity.status ?? 'ACTIVE'}
                color={entity.status === 'ACTIVE' ? 'green' : 'gray'}
              />
              {entity.node_type && entity.node_type !== 'ENTITY' && (
                <Badge label={entity.node_type} color="navy" />
              )}
              {entity.group_label && (
                <span className="text-xs text-gray-400">{entity.group_label}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => onEdit(entity)}
                title="Edit entity"
              >
                <Pencil size={13} />
              </Btn>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => onDelete(entity)}
                title="Archive entity"
              >
                <Trash2 size={13} />
              </Btn>
            </div>
          </div>

          {entity.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{entity.description}</p>
          )}
          {entity.operational_meaning && (
            <p className="text-xs text-gray-400 mt-0.5 italic">{entity.operational_meaning}</p>
          )}
          {entity.investigation_hints && (
            <p className="text-xs text-indigo-400 mt-0.5">💡 {entity.investigation_hints}</p>
          )}
          {entity.primary_object_key && (
            <p className="text-xs text-gray-300 font-mono mt-1">{entity.primary_object_key}</p>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              {rels !== null && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <ArrowLeftRight size={11} /> Relationships
                  </p>
                  {rels.length === 0 ? (
                    <p className="text-xs text-gray-400">None defined</p>
                  ) : rels.map((r, i) => (
                    <p key={i} className="text-xs text-gray-600">
                      <span className="font-mono">{r.source_entity_key}</span>
                      {' '}<span className="text-indigo-500 font-medium">{r.relationship_type}</span>{' '}
                      <span className="font-mono">{r.target_entity_key}</span>
                      {r.source_column && r.target_column && (
                        <span className="text-gray-400"> ({r.source_column} = {r.target_column})</span>
                      )}
                    </p>
                  ))}
                </div>
              )}

              {maps !== null && maps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Data Mappings</p>
                  {maps.map((m, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">
                      {m.object_key}
                      {m.is_primary && <span className="ml-1 text-green-500">(primary)</span>}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Vocabulary Card ───────────────────────────────────────────────────────────

function VocabCard({ term, onEdit, onDelete }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-700">{term.term}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{term.definition}</p>
          {term.sql_equivalent && (
            <code className="block text-xs text-gray-400 font-mono mt-1 bg-gray-50 rounded px-2 py-1">
              {term.sql_equivalent}
            </code>
          )}
          {term.examples && (
            <p className="text-xs text-gray-400 italic mt-0.5">e.g. {term.examples}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Btn variant="ghost" size="sm" onClick={() => onEdit(term)} title="Edit term">
            <Pencil size={13} />
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => onDelete(term)} title="Delete term">
            <Trash2 size={13} />
          </Btn>
        </div>
      </div>
    </Card>
  );
}

// ── Discovery Wizard ──────────────────────────────────────────────────────────

/**
 * Multi-step wizard that connects to a live database, reads table schemas,
 * calls the AI to generate semantic suggestions, and lets the user review
 * and approve each entity/vocabulary before saving.
 *
 * Steps: 1 → Select connection + tables
 *        2 → AI analysis (loading)
 *        3 → Review suggestions
 *        4 → Done
 */
function DiscoveryWizard({ open, onClose, onComplete, defaultDomainKey }) {
  const [step, setStep]             = useState(1);
  const [connections, setConnections] = useState([]);
  const [connKey, setConnKey]       = useState('');
  const [schema, setSchema]         = useState('public');
  const [tableSearch, setTableSearch] = useState('');
  const [tables, setTables]         = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState('');
  const [selected, setSelected]     = useState(new Set());
  const [domainKey, setDomainKey]   = useState(defaultDomainKey || '');
  const [domains, setDomains]       = useState([]);
  const [analysing, setAnalysing]   = useState(false);
  const [suggestions, setSuggestions] = useState([]); // per table
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [approved, setApproved]     = useState({}); // tableIdx → {entity, vocab[]}

  // reset when opened
  useEffect(() => {
    if (!open) return;
    setStep(1); setConnKey(''); setSchema('public'); setTableSearch('');
    setTables([]); setSelected(new Set()); setAnalysing(false);
    setSuggestions([]); setApproved({}); setSaveError('');
    Promise.all([api.connections.list(), api.domains.list()]).then(([c, d]) => {
      setConnections(safeArray(c).filter(x => x.status !== 'ARCHIVED'));
      const doms = safeArray(d);
      setDomains(doms);
      if (!domainKey && doms.length) setDomainKey(doms[0].domain_key ?? doms[0].domainKey);
    }).catch(() => {});
  }, [open]);

  // load table catalog when connection or schema changes
  useEffect(() => {
    if (!connKey || !schema) return;
    setTablesLoading(true); setTablesError(''); setTables([]); setSelected(new Set());
    api.connections.catalog(connKey, schema, '')
      .then(rows => setTables(safeArray(rows).map(r => r.table_name || r.TABLE_NAME || Object.values(r)[0]).filter(Boolean)))
      .catch(e => setTablesError(e.message || 'Could not load tables'))
      .finally(() => setTablesLoading(false));
  }, [connKey, schema]);

  const filteredTables = tables.filter(t =>
    !tableSearch || t.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const toggleTable = (t) => setSelected(prev => {
    const next = new Set(prev);
    next.has(t) ? next.delete(t) : next.add(t);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === filteredTables.length) setSelected(new Set());
    else setSelected(new Set(filteredTables));
  };

  // Step 1 → 2: run AI analysis
  const runAnalysis = async () => {
    setAnalysing(true); setStep(2);
    try {
      const result = await api.semantic.discover({
        connectionKey: connKey,
        domainKey,
        schemaName: schema,
        tableNames: Array.from(selected),
      });
      const tableSuggestions = safeArray(result.tables);
      setSuggestions(tableSuggestions);
      // Pre-approve all with defaults
      const defaults = {};
      tableSuggestions.forEach((t, i) => {
        defaults[i] = {
          approved: !t.error,
          entityKey: slugify(t.entityName || t.tableName),
          entityName: t.entityName || t.tableName,
          description: t.purpose || '',
          operationalMeaning: t.usageGuidance || '',
          investigationHints: t.filterGuidance || '',
          vocab: safeArray(t.vocabularySuggestions).map((v, vi) => ({
            approved: true,
            termKey: slugify(v.term || `term-${vi}`),
            term: v.term || '',
            definition: v.definition || '',
            sqlEquivalent: v.sqlEquivalent || '',
          })),
        };
      });
      setApproved(defaults);
      setStep(3);
    } catch (e) {
      setSaveError(e.message || 'AI analysis failed');
      setStep(1);
    } finally {
      setAnalysing(false);
    }
  };

  // Step 3 → save approved items
  const saveApproved = async () => {
    setSaving(true); setSaveError('');
    let saved = 0;
    try {
      for (const [idxStr, item] of Object.entries(approved)) {
        if (!item.approved) continue;
        // Save entity
        await api.semantic.createEntity({
          entity_key: item.entityKey,
          entity_name: item.entityName,
          description: item.description,
          operational_meaning: item.operationalMeaning,
          investigation_hints: item.investigationHints,
          domain_key: domainKey,
          node_type: 'ENTITY',
          status: 'ACTIVE',
        });
        // Save approved vocab
        for (const v of safeArray(item.vocab).filter(v => v.approved)) {
          await api.semantic.createVocab({
            term_key: v.termKey,
            term: v.term,
            definition: v.definition,
            sql_equivalent: v.sqlEquivalent,
            domain_key: domainKey,
            status: 'ACTIVE',
          });
        }
        saved++;
      }
      setStep(4);
      onComplete?.();
    } catch (e) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateApproved = (i, patch) =>
    setApproved(prev => ({ ...prev, [i]: { ...prev[i], ...patch } }));

  const updateVocab = (i, vi, patch) =>
    setApproved(prev => ({
      ...prev,
      [i]: {
        ...prev[i],
        vocab: prev[i].vocab.map((v, j) => j === vi ? { ...v, ...patch } : v),
      },
    }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === 1 && 'Discover from Database'}
              {step === 2 && 'Analysing Schema…'}
              {step === 3 && 'Review AI Suggestions'}
              {step === 4 && 'Import Complete'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1 w-8 rounded-full transition-colors ${
                  s <= step ? 'bg-indigo-600' : 'bg-gray-200'
                }`} />
              ))}
              <span className="text-xs text-gray-400 ml-1">Step {step} of 4</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: Select connection + tables ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target domain</label>
                  <select value={domainKey} onChange={e => setDomainKey(e.target.value)}
                    className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-400">
                    {domains.map(d => {
                      const k = d.domain_key ?? d.domainKey;
                      return <option key={k} value={k}>{d.name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Database schema</label>
                  <Input value={schema} onChange={e => setSchema(e.target.value)} placeholder="public" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Connection</label>
                <select value={connKey} onChange={e => setConnKey(e.target.value)}
                  className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-400">
                  <option value="">— select a connection —</option>
                  {connections.map(c => (
                    <option key={c.connection_key} value={c.connection_key}>
                      {c.name} ({c.connection_type})
                    </option>
                  ))}
                </select>
              </div>

              {connKey && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">
                      Tables in <span className="font-mono">{schema}</span>
                      {!tablesLoading && tables.length > 0 && (
                        <span className="ml-1 text-gray-400">({tables.length} found)</span>
                      )}
                    </label>
                    {tables.length > 0 && (
                      <button onClick={toggleAll} className="text-xs text-indigo-600 hover:underline">
                        {selected.size === filteredTables.length ? 'Deselect all' : 'Select all'}
                      </button>
                    )}
                  </div>

                  {tablesLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <Spinner size={4} /> Loading tables…
                    </div>
                  )}

                  {tablesError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 py-2">
                      <AlertCircle size={14} /> {tablesError}
                    </div>
                  )}

                  {!tablesLoading && tables.length > 0 && (
                    <>
                      <div className="relative mb-2">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={tableSearch}
                          onChange={e => setTableSearch(e.target.value)}
                          placeholder="Filter tables…"
                          className="w-full h-8 border border-gray-200 rounded-lg pl-8 pr-3 text-sm focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                        {filteredTables.map(t => (
                          <label key={t} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                            <input
                              type="checkbox"
                              checked={selected.has(t)}
                              onChange={() => toggleTable(t)}
                              className="accent-indigo-600"
                            />
                            <span className="text-sm font-mono text-gray-700">{t}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  {!tablesLoading && !tablesError && tables.length === 0 && (
                    <p className="text-sm text-gray-400 py-3">No tables found in schema "{schema}".</p>
                  )}
                </div>
              )}

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          )}

          {/* ── STEP 2: AI loading ── */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <Sparkles size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-gray-800">
                  AI is reading your table schemas
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Analysing {selected.size} table{selected.size !== 1 ? 's' : ''} — generating entity definitions, vocabulary, and relationship hints…
                </p>
              </div>
              <div className="w-full max-w-xs bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* ── STEP 3: Review suggestions ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Review each suggestion. Edit or uncheck items you don't want to import.
                </p>
                <span className="text-xs text-gray-400">
                  {Object.values(approved).filter(a => a.approved).length} of {suggestions.length} selected
                </span>
              </div>

              {suggestions.map((s, i) => {
                const a = approved[i] || {};
                return (
                  <div key={i} className={`border rounded-xl overflow-hidden transition-all ${
                    a.approved ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 opacity-50'
                  }`}>
                    {/* Table header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!a.approved}
                          onChange={e => updateApproved(i, { approved: e.target.checked })}
                          className="accent-indigo-600 w-4 h-4"
                        />
                        <div>
                          <span className="text-sm font-semibold text-gray-800">{s.entityName || s.tableName}</span>
                          <span className="ml-2 text-xs text-gray-400 font-mono">{s.tableName}</span>
                        </div>
                      </div>
                      {s.readinessScore != null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.readinessScore >= 0.8 ? 'bg-green-100 text-green-700' :
                          s.readinessScore >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(s.readinessScore * 100)}% ready
                        </span>
                      )}
                    </div>

                    {a.approved && (
                      <div className="px-4 py-4 space-y-3">
                        {s.error ? (
                          <p className="text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle size={14} /> {s.error}
                          </p>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Entity key (ID)</label>
                                <input
                                  value={a.entityKey || ''}
                                  onChange={e => updateApproved(i, { entityKey: e.target.value })}
                                  className="mt-1 w-full h-8 border border-gray-200 rounded-lg px-3 text-xs font-mono focus:outline-none focus:border-indigo-400"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Entity name</label>
                                <input
                                  value={a.entityName || ''}
                                  onChange={e => updateApproved(i, { entityName: e.target.value })}
                                  className="mt-1 w-full h-8 border border-gray-200 rounded-lg px-3 text-xs focus:outline-none focus:border-indigo-400"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-600">Description / Purpose</label>
                              <textarea
                                value={a.description || ''}
                                onChange={e => updateApproved(i, { description: e.target.value })}
                                rows={2}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 resize-none"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-600">Investigation hints (used by AI for SQL)</label>
                              <textarea
                                value={a.investigationHints || ''}
                                onChange={e => updateApproved(i, { investigationHints: e.target.value })}
                                rows={2}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-400 resize-none"
                              />
                            </div>

                            {/* Vocabulary suggestions */}
                            {a.vocab && a.vocab.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-2">
                                  Vocabulary suggestions ({a.vocab.filter(v => v.approved).length} of {a.vocab.length} selected)
                                </p>
                                <div className="space-y-2">
                                  {a.vocab.map((v, vi) => (
                                    <div key={vi} className={`flex items-start gap-3 p-3 rounded-lg border ${
                                      v.approved ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 opacity-50'
                                    }`}>
                                      <input
                                        type="checkbox"
                                        checked={!!v.approved}
                                        onChange={e => updateVocab(i, vi, { approved: e.target.checked })}
                                        className="mt-0.5 accent-emerald-600"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-800">{v.term}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{v.definition}</p>
                                        {v.sqlEquivalent && (
                                          <code className="text-xs text-emerald-700 font-mono mt-1 block">
                                            {v.sqlEquivalent}
                                          </code>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Relationship hints (informational) */}
                            {safeArray(s.relationshipHints).length > 0 && (
                              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                                <p className="text-xs font-semibold text-blue-700 mb-1">Relationship hints (set manually in Knowledge Graph)</p>
                                {safeArray(s.relationshipHints).map((h, hi) => (
                                  <p key={hi} className="text-xs text-blue-600">• {h}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {saveError && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={14} /> {saveError}
                </p>
              )}
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={28} className="text-green-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">Import complete</p>
                <p className="text-sm text-gray-500 mt-1">
                  {Object.values(approved).filter(a => a.approved).length} entities and their vocabulary have been added to your semantic layer and knowledge graph.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div>
            {step === 3 && (
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Btn variant="secondary" onClick={onClose}>
              {step === 4 ? 'Close' : 'Cancel'}
            </Btn>
            {step === 1 && (
              <Btn
                onClick={runAnalysis}
                disabled={!connKey || !domainKey || selected.size === 0 || analysing}
              >
                <Sparkles size={13} />
                Analyse {selected.size > 0 ? `${selected.size} table${selected.size !== 1 ? 's' : ''}` : 'tables'} with AI
              </Btn>
            )}
            {step === 3 && (
              <Btn
                onClick={saveApproved}
                disabled={saving || Object.values(approved).every(a => !a.approved)}
              >
                {saving ? <Spinner size={4} /> : <Check size={13} />}
                Import approved
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ── Entity Detail Panel (right side, matches mockup) ──────────────────────────

function EntityDetailPanel({ entity, vocab, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [rels,    setRels]    = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entity) return;
    setActiveTab('overview');
    setLoading(true);
    const key    = entity.entity_key;
    const objKey = entity.primary_object_key;
    Promise.all([
      api.semantic.relationships(key).catch(() => []),
      objKey ? api.enterprise.columns(objKey).catch(() => []) : Promise.resolve([]),
    ]).then(([r, c]) => {
      setRels(safeArray(r));
      setColumns(safeArray(c));
    }).finally(() => setLoading(false));
  }, [entity?.entity_key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entity) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100/80 flex items-center justify-center mx-auto mb-3">
          <Layers size={26} className="text-gray-300" />
        </div>
        <p className="text-[14px] font-semibold text-[#374151]">Select an entity</p>
        <p className="text-[13px] text-[#9CA3AF] mt-1">Click an entity in the list to view its details</p>
      </div>
    </div>
  );

  const entityVocab = safeArray(vocab).filter(v =>
    (v.entity_key ?? v.entityKey) === entity.entity_key
  );
  const status   = entity.status ?? 'ACTIVE';
  const nodeType = entity.node_type ?? 'ENTITY';

  const statusCls = status === 'ACTIVE'
    ? 'bg-[#DCFCE7] text-[#15803D]'
    : 'bg-[#F3F4F6] text-[#374151]';

  return (
    <div className="flex-1 overflow-y-auto p-7">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <h2 className="text-[20px] font-bold text-[#111827]">{entity.entity_name}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCls}`}>{status}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[#374151]">{nodeType}</span>
          </div>
          <p className="text-[13px] text-[#6B7280]">
            Source:{' '}
            <code className="bg-gray-100 text-emerald-700 px-1.5 py-0.5 rounded text-[12px] font-mono">
              {entity.primary_object_key || entity.entity_key}
            </code>
            {' '}· {entity.domain_key}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(entity)}
            className="px-3.5 py-1.5 text-[13px] font-medium text-[#374151] bg-white/80 border
                       border-gray-200 rounded-[8px] hover:bg-gray-50 transition-colors">
            Edit
          </button>
          <button onClick={() => onDelete(entity)}
            className="px-3.5 py-1.5 text-[13px] font-medium text-red-500 bg-red-50/80 border
                       border-red-100 rounded-[8px] hover:bg-red-100 transition-colors">
            Archive
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-[10px] w-fit mb-6">
        {['Overview', 'Vocabulary', 'Relationships'].map(t => (
          <button key={t} onClick={() => setActiveTab(t.toLowerCase())}
            className={`px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium capitalize transition-all
              ${activeTab === t.toLowerCase()
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#374151]'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}

      {/* ── Overview ── */}
      {!loading && activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/70 rounded-xl p-4">
              <div className="text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Purpose</div>
              <p className="text-[13px] text-[#374151] leading-relaxed">
                {entity.description || entity.operational_meaning || '—'}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/70 rounded-xl p-4">
              <div className="text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Investigation Hint</div>
              {entity.investigation_hints ? (
                <code className="text-[12px] text-emerald-700 leading-relaxed font-mono block">
                  {entity.investigation_hints}
                </code>
              ) : <p className="text-[13px] text-[#9CA3AF]">No hint defined</p>}
            </div>
          </div>

          {columns.length > 0 && (
            <>
              <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Columns</div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200/70">
                      {['Column', 'Type', 'Flags'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#374151] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map(col => (
                      <tr key={col.column_key ?? col.column_name} className="border-b border-gray-100/80 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-mono text-[12.5px] text-[#374151]">{col.column_name}</td>
                        <td className="px-4 py-2.5">
                          <span className="bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded-full text-[11px] font-semibold">
                            {col.data_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {col.is_identifier && <span className="bg-[#DBEAFE] text-[#1D4ED8] px-2 py-0.5 rounded-full text-[11px] font-semibold">identifier</span>}
                            {col.is_filterable && <span className="bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-full text-[11px] font-semibold">filterable</span>}
                            {col.is_status    && <span className="bg-[#FEF9C3] text-[#A16207] px-2 py-0.5 rounded-full text-[11px] font-semibold">status</span>}
                            {col.is_sensitive && <span className="bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded-full text-[11px] font-semibold">sensitive</span>}
                            {col.is_error     && <span className="bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded-full text-[11px] font-semibold">error</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Vocabulary ── */}
      {!loading && activeTab === 'vocabulary' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/70">
                {['Term', 'Definition', 'SQL Equivalent'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#374151] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entityVocab.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[13px] text-[#9CA3AF]">No vocabulary terms for this entity</td></tr>
              ) : entityVocab.map(v => (
                <tr key={v.term_key} className="border-b border-gray-100/80 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-semibold text-[#111827] text-[13px]">{v.term}</td>
                  <td className="px-4 py-2.5 text-[#6B7280] text-[13px]">{v.definition}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-emerald-600">{v.sql_equivalent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Relationships ── */}
      {!loading && activeTab === 'relationships' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/70">
                {['Type', 'Target', 'Join Guidance'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#374151] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rels.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[13px] text-[#9CA3AF]">No relationships defined</td></tr>
              ) : rels.map((r, i) => (
                <tr key={i} className="border-b border-gray-100/80 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <span className="bg-[#EDE9FE] text-[#7C3AED] px-2 py-0.5 rounded-full text-[11px] font-semibold">
                      {r.relationship_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-[#111827] text-[13px]">{r.target_entity_key}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[#6B7280]">{r.join_guidance || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Semantic() {
  const [domains, setDomains]         = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [entities, setEntities]       = useState([]);
  const [vocab, setVocab]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [tab, setTab]                 = useState('entities');
  const [selectedEntityKey, setSelectedEntityKey] = useState(null);

  // discovery wizard
  const [showWizard, setShowWizard] = useState(false);

  // entity modal
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [editingEntity, setEditingEntity]     = useState(null); // null = adding new
  const [entityForm, setEntityForm]           = useState(emptyEntityForm());
  const [savingEntity, setSavingEntity]       = useState(false);
  const [entityError, setEntityError]         = useState('');

  // vocab modal
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [editingTerm, setEditingTerm]       = useState(null);
  const [vocabForm, setVocabForm]           = useState(emptyVocabForm());
  const [savingVocab, setSavingVocab]       = useState(false);
  const [vocabError, setVocabError]         = useState('');

  function emptyEntityForm(domainKey) {
    return {
      entityKey: '', entityName: '', description: '',
      operationalMeaning: '', investigationHints: '',
      nodeType: 'ENTITY', groupLabel: '', status: 'ACTIVE',
      domainKey: domainKey || '',
    };
  }

  function emptyVocabForm(domainKey) {
    return {
      termKey: '', term: '', definition: '',
      sqlEquivalent: '', examples: '', status: 'ACTIVE',
      domainKey: domainKey || '',
    };
  }

  // ── data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    api.domains.list().then(ds => {
      const arr = safeArray(ds);
      setDomains(arr);
      if (arr.length) {
        const key = arr[0].domain_key ?? arr[0].domainKey;
        setSelectedDomain(key);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDomain) return;
    reload(selectedDomain);
  }, [selectedDomain]);

  const reload = async (dk) => {
    const key = dk || selectedDomain;
    if (!key) return;
    setLoading(true);
    const [e, v] = await Promise.all([
      api.semantic.entities(key).catch(() => []),
      api.semantic.vocabulary(key).catch(() => []),
    ]);
    const ents = safeArray(e);
    setEntities(ents);
    setVocab(safeArray(v));
    setLoading(false);
    // Auto-select first entity so right panel isn't empty
    if (ents.length > 0) setSelectedEntityKey(prev => prev ?? ents[0].entity_key);
  };

  // ── entity CRUD ───────────────────────────────────────────────────────────

  const openAddEntity = () => {
    setEditingEntity(null);
    setEntityForm(emptyEntityForm(selectedDomain));
    setEntityError('');
    setShowEntityModal(true);
  };

  const openEditEntity = (entity) => {
    setEditingEntity(entity);
    setEntityForm({
      entityKey:          entity.entity_key,
      entityName:         entity.entity_name         || '',
      description:        entity.description          || '',
      operationalMeaning: entity.operational_meaning  || '',
      investigationHints: entity.investigation_hints  || '',
      nodeType:           entity.node_type            || 'ENTITY',
      groupLabel:         entity.group_label          || '',
      status:             entity.status               || 'ACTIVE',
      domainKey:          entity.domain_key           || selectedDomain,
    });
    setEntityError('');
    setShowEntityModal(true);
  };

  const saveEntity = async () => {
    setSavingEntity(true);
    setEntityError('');
    try {
      await api.semantic.createEntity({
        entity_key:          entityForm.entityKey,
        entity_name:         entityForm.entityName,
        description:         entityForm.description,
        operational_meaning: entityForm.operationalMeaning,
        investigation_hints: entityForm.investigationHints,
        node_type:           entityForm.nodeType,
        group_label:         entityForm.groupLabel,
        status:              entityForm.status,
        domain_key:          entityForm.domainKey,
      });
      setShowEntityModal(false);
      reload();
    } catch (e) { setEntityError(e.message); }
    finally { setSavingEntity(false); }
  };

  const deleteEntity = async (entity) => {
    if (!confirm(`Archive "${entity.entity_name}"? It will no longer appear in the graph or AI context.`)) return;
    await api.semantic.deleteEntity(entity.entity_key).catch(e => alert(e.message));
    reload();
  };

  // ── vocabulary CRUD ───────────────────────────────────────────────────────

  const openAddVocab = () => {
    setEditingTerm(null);
    setVocabForm(emptyVocabForm(selectedDomain));
    setVocabError('');
    setShowVocabModal(true);
  };

  const openEditVocab = (term) => {
    setEditingTerm(term);
    setVocabForm({
      termKey:      term.term_key    || '',
      term:         term.term        || '',
      definition:   term.definition  || '',
      sqlEquivalent:term.sql_equivalent || '',
      examples:     term.examples    || '',
      status:       term.status      || 'ACTIVE',
      domainKey:    term.domain_key  || selectedDomain,
    });
    setVocabError('');
    setShowVocabModal(true);
  };

  const saveVocab = async () => {
    setSavingVocab(true);
    setVocabError('');
    try {
      await api.semantic.createVocab({
        term_key:      vocabForm.termKey,
        term:          vocabForm.term,
        definition:    vocabForm.definition,
        sql_equivalent:vocabForm.sqlEquivalent,
        examples:      vocabForm.examples,
        status:        vocabForm.status,
        domain_key:    vocabForm.domainKey,
      });
      setShowVocabModal(false);
      reload();
    } catch (e) { setVocabError(e.message); }
    finally { setSavingVocab(false); }
  };

  const deleteTerm = async (term) => {
    if (!confirm(`Delete vocabulary term "${term.term}"?`)) return;
    // Archive via status update — reuse createVocab (upsert)
    await api.semantic.createVocab({
      ...term, status: 'INACTIVE',
      term_key: term.term_key, domain_key: term.domain_key,
    }).catch(e => alert(e.message));
    reload();
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full min-h-0 flex overflow-hidden bg-transparent">

      {/* ── Left sidebar: entity / vocab list ─────────────────────────────── */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col bg-white/80 backdrop-blur-sm
                         border-r border-gray-200/70 overflow-hidden">

        {/* Sidebar header */}
        <div className="px-4 py-3.5 border-b border-gray-200/70 flex items-center justify-between flex-shrink-0">
          <span className="text-[13px] font-semibold text-[#111827]">
            {tab === 'entities' ? `Entities (${entities.length})` : `Vocabulary (${vocab.length})`}
          </span>
          <button
            onClick={tab === 'entities' ? openAddEntity : openAddVocab}
            className="flex items-center gap-1 px-[8px] py-[4px] bg-[#111827] text-white
                       text-[11.5px] font-medium rounded-[6px] hover:bg-[#1F2937] transition-colors">
            <Plus size={10} /> Add
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex border-b border-gray-200/70 flex-shrink-0">
          {[['entities', 'Entities'], ['vocab', 'Vocabulary']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2 text-[12px] font-medium transition-colors
                ${tab === k ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-[#9CA3AF] hover:text-[#374151]'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Domain filter */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
          <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)}
            className="w-full border border-gray-200 rounded-[7px] px-2.5 py-1.5 text-[12px]
                       text-[#374151] bg-white focus:outline-none focus:border-emerald-400">
            {domains.map(d => {
              const key = d.domain_key ?? d.domainKey;
              return <option key={key} value={key}>{d.name}</option>;
            })}
          </select>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : tab === 'entities' ? (
            entities.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">No entities yet</div>
            ) : entities.map(e => {
              const isSelected = selectedEntityKey === e.entity_key;
              return (
                <div key={e.entity_key}
                  onClick={() => setSelectedEntityKey(e.entity_key)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100/80 transition-colors
                    ${isSelected
                      ? 'bg-emerald-50/80 border-l-2 border-l-emerald-500'
                      : 'hover:bg-gray-50/60'}`}>
                  <div className={`text-[13px] font-medium ${isSelected ? 'text-emerald-700' : 'text-[#111827]'}`}>
                    {e.entity_name}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] mt-0.5 font-mono">{e.entity_key}</div>
                </div>
              );
            })
          ) : (
            vocab.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">No vocabulary yet</div>
            ) : vocab.map(v => (
              <div key={v.term_key}
                className="px-4 py-3 cursor-pointer border-b border-gray-100/80 hover:bg-gray-50/60 transition-colors">
                <div className="text-[13px] font-medium text-[#111827]">{v.term}</div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">{v.definition}</div>
              </div>
            ))
          )}
        </div>

        {/* Discover from DB */}
        <div className="px-3 py-3 border-t border-gray-200/70 flex-shrink-0">
          <button onClick={() => setShowWizard(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium
                       text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-[8px] transition-colors">
            <Sparkles size={12} /> Discover from DB
          </button>
        </div>
      </aside>

      {/* ── Right content: entity detail or vocab list ────────────────────── */}
      {tab === 'entities' ? (
        <EntityDetailPanel
          entity={entities.find(e => e.entity_key === selectedEntityKey) ?? null}
          vocab={vocab}
          onEdit={openEditEntity}
          onDelete={deleteEntity}
        />
      ) : (
        <div className="flex-1 min-w-0 overflow-y-auto p-7">
          {vocab.length === 0 ? (
            <EmptyState icon={BookOpen} title="No vocabulary"
              body="Add business terms so the AI understands domain-specific language." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {vocab.map(v => (
                <VocabCard key={v.term_key} term={v} onEdit={openEditVocab} onDelete={deleteTerm} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Discovery wizard ── */}
      <DiscoveryWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={() => { setShowWizard(false); reload(); }}
        defaultDomainKey={selectedDomain}
      />

      {/* ── Entity modal (add / edit) ── */}
      <Modal
        open={showEntityModal}
        onClose={() => { setShowEntityModal(false); setEntityError(''); }}
        title={editingEntity ? `Edit — ${editingEntity.entity_name}` : 'Add Business Entity'}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Domain" value={entityForm.domainKey}
              onChange={e => setEntityForm(f => ({ ...f, domainKey: e.target.value }))}>
              {domains.map(d => {
                const key = d.domain_key ?? d.domainKey;
                return <option key={key} value={key}>{d.name}</option>;
              })}
            </Select>
            <Select label="Node type" value={entityForm.nodeType}
              onChange={e => setEntityForm(f => ({ ...f, nodeType: e.target.value }))}>
              {['ENTITY', 'TRANSACTION', 'REFERENCE', 'METRIC', 'EVENT', 'DETAIL'].map(t =>
                <option key={t}>{t}</option>)}
            </Select>
          </div>

          {!editingEntity && (
            <Input
              label="Entity Key (unique ID — cannot change later)"
              placeholder="lgs-supplier"
              value={entityForm.entityKey}
              onChange={e => setEntityForm(f => ({ ...f, entityKey: e.target.value }))}
            />
          )}
          {editingEntity && (
            <Input label="Entity Key" value={entityForm.entityKey} disabled />
          )}

          <Input
            label="Entity Name"
            placeholder="Supplier"
            value={entityForm.entityName}
            onChange={e => setEntityForm(f => ({ ...f, entityName: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Group Label"
              placeholder="Procurement"
              value={entityForm.groupLabel}
              onChange={e => setEntityForm(f => ({ ...f, groupLabel: e.target.value }))}
            />
            <Select label="Status" value={entityForm.status}
              onChange={e => setEntityForm(f => ({ ...f, status: e.target.value }))}>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>

          <Textarea
            label="Description"
            placeholder="What is this entity in plain terms?"
            rows={2}
            value={entityForm.description}
            onChange={e => setEntityForm(f => ({ ...f, description: e.target.value }))}
          />

          <Textarea
            label="Operational Meaning"
            placeholder="How is this entity used operationally? What do its key fields mean?"
            rows={3}
            value={entityForm.operationalMeaning}
            onChange={e => setEntityForm(f => ({ ...f, operationalMeaning: e.target.value }))}
          />

          <Textarea
            label="Investigation Hints (AI uses this when writing SQL)"
            placeholder="e.g. To find overdue POs: WHERE status = 'OVERDUE' AND expected_at < NOW()"
            rows={3}
            value={entityForm.investigationHints}
            onChange={e => setEntityForm(f => ({ ...f, investigationHints: e.target.value }))}
          />

          {entityError && <p className="text-sm text-red-600">{entityError}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowEntityModal(false)}>Cancel</Btn>
            <Btn
              onClick={saveEntity}
              disabled={savingEntity || !entityForm.entityKey || !entityForm.entityName}
            >
              {savingEntity ? <Spinner size={4} /> : editingEntity ? <Pencil size={13} /> : <Plus size={13} />}
              {editingEntity ? 'Save Changes' : 'Create Entity'}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Vocabulary modal (add / edit) ── */}
      <Modal
        open={showVocabModal}
        onClose={() => { setShowVocabModal(false); setVocabError(''); }}
        title={editingTerm ? `Edit — ${editingTerm.term}` : 'Add Vocabulary Term'}
      >
        <div className="space-y-3">
          <Select label="Domain" value={vocabForm.domainKey}
            onChange={e => setVocabForm(f => ({ ...f, domainKey: e.target.value }))}>
            {domains.map(d => {
              const key = d.domain_key ?? d.domainKey;
              return <option key={key} value={key}>{d.name}</option>;
            })}
          </Select>

          {!editingTerm && (
            <Input
              label="Term Key (unique ID)"
              placeholder="overdue-order"
              value={vocabForm.termKey}
              onChange={e => setVocabForm(f => ({ ...f, termKey: e.target.value }))}
            />
          )}
          {editingTerm && (
            <Input label="Term Key" value={vocabForm.termKey} disabled />
          )}

          <Input
            label="Term"
            placeholder="Overdue Order"
            value={vocabForm.term}
            onChange={e => setVocabForm(f => ({ ...f, term: e.target.value }))}
          />

          <Textarea
            label="Definition"
            placeholder="What does this term mean in business context?"
            rows={2}
            value={vocabForm.definition}
            onChange={e => setVocabForm(f => ({ ...f, definition: e.target.value }))}
          />

          <Textarea
            label="SQL Equivalent (how to express this in SQL)"
            placeholder="WHERE status = 'OVERDUE' — or — WHERE expected_at < NOW() AND received_at IS NULL"
            rows={2}
            value={vocabForm.sqlEquivalent}
            onChange={e => setVocabForm(f => ({ ...f, sqlEquivalent: e.target.value }))}
          />

          <Input
            label="Examples"
            placeholder="PO-2024-0103 is overdue because it passed its expected_at date"
            value={vocabForm.examples}
            onChange={e => setVocabForm(f => ({ ...f, examples: e.target.value }))}
          />

          <Select label="Status" value={vocabForm.status}
            onChange={e => setVocabForm(f => ({ ...f, status: e.target.value }))}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>

          {vocabError && <p className="text-sm text-red-600">{vocabError}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowVocabModal(false)}>Cancel</Btn>
            <Btn
              onClick={saveVocab}
              disabled={savingVocab || !vocabForm.termKey || !vocabForm.term || !vocabForm.definition}
            >
              {savingVocab ? <Spinner size={4} /> : editingTerm ? <Pencil size={13} /> : <Plus size={13} />}
              {editingTerm ? 'Save Changes' : 'Add Term'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
