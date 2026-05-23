import { useCallback, useEffect, useState } from 'react';
import {
  Activity, Brain, CheckCircle2, ChevronRight, Database, Globe,
  Package, RefreshCw, Shield, ShieldCheck, Zap,
} from 'lucide-react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';

// ── helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'text-emerald-600' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className={`text-[28px] font-black ${color} leading-none`}>{value ?? '—'}</p>
      <p className="text-[13px] font-semibold text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-[11.5px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, linkLabel, linkTarget, color = 'bg-emerald-50', iconColor = 'text-emerald-600' }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={17} className={iconColor} />
        </div>
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
      </div>
      {linkLabel && linkTarget && (
        <button onClick={() => navigate(linkTarget)}
          className="flex items-center gap-1 text-[12.5px] font-medium text-emerald-700 hover:text-emerald-900 transition-colors">
          {linkLabel} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ── Settings page ─────────────────────────────────────────────────────────────

export default function Settings() {
  const [loading,       setLoading]       = useState(true);
  const [packData,      setPackData]       = useState({ applied: [], available: [] });
  const [govData,       setGovData]        = useState({ columns: 0, rls: 0, contracts: 0, auditTotal: 0 });
  const [learnData,     setLearnData]      = useState({ total: 0, promoted: 0, avgConf: 0 });
  const [sysData,       setSysData]        = useState({ connections: 0, agents: 0, domains: 0, entities: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        applied, allPacks, columns, rls, contracts, audit,
        learnings, connections, agents, domains,
      ] = await Promise.allSettled([
        api.industryPacks.applied(),
        api.industryPacks.list(),
        api.governance.columnPolicies.list(),
        api.governance.rlsPolicies.list(),
        api.governance.contracts.list(),
        api.governance.audit.list({ size: 1 }),
        api.semantic.learnings.list(''),
        api.connections.list(),
        api.agents.list(),
        api.domains.list(),
      ]);

      const val = r => r.status === 'fulfilled' ? r.value : null;

      setPackData({
        applied:   Array.isArray(val(applied))  ? val(applied)  : [],
        available: Array.isArray(val(allPacks)) ? val(allPacks) : [],
      });

      setGovData({
        columns:    Array.isArray(val(columns))   ? val(columns).length   : 0,
        rls:        Array.isArray(val(rls))        ? val(rls).length        : 0,
        contracts:  Array.isArray(val(contracts))  ? val(contracts).length  : 0,
        auditTotal: val(audit)?.total ?? 0,
      });

      const lArr = Array.isArray(val(learnings)) ? val(learnings) : [];
      setLearnData({
        total:    lArr.length,
        promoted: lArr.filter(l => l.promoted).length,
        avgConf:  lArr.length
          ? Math.round(lArr.reduce((s, l) => s + (l.confidence || 0), 0) / lArr.length * 100)
          : 0,
      });

      setSysData({
        connections: Array.isArray(val(connections)) ? val(connections).length : 0,
        agents:      Array.isArray(val(agents))      ? val(agents).filter(a => a.status !== 'ARCHIVED').length : 0,
        domains:     Array.isArray(val(domains))     ? val(domains).length     : 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeApplied = packData.applied.filter(p => p.status === 'ACTIVE');

  return (
    <div className="h-full overflow-y-auto bg-[#F7F8FA]">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Platform Settings</h1>
              <p className="text-[13.5px] text-gray-500 mt-0.5">
                Overview of all four advanced capabilities and system configuration.
              </p>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* ── Phase 1: Governance ───────────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={Shield} title="Governance" linkLabel="Manage policies"
            linkTarget="/governance" color="bg-slate-50" iconColor="text-slate-600" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard label="Column masking policies" value={govData.columns}
              sub="Sensitive columns protected" color="text-slate-700" />
            <StatCard label="Row filter policies" value={govData.rls}
              sub="Active RLS filters" color="text-violet-600" />
            <StatCard label="Data contracts" value={govData.contracts}
              sub="Query safety rules" color="text-indigo-600" />
            <StatCard label="Audit events" value={govData.auditTotal?.toLocaleString()}
              sub="Compliance records" color="text-gray-600" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['Add column policy', '/governance'],
                ['Add row filter',    '/governance'],
                ['Add data contract', '/governance'],
                ['View audit log',    '/governance'],
                ['Test simulator',    '/governance'],
                ['Set user attributes', '/governance'],
              ].map(([label, path]) => (
                <button key={label} onClick={() => navigate(path)}
                  className="px-3 py-1.5 text-[12px] font-medium bg-gray-50 border border-gray-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Phase 3: Semantic Learning ───────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={Brain} title="Semantic Learning" linkLabel="View learnings"
            linkTarget="/semantic" color="bg-emerald-50" iconColor="text-emerald-600" />
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <StatCard label="Learned mappings" value={learnData.total}
              sub="Business terms auto-extracted" color="text-emerald-600" />
            <StatCard label="Promoted to vocabulary" value={learnData.promoted}
              sub="Graduated to formal terms" color="text-emerald-700" />
            <StatCard label="Average confidence" value={learnData.total > 0 ? `${learnData.avgConf}%` : '—'}
              sub="Across all learned terms" color="text-emerald-500" />
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-[12.5px] text-emerald-800 leading-relaxed">
              Zevra learns from every query. Terms reach the vocabulary automatically when confidence ≥ 80% with 10+ uses.
              Corrections and positive feedback adjust confidence in real time.
              Manage learned terms in <button onClick={() => navigate('/semantic')} className="font-semibold underline">Semantic Layer → Learned</button>.
            </p>
          </div>
        </section>

        {/* ── Phase 4: Industry Packs ──────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={Package} title="Industry Context Packs"
            linkLabel="Browse packs" linkTarget="/semantic"
            color="bg-indigo-50" iconColor="text-indigo-600" />
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <StatCard label="Available packs" value={packData.available.length}
              sub="Healthcare, Hospitality, Logistics, Retail, Finance"
              color="text-indigo-500" />
            <StatCard label="Applied packs" value={activeApplied.length}
              sub="Pre-built entities and vocabulary in use" color="text-indigo-700" />
          </div>
          {activeApplied.length > 0 && (
            <div className="space-y-2">
              {activeApplied.map(tp => (
                <div key={tp.pack_key}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{tp.display_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 max-w-[160px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${Math.round((tp.coverage_score || 0) * 100)}%` }} />
                      </div>
                      <span className="text-[11.5px] text-gray-500">
                        {Math.round((tp.coverage_score || 0) * 100)}% entity coverage
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
          {activeApplied.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
              <Package size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-[13px] text-gray-500 mb-3">No packs applied yet</p>
              <button onClick={() => navigate('/semantic')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold rounded-xl transition-all">
                Browse packs
              </button>
            </div>
          )}
        </section>

        {/* ── System ───────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={Database} title="System" color="bg-gray-100" iconColor="text-gray-600" />
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <StatCard label="Database connections" value={sysData.connections}
              sub="Active data sources" color="text-gray-700" />
            <StatCard label="Active agents" value={sysData.agents}
              sub="Configured investigation agents" color="text-gray-700" />
            <StatCard label="Domains" value={sysData.domains}
              sub="Business domains in this tenant" color="text-gray-700" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Navigation shortcuts</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { label: 'Investigations',   path: '/chat',        icon: Zap,         color: 'text-emerald-600' },
                { label: 'Semantic Layer',   path: '/semantic',    icon: Brain,       color: 'text-emerald-600' },
                { label: 'Governance Hub',   path: '/governance',  icon: Shield,      color: 'text-slate-600' },
                { label: 'Knowledge Graph',  path: '/graph',       icon: Globe,       color: 'text-violet-600' },
                { label: 'Connections',      path: '/connections', icon: Database,    color: 'text-blue-600' },
                { label: 'Agents',           path: '/agents',      icon: Activity,    color: 'text-indigo-600' },
              ].map(({ label, path, icon: Icon, color }) => (
                <button key={path} onClick={() => navigate(path)}
                  className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left">
                  <Icon size={14} className={color} />
                  <span className="text-[13px] font-medium text-gray-700">{label}</span>
                  <ChevronRight size={12} className="ml-auto text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
