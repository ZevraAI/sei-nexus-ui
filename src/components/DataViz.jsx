import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ── Brand palette ──────────────────────────────────────────────────────────────
const PALETTE = [
  '#0C5847', '#2DBFA8', '#3B82F6', '#8B5CF6',
  '#F59E0B', '#EF4444', '#EC4899', '#10B981',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000)         return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Number.isInteger(n) ? n.toLocaleString() : parseFloat(n.toFixed(2)).toLocaleString();
}

function fmtLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function truncate(str, max = 14) {
  const s = String(str ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ── Column type detection ─────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$|^\d{2}\/\d{2}\/\d{4}$|^\d{4}\/\d{2}\/\d{2}$/;

function detectType(values) {
  const nonNull = values.filter(v => v != null && v !== '');
  if (!nonNull.length) return 'null';
  if (nonNull.every(v => typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(String(v))))) return 'numeric';
  if (nonNull.every(v => DATE_RE.test(String(v)))) return 'date';
  return 'categorical';
}

function analyzeColumns(rows) {
  if (!rows?.length) return [];
  return Object.keys(rows[0]).map(key => ({
    key,
    label: fmtLabel(key),
    type: detectType(rows.map(r => r[key])),
    uniqueCount: new Set(rows.map(r => String(r[key]))).size,
  }));
}

// ── Chart selection ───────────────────────────────────────────────────────────
// Rules (in priority order):
//  1. Single row, ≥1 numeric → stat cards
//  2. Date/time + numeric, ≥2 rows → area / line chart
//  3. Categorical + numeric, 2–30 rows → bar chart
//  4. Otherwise → null (no chart rendered)

function selectConfig(rows, cols) {
  const n = rows.length;
  const numerics     = cols.filter(c => c.type === 'numeric');
  const categoricals = cols.filter(c => c.type === 'categorical');
  const dates        = cols.filter(c => c.type === 'date');

  if (!numerics.length || n === 0) return null;

  if (n === 1 && numerics.length >= 1)
    return { chart: 'stats', numerics };

  if (dates.length >= 1 && n >= 2 && n <= 200)
    return { chart: 'area', xKey: dates[0].key, xLabel: dates[0].label, yKeys: numerics.slice(0, 3) };

  if (categoricals.length >= 1 && n >= 2 && n <= 30) {
    const xCol = [...categoricals].sort((a, b) => a.uniqueCount - b.uniqueCount)[0];
    return { chart: 'bar', xKey: xCol.key, xLabel: xCol.label, yKeys: numerics.slice(0, 2) };
  }

  return null;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-xl px-4 py-3 text-[13px]"
         style={{ minWidth: 140 }}>
      {label != null && (
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {truncate(String(label), 24)}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-5 mb-0.5 last:mb-0">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-900 tabular-nums">{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chart components ──────────────────────────────────────────────────────────

const AXIS_STYLE = { fontSize: 12, fill: '#9CA3AF', fontFamily: 'inherit' };
const GRID_STYLE = { stroke: '#F3F4F6', strokeDasharray: '0' };

function ZevraBarChart({ rows, config }) {
  const { xKey, yKeys } = config;
  const many = rows.length > 6;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: many ? 24 : 4 }}
                barCategoryGap="32%" barGap={3}>
        <CartesianGrid vertical={false} {...GRID_STYLE} />
        <XAxis dataKey={xKey} tick={{ ...AXIS_STYLE, ...(many ? { angle: -35, textAnchor: 'end' } : {}) }}
               axisLine={false} tickLine={false}
               tickFormatter={v => truncate(String(v), many ? 10 : 14)} />
        <YAxis tickFormatter={fmtNum} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
        {yKeys.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 8 }} />
        )}
        {yKeys.map((col, i) => (
          <Bar key={col.key} dataKey={col.key} name={col.label}
               fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} maxBarSize={48} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ZevraAreaChart({ rows, config }) {
  const { xKey, yKeys } = config;
  const isSingle = yKeys.length === 1;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
        <defs>
          {yKeys.map((col, i) => (
            <linearGradient key={col.key} id={`vz-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.15} />
              <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0}    />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} {...GRID_STYLE} />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} axisLine={false} tickLine={false}
               tickFormatter={v => truncate(String(v), 10)} />
        <YAxis tickFormatter={fmtNum} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<ChartTooltip />} />
        {!isSingle && <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 8 }} />}
        {yKeys.map((col, i) => (
          <Area key={col.key} type="monotone" dataKey={col.key} name={col.label}
                stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
                fill={`url(#vz-grad-${i})`}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatCards({ rows, config }) {
  const { numerics } = config;
  const row = rows[0];
  const cols = numerics.slice(0, 4);
  return (
    <div className={`grid gap-3 ${cols.length >= 3 ? 'grid-cols-3' : cols.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {cols.map((col, i) => (
        <div key={col.key}
             className="rounded-xl border border-gray-100 bg-gradient-to-br from-[#f0faf5] to-white px-5 py-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 truncate">
            {col.label}
          </p>
          <p className="text-[28px] font-bold tracking-tight leading-none"
             style={{ color: PALETTE[i % PALETTE.length] }}>
            {fmtNum(row[col.key])}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

const CHART_TITLES = {
  bar:   'Distribution',
  area:  'Trend over time',
  stats: 'Key metrics',
};

export default function DataViz({ queryData }) {
  const cols   = useMemo(() => analyzeColumns(queryData), [queryData]);
  const config = useMemo(() => selectConfig(queryData, cols), [queryData, cols]);

  if (!config) return null;

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex items-center mb-3 gap-2">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
          {CHART_TITLES[config.chart]}
        </span>
        <span className="ml-auto text-[11px] text-gray-300">
          {queryData.length.toLocaleString()} row{queryData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {config.chart === 'bar'   && <ZevraBarChart  rows={queryData} config={config} />}
      {config.chart === 'area'  && <ZevraAreaChart rows={queryData} config={config} />}
      {config.chart === 'stats' && <StatCards      rows={queryData} config={config} />}
    </div>
  );
}
