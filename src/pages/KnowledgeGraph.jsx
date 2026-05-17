import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../api.js';
import {
  Search, RefreshCw, Maximize2, X, Database,
  ArrowRight, ChevronRight, Layers,
} from 'lucide-react';

// ── design tokens ─────────────────────────────────────────────────────────────

const CANVAS_BG = '#0E1117';

const NODE_STYLES = {
  ENTITY:      { color: '#10B981', glow: '#10B98150', radius: 14, label: 'Entity' },
  TRANSACTION: { color: '#3B82F6', glow: '#3B82F650', radius: 13, label: 'Transaction' },
  REFERENCE:   { color: '#8B5CF6', glow: '#8B5CF650', radius: 12, label: 'Reference' },
  METRIC:      { color: '#F59E0B', glow: '#F59E0B50', radius: 12, label: 'Metric' },
  EVENT:       { color: '#EC4899', glow: '#EC489950', radius: 11, label: 'Event' },
  DETAIL:      { color: '#06B6D4', glow: '#06B6D450', radius: 11, label: 'Detail' },
  DEFAULT:     { color: '#6B7280', glow: '#6B728050', radius: 11, label: 'Node' },
};

function nodeStyle(nodeType) {
  return NODE_STYLES[nodeType] || NODE_STYLES.DEFAULT;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function safeArray(v) { return Array.isArray(v) ? v : []; }
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }
function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
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
    id:               e.id               ?? e.relationship_key ?? `${e.source ?? e.source_entity_key}-${e.target ?? e.target_entity_key}`,
    source:           e.source           ?? e.source_entity_key,
    target:           e.target           ?? e.target_entity_key,
    relationshipType: e.relationship_type?? e.relationshipType,
    sourceColumn:     e.source_column    ?? e.sourceColumn,
    targetColumn:     e.target_column    ?? e.targetColumn,
    joinGuidance:     e.join_guidance    ?? e.joinGuidance,
    cardinality:      e.cardinality,
    bidirectional:    e.bidirectional    ?? false,
    edgeColor:        e.edge_color       ?? e.edgeColor ?? '#374151',
  };
}

// ── detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ node, edges, onClose, onExpand }) {
  if (!node) return null;
  const style   = nodeStyle(node.nodeType);
  const outbound = edges.filter(e => (typeof e.source === 'object' ? e.source.id : e.source) === node.id);
  const inbound  = edges.filter(e => (typeof e.target === 'object' ? e.target.id : e.target) === node.id);
  const tableName = node.primaryObjectKey
    ? node.primaryObjectKey.split('-').slice(3).join('_') || node.primaryObjectKey
    : null;

  return (
    <div className="absolute top-0 right-0 h-full w-[340px] flex flex-col bg-[#13181F] border-l border-white/8 z-20 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-white/8" style={{ borderTopColor: style.color, borderTopWidth: 2 }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: style.color + '25', color: style.color }}
              >
                {node.nodeType}
              </span>
              {node.groupLabel && (
                <span className="text-xs text-white/35">{node.groupLabel}</span>
              )}
            </div>
            <h3 className="text-[17px] font-bold text-white leading-tight">{node.label}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onExpand(node.id)}
              title="Expand 2-hop neighbours"
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {tableName && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-white/40 font-mono">
            <Database size={11} />
            {tableName}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">

        {/* Description */}
        {node.description && (
          <p className="text-sm text-white/60 leading-relaxed">{node.description}</p>
        )}

        {/* Operational meaning */}
        {node.operationalMeaning && (
          <div>
            <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">Operational meaning</p>
            <p className="text-sm text-white/70 leading-relaxed">{node.operationalMeaning}</p>
          </div>
        )}

        {/* Investigation hint */}
        {node.investigationHints && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-4 py-3">
            <p className="text-xs font-semibold text-amber-400 mb-1.5">💡 Investigation hint</p>
            <p className="text-xs text-amber-300/80 leading-relaxed font-mono break-words">
              {node.investigationHints}
            </p>
          </div>
        )}

        {/* Relationships */}
        {(outbound.length > 0 || inbound.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Relationships</p>
            <div className="space-y-2">
              {outbound.map((e, i) => {
                const tid = typeof e.target === 'object' ? e.target.id : e.target;
                const tStyle = nodeStyle(null);
                return (
                  <div key={`out-${i}`} className="flex items-center gap-2.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.edgeColor || '#374151' }} />
                    <span className="text-white/80 font-medium truncate">{tid}</span>
                    <ArrowRight size={10} className="text-white/25 shrink-0" />
                    <span className="text-white/40 shrink-0">{e.relationshipType}</span>
                    {e.cardinality && <span className="ml-auto text-white/25 shrink-0">{e.cardinality}</span>}
                  </div>
                );
              })}
              {inbound.map((e, i) => {
                const sid = typeof e.source === 'object' ? e.source.id : e.source;
                return (
                  <div key={`in-${i}`} className="flex items-center gap-2.5 text-xs opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 opacity-50" style={{ backgroundColor: e.edgeColor || '#374151' }} />
                    <span className="text-white/60 truncate">← {sid}</span>
                    <span className="text-white/30 shrink-0">{e.relationshipType}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* JOIN guidance */}
        {outbound.some(e => e.joinGuidance) && (
          <div>
            <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">JOIN guidance</p>
            <div className="space-y-2">
              {outbound.filter(e => e.joinGuidance).map((e, i) => {
                const tid = typeof e.target === 'object' ? e.target.id : e.target;
                return (
                  <div key={i} className="rounded-lg bg-[#0E1117] border border-white/8 overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-white/8 text-2xs text-white/30 font-medium">
                      → {tid}
                    </div>
                    <pre className="px-3 py-2 text-xs text-emerald-400 font-mono leading-relaxed overflow-x-auto">
                      {e.joinGuidance}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3 border-t border-white/8">
        <button
          onClick={() => onExpand(node.id)}
          className="w-full h-9 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
          style={{ backgroundColor: style.color + '20', color: style.color }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = style.color + '30'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = style.color + '20'}
        >
          <Maximize2 size={14} />
          Expand neighbours
        </button>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  const [domains, setDomains]               = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [graphData, setGraphData]           = useState({ nodes: [], links: [] });
  const [rawEdges, setRawEdges]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [selectedNode, setSelectedNode]     = useState(null);
  const [search, setSearch]                 = useState('');
  const [hoverNode, setHoverNode]           = useState(null);

  // track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    return () => ro.disconnect();
  }, []);

  // load domains
  useEffect(() => {
    api.domains.list()
      .then(ds => {
        const arr = safeArray(ds);
        setDomains(arr);
        if (arr.length) setSelectedDomain(arr[0].domain_key ?? arr[0].domainKey);
      })
      .catch(() => {});
  }, []);

  // load graph
  const loadGraph = useCallback(async (domainKey) => {
    if (!domainKey) return;
    setLoading(true);
    setError('');
    setSelectedNode(null);
    try {
      const data = await api.graph.full(domainKey);
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

  // expand neighbours
  const expandNeighbors = useCallback(async (entityKey) => {
    setLoading(true);
    try {
      const data = await api.graph.neighbors(entityKey, 2);
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
    } catch {}
    finally { setLoading(false); }
  }, []);

  // search-filtered highlight sets
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

  // canvas: draw node
  const drawNode = useCallback((node, ctx, globalScale) => {
    const style    = nodeStyle(node.nodeType);
    const color    = node.color || style.color;
    const x        = finiteNumber(node.x);
    const y        = finiteNumber(node.y);
    const r        = Math.max(1, finiteNumber(style.radius, 11));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
    const isSelected = selectedNode?.id === node.id;
    const isHover    = hoverNode?.id === node.id;
    const isDimmed   = highlightNodes && !highlightNodes.has(node.id) && !isSelected;
    const alpha      = isDimmed ? 0.15 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // glow for selected / hover
    if (isSelected || isHover) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = isSelected ? 22 : 12;
    }

    // outer ring for selected
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = color + '60';
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // node fill with radial gradient
    const grad = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, 0,
      x, y, r
    );
    grad.addColorStop(0, lighten(color, 0.35));
    grad.addColorStop(1, color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // border
    ctx.strokeStyle = isSelected ? '#fff' : color + 'AA';
    ctx.lineWidth   = isSelected ? 2 : 1;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // label — always visible, sized by zoom
    const label    = truncate(node.label, 18);
    const fontSize = Math.max(isSelected ? 11 : 9, Math.min(13, 11 / Math.max(0.6, globalScale)));
    ctx.font       = `${isSelected ? '700' : '500'} ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle  = isSelected ? '#fff' : 'rgba(255,255,255,0.85)';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';

    // label background pill
    const tw = ctx.measureText(label).width;
    const lx = x - tw / 2 - 4;
    const ly = y + r + 4;
    ctx.fillStyle = 'rgba(14,17,23,0.75)';
    ctx.beginPath();
    ctx.roundRect(lx, ly, tw + 8, fontSize + 5, 3);
    ctx.fill();

    ctx.fillStyle  = isSelected ? '#fff' : 'rgba(255,255,255,0.80)';
    ctx.fillText(label, x, ly + 2.5);

    ctx.restore();
  }, [selectedNode, hoverNode, highlightNodes]);

  // canvas: link
  const linkColor = useCallback((link) => {
    const isDimmed = highlightLinks && !highlightLinks.has(link);
    const base = link.edgeColor || '#374151';
    return isDimmed ? base + '18' : base + 'BB';
  }, [highlightLinks]);

  const linkWidth = useCallback((link) => {
    return highlightLinks?.has(link) ? 2.5 : 1.2;
  }, [highlightLinks]);

  // stats
  const stats = useMemo(() => {
    const groups = {};
    graphData.nodes.forEach(n => {
      const g = n.groupLabel || 'General';
      groups[g] = (groups[g] || 0) + 1;
    });
    return { nodes: graphData.nodes.length, edges: graphData.links.length, groups };
  }, [graphData]);

  const panelOpen = !!selectedNode;
  const canvasW   = panelOpen ? Math.max(200, dims.w - 340) : dims.w;
  const canvasH   = Math.max(200, dims.h - 56);

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: CANVAS_BG }}>

      {/* ── left: graph canvas ── */}
      <div ref={containerRef} className="flex-1 flex flex-col relative overflow-hidden">

        {/* Toolbar */}
        <div className="shrink-0 h-14 flex items-center gap-3 px-5 border-b border-white/8 bg-[#13181F]/80 backdrop-blur z-10">

          {/* Domain */}
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-white/30" />
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="h-8 bg-white/8 border border-white/10 rounded-lg text-sm text-white/80 px-2.5 focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
            >
              {domains.map(d => {
                const k = d.domain_key ?? d.domainKey;
                return <option key={k} value={k} className="bg-gray-900">{d.name}</option>;
              })}
            </select>
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nodes…"
              className="h-8 w-44 bg-white/8 border border-white/10 rounded-lg pl-8 pr-3 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-3 text-xs text-white/30">
            <span>{stats.nodes} nodes</span>
            <span className="w-px h-3 bg-white/10" />
            <span>{stats.edges} edges</span>
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Zoom fit */}
          <button
            onClick={() => graphRef.current?.zoomToFit(400, 60)}
            className="h-8 px-3 rounded-lg bg-white/8 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/12 transition-colors flex items-center gap-1.5"
          >
            <Maximize2 size={13} /> Fit
          </button>

          {/* Reload */}
          <button
            onClick={() => loadGraph(selectedDomain)}
            disabled={loading}
            className="h-8 w-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/12 transition-colors disabled:opacity-30"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0E1117]/80 z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-[3px] border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm text-white/40">Loading graph…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg z-10">
              {error}
            </div>
          )}

          {!loading && graphData.nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
              <div className="text-8xl mb-4 opacity-30">⬡</div>
              <p className="text-lg font-medium">No entities in this domain</p>
              <p className="text-sm mt-1">Add entities via the Semantic Layer page.</p>
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
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={linkColor}
            linkCurvature={0.15}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={link => highlightLinks?.has(link) ? 3 : 1.5}
            linkDirectionalParticleSpeed={0.003}
            linkDirectionalParticleColor={linkColor}
            nodeCanvasObject={drawNode}
            nodeCanvasObjectMode={() => 'replace'}
            onNodeClick={node => setSelectedNode(prev => prev?.id === node.id ? null : node)}
            onNodeHover={setHoverNode}
            onBackgroundClick={() => { setSelectedNode(null); setSearch(''); }}
            cooldownTicks={150}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.35}
            backgroundColor={CANVAS_BG}
            nodePointerAreaPaint={(node, color, ctx) => {
              const x = finiteNumber(node.x);
              const y = finiteNumber(node.y);
              const r = Math.max(1, finiteNumber(nodeStyle(node.nodeType).radius, 11) + 6);
              if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, 2 * Math.PI);
              ctx.fill();
            }}
          />

          {/* Legend */}
          <div className="absolute bottom-5 left-5 rounded-xl bg-[#13181F]/90 backdrop-blur border border-white/8 px-4 py-3 z-10">
            <p className="text-2xs font-semibold text-white/30 uppercase tracking-widest mb-2.5">Node types</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
              {Object.entries(NODE_STYLES).filter(([k]) => k !== 'DEFAULT').map(([type, s]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}80` }} />
                  <span className="text-xs text-white/45">{s.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-2xs text-white/20">Click node · Scroll to zoom · Drag to pan</p>
          </div>

          {/* Group summary */}
          {Object.keys(stats.groups).length > 0 && !panelOpen && (
            <div className="absolute bottom-5 right-5 rounded-xl bg-[#13181F]/90 backdrop-blur border border-white/8 px-4 py-3 z-10">
              <p className="text-2xs font-semibold text-white/30 uppercase tracking-widest mb-2.5">Groups</p>
              <div className="space-y-1.5">
                {Object.entries(stats.groups).map(([g, c]) => (
                  <div key={g} className="flex items-center justify-between gap-6">
                    <span className="text-xs text-white/50">{g}</span>
                    <span className="text-xs font-semibold text-white/70">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── right: detail panel ── */}
      {panelOpen && (
        <DetailPanel
          node={selectedNode}
          edges={rawEdges}
          onClose={() => setSelectedNode(null)}
          onExpand={expandNeighbors}
        />
      )}
    </div>
  );
}

// ── colour util ───────────────────────────────────────────────────────────────

function lighten(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
