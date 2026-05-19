import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import { Spinner } from '../components/Card.jsx';
import {
  ArrowRight, ChevronRight, Clipboard, ClipboardCheck,
  MessageSquare, Search, Shuffle, X, Zap,
} from 'lucide-react';

// ── Entity type config ────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  ENTITY:      { color: '#10B981', bg: '#D1FAE5', label: 'Entity',      order: 1 },
  TRANSACTION: { color: '#3B82F6', bg: '#DBEAFE', label: 'Transaction', order: 2 },
  REFERENCE:   { color: '#8B5CF6', bg: '#EDE9FE', label: 'Reference',   order: 3 },
  METRIC:      { color: '#F59E0B', bg: '#FEF9C3', label: 'Metric',      order: 4 },
  EVENT:       { color: '#EC4899', bg: '#FCE7F3', label: 'Event',       order: 5 },
  DETAIL:      { color: '#06B6D4', bg: '#CFFAFE', label: 'Detail',      order: 6 },
};

const FLAG_STYLES = {
  identifier: 'bg-[#DBEAFE] text-[#1D4ED8]',
  filterable: 'bg-[#DCFCE7] text-[#15803D]',
  status:     'bg-[#FEF9C3] text-[#A16207]',
  sensitive:  'bg-[#FEE2E2] text-[#DC2626]',
  error:      'bg-[#FEE2E2] text-[#DC2626]',
};

function typeConf(t) { return TYPE_CONFIG[t] ?? { color: '#6B7280', bg: '#F3F4F6', label: t || 'Node', order: 99 }; }
function safeArr(v)  { return Array.isArray(v) ? v : []; }
function fmtKey(k)   { return k?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? ''; }

// ── useCopyToClipboard ────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return [copied, copy];
}

// ── Entity sidebar list ───────────────────────────────────────────────────────

function EntityList({ entities, selected, onSelect, search, onSearchChange }) {
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? entities.filter(e => e.entity_name?.toLowerCase().includes(q) ||
                             e.entity_key?.toLowerCase().includes(q) ||
                             e.description?.toLowerCase().includes(q))
      : entities;

    const groups = {};
    filtered.forEach(e => {
      const t = e.node_type ?? e.nodeType ?? 'ENTITY';
      if (!groups[t]) groups[t] = [];
      groups[t].push(e);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => (typeConf(a).order ?? 99) - (typeConf(b).order ?? 99));
  }, [entities, search]);

  return (
    <div className="w-[260px] flex-shrink-0 flex flex-col bg-white/80 backdrop-blur-sm
                    border-r border-gray-200/70 overflow-hidden">

      {/* Search */}
      <div className="px-3 py-3 border-b border-gray-200/70 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search entities…"
            className="w-full h-8 rounded-[8px] bg-gray-100/80 pl-8 pr-8 text-[12.5px]
                       text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-400/30
                       focus:bg-white transition-all placeholder:text-gray-300"
          />
          {search && (
            <button onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Grouped entity list */}
      <div className="overflow-y-auto flex-1 py-2">
        {grouped.length === 0 && (
          <p className="px-4 py-6 text-[12px] text-gray-400 text-center">No entities found</p>
        )}
        {grouped.map(([type, items]) => {
          const conf = typeConf(type);
          return (
            <div key={type} className="mb-1">
              <div className="flex items-center gap-2 px-4 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                     style={{ background: conf.color }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: conf.color }}>
                  {conf.label} ({items.length})
                </span>
              </div>
              {items.map(e => {
                const key  = e.entity_key;
                const name = e.entity_name ?? key;
                const active = selected?.entity_key === key;
                return (
                  <button key={key} onClick={() => onSelect(e)}
                    className={`w-full text-left px-4 py-2 transition-colors flex items-center gap-2.5 group
                      ${active
                        ? 'bg-emerald-50/80 border-l-2 border-emerald-500'
                        : 'hover:bg-gray-50/60 border-l-2 border-transparent'}`}>
                    <span className={`text-[12.5px] font-medium truncate
                      ${active ? 'text-emerald-700' : 'text-[#374151] group-hover:text-[#111827]'}`}>
                      {name}
                    </span>
                    <ChevronRight size={11}
                      className={`ml-auto flex-shrink-0 transition-opacity
                        ${active ? 'text-emerald-500 opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Column flags ──────────────────────────────────────────────────────────────

function ColFlags({ col }) {
  const flags = [];
  if (col.is_identifier) flags.push('identifier');
  if (col.is_filterable) flags.push('filterable');
  if (col.is_status)     flags.push('status');
  if (col.is_sensitive)  flags.push('sensitive');
  if (col.is_error)      flags.push('error');
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map(f => (
        <span key={f} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${FLAG_STYLES[f] ?? ''}`}>{f}</span>
      ))}
    </div>
  );
}

// ── Entity detail panel ───────────────────────────────────────────────────────

function EntityDetail({ entity, allEdges, entityIndex }) {
  const [columns,  setColumns]  = useState([]);
  const [vocab,    setVocab]    = useState([]);
  const [rels,     setRels]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState('overview');
  const [copied,   copy]        = useCopy();

  const domainKey        = entity.domain_key ?? entity.domainKey ?? '';
  const primaryObjectKey = entity.primary_object_key ?? entity.primaryObjectKey;
  const conf             = typeConf(entity.node_type ?? entity.nodeType);

  useEffect(() => {
    if (!entity) return;
    setTab('overview');
    setColumns([]); setVocab([]); setRels([]);
    setLoading(true);
    Promise.all([
      primaryObjectKey
        ? api.enterprise.columns(primaryObjectKey).catch(() => [])
        : Promise.resolve([]),
      domainKey
        ? api.semantic.vocabulary(domainKey).catch(() => [])
        : Promise.resolve([]),
      api.semantic.relationships(entity.entity_key).catch(() => []),
    ]).then(([cols, voc, r]) => {
      setColumns(safeArr(cols));
      setVocab(safeArr(voc).filter(v =>
        (v.entity_key ?? v.entityKey) === entity.entity_key));
      setRels(safeArr(r));
    }).finally(() => setLoading(false));
  }, [entity?.entity_key]); // eslint-disable-line react-hooks/exhaustive-deps

  const askZevra = () => {
    const q = `Tell me about the ${entity.entity_name} entity — what are the key metrics, current status distribution, and any anomalies I should investigate?`;
    localStorage.setItem('zevra_chat_prefill', q);
    navigate('/chat');
  };

  const edgesForEntity = useMemo(() =>
    allEdges.filter(e => {
      const src = typeof e.source === 'object' ? e.source?.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target?.id : e.target;
      return src === entity.entity_key || tgt === entity.entity_key;
    }),
  [allEdges, entity.entity_key]);

  const outbound = edgesForEntity.filter(e => {
    const src = typeof e.source === 'object' ? e.source?.id : e.source;
    return src === entity.entity_key;
  });

  const inbound = edgesForEntity.filter(e => {
    const tgt = typeof e.target === 'object' ? e.target?.id : e.target;
    return tgt === entity.entity_key;
  });

  const TABS = [
    ['overview',  'Overview'],
    ['columns',   `Columns (${columns.length})`],
    ['vocab',     `Vocabulary (${vocab.length})`],
    ['relations', `Relationships (${outbound.length + inbound.length})`],
  ];

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

      {/* Entity header */}
      <div className="flex-shrink-0 px-7 pt-6 pb-0 border-b border-gray-200/70 bg-white/40">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-1 rounded-[7px] text-[11.5px] font-semibold"
                    style={{ background: conf.bg, color: conf.color }}>
                {conf.label}
              </span>
              {domainKey && (
                <span className="text-[12px] text-gray-400 font-medium">{domainKey}</span>
              )}
            </div>
            <h1 className="text-[22px] font-bold text-[#111827] tracking-[-0.025em]">
              {entity.entity_name}
            </h1>
            {primaryObjectKey && (
              <p className="text-[12.5px] text-gray-400 font-mono mt-1">{primaryObjectKey}</p>
            )}
          </div>

          {/* Ask Zevra CTA */}
          <button onClick={askZevra}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px]
                       font-semibold text-white shadow-sm transition-all hover:shadow-md hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${conf.color}, ${conf.color}CC)` }}>
            <MessageSquare size={14} />
            Ask Zevra
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors
                ${tab === k
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="px-7 py-6">

            {/* ── Overview ── */}
            {tab === 'overview' && (
              <div className="space-y-5 max-w-3xl">
                {entity.description ? (
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                  rounded-xl p-5">
                    <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                      Description
                    </p>
                    <p className="text-[14px] text-[#374151] leading-relaxed">{entity.description}</p>
                  </div>
                ) : null}

                {entity.operational_meaning ?? entity.operationalMeaning ? (
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                  rounded-xl p-5">
                    <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                      Operational context
                    </p>
                    <p className="text-[13.5px] text-[#374151] leading-relaxed">
                      {entity.operational_meaning ?? entity.operationalMeaning}
                    </p>
                  </div>
                ) : null}

                {(entity.investigation_hints ?? entity.investigationHints) ? (
                  <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-5">
                    <p className="text-[10.5px] font-semibold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Zap size={11} /> Investigation hint
                    </p>
                    <code className="text-[12.5px] text-amber-700 font-mono leading-relaxed block whitespace-pre-wrap">
                      {entity.investigation_hints ?? entity.investigationHints}
                    </code>
                  </div>
                ) : null}

                {!entity.description && !(entity.operational_meaning ?? entity.operationalMeaning) && (
                  <div className="text-center py-10 text-[13px] text-gray-400">
                    No description yet.{' '}
                    <button onClick={() => navigate('/semantic')}
                      className="text-emerald-600 hover:underline">
                      Add one in the Semantic Layer →
                    </button>
                  </div>
                )}

                {/* Quick stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Columns',      value: columns.length },
                    { label: 'Vocab terms',  value: vocab.length   },
                    { label: 'Connects to',  value: outbound.length },
                    { label: 'Referenced by',value: inbound.length  },
                  ].map(({ label, value }) => (
                    <div key={label}
                      className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                 rounded-xl p-4 text-center">
                      <div className="text-[24px] font-bold text-[#111827]">{value}</div>
                      <div className="text-[11.5px] text-gray-400 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Columns ── */}
            {tab === 'columns' && (
              columns.length === 0 ? (
                <div className="text-center py-12 text-[13px] text-gray-400">
                  No column data. Run a scan from the Enterprise Map page.
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                rounded-xl overflow-hidden max-w-4xl">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200/70">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Column</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Flags</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Business meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col, i) => (
                        <tr key={col.column_key ?? col.columnKey ?? i}
                          className="border-b border-gray-100/80 hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-[12.5px] text-[#374151] font-medium">
                            {col.column_name ?? col.columnName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold
                                             bg-gray-100 text-gray-600">
                              {col.data_type ?? col.dataType ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3"><ColFlags col={col} /></td>
                          <td className="px-4 py-3 text-[12.5px] text-gray-500">
                            {col.business_meaning ?? col.businessMeaning ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Vocabulary ── */}
            {tab === 'vocab' && (
              vocab.length === 0 ? (
                <div className="text-center py-12 text-[13px] text-gray-400">
                  No vocabulary terms for this entity.{' '}
                  <button onClick={() => navigate('/semantic')}
                    className="text-emerald-600 hover:underline">
                    Add terms in the Semantic Layer →
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {vocab.map(v => (
                    <div key={v.term_key ?? v.termKey}
                      className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                 rounded-xl p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13.5px] text-[#111827] mb-1">
                          {v.term}
                        </div>
                        <p className="text-[13px] text-gray-500">{v.definition}</p>
                      </div>
                      {(v.sql_equivalent ?? v.sqlEquivalent) && (
                        <code className="flex-shrink-0 px-3 py-1.5 bg-emerald-50 text-emerald-700
                                         rounded-[7px] text-[12px] font-mono border border-emerald-200/70">
                          {v.sql_equivalent ?? v.sqlEquivalent}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── Relationships ── */}
            {tab === 'relations' && (
              <div className="space-y-5 max-w-4xl">
                {outbound.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      {entity.entity_name} connects to
                    </p>
                    <div className="space-y-2.5">
                      {outbound.map((e, i) => {
                        const tid  = typeof e.target === 'object' ? e.target?.id : e.target;
                        const tEnt = entityIndex[tid];
                        const tConf = typeConf(tEnt?.node_type ?? tEnt?.nodeType);
                        return (
                          <div key={i}
                            className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                       rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#111827]">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                      style={{ background: conf.bg, color: conf.color }}>
                                  {entity.entity_name}
                                </span>
                                <ArrowRight size={14} className="text-gray-300" />
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                      style={{ background: tConf.bg, color: tConf.color }}>
                                  {tEnt?.entity_name ?? tid}
                                </span>
                              </div>
                              <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] font-semibold
                                               bg-gray-100 text-gray-500">
                                {e.relationshipType ?? e.relationship_type}
                                {e.cardinality ? ` · ${e.cardinality}` : ''}
                              </span>
                            </div>
                            {(e.sourceColumn ?? e.source_column) && (
                              <p className="text-[12px] text-gray-400 mb-2 font-mono">
                                ON {e.sourceColumn ?? e.source_column} = {e.targetColumn ?? e.target_column}
                              </p>
                            )}
                            {(e.joinGuidance ?? e.join_guidance) && (
                              <code className="block text-[12px] text-emerald-700 bg-emerald-50/80
                                               border border-emerald-200/70 rounded-[8px] px-3 py-2
                                               font-mono whitespace-pre-wrap">
                                {e.joinGuidance ?? e.join_guidance}
                              </code>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {inbound.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      Referenced by
                    </p>
                    <div className="space-y-2.5">
                      {inbound.map((e, i) => {
                        const sid  = typeof e.source === 'object' ? e.source?.id : e.source;
                        const sEnt = entityIndex[sid];
                        const sConf = typeConf(sEnt?.node_type ?? sEnt?.nodeType);
                        return (
                          <div key={i}
                            className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                       rounded-xl p-4 opacity-75">
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                    style={{ background: sConf.bg, color: sConf.color }}>
                                {sEnt?.entity_name ?? sid}
                              </span>
                              <ArrowRight size={13} className="text-gray-300" />
                              <span className="text-[13px] font-semibold text-[#111827]">
                                {entity.entity_name}
                              </span>
                              <span className="ml-auto text-[11.5px] text-gray-400">
                                {e.relationshipType ?? e.relationship_type}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {outbound.length === 0 && inbound.length === 0 && (
                  <div className="text-center py-12 text-[13px] text-gray-400">
                    No relationships defined. Add them in the Semantic Layer.
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── JOIN Path Finder ──────────────────────────────────────────────────────────

function JoinPathFinder({ entities, allEdges, entityIndex }) {
  const [fromKey,   setFromKey]   = useState('');
  const [toKey,     setToKey]     = useState('');
  const [pathNodes, setPathNodes] = useState([]);
  const [pathEdges, setPathEdges] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [copied,    copy]         = useCopy();

  const sorted = useMemo(() =>
    [...entities].sort((a, b) => (a.entity_name ?? '').localeCompare(b.entity_name ?? '')),
  [entities]);

  const findPath = async () => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    setLoading(true); setError(''); setPathNodes([]); setPathEdges([]);
    try {
      const data = await api.graph.paths(fromKey, toKey);
      const nodes = safeArr(data.nodes).map(n => ({
        id:    n.id    ?? n.entity_key,
        name:  n.label ?? n.entity_name ?? n.id ?? n.entity_key,
        type:  n.node_type ?? n.nodeType ?? 'ENTITY',
        objKey:n.primary_object_key ?? n.primaryObjectKey,
      }));
      const edges = safeArr(data.edges).map(e => ({
        source: typeof e.source === 'object' ? e.source?.id : (e.source ?? e.source_entity_key),
        target: typeof e.target === 'object' ? e.target?.id : (e.target ?? e.target_entity_key),
        type:   e.relationship_type ?? e.relationshipType,
        srcCol: e.source_column ?? e.sourceColumn,
        tgtCol: e.target_column ?? e.targetColumn,
        join:   e.join_guidance  ?? e.joinGuidance,
        card:   e.cardinality,
      }));
      if (nodes.length === 0) {
        // Distinguish: no relationships at all vs genuinely disconnected entities
        const hasAnyRelationships = allEdges.length > 0;
        setError(hasAnyRelationships
          ? `No connection found between these two entities. They are not linked in the semantic model — add a relationship between them in the Semantic Layer to enable path finding.`
          : `No relationships are defined yet. Go to the Semantic Layer, select an entity, open the Relationships tab, and add connections between entities. Path finding requires at least one relationship.`);
      } else {
        setPathNodes(nodes);
        setPathEdges(edges);
      }
    } catch {
      setError('Unable to find path. Ensure both entities are connected in the semantic layer.');
    } finally {
      setLoading(false);
    }
  };

  // Build the complete JOIN SQL from the path
  const joinSQL = useMemo(() => {
    if (pathNodes.length < 2) return '';
    const first = pathNodes[0];
    const tableName = n => (n.objKey
      ? n.objKey.split('-').slice(3).join('_') || n.objKey
      : n.name.toLowerCase().replace(/\s+/g, '_'));
    const alias = n => n.name.charAt(0).toLowerCase();

    let sql = `SELECT *\nFROM ${tableName(first)} ${alias(first)}`;
    for (let i = 1; i < pathNodes.length; i++) {
      const cur  = pathNodes[i];
      const prev = pathNodes[i - 1];
      const edge = pathEdges.find(e =>
        (e.source === prev.id && e.target === cur.id) ||
        (e.source === cur.id  && e.target === prev.id));

      if (edge?.join) {
        sql += `\nJOIN ${tableName(cur)} ${alias(cur)}\n  ON ${edge.join}`;
      } else if (edge?.srcCol && edge?.tgtCol) {
        const fromAlias = edge.source === prev.id ? alias(prev) : alias(cur);
        const toAlias   = edge.source === prev.id ? alias(cur)  : alias(prev);
        sql += `\nJOIN ${tableName(cur)} ${alias(cur)}\n  ON ${toAlias}.${edge.tgtCol} = ${fromAlias}.${edge.srcCol}`;
      } else {
        sql += `\nJOIN ${tableName(cur)} ${alias(cur)} -- JOIN condition not specified`;
      }
    }
    return sql;
  }, [pathNodes, pathEdges]);

  const askZevra = () => {
    if (pathNodes.length < 2) return;
    const chain  = pathNodes.map(n => n.name).join(' → ');
    const from   = pathNodes[0].name;
    const to     = pathNodes[pathNodes.length - 1].name;
    const q = `Using the join path ${chain}, investigate the relationship between ${from} and ${to}. What insights can you find?`;
    localStorage.setItem('zevra_chat_prefill', q);
    navigate('/chat');
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="px-7 py-7 max-w-3xl">

        {/* Header */}
        <div className="mb-7">
          <h2 className="text-[20px] font-bold text-[#111827] tracking-[-0.025em] mb-1.5">
            JOIN Path Finder
          </h2>
          <p className="text-[13.5px] text-gray-500 leading-relaxed">
            Select any two entities and Zevra finds the shortest join chain connecting them —
            with the exact SQL you need to query across them.
          </p>
        </div>

        {/* Entity selectors */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              From entity
            </label>
            <select value={fromKey} onChange={e => setFromKey(e.target.value)}
              className="w-full border border-gray-200 rounded-[10px] px-3.5 py-2.5 text-[13.5px]
                         text-[#111827] bg-white/80 focus:outline-none focus:border-emerald-400
                         focus:ring-2 focus:ring-emerald-400/20 transition-all">
              <option value="">Select entity…</option>
              {sorted.map(e => (
                <option key={e.entity_key} value={e.entity_key}>{e.entity_name}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Shuffle size={14} className="text-gray-400" />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              To entity
            </label>
            <select value={toKey} onChange={e => setToKey(e.target.value)}
              className="w-full border border-gray-200 rounded-[10px] px-3.5 py-2.5 text-[13.5px]
                         text-[#111827] bg-white/80 focus:outline-none focus:border-emerald-400
                         focus:ring-2 focus:ring-emerald-400/20 transition-all">
              <option value="">Select entity…</option>
              {sorted.filter(e => e.entity_key !== fromKey).map(e => (
                <option key={e.entity_key} value={e.entity_key}>{e.entity_name}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex-shrink-0">
            <button onClick={findPath}
              disabled={!fromKey || !toKey || fromKey === toKey || loading}
              className="h-10 px-5 bg-[#111827] text-white text-[13px] font-semibold
                         rounded-[10px] hover:bg-[#1F2937] disabled:opacity-40 transition-colors
                         flex items-center gap-2">
              {loading ? <Spinner size={4} /> : <Zap size={14} />}
              Find path
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl
                          text-[13px] text-amber-700">
            {error}
          </div>
        )}

        {/* Result */}
        {pathNodes.length > 0 && (
          <div className="space-y-5">

            {/* Visual chain */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/70 rounded-xl p-5">
              <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Join chain · {pathNodes.length} entities · {pathEdges.length} joins
              </p>
              <div className="flex items-center flex-wrap gap-2">
                {pathNodes.map((n, i) => {
                  const conf = typeConf(n.type);
                  return (
                    <React.Fragment key={n.id}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="px-3 py-2 rounded-[9px] text-[13px] font-semibold"
                             style={{ background: conf.bg, color: conf.color }}>
                          {n.name}
                        </div>
                        <span className="text-[10px] text-gray-400">{conf.label}</span>
                      </div>
                      {i < pathNodes.length - 1 && (
                        <div className="flex flex-col items-center gap-1">
                          <ArrowRight size={16} className="text-gray-300" />
                          {pathEdges[i] && (
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {pathEdges[i].type}
                              {pathEdges[i].card ? ` · ${pathEdges[i].card}` : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* JOIN steps */}
            {pathEdges.filter(e => e.join || (e.srcCol && e.tgtCol)).length > 0 && (
              <div>
                <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Join conditions
                </p>
                <div className="space-y-2.5">
                  {pathEdges.map((e, i) => {
                    const from = pathNodes[i]?.name;
                    const to   = pathNodes[i + 1]?.name;
                    if (!e.join && !(e.srcCol && e.tgtCol)) return null;
                    return (
                      <div key={i}
                        className="bg-white/80 backdrop-blur-sm border border-gray-200/70
                                   rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80
                                        border-b border-gray-200/70">
                          <span className="text-[12px] font-medium text-[#374151]">{from}</span>
                          <ArrowRight size={11} className="text-gray-300" />
                          <span className="text-[12px] font-medium text-[#374151]">{to}</span>
                          {e.card && (
                            <span className="ml-auto text-[11px] text-gray-400">{e.card}</span>
                          )}
                        </div>
                        <div className="px-4 py-3">
                          <code className="text-[12.5px] text-emerald-700 font-mono">
                            {e.join || `ON ${to?.toLowerCase().charAt(0)}.${e.tgtCol} = ${from?.toLowerCase().charAt(0)}.${e.srcCol}`}
                          </code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Complete SQL */}
            {joinSQL && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest">
                    Complete SQL
                  </p>
                  <button onClick={() => copy(joinSQL)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]
                               font-medium transition-all text-gray-500 hover:text-gray-700
                               hover:bg-gray-100">
                    {copied ? <ClipboardCheck size={13} className="text-emerald-500" /> : <Clipboard size={13} />}
                    {copied ? 'Copied!' : 'Copy SQL'}
                  </button>
                </div>
                <div className="bg-[#0D1117] rounded-xl overflow-hidden border border-gray-800">
                  <pre className="px-5 py-4 text-[13px] text-emerald-400 font-mono
                                  leading-relaxed overflow-x-auto whitespace-pre">
                    {joinSQL}
                  </pre>
                </div>
              </div>
            )}

            {/* Ask Zevra */}
            <div className="flex gap-3 pt-1">
              <button onClick={askZevra}
                className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-[10px]
                           bg-[#111827] text-white text-[13.5px] font-semibold
                           hover:bg-[#1F2937] transition-colors">
                <MessageSquare size={15} />
                Investigate this path in Zevra
              </button>
              <button onClick={() => copy(joinSQL)}
                className="px-5 py-3 rounded-[10px] border border-gray-200 bg-white/80
                           text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors
                           flex items-center gap-2">
                {copied ? <ClipboardCheck size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
            </div>

          </div>
        )}

        {/* Empty state */}
        {!loading && pathNodes.length === 0 && !error && (
          <div className="text-center py-14">
            <div className="w-16 h-16 rounded-2xl bg-gray-100/80 flex items-center justify-center
                            mx-auto mb-4">
              <Shuffle size={26} className="text-gray-300" />
            </div>
            <p className="text-[14px] font-semibold text-[#374151] mb-2">
              Discover how entities connect
            </p>
            <p className="text-[13px] text-gray-400 max-w-sm mx-auto leading-relaxed">
              Select a start and end entity above. Zevra will find the shortest join chain
              and generate the SQL you need.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const [domains,        setDomains]        = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [entities,       setEntities]       = useState([]);
  const [allEdges,       setAllEdges]       = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [view,           setView]           = useState('explore'); // 'explore' | 'path'
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [search,         setSearch]         = useState('');

  // Fast entity lookup by key
  const entityIndex = useMemo(() => {
    const idx = {};
    entities.forEach(e => { idx[e.entity_key] = e; });
    return idx;
  }, [entities]);

  // Load domains
  useEffect(() => {
    api.domains.list()
      .then(ds => {
        const arr = safeArr(ds);
        setDomains(arr);
        if (arr.length) setSelectedDomain(arr[0].domain_key ?? arr[0].domainKey ?? '');
      })
      .catch(() => {});
  }, []);

  // Load entities + edges for selected domain
  useEffect(() => {
    if (!selectedDomain) return;
    setLoading(true);
    setSelectedEntity(null);
    api.graph.full(selectedDomain)
      .then(data => {
        // GraphNode record serialises as { id, label, node_type, ... }
        // Normalise to consistent shape so all child components use entity_key / entity_name
        const nodes = safeArr(data.nodes).map(n => ({
          ...n,
          entity_key:          n.entity_key          ?? n.id,
          entity_name:         n.entity_name         ?? n.label,
          node_type:           n.node_type           ?? n.nodeType,
          primary_object_key:  n.primary_object_key  ?? n.primaryObjectKey,
          domain_key:          n.domain_key          ?? n.domainKey,
          operational_meaning: n.operational_meaning ?? n.operationalMeaning,
          investigation_hints: n.investigation_hints ?? n.investigationHints,
        }));
        const edges = safeArr(data.edges).map(e => ({
          ...e,
          source:            e.source            ?? e.source_entity_key,
          target:            e.target            ?? e.target_entity_key,
          relationshipType:  e.relationship_type ?? e.relationshipType,
          joinGuidance:      e.join_guidance     ?? e.joinGuidance,
          sourceColumn:      e.source_column     ?? e.sourceColumn,
          targetColumn:      e.target_column     ?? e.targetColumn,
        }));
        setEntities(nodes);
        setAllEdges(edges);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDomain]);

  // Stats
  const stats = useMemo(() => {
    const byType = {};
    entities.forEach(e => {
      const t = e.node_type ?? e.nodeType ?? 'ENTITY';
      byType[t] = (byType[t] || 0) + 1;
    });
    return { total: entities.length, edges: allEdges.length, byType };
  }, [entities, allEdges]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent">

      {/* Page header */}
      <div className="flex-shrink-0 px-7 pt-6 pb-4 bg-white/40 backdrop-blur-sm
                      border-b border-gray-200/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[#111827] tracking-[-0.025em]">
              Knowledge Graph
            </h1>
            <p className="text-[13px] text-gray-400 mt-1">
              {stats.total} entities · {stats.edges} relationships
              {domains.length > 1 && ` in domain ${selectedDomain}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Domain selector */}
            {domains.length > 1 && (
              <select value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                           text-[#111827] bg-white/80 focus:outline-none focus:border-emerald-400
                           transition-colors">
                {domains.map(d => {
                  const k = d.domain_key ?? d.domainKey;
                  return <option key={k} value={k}>{d.name}</option>;
                })}
              </select>
            )}

            {/* View toggle */}
            <div className="flex gap-1 bg-gray-100/80 p-1 rounded-[9px]">
              {[['explore', 'Explore'], ['path', 'Find JOIN path']].map(([k, l]) => (
                <button key={k} onClick={() => setView(k)}
                  className={`px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium transition-all
                    ${view === k
                      ? 'bg-white text-[#111827] shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Left: entity list (always visible) */}
            <EntityList
              entities={entities}
              selected={selectedEntity}
              onSelect={e => { setSelectedEntity(e); setView('explore'); }}
              search={search}
              onSearchChange={setSearch}
            />

            {/* Right: entity detail OR path finder */}
            {view === 'explore' ? (
              selectedEntity ? (
                <EntityDetail
                  entity={selectedEntity}
                  allEdges={allEdges}
                  entityIndex={entityIndex}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-transparent">
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-white/80 border border-gray-200/70
                                    flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Search size={26} className="text-gray-300" />
                    </div>
                    <p className="text-[15px] font-semibold text-[#374151] mb-2">
                      Select an entity
                    </p>
                    <p className="text-[13px] text-gray-400 leading-relaxed">
                      Choose an entity from the list to explore its columns, vocabulary,
                      relationships, and JOIN guidance.
                    </p>
                    <button onClick={() => setView('path')}
                      className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-[8px]
                                 border border-gray-200 bg-white/80 text-[13px] font-medium
                                 text-gray-600 hover:bg-gray-50 transition-colors">
                      <Shuffle size={13} /> Or find a JOIN path between two entities
                    </button>
                  </div>
                </div>
              )
            ) : (
              <JoinPathFinder
                entities={entities}
                allEdges={allEdges}
                entityIndex={entityIndex}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
