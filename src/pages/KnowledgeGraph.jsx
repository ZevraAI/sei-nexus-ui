import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import {
  ArrowRight, Code, Database, ExternalLink, Layers,
  Maximize2, MessageSquare, Network, RefreshCw, Search, X,
} from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CANVAS_BG = '#0D1117';

const NODE_STYLES = {
  ENTITY:      { color: '#10B981', radius: 15, abbr: 'E',  label: 'Entity'      },
  TRANSACTION: { color: '#3B82F6', radius: 14, abbr: 'T',  label: 'Transaction' },
  REFERENCE:   { color: '#8B5CF6', radius: 13, abbr: 'R',  label: 'Reference'   },
  METRIC:      { color: '#F59E0B', radius: 13, abbr: 'M',  label: 'Metric'      },
  EVENT:       { color: '#EC4899', radius: 12, abbr: 'EV', label: 'Event'       },
  DETAIL:      { color: '#06B6D4', radius: 12, abbr: 'D',  label: 'Detail'      },
  DEFAULT:     { color: '#6B7280', radius: 12, abbr: '?',  label: 'Node'        },
};

const REL_COLORS = {
  HAS_MANY:    '#10B981',
  BELONGS_TO:  '#3B82F6',
  REFERENCES:  '#8B5CF6',
  LINKED_VIA:  '#F59E0B',
};

function nodeStyle(t) { return NODE_STYLES[t] || NODE_STYLES.DEFAULT; }

// ── Normalise API shapes ───────────────────────────────────────────────────────

function safeArray(v) { return Array.isArray(v) ? v : []; }
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }
function finiteNumber(v, fb = 0) { return Number.isFinite(v) ? v : fb; }
function lighten(hex, a) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, ((n>>16)&0xff) + Math.round(255*a));
  const g = Math.min(255, ((n>>8)&0xff)  + Math.round(255*a));
  const b = Math.min(255, (n&0xff)        + Math.round(255*a));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function normaliseNode(n) {
  return {
    id:                 n.id                ?? n.entity_key,
    label:              n.label             ?? n.entity_name,
    nodeType:           n.node_type         ?? n.nodeType         ?? 'DEFAULT',
    color:              n.color             ?? null,
    groupLabel:         n.group_label       ?? n.groupLabel,
    domainKey:          n.domain_key        ?? n.domainKey,
    description:        n.description,
    primaryObjectKey:   n.primary_object_key?? n.primaryObjectKey,
    operationalMeaning: n.operational_meaning ?? n.operationalMeaning,
    investigationHints: n.investigation_hints ?? n.investigationHints,
    status:             n.status,
  };
}

function normaliseEdge(e) {
  return {
    id:               e.id ?? e.relationship_key
                      ?? `${e.source ?? e.source_entity_key}→${e.target ?? e.target_entity_key}`,
    source:           e.source           ?? e.source_entity_key,
    target:           e.target           ?? e.target_entity_key,
    relationshipType: e.relationship_type ?? e.relationshipType,
    sourceColumn:     e.source_column    ?? e.sourceColumn,
    targetColumn:     e.target_column    ?? e.targetColumn,
    joinGuidance:     e.join_guidance    ?? e.joinGuidance,
    cardinality:      e.cardinality,
    bidirectional:    e.bidirectional    ?? false,
    edgeColor:        e.edge_color       ?? e.edgeColor
                      ?? REL_COLORS[e.relationship_type] ?? '#4B5563',
  };
}

// ── EntityBadge ───────────────────────────────────────────────────────────────

function EntityBadge({ nodeType, style: s }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
          style={{ background: s.color + '25', color: s.color }}>
      {nodeType || 'ENTITY'}
    </span>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ node, edges, nodeIndex, onClose, onExpand }) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!node) return null;

  const style    = nodeStyle(node.nodeType);
  const outbound = edges.filter(e => (typeof e.source === 'object' ? e.source.id : e.source) === node.id);
  const inbound  = edges.filter(e => (typeof e.target === 'object' ? e.target.id : e.target) === node.id);
  const tableName = node.primaryObjectKey
    ? (node.primaryObjectKey.split('-').slice(3).join('_') || node.primaryObjectKey)
    : null;

  const resolveLabel = (id) => nodeIndex[id]?.label || id;

  const askZevra = () => {
    const q = `Tell me about ${node.label}. What are the key metrics, current status, and any anomalies I should know about?`;
    localStorage.setItem('zevra_chat_prefill', q);
    navigate('/chat');
  };

  const TABS = [
    ['overview',  'Overview'],
    ['relations', `Relations (${outbound.length + inbound.length})`],
    ['sql',       'JOIN Paths'],
  ];

  return (
    <div className="absolute top-0 right-0 h-full w-[360px] flex flex-col z-20 overflow-hidden"
         style={{ background: '#13181F', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Colour bar + header */}
      <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/8"
           style={{ borderTopColor: style.color, borderTopWidth: 3 }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <EntityBadge nodeType={node.nodeType} style={style} />
            {node.groupLabel && (
              <span className="text-[11px] text-white/35 font-medium">{node.groupLabel}</span>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onExpand(node.id)} title="Expand neighbours"
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/40
                         hover:text-white hover:bg-white/10 transition-colors">
              <Maximize2 size={13} />
            </button>
            <button onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/40
                         hover:text-white hover:bg-white/10 transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>

        <h3 className="text-[18px] font-bold text-white leading-tight mb-1">{node.label}</h3>

        {tableName && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/35 font-mono">
            <Database size={10} /> {tableName}
          </div>
        )}

        {/* CTA — Ask Zevra */}
        <button onClick={askZevra}
          className="mt-3 w-full h-8 rounded-[8px] flex items-center justify-center gap-2
                     text-[12.5px] font-semibold transition-all"
          style={{ background: style.color + '22', color: style.color }}
          onMouseEnter={e => e.currentTarget.style.background = style.color + '35'}
          onMouseLeave={e => e.currentTarget.style.background = style.color + '22'}>
          <MessageSquare size={13} />
          Ask Zevra about {node.label}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8 shrink-0">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`flex-1 py-2.5 text-[11.5px] font-medium transition-colors border-b-2 -mb-px
              ${activeTab === k
                ? 'text-white border-current'
                : 'text-white/35 border-transparent hover:text-white/60'}`}
            style={activeTab === k ? { borderColor: style.color } : {}}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="px-5 py-4 space-y-4">
            {node.description && (
              <p className="text-[13px] text-white/65 leading-relaxed">{node.description}</p>
            )}

            {node.operationalMeaning && (
              <div>
                <p className="text-[10.5px] font-semibold text-white/30 uppercase tracking-widest mb-2">
                  How it's used
                </p>
                <p className="text-[13px] text-white/70 leading-relaxed">{node.operationalMeaning}</p>
              </div>
            )}

            {node.investigationHints && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
                <p className="text-[10.5px] font-semibold text-amber-400/80 uppercase tracking-widest mb-2">
                  💡 Investigation hint
                </p>
                <code className="text-[11.5px] text-amber-300/85 leading-relaxed break-words
                                  whitespace-pre-wrap font-mono">
                  {node.investigationHints}
                </code>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: 'Outbound', value: outbound.length },
                { label: 'Inbound',  value: inbound.length  },
                { label: 'JOIN paths', value: outbound.filter(e => e.joinGuidance).length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-[8px] px-3 py-2.5 text-center">
                  <div className="text-[18px] font-bold text-white">{value}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {!node.description && !node.operationalMeaning && (
              <p className="text-[13px] text-white/30 text-center py-4">
                No description yet. Add one in the Semantic Layer.
              </p>
            )}
          </div>
        )}

        {/* Relations */}
        {activeTab === 'relations' && (
          <div className="px-5 py-4 space-y-4">
            {outbound.length > 0 && (
              <div>
                <p className="text-[10.5px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
                  Connects to
                </p>
                <div className="space-y-2">
                  {outbound.map((e, i) => {
                    const tid  = typeof e.target === 'object' ? e.target.id : e.target;
                    const tLbl = resolveLabel(tid);
                    const rColor = REL_COLORS[e.relationshipType] ?? '#6B7280';
                    return (
                      <div key={i}
                        className="flex items-center gap-2.5 p-2.5 rounded-[9px] bg-white/5
                                   hover:bg-white/8 transition-colors">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-white/85 truncate">{tLbl}</div>
                          <div className="text-[11px] text-white/35 mt-0.5 flex items-center gap-1">
                            <span style={{ color: rColor }}>{e.relationshipType}</span>
                            {e.sourceColumn && e.targetColumn && (
                              <span className="text-white/25">·  {e.sourceColumn} = {e.targetColumn}</span>
                            )}
                            {e.cardinality && (
                              <span className="ml-auto text-white/25">{e.cardinality}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={12} className="text-white/20 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {inbound.length > 0 && (
              <div>
                <p className="text-[10.5px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
                  Referenced by
                </p>
                <div className="space-y-2">
                  {inbound.map((e, i) => {
                    const sid  = typeof e.source === 'object' ? e.source.id : e.source;
                    const sLbl = resolveLabel(sid);
                    return (
                      <div key={i}
                        className="flex items-center gap-2.5 p-2.5 rounded-[9px] bg-white/5
                                   hover:bg-white/8 transition-colors opacity-70">
                        <div className="w-2 h-2 rounded-full shrink-0 opacity-50"
                             style={{ background: e.edgeColor || '#6B7280' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-white/70 truncate">{sLbl}</div>
                          <div className="text-[11px] text-white/30 mt-0.5">
                            {e.relationshipType}
                          </div>
                        </div>
                        <ArrowRight size={12} className="text-white/20 shrink-0 rotate-180" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {outbound.length === 0 && inbound.length === 0 && (
              <div className="py-8 text-center text-[13px] text-white/30">
                No relationships defined yet.
              </div>
            )}
          </div>
        )}

        {/* JOIN paths */}
        {activeTab === 'sql' && (
          <div className="px-5 py-4 space-y-3">
            {outbound.filter(e => e.joinGuidance).length === 0 ? (
              <div className="py-8 text-center text-[13px] text-white/30">
                No JOIN paths defined yet.<br/>
                <span className="text-[11.5px] text-white/20">
                  Add join_guidance in the Semantic Layer to see SQL paths here.
                </span>
              </div>
            ) : (
              outbound.filter(e => e.joinGuidance).map((e, i) => {
                const tid  = typeof e.target === 'object' ? e.target.id : e.target;
                const tLbl = resolveLabel(tid);
                return (
                  <div key={i} className="rounded-xl border border-white/8 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/8">
                      <Code size={11} className="text-white/30" />
                      <span className="text-[11.5px] font-medium text-white/50">
                        {node.label} → {tLbl}
                      </span>
                      {e.cardinality && (
                        <span className="ml-auto text-[10.5px] text-white/25">{e.cardinality}</span>
                      )}
                    </div>
                    <pre className="px-3 py-3 text-[12px] text-emerald-400 font-mono
                                    leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {e.joinGuidance}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 px-4 py-3 border-t border-white/8 flex gap-2">
        <button onClick={() => onExpand(node.id)}
          className="flex-1 h-8 rounded-[8px] text-[12px] font-medium flex items-center
                     justify-center gap-1.5 text-white/50 hover:text-white bg-white/6
                     hover:bg-white/10 transition-all">
          <Maximize2 size={12} /> Expand
        </button>
        <button onClick={() => navigate('/semantic')}
          className="flex-1 h-8 rounded-[8px] text-[12px] font-medium flex items-center
                     justify-center gap-1.5 text-white/50 hover:text-white bg-white/6
                     hover:bg-white/10 transition-all">
          <ExternalLink size={12} /> Edit entity
        </button>
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats, loading }) {
  return (
    <div className="flex items-center gap-5 px-5 py-2.5 border-b border-white/8 bg-[#0D1117]/80
                    backdrop-blur flex-shrink-0">
      <div className="flex items-center gap-2">
        <Network size={13} className="text-white/30" />
        <span className="text-[12px] text-white/50">
          <strong className="text-white/80">{loading ? '…' : stats.nodes}</strong> entities
        </span>
      </div>
      <div className="w-px h-4 bg-white/10" />
      <span className="text-[12px] text-white/50">
        <strong className="text-white/80">{loading ? '…' : stats.edges}</strong> relationships
      </span>
      {Object.entries(stats.types || {}).map(([type, count]) => {
        const s = nodeStyle(type);
        return (
          <React.Fragment key={type}>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-[12px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-white/40">{s.label}</span>
              <strong className="text-white/70">{count}</strong>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend({ visible }) {
  if (!visible) return null;
  return (
    <div className="absolute bottom-5 left-5 rounded-xl border border-white/10
                    bg-[#13181F]/95 backdrop-blur px-4 py-3 z-10">
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">
        Entity types
      </p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
        {Object.entries(NODE_STYLES).filter(([k]) => k !== 'DEFAULT').map(([type, s]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0"
                 style={{ background: s.color, boxShadow: `0 0 6px ${s.color}80` }} />
            <span className="text-[11px] text-white/45">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2.5 border-t border-white/8 space-y-1.5">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-1.5">
          Relationships
        </p>
        {Object.entries(REL_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-6 h-px" style={{ background: color }} />
            <span className="text-[11px] text-white/40">{type}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/20 mt-2.5">
        Click · Scroll to zoom · Drag to pan
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const graphRef     = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  const [domains,         setDomains]         = useState([]);
  const [selectedDomain,  setSelectedDomain]  = useState('');
  const [graphData,       setGraphData]       = useState({ nodes: [], links: [] });
  const [rawEdges,        setRawEdges]        = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [selectedNode,    setSelectedNode]    = useState(null);
  const [hoverNode,       setHoverNode]       = useState(null);
  const [search,          setSearch]          = useState('');

  // Container size tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Load domains on mount
  useEffect(() => {
    api.domains.list()
      .then(ds => {
        const arr = safeArray(ds);
        setDomains(arr);
        if (arr.length) setSelectedDomain(arr[0].domain_key ?? arr[0].domainKey ?? '');
      })
      .catch(() => {});
  }, []);

  // Load graph when domain changes
  const loadGraph = useCallback(async (domainKey) => {
    if (!domainKey) return;
    setLoading(true);
    setError('');
    setSelectedNode(null);
    try {
      const data  = await api.graph.full(domainKey);
      const nodes = safeArray(data.nodes).map(normaliseNode);
      const edges = safeArray(data.edges).map(normaliseEdge);
      setRawEdges(edges);
      setGraphData({ nodes, links: edges });
      setTimeout(() => graphRef.current?.zoomToFit(600, 80), 600);
    } catch (err) {
      setError(err.message || 'Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGraph(selectedDomain); }, [selectedDomain, loadGraph]);

  // Expand neighbours (called from panel)
  const expandNeighbors = useCallback(async (entityKey) => {
    setLoading(true);
    try {
      const data     = await api.graph.neighbors(entityKey, 2);
      const newNodes = safeArray(data.nodes).map(normaliseNode);
      const newEdges = safeArray(data.edges).map(normaliseEdge);
      setGraphData(prev => {
        const existIds  = new Set(prev.nodes.map(n => n.id));
        const existLIds = new Set(prev.links.map(l => l.id));
        return {
          nodes: [...prev.nodes, ...newNodes.filter(n => !existIds.has(n.id))],
          links: [...prev.links, ...newEdges.filter(e => !existLIds.has(e.id))],
        };
      });
      setRawEdges(prev => {
        const ids = new Set(prev.map(e => e.id));
        return [...prev, ...newEdges.filter(e => !ids.has(e.id))];
      });
    } catch (err) {
      setError(err.message || 'Failed to expand neighbours');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search highlight sets
  const { highlightNodes, highlightLinks } = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return { highlightNodes: null, highlightLinks: null };
    const hNodes = new Set(
      graphData.nodes
        .filter(n => n.label?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q))
        .map(n => n.id)
    );
    const hLinks = new Set(
      graphData.links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return hNodes.has(s) || hNodes.has(t);
      })
    );
    return { highlightNodes: hNodes, highlightLinks: hLinks };
  }, [search, graphData]);

  // Fast node lookup map for resolving labels in the panel
  const nodeIndex = useMemo(() => {
    const idx = {};
    graphData.nodes.forEach(n => { idx[n.id] = n; });
    return idx;
  }, [graphData.nodes]);

  // Canvas draw: node
  const drawNode = useCallback((node, ctx, globalScale) => {
    const s          = nodeStyle(node.nodeType);
    const color      = node.color || s.color;
    const x          = finiteNumber(node.x);
    const y          = finiteNumber(node.y);
    const r          = Math.max(1, finiteNumber(s.radius, 12));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const isSelected = selectedNode?.id === node.id;
    const isHover    = hoverNode?.id    === node.id;
    const isDimmed   = (highlightNodes && !highlightNodes.has(node.id) && !isSelected);
    const alpha      = isDimmed ? 0.12 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow
    if (isSelected || isHover) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = isSelected ? 28 : 14;
    }

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, 2 * Math.PI);
      ctx.strokeStyle = color + '55';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }

    // Node fill with radial gradient
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, lighten(color, 0.4));
    g.addColorStop(1, color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = g;
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected ? '#ffffff' : color + 'AA';
    ctx.lineWidth   = isSelected ? 2 : 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Abbreviation inside node
    const abbr     = s.abbr ?? node.nodeType?.charAt(0) ?? '?';
    const abbrSize = Math.max(8, r * 0.7);
    ctx.font       = `700 ${abbrSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle  = 'rgba(255,255,255,0.9)';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(abbr, x, y);

    // Label pill below node
    const label    = truncate(node.label, 20);
    const fontSize = Math.max(isSelected ? 11 : 9, Math.min(13, 11 / Math.max(0.5, globalScale)));
    ctx.font       = `${isSelected ? '700' : '500'} ${fontSize}px Inter, system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    const lx = x - tw / 2 - 5;
    const ly = y + r + 4;

    ctx.fillStyle = 'rgba(13,17,23,0.80)';
    ctx.beginPath();
    ctx.roundRect(lx, ly, tw + 10, fontSize + 6, 4);
    ctx.fill();

    ctx.fillStyle   = isSelected ? '#ffffff' : 'rgba(255,255,255,0.82)';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, ly + 3);

    ctx.restore();
  }, [selectedNode, hoverNode, highlightNodes]);

  const linkColor = useCallback((link) => {
    const dimmed = highlightLinks && !highlightLinks.has(link);
    const base   = link.edgeColor || '#4B5563';
    return dimmed ? base + '15' : base + 'CC';
  }, [highlightLinks]);

  const linkWidth = useCallback((link) => {
    return highlightLinks?.has(link) ? 2.5 : 1;
  }, [highlightLinks]);

  // Stats
  const stats = useMemo(() => {
    const types = {};
    graphData.nodes.forEach(n => {
      const t = n.nodeType || 'DEFAULT';
      types[t] = (types[t] || 0) + 1;
    });
    return { nodes: graphData.nodes.length, edges: graphData.links.length, types };
  }, [graphData]);

  const panelOpen = !!selectedNode;
  const canvasW   = panelOpen ? Math.max(300, dims.w - 360) : dims.w;
  const canvasH   = Math.max(300, dims.h - 92); // subtract toolbar + stats

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: CANVAS_BG }}>

      {/* ── Canvas column ── */}
      <div ref={containerRef} className="flex-1 flex flex-col relative overflow-hidden">

        {/* Toolbar */}
        <div className="shrink-0 h-[52px] flex items-center gap-3 px-5 border-b border-white/8
                        bg-[#13181F]/80 backdrop-blur z-10">

          {/* Domain selector */}
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-white/30" />
            <select value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="h-8 bg-white/8 border border-white/12 rounded-lg text-[13px]
                         text-white/80 px-2.5 focus:outline-none focus:border-emerald-500/50
                         appearance-none cursor-pointer min-w-[120px]">
              {domains.map(d => {
                const k = d.domain_key ?? d.domainKey;
                return <option key={k} value={k} style={{ background: '#1a1f2e' }}>{d.name}</option>;
              })}
            </select>
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search entities…"
              className="h-8 w-48 bg-white/8 border border-white/12 rounded-lg pl-8 pr-3
                         text-[13px] text-white/80 placeholder:text-white/25
                         focus:outline-none focus:border-emerald-500/50 transition-colors" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Stats summary (compact) */}
          <div className="flex items-center gap-3 ml-auto text-[12px] text-white/35">
            <span><strong className="text-white/70">{stats.nodes}</strong> entities</span>
            <span className="w-px h-3 bg-white/10" />
            <span><strong className="text-white/70">{stats.edges}</strong> relationships</span>
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Fit */}
          <button onClick={() => graphRef.current?.zoomToFit(400, 60)}
            className="h-8 px-3 rounded-lg bg-white/8 border border-white/12 text-[12.5px]
                       text-white/60 hover:text-white hover:bg-white/12 flex items-center gap-1.5
                       transition-colors">
            <Maximize2 size={12} /> Fit
          </button>

          {/* Reload */}
          <button onClick={() => loadGraph(selectedDomain)} disabled={loading}
            className="w-8 h-8 rounded-lg bg-white/8 border border-white/12 flex items-center
                       justify-center text-white/60 hover:text-white hover:bg-white/12
                       disabled:opacity-30 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats bar */}
        <StatsBar stats={stats} loading={loading} />

        {/* Canvas */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0D1117]/70 z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-[3px] border-emerald-500/30 border-t-emerald-500
                                rounded-full animate-spin" />
                <p className="text-[13px] text-white/40">Loading graph…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2.5
                            bg-red-500/15 border border-red-500/30 text-red-400
                            text-[13px] rounded-xl">
              {error}
            </div>
          )}

          {!loading && graphData.nodes.length === 0 && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
              <Network size={48} className="mb-4 opacity-30" />
              <p className="text-[16px] font-semibold mb-2">No entities in this domain</p>
              <p className="text-[13px]">Complete onboarding or add entities via the Semantic Layer</p>
            </div>
          )}

          <ForceGraph2D
            ref={graphRef}
            width={canvasW}
            height={canvasH}
            graphData={graphData}
            nodeId="id"
            nodeLabel={() => ''}
            linkSource="source"
            linkTarget="target"
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkDirectionalArrowLength={7}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={linkColor}
            linkCurvature={0.2}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={l => highlightLinks?.has(l) ? 3 : 1.5}
            linkDirectionalParticleSpeed={0.003}
            linkDirectionalParticleColor={linkColor}
            nodeCanvasObject={drawNode}
            nodeCanvasObjectMode={() => 'replace'}
            onNodeClick={node => {
              setSelectedNode(prev => prev?.id === node.id ? null : node);
              // Centre graph on clicked node
              graphRef.current?.centerAt(finiteNumber(node.x), finiteNumber(node.y), 400);
            }}
            onNodeHover={setHoverNode}
            onBackgroundClick={() => { setSelectedNode(null); setSearch(''); }}
            cooldownTicks={150}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.35}
            backgroundColor={CANVAS_BG}
            nodePointerAreaPaint={(node, color, ctx) => {
              const x = finiteNumber(node.x), y = finiteNumber(node.y);
              const r = Math.max(1, finiteNumber(nodeStyle(node.nodeType).radius, 12) + 8);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, 2 * Math.PI);
              ctx.fill();
            }}
          />

          <Legend visible={graphData.nodes.length > 0 && !loading} />
        </div>
      </div>

      {/* ── Detail panel ── */}
      {panelOpen && (
        <DetailPanel
          node={selectedNode}
          edges={rawEdges}
          nodeIndex={nodeIndex}
          onClose={() => setSelectedNode(null)}
          onExpand={expandNeighbors}
        />
      )}
    </div>
  );
}
