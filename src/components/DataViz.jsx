import React, { useEffect, useMemo, useRef, useState } from 'react';
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
// The first two slots track the live theme accent (see useThemedAccents below) — resolved to a
// literal color, never a raw `var(--...)` string, because SVG presentation ATTRIBUTES (fill=,
// stroke=, <stop stopColor=>) do not reliably repaint custom-property values across renderers —
// confirmed empirically: getComputedStyle correctly resolves the cascaded color, but the bar/area
// paint can still come out blank. Inline `style={{...}}` usages (a real CSS context) don't have
// this problem — only bare presentation-attribute strings do. The rest of the palette is a fixed
// categorical set, chosen to stay legible against both the light and dark surfaces.
const STATIC_PALETTE = ['#d99a3d', '#a78bda', '#e0729a', '#4fb8a0', '#6ea3e8', '#e0685f'];

// Resolves --z-primary / --z-investigating / --z-hover to literal colors from the actual
// cascaded value at `ref`'s DOM node (not assumed to live on <html> — works regardless of where
// an ancestor sets [data-theme]), and re-resolves whenever the theme attribute changes.
function useThemedAccents(ref) {
  const [accents, setAccents] = useState({ primary: '#0f7a58', investigating: '#2f6fb0', hover: 'rgba(15,23,42,0.04)' });
  useEffect(() => {
    if (!ref.current) return undefined;
    const resolve = () => {
      const cs = getComputedStyle(ref.current);
      const primary = cs.getPropertyValue('--z-primary').trim();
      const investigating = cs.getPropertyValue('--z-investigating').trim();
      const hover = cs.getPropertyValue('--z-hover').trim();
      setAccents((prev) => ({
        primary: primary || prev.primary,
        investigating: investigating || prev.investigating,
        hover: hover || prev.hover,
      }));
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [ref]);
  return accents;
}

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
    <div className="rounded-xl border px-4 py-3 text-[13px] shadow-z-2"
         style={{ minWidth: 140, background: 'var(--z-card)', borderColor: 'var(--z-border)' }}>
      {label != null && (
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--z-text-3)' }}>
          {truncate(String(label), 24)}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-5 mb-0.5 last:mb-0">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--z-text-2)' }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--z-text)' }}>{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chart components ──────────────────────────────────────────────────────────

const AXIS_STYLE = { fontSize: 12, fill: 'var(--z-text-3)', fontFamily: 'inherit' };
const GRID_STYLE = { stroke: 'var(--z-border)', strokeDasharray: '0' };

function ZevraBarChart({ rows, config, palette, hoverColor }) {
  const { xKey, yKeys } = config;
  const many = rows.length > 6;

  return (
    <ResponsiveContainer width="100%" height={115}>
      <BarChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: many ? 24 : 4 }}
                barCategoryGap="32%" barGap={3}>
        <CartesianGrid vertical={false} {...GRID_STYLE} />
        <XAxis dataKey={xKey} tick={{ ...AXIS_STYLE, ...(many ? { angle: -35, textAnchor: 'end' } : {}) }}
               axisLine={false} tickLine={false}
               tickFormatter={v => truncate(String(v), many ? 10 : 14)} />
        <YAxis tickFormatter={fmtNum} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: hoverColor }} />
        {yKeys.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--z-text-3)', paddingTop: 4 }} />
        )}
        {yKeys.map((col, i) => (
          <Bar key={col.key} dataKey={col.key} name={col.label} isAnimationActive={false}
               fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} maxBarSize={48} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ZevraAreaChart({ rows, config, palette }) {
  const { xKey, yKeys } = config;
  const isSingle = yKeys.length === 1;

  return (
    <ResponsiveContainer width="100%" height={115}>
      <AreaChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
        <defs>
          {yKeys.map((col, i) => (
            <linearGradient key={col.key} id={`vz-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={palette[i % palette.length]} stopOpacity={0.15} />
              <stop offset="100%" stopColor={palette[i % palette.length]} stopOpacity={0}    />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} {...GRID_STYLE} />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} axisLine={false} tickLine={false}
               tickFormatter={v => truncate(String(v), 10)} />
        <YAxis tickFormatter={fmtNum} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<ChartTooltip />} />
        {!isSingle && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--z-text-3)', paddingTop: 4 }} />}
        {yKeys.map((col, i) => (
          <Area key={col.key} type="monotone" dataKey={col.key} name={col.label} isAnimationActive={false}
                stroke={palette[i % palette.length]} strokeWidth={2}
                fill={`url(#vz-grad-${i})`}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatCards({ rows, config, palette }) {
  const { numerics } = config;
  const row = rows[0];
  const cols = numerics.slice(0, 4);
  return (
    <div className={`grid gap-3 ${cols.length >= 3 ? 'grid-cols-3' : cols.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {cols.map((col, i) => (
        <div key={col.key}
             className="rounded-xl border px-5 py-4"
             style={{ borderColor: 'var(--z-border)', background: 'linear-gradient(160deg, var(--z-primary-soft) 0%, var(--z-card) 100%)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5 truncate" style={{ color: 'var(--z-text-3)' }}>
            {col.label}
          </p>
          <p className="text-[28px] font-bold tracking-tight leading-none"
             style={{ color: palette[i % palette.length] }}>
            {fmtNum(row[col.key])}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Backend visualization intent ────────────────────────────────────────────────
// ResponseArtifacts.evidence can carry a CHART entry {chartType, xKey, yKeys} — the backend's
// own read of what kind of evidence this is, computed from the same column-shape rules as
// selectConfig (see ResponseArtifactsBuilder.evidence(), sei-nexus-ai). Preferred when present
// and still valid against the actual rows (a hint referencing a column this response doesn't
// have is ignored, never trusted blindly) — falls back to selectConfig's own inference
// otherwise, so older/legacy responses render exactly as before.
function configFromHint(rows, cols, hint) {
  if (!hint || !hint.chartType) return null;
  const colKeys = new Set(cols.map((c) => c.key));
  const byKey = Object.fromEntries(cols.map((c) => [c.key, c]));

  if (hint.chartType === 'stats') {
    const numerics = (hint.yKeys || []).filter((k) => colKeys.has(k)).map((k) => byKey[k]);
    return numerics.length ? { chart: 'stats', numerics } : null;
  }
  if (hint.chartType === 'area' || hint.chartType === 'bar') {
    if (!hint.xKey || !colKeys.has(hint.xKey)) return null;
    const yKeys = (hint.yKeys || []).filter((k) => colKeys.has(k)).map((k) => byKey[k]);
    if (!yKeys.length) return null;
    const xCol = byKey[hint.xKey];
    return { chart: hint.chartType, xKey: xCol.key, xLabel: xCol.label, yKeys };
  }
  return null;
}

// ── Public component ──────────────────────────────────────────────────────────

const CHART_TITLES = {
  bar:   'Distribution',
  area:  'Trend over time',
  stats: 'Key metrics',
};

export default function DataViz({ queryData, chartHint }) {
  const rootRef = useRef(null);
  const accents = useThemedAccents(rootRef);
  const palette = useMemo(
    () => [accents.primary, accents.investigating, ...STATIC_PALETTE],
    [accents.primary, accents.investigating],
  );

  const cols   = useMemo(() => analyzeColumns(queryData), [queryData]);
  const config = useMemo(
    () => configFromHint(queryData, cols, chartHint) || selectConfig(queryData, cols),
    [queryData, cols, chartHint],
  );

  if (!config) return null;

  return (
    <div ref={rootRef} className="mt-2 pt-2 border-t border-z-border">
      <div className="flex items-center mb-1.5 gap-2">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-z-text-3">
          {CHART_TITLES[config.chart]}
        </span>
        <span className="ml-auto text-[11px] text-z-text-muted">
          {queryData.length.toLocaleString()} row{queryData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {config.chart === 'bar'   && <ZevraBarChart  rows={queryData} config={config} palette={palette} hoverColor={accents.hover} />}
      {config.chart === 'area'  && <ZevraAreaChart rows={queryData} config={config} palette={palette} />}
      {config.chart === 'stats' && <StatCards      rows={queryData} config={config} palette={palette} />}
    </div>
  );
}
