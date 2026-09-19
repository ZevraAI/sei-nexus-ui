import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { BarChart3, TrendingUp, Activity, PieChart as PieChartIcon } from 'lucide-react';

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

// Purely mechanical, meaning-blind display transform for a raw CATEGORICAL VALUE (not a column
// name/label — see fmtLabel above for that) — e.g. an enum like PARTIALLY_RECEIVED or a
// snake_case string rendered as a chart category. Same category of helper as fmtLabel/colLabel
// (casing/punctuation only, zero awareness of what the value means, no lookup table of any
// kind) — never applied to a value that already looks like free/human-authored text (contains
// whitespace) or has no separator/casing signal to normalize, so a genuinely free-text value
// (a name, a description) passes through unchanged. Never applied to date/time axis values —
// callers only ever use this for a categorical (non-time) axis or a table/legend value.
function fmtValue(v) {
  const s = String(v ?? '');
  if (!s) return s;
  if (/[_-]/.test(s) && !/\s/.test(s)) {
    return s.toLowerCase().replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  if (/^[A-Z0-9][A-Z0-9\s]*$/.test(s) && /[A-Z]/.test(s) && s.length > 1) {
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  return s;
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
//  3. Categorical + exactly one numeric, 2–6 rows, one row per distinct category value
//     (uniqueCount === rowCount — a clean "category → count" breakdown, e.g. status counts)
//     → donut chart
//  4. Categorical + numeric, 2–30 rows → bar chart (the higher-cardinality / multi-numeric
//     fallback — unchanged from before, so nothing that used to render a bar regresses)
//  5. Otherwise → null (no chart rendered)
//
// The donut rule is intentionally narrow (2–6 rows, single numeric column, one row per
// category) so it only claims the "small status/category breakdown" shape the reference
// mockup shows (e.g. "Orders by Status": OPEN/PARTIAL/CLOSED, one count each) — anything with
// more categories, more than one numeric column, or repeated category values (a shape a donut
// can't represent cleanly) still falls through to the existing bar-chart rule below it.

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

  if (categoricals.length >= 1 && numerics.length === 1 && n >= 2 && n <= 6) {
    const xCol = [...categoricals].sort((a, b) => a.uniqueCount - b.uniqueCount)[0];
    if (xCol.uniqueCount === n) {
      return { chart: 'donut', xKey: xCol.key, xLabel: xCol.label, yKeys: numerics };
    }
  }

  if (categoricals.length >= 1 && n >= 2 && n <= 30) {
    const xCol = [...categoricals].sort((a, b) => a.uniqueCount - b.uniqueCount)[0];
    return { chart: 'bar', xKey: xCol.key, xLabel: xCol.label, yKeys: numerics.slice(0, 2) };
  }

  return null;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const displayLabel = labelFormatter ? labelFormatter(label) : label;
  return (
    <div className="rounded-xl border px-4 py-3 text-[13px] shadow-z-2"
         style={{ minWidth: 140, background: 'var(--z-card)', borderColor: 'var(--z-border)' }}>
      {label != null && (
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--z-text-3)' }}>
          {truncate(String(displayLabel), 24)}
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

// Bar charts here are always rendered over a categorical x-axis (a date/time axis routes to
// ZevraAreaChart instead — see selectConfig/configFromHint) — so per-category coloring is safe
// for every bar chart, never a time series. Per-category <Cell> coloring + value labels are
// scoped to the single-series case (one yKey): that is the exact "group by category" shape
// (e.g. records by status) this exists for — a multi-series bar chart keeps its existing
// per-series solid coloring instead, since the Legend already disambiguates series and painting
// each bar a different color per category would conflict with that legend.
function ZevraBarChart({ rows, config, palette, hoverColor }) {
  const { xKey, yKeys } = config;
  const many = rows.length > 6;
  const singleSeries = yKeys.length === 1;

  return (
    <ResponsiveContainer width="100%" height={115}>
      <BarChart data={rows} margin={{ top: singleSeries ? 18 : 4, right: 8, left: -8, bottom: many ? 24 : 4 }}
                barCategoryGap="32%" barGap={3}>
        <CartesianGrid vertical={false} {...GRID_STYLE} />
        <XAxis dataKey={xKey} tick={{ ...AXIS_STYLE, ...(many ? { angle: -35, textAnchor: 'end' } : {}) }}
               axisLine={false} tickLine={false}
               tickFormatter={v => truncate(fmtValue(v), many ? 10 : 14)} />
        <YAxis tickFormatter={fmtNum} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<ChartTooltip labelFormatter={fmtValue} />} cursor={{ fill: hoverColor }} />
        {yKeys.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--z-text-3)', paddingTop: 4 }} />
        )}
        {yKeys.map((col, i) => (
          <Bar key={col.key} dataKey={col.key} name={col.label} isAnimationActive={false}
               fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} maxBarSize={48}>
            {singleSeries && rows.map((_, ri) => <Cell key={ri} fill={palette[ri % palette.length]} />)}
            {singleSeries && (
              <LabelList dataKey={col.key} position="top" formatter={fmtNum}
                         style={{ fontSize: 10, fontWeight: 600, fill: 'var(--z-text-2)' }} />
            )}
          </Bar>
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

// A donut with the total (across all rows/slices) + a generic "records" label in the center
// hole, and a side legend of {dot, category label, count (percentage)} per slice — the exact
// composition the reference mockup shows for a small status/category breakdown. "records" is
// the same deliberately generic noun the rest of this file already uses for an unlabeled
// collection of rows (see the row-count line under CHART_TITLES) — never a fabricated
// business noun like "orders". The percentage is plain client-side arithmetic over the real
// per-slice counts (value / total), not a new semantic value.
function ZevraDonutChart({ rows, config, palette }) {
  const { xKey, yKeys } = config;
  const valueKey = yKeys[0].key;
  const slices = rows.map((r, i) => ({
    name: fmtValue(r[xKey]),
    value: parseFloat(r[valueKey]) || 0,
    color: palette[i % palette.length],
  }));
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-none" style={{ width: 115, height: 115 }}>
        <ResponsiveContainer width="100%" height={115}>
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={32} outerRadius={52} paddingAngle={2} stroke="none" isAnimationActive={false}>
              {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[16px] font-bold leading-none text-z-text">{fmtNum(total)}</span>
          <span className="mt-0.5 text-[9px] uppercase tracking-wide text-z-text-3">records</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5 text-[11.5px]">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 truncate text-z-text-2">{truncate(s.name, 18)}</span>
            <span className="ml-auto flex-none font-semibold tabular-nums text-z-text">
              {fmtNum(s.value)} ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
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
// Applies the backend's optional, purely presentational LLM-authored value labels (see
// ReasoningPlanner.SYSTEM_PROMPT's OPTIONAL HUMAN-READABLE LABELS guidance, relayed verbatim as
// Evidence.yLabels/hint.yLabels) over the mechanical fmtLabel() label each column already carries
// — only when every hinted key survived the existence filter AND the label list is the exact same
// length (a mechanical alignment safety check, never a semantic one), so a label can never end up
// attached to the wrong column. A blank individual entry leaves that one column's mechanical
// label untouched — the model may supply some labels and omit others.
function withLabelOverrides(hintKeys, resolvedCols, labels) {
  if (!labels || !labels.length || hintKeys.length !== resolvedCols.length || labels.length !== hintKeys.length) {
    return resolvedCols;
  }
  return resolvedCols.map((c, i) => (labels[i] && labels[i].trim()) ? { ...c, label: labels[i].trim() } : c);
}

function configFromHint(rows, cols, hint) {
  if (!hint || !hint.chartType) return null;
  const colKeys = new Set(cols.map((c) => c.key));
  const byKey = Object.fromEntries(cols.map((c) => [c.key, c]));

  if (hint.chartType === 'stats') {
    const rawKeys = hint.yKeys || [];
    const numerics = withLabelOverrides(rawKeys,
      rawKeys.filter((k) => colKeys.has(k)).map((k) => byKey[k]), hint.yLabels);
    return numerics.length ? { chart: 'stats', numerics } : null;
  }
  if (hint.chartType === 'area' || hint.chartType === 'bar' || hint.chartType === 'donut') {
    if (!hint.xKey || !colKeys.has(hint.xKey)) return null;
    const rawKeys = hint.yKeys || [];
    const yKeys = withLabelOverrides(rawKeys,
      rawKeys.filter((k) => colKeys.has(k)).map((k) => byKey[k]), hint.yLabels);
    if (!yKeys.length) return null;
    const xCol = byKey[hint.xKey];
    const xLabel = (hint.xLabel && hint.xLabel.trim()) ? hint.xLabel.trim() : xCol.label;
    return { chart: hint.chartType, xKey: xCol.key, xLabel, yKeys };
  }
  return null;
}

// ── Public component ──────────────────────────────────────────────────────────

// Presentational-only helper for callers that need to know ahead of render whether a given
// dataset will actually produce a chart (e.g. to decide whether to show a chart card's
// wrapper at all) — reuses the exact same column analysis + selection rules as the component
// below (analyzeColumns/configFromHint/selectConfig), so "will this render a chart" can never
// drift from "did this render a chart". No new chart-selection logic, no semantics changed.
export function hasChartConfig(rows, chartHint) {
  if (!rows?.length) return false;
  const cols = analyzeColumns(rows);
  return !!(configFromHint(rows, cols, chartHint) || selectConfig(rows, cols));
}

// Presentational label used as the chart card's header when no real per-dataset title/purpose
// exists upstream (see EvidenceVisualizationGrid in Chat.jsx, which threads the DATASET
// section's own `title`/`purpose` through as the `title` prop when the backend supplied one —
// this map is only the honest, generic fallback, in the same naming style as the existing
// 'Distribution' / 'Trend over time' / 'Key metrics' labels, never a fabricated business phrase).
const CHART_TITLES = {
  bar:   'Distribution',
  area:  'Trend over time',
  stats: 'Key metrics',
  donut: 'Breakdown',
};

// One small colored icon badge per CHART TYPE (not per business dataset — DataViz has no
// knowledge of "buyer" vs "timeline" semantics, only the shape of the rows it was given, so
// distinguishing by chart type is the honest generic equivalent of the mockup's per-dataset
// icon treatment).
const CHART_ICONS = {
  bar:   { Icon: BarChart3,    bg: 'bg-z-investigating-soft', fg: 'text-z-investigating' },
  area:  { Icon: TrendingUp,   bg: 'bg-z-primary-soft',       fg: 'text-z-primary' },
  stats: { Icon: Activity,     bg: 'bg-z-info-soft',          fg: 'text-z-info' },
  donut: { Icon: PieChartIcon, bg: 'bg-z-warning-soft',       fg: 'text-z-warning' },
};

export default function DataViz({ queryData, chartHint, title }) {
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

  const { Icon: HeaderIcon, bg: headerBg, fg: headerFg } = CHART_ICONS[config.chart] || CHART_ICONS.bar;
  const headerTitle = title || CHART_TITLES[config.chart];

  return (
    <div ref={rootRef} className="mt-2 pt-2 border-t border-z-border">
      <div className="flex items-center mb-2 gap-2">
        <span className={`grid h-6 w-6 flex-none place-items-center rounded-z-round ${headerBg} ${headerFg}`}>
          <HeaderIcon size={13} />
        </span>
        <span className="min-w-0 truncate text-z-caption font-semibold text-z-text">
          {headerTitle}
        </span>
        <span className="ml-auto flex-none text-[11px] text-z-text-muted">
          {queryData.length.toLocaleString()} row{queryData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {config.chart === 'bar'   && <ZevraBarChart   rows={queryData} config={config} palette={palette} hoverColor={accents.hover} />}
      {config.chart === 'area'  && <ZevraAreaChart  rows={queryData} config={config} palette={palette} />}
      {config.chart === 'donut' && <ZevraDonutChart rows={queryData} config={config} palette={palette} />}
      {config.chart === 'stats' && <StatCards       rows={queryData} config={config} palette={palette} />}
    </div>
  );
}
