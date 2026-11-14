import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTokens(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtCost(usd) {
  if (!usd || usd === 0) return '$0.00';
  if (usd < 0.01) return '<$0.01';
  return '$' + Number(usd).toFixed(2);
}

function periodLabel(p) {
  if (!p) return '';
  const [y, m] = p.split('-');
  return new Date(+y, +m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

const FEATURE_COLORS = {
  agent:   { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  chat:    { bar: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50'    },
  brief:   { bar: 'bg-purple-500',  text: 'text-purple-700',  bg: 'bg-purple-50'  },
  report:  { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  routing: { bar: 'bg-gray-400',    text: 'text-z-text-2',    bg: 'bg-z-card-2'   },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, highlight, isDark }) {
  return (
    <div className={`rounded-2xl border px-6 py-5 ${
      isDark ? 'bg-[#111827] border-[#1E293B]' : 'bg-z-card border-z-border'
    }`}>
      <p className={`text-z-micro font-semibold uppercase tracking-wide mb-1 ${
        isDark ? 'text-[#64748B]' : 'text-z-text-3'
      }`}>{label}</p>
      <p className={`text-z-h2 font-semibold tracking-tight leading-none mb-1 ${
        highlight ? 'text-emerald-600' : isDark ? 'text-[#F0F4F8]' : 'text-z-text'
      }`}>{value}</p>
      {sub && <p className={`text-z-small ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>{sub}</p>}
    </div>
  );
}

function BarChart({ rows, valueKey, labelKey, colorKey, max, isDark }) {
  if (!rows || rows.length === 0) return (
    <p className={`text-z-caption py-6 text-center ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>
      No data for this period
    </p>
  );
  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const val   = Number(row[valueKey] || 0);
        const label = row[labelKey] || '—';
        const pct   = max > 0 ? Math.max(2, (val / max) * 100) : 0;
        const color = (colorKey && FEATURE_COLORS[row[colorKey]]) || FEATURE_COLORS.chat;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-z-caption font-medium capitalize ${isDark ? 'text-[#CBD5E1]' : 'text-z-text-2'}`}>
                {label}
              </span>
              <span className={`text-z-small tabular-nums ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>
                {fmtTokens(val)}
              </span>
            </div>
            <div className={`h-1.5 rounded-full ${isDark ? 'bg-[#1E293B]' : 'bg-z-card-2'}`}>
              <div className={`h-1.5 rounded-full transition-all ${color.bar}`}
                   style={{ width: pct + '%' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DailyChart({ daily, showCost, isDark }) {
  if (!daily || daily.length === 0) return null;
  const maxTokens = Math.max(...daily.map(d => Number(d.total_tokens || 0)), 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-20">
        {daily.map((d, i) => {
          const pct = (Number(d.total_tokens || 0) / maxTokens) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
              <div className={`w-full rounded-t transition-all ${isDark ? 'bg-emerald-700 group-hover:bg-emerald-500' : 'bg-emerald-200 group-hover:bg-emerald-400'}`}
                   style={{ height: Math.max(2, pct * 0.8) + '%' }} />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block
                              bg-gray-900 text-white text-z-nano px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {fmtTokens(d.total_tokens)}
                {showCost && d.cost_usd ? ` · ${fmtCost(d.cost_usd)}` : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className={`text-z-nano ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>
          {daily[0]?.day?.slice(5)}
        </span>
        <span className={`text-z-nano ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>
          {daily[daily.length - 1]?.day?.slice(5)}
        </span>
      </div>
    </div>
  );
}

function Section({ title, children, isDark }) {
  return (
    <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#111827] border-[#1E293B]' : 'bg-z-card border-z-border'}`}>
      <h3 className={`text-z-caption font-semibold mb-4 ${isDark ? 'text-[#CBD5E1]' : 'text-z-text'}`}>{title}</h3>
      {children}
    </div>
  );
}

// ── Tenant view ───────────────────────────────────────────────────────────────

function TenantUsage({ period, isDark }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.usage.summary(period).then(setData).catch(() => {});
  }, [period]);

  if (!data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const totals    = data.totals || {};
  const byFeature = data.by_feature || [];
  const byUser    = data.by_user    || [];
  const byAgent   = data.by_agent   || [];
  const total     = Number(totals.total_tokens || 0);
  const maxFeat   = Math.max(...byFeature.map(r => Number(r.total_tokens || 0)), 1);
  const maxUser   = Math.max(...byUser.map(r => Number(r.total_tokens || 0)), 1);
  const maxAgent  = Math.max(...byAgent.map(r => Number(r.total_tokens || 0)), 1);

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Total Tokens" value={fmtTokens(total)}
          sub={`${fmtTokens(totals.prompt_tokens)} in · ${fmtTokens(totals.completion_tokens)} out`}
          isDark={isDark} />
        <MetricCard label="AI Calls" value={Number(totals.calls || 0).toLocaleString()}
          sub="LLM requests this period" isDark={isDark} />
        <MetricCard label="Top Feature"
          value={byFeature[0]?.feature ? byFeature[0].feature.charAt(0).toUpperCase() + byFeature[0].feature.slice(1) : '—'}
          sub={byFeature[0] ? fmtTokens(byFeature[0].total_tokens) + ' tokens' : ''}
          isDark={isDark} />
        <MetricCard label="Active Agents"
          value={byAgent.length}
          sub="contributed to usage" isDark={isDark} />
      </div>

      {/* Daily chart */}
      {data.daily?.length > 0 && (
        <Section title="Daily Usage" isDark={isDark}>
          <DailyChart daily={data.daily} showCost={false} isDark={isDark} />
        </Section>
      )}

      {/* Feature + Agent breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="By Feature" isDark={isDark}>
          <BarChart rows={byFeature} valueKey="total_tokens" labelKey="feature"
            colorKey="feature" max={maxFeat} isDark={isDark} />
        </Section>
        <Section title="By Agent" isDark={isDark}>
          <BarChart rows={byAgent} valueKey="total_tokens" labelKey="agent_name"
            max={maxAgent} isDark={isDark} />
        </Section>
      </div>

      {/* Users table */}
      {byUser.length > 0 && (
        <Section title="By User" isDark={isDark}>
          <div className="space-y-2.5">
            {byUser.map((u, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-z-nano font-semibold text-white flex-shrink-0">
                    {(u.user_email || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <span className={`text-z-caption ${isDark ? 'text-[#CBD5E1]' : 'text-z-text-2'}`}>
                    {u.user_email}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-z-caption font-semibold tabular-nums ${isDark ? 'text-[#F0F4F8]' : 'text-z-text'}`}>
                    {fmtTokens(u.total_tokens)}
                  </span>
                  <span className={`text-z-micro ml-1.5 ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>tokens</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Platform admin view (with cost) ──────────────────────────────────────────

function PlatformUsage({ period, isDark }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.usage.admin(period).then(setData).catch(() => {});
  }, [period]);

  if (!data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const byTenant  = data.by_tenant || [];
  const totalCost = byTenant.reduce((s, t) => s + Number(t.cost_usd || 0), 0);
  const totalTok  = byTenant.reduce((s, t) => s + Number(t.total_tokens || 0), 0);
  const totalCalls= byTenant.reduce((s, t) => s + Number(t.calls || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Total Cost" value={fmtCost(totalCost)}
          sub={periodLabel(period)} highlight isDark={isDark} />
        <MetricCard label="Total Tokens" value={fmtTokens(totalTok)}
          sub="across all workspaces" isDark={isDark} />
        <MetricCard label="AI Calls" value={totalCalls.toLocaleString()}
          sub="LLM requests" isDark={isDark} />
        <MetricCard label="Active Workspaces" value={byTenant.length}
          sub="with usage this period" isDark={isDark} />
      </div>

      {/* Daily chart */}
      {data.daily?.length > 0 && (
        <Section title="Daily Cost & Usage" isDark={isDark}>
          <DailyChart daily={data.daily} showCost isDark={isDark} />
        </Section>
      )}

      {/* Per-tenant table */}
      <Section title="Usage by Workspace" isDark={isDark}>
        {byTenant.length === 0 ? (
          <p className={`text-z-caption text-center py-6 ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>
            No usage recorded for this period
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isDark ? 'border-b border-[#1E293B]' : 'border-b border-z-border'}>
                  {['Workspace', 'Tokens', 'Calls', 'Cost'].map(h => (
                    <th key={h} className={`pb-2.5 text-left text-z-micro font-semibold uppercase tracking-wide ${isDark ? 'text-[#64748B]' : 'text-z-text-3'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byTenant.map((t, i) => (
                  <tr key={i} className={`border-t ${isDark ? 'border-[#1E293B]' : 'border-gray-50'}`}>
                    <td className={`py-3 text-z-caption font-medium ${isDark ? 'text-[#CBD5E1]' : 'text-z-text'}`}>
                      {t.tenant_schema?.replace(/^tenant_/, '').replace(/_/g, '-') || 'default'}
                    </td>
                    <td className={`py-3 text-z-caption tabular-nums ${isDark ? 'text-[#94A3B8]' : 'text-z-text-2'}`}>
                      {fmtTokens(t.total_tokens)}
                    </td>
                    <td className={`py-3 text-z-caption tabular-nums ${isDark ? 'text-[#94A3B8]' : 'text-z-text-2'}`}>
                      {Number(t.calls).toLocaleString()}
                    </td>
                    <td className={`py-3 text-z-caption font-semibold tabular-nums ${
                      Number(t.cost_usd) > 1 ? 'text-emerald-600' : isDark ? 'text-[#94A3B8]' : 'text-z-text-2'
                    }`}>
                      {fmtCost(t.cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Usage() {
  const { user }  = useAuth();
  const { isDark } = useTheme();
  const isPlatformAdmin = user?.role === 'ADMIN' &&
    (!user?.tenant_schema || user?.tenant_schema === 'public');

  // Period picker — current month and last 5 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });
  const [period, setPeriod] = useState(months[0]);

  const sub = isDark ? 'text-[#64748B]' : 'text-z-text-3';

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className={`text-z-h3 font-semibold ${isDark ? 'text-[#F0F4F8]' : 'text-z-text'}`}>
              {isPlatformAdmin ? 'Platform Usage & Cost' : 'Usage'}
            </h1>
            <p className={`text-z-caption mt-1 ${sub}`}>
              {isPlatformAdmin
                ? 'AI consumption and estimated cost across all workspaces'
                : 'Your workspace AI consumption this period'}
            </p>
          </div>

          {/* Period selector */}
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-z-caption focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
              isDark ? 'bg-[#111827] border-[#1E293B] text-[#CBD5E1]' : 'bg-z-card border-z-border text-z-text-2'
            }`}>
            {months.map(m => (
              <option key={m} value={m}>{periodLabel(m)}</option>
            ))}
          </select>
        </div>

        {isPlatformAdmin
          ? <PlatformUsage period={period} isDark={isDark} />
          : <TenantUsage   period={period} isDark={isDark} />
        }

      </div>
    </div>
  );
}
