import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import {
  ArrowLeft, ArrowUpRight, Activity, Award, BarChart3, Bot, CalendarClock, Check, ChevronDown, Clipboard, Clock, Compass,
  Download, FileDown, FileSpreadsheet, FileText, Hash, ListTree, Printer, Radar, Search, TrendingUp, User, X,
} from 'lucide-react';
import { api } from '../api.js';
import { openEventStream } from '../lib/sse.js';
import { useAuth } from '../App.jsx';
import { cn } from '../utils/cn';
import {
  Button, IconButton, Field, Input, SegmentedControl, Dialog,
  InlineAlert, Spinner, Spine, TableWrap, Table, THead, TBody, Th, Tr, Td,
  Badge, StatusDot, statusKind,
} from '../ds';
import { IntelligencePage, ReadingColumn, Eyebrow, Verdict, HighlightSurface } from '../ds/intelligence';
import InvestigationComposer from '../components/InvestigationComposer.jsx';
import TeachZevraModal from '../components/TeachZevraModal.jsx';

import DataViz, { hasChartConfig } from '../components/DataViz.jsx';
import ReasoningTrace from '../components/ReasoningTrace.jsx';
import BusinessUnderstanding from '../components/BusinessUnderstanding.jsx';
import AgentStepTrace from '../components/agents/AgentStepTrace.jsx';

// ── markdown ──────────────────────────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

export function MarkdownBody({ content }) {
  const html = marked.parse(content || '');
  return (
    <div
      className="prose-nexus"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function envLabel() {
  return import.meta.env.VITE_ENV_LABEL || import.meta.env.MODE || 'environment';
}

export function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupLabel(value) {
  if (!value) return 'Earlier';
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;
  const time = date.getTime();
  if (time >= startToday) return 'Today';
  if (time >= startYesterday) return 'Yesterday';
  return 'Earlier';
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function newConversationId() {
  return 'conv-' + Math.random().toString(36).slice(2, 10);
}

function slugifyFileName(value, fallback = 'zevra-export') {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
}

function exportStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function splitMarkdownRow(row) {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let current = '';
  let escaped = false;
  for (const char of trimmed) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isMarkdownSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || '');
}

function extractMarkdownTables(content) {
  const lines = String(content || '').split(/\r?\n/);
  const tables = [];

  for (let i = 0; i < lines.length - 1; i += 1) {
    const header = lines[i];
    const separator = lines[i + 1];
    if (!header.includes('|') || !isMarkdownSeparator(separator)) continue;

    const rows = [splitMarkdownRow(header)];
    i += 2;
    while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
      rows.push(splitMarkdownRow(lines[i]));
      i += 1;
    }
    i -= 1;

    if (rows.length > 1) tables.push(rows);
  }

  return tables;
}

function csvEscape(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tablesToCsv(tables) {
  return tables
    .map((table, idx) => [
      ...(tables.length > 1 ? [`Table ${idx + 1}`] : []),
      ...table.map((row) => row.map(csvEscape).join(',')),
    ].join('\n'))
    .join('\n\n');
}

function tablesToExcelHtml(tables, title) {
  const sheets = tables.map((table, idx) => `
    <h2>${escapeHtml(tables.length > 1 ? `Table ${idx + 1}` : title)}</h2>
    <table>
      ${table.map((row, rowIdx) => `
        <tr>${row.map((cell) => rowIdx === 0
          ? `<th>${escapeHtml(cell)}</th>`
          : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
      `).join('')}
    </table>
  `).join('<br />');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #b7c1cc; padding: 6px 10px; }
    th { background: #0c5847; color: #ffffff; font-weight: 700; }
  </style>
</head>
<body>${sheets}</body>
</html>`;
}

function buildConversationMarkdown(messages, title) {
  const body = messages
    .filter((msg) => !msg.loading)
    .map((msg) => {
      const heading = msg.role === 'user' ? 'User' : 'Zevra';
      return `## ${heading}\n\n${msg.content || ''}`;
    })
    .join('\n\n');
  return `# ${title}\n\nExported: ${new Date().toLocaleString()}\n\n${body}\n`;
}

function buildReportHtml(title, markdown) {
  const html = marked.parse(markdown || '');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #1a2637; margin: 40px; line-height: 1.55; }
    h1, h2, h3 { color: #0d2438; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th { background: #0c5847; color: white; text-align: left; padding: 8px 10px; }
    td { border-bottom: 1px solid #e8ede8; padding: 7px 10px; }
    tr:nth-child(even) { background: #f7faf8; }
    pre { background: #1a2637; color: #e8edf5; padding: 12px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 3px solid #0c5847; color: #415268; margin-left: 0; padding-left: 12px; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

function printMarkdown(title, markdown) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(buildReportHtml(title, markdown));
  win.document.close();
  win.focus();
  win.print();
}

function buildPowerPointHtml(title, messages) {
  const slides = messages
    .filter((msg) => !msg.loading)
    .map((msg, idx) => {
      const role = msg.role === 'user' ? 'Question' : 'Answer';
      return `<section class="slide"><h1>${idx + 1}. ${role}</h1>${marked.parse(msg.content || '')}</section>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    .slide { page-break-after: always; width: 960px; min-height: 540px; padding: 48px; font-family: Arial, sans-serif; }
    h1 { color: #0c5847; font-size: 30px; }
    body { color: #1a2637; font-size: 20px; }
    table { border-collapse: collapse; width: 100%; font-size: 16px; }
    th, td { border: 1px solid #d8dee6; padding: 8px; }
    th { background: #0c5847; color: white; }
  </style>
</head>
<body><section class="slide"><h1>${escapeHtml(title)}</h1><p>Exported ${new Date().toLocaleString()}</p></section>${slides}</body>
</html>`;
}

function ExportMenu({ open, onToggle, disabled, actions, align = 'right' }) {
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={onToggle} disabled={disabled}
        aria-haspopup="menu" aria-expanded={open} leadingIcon={<Download size={14} />}>
        Export
      </Button>
      {open && (
        <div role="menu"
          className={cn(
            'absolute top-10 z-20 w-60 overflow-hidden rounded-z-md border border-z-border bg-z-card py-1 shadow-z-2',
            align === 'left' ? 'left-0' : 'right-0',
          )}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={action.onClick}
              disabled={action.disabled}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-z-caption text-z-text-2 transition-colors hover:bg-z-hover hover:text-z-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring"
            >
              <action.icon size={14} className="text-z-text-3" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Floating history panel ────────────────────────────────────────────────────
function FloatingHistory({ conversations, loading, onOpen, onClose }) {
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = safeArray(conversations).filter((c) => {
    const q = search.trim().toLowerCase();
    return !q || String(c.first_question || c.conversation_id || '').toLowerCase().includes(q);
  });

  const grouped = filtered.reduce((acc, item) => {
    const key = groupLabel(item.last_activity);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Conversation history"
      className="fixed right-4 top-[58px] z-50 flex max-h-[72vh] w-[320px] flex-col overflow-hidden rounded-z-lg border border-z-border bg-z-card shadow-z-2"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-z-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-z-primary" />
          <span className="text-z-caption font-semibold text-z-text">History</span>
        </div>
        <IconButton label="Close history" onClick={onClose} className="h-7 w-7"><X size={14} /></IconButton>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 border-b border-z-border px-3 py-2.5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-z-text-3" />
          <Input
            className="h-9 pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && (
          <div className="py-8 text-center text-z-caption text-z-text-3">Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-8 text-center">
            <div className="text-z-caption text-z-text-2">No conversations yet</div>
            <div className="mt-1 text-z-caption text-z-text-3">Ask your first question to start</div>
          </div>
        )}
        {['Today', 'Yesterday', 'Earlier'].map((label) =>
          grouped[label]?.length ? (
            <div key={label} className="mb-3">
              <div className="mb-1 px-2 font-z-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-z-text-3">
                {label}
              </div>
              <div className="space-y-px">
                {grouped[label].map((item) => (
                  <button
                    key={item.conversation_id}
                    type="button"
                    onClick={() => { onOpen(item.conversation_id); onClose(); }}
                    className="group w-full rounded-z-md px-3 py-2.5 text-left transition-colors hover:bg-z-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-z-caption font-medium leading-snug text-z-text">
                        {item.first_question || item.title || 'Investigation'}
                      </span>
                      <span className="mt-px shrink-0 font-z-mono text-[10.5px] text-z-text-3">
                        {timeAgo(item.last_activity)}
                      </span>
                    </div>
                    {item.run_count > 0 && (
                      <span className="mt-0.5 block text-[11px] text-z-text-3">
                        {item.run_count} {item.run_count === 1 ? 'run' : 'runs'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

export function fmtCell(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  if (!isNaN(n) && isFinite(v)) {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1_000)     return n.toLocaleString();
    return Number.isInteger(n) ? n.toLocaleString() : parseFloat(n.toFixed(4)).toString();
  }
  return String(v);
}

export function colLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Purely mechanical, meaning-blind display transform for a raw CATEGORICAL VALUE (as opposed to
// colLabel above, which formats a column NAME) — e.g. an enum like PARTIALLY_RECEIVED or a
// snake_case string rendered in a table cell/badge. Same category of helper as colLabel/fmtLabel
// (DataViz.jsx): casing/punctuation only, zero awareness of what the value means, no lookup
// table. A value that already looks like free/human-authored text (contains whitespace) or has
// no separator/casing signal to normalize passes through unchanged. The underlying raw value is
// still used for search/export/filtering/color mapping — only the rendered text changes.
export function fmtValue(v) {
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

// ── DataTable ─────────────────────────────────────────────────────────────────

export function DataTable({ rows }) {
  if (!rows?.length) return null;
  const cols = Object.keys(rows[0]);
  return (
    <TableWrap className="mt-4">
      <div className="max-h-[260px] overflow-y-auto">
        <Table>
          <THead className="sticky top-0 z-10">
            <tr>
              {cols.map(col => (
                <Th key={col} className="whitespace-nowrap">{colLabel(col)}</Th>
              ))}
            </tr>
          </THead>
          <TBody>
            {rows.map((row, i) => (
              <Tr key={i}>
                {cols.map(col => (
                  <Td key={col} className="max-w-[220px] truncate whitespace-nowrap">
                    {fmtCell(row[col])}
                  </Td>
                ))}
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
      <div className="border-t border-z-border bg-z-card-2 px-3.5 py-1.5 font-z-mono text-[11px] text-z-text-3">
        {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''}
      </div>
    </TableWrap>
  );
}

// ── SuggestedQuestions ────────────────────────────────────────────────────────

export function buildSuggestions(quickRefinements, queryData) {
  const chips = [];

  // Data-driven: detect useful follow-ups from column patterns
  if (queryData?.length > 0) {
    const cols = Object.keys(queryData[0]);
    const statusCol = cols.find(c => /status|state|type/i.test(c));
    const numCol    = cols.find(c => {
      const vals = queryData.map(r => r[c]).filter(v => v != null);
      return vals.length > 0 && vals.every(v => !isNaN(parseFloat(v)));
    });
    const dateCol   = cols.find(c => /date|_at|time|month|year/i.test(c));

    if (statusCol) {
      const statuses = [...new Set(queryData.map(r => r[statusCol]).filter(Boolean))].slice(0, 2);
      if (statuses.length) chips.push({ label: `Filter: ${statuses[0]}`, prompt: `Show only records where ${colLabel(statusCol)} is ${statuses[0]}` });
    }
    if (numCol)  chips.push({ label: `Total ${colLabel(numCol)}`, prompt: `What is the total ${colLabel(numCol)}?` });
    if (dateCol && !chips.find(c => c.label.startsWith('Total')))
      chips.push({ label: 'Trend over time', prompt: `Show the trend by month` });
  }

  // Backend refinements (exclude "Run in background" — too technical)
  safeArray(quickRefinements)
    .filter(r => !String(r.prompt || '').startsWith('/async'))
    .slice(0, 2)
    .forEach(r => chips.push({ label: r.label, prompt: r.prompt }));

  // Deduplicate and cap at 3
  const seen = new Set();
  return chips.filter(c => { if (seen.has(c.label)) return false; seen.add(c.label); return true; }).slice(0, 3);
}

function SuggestedQuestions({ quickRefinements, queryData, onAsk }) {
  const chips = useMemo(() => buildSuggestions(quickRefinements, queryData), [quickRefinements, queryData]);
  if (!chips.length) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-z-border pt-4">
      <span className="mr-0.5 self-center font-z-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-z-text-3">
        Ask next
      </span>
      {chips.map((c, i) => (
        <button key={i} type="button" onClick={() => onAsk(c.prompt)}
          className="rounded-z-pill border border-z-border bg-transparent px-3.5 py-2 text-z-caption text-z-text-2 transition-colors hover:border-z-primary hover:text-z-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring">
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ── message bubbles ────────────────────────────────────────────────────────────
// ── Attachment type icon + colour ─────────────────────────────────────────────
const ATTACHMENT_STYLE = {
  IMAGE:    { icon: '🖼️', label: 'Image' },
  TABULAR:  { icon: '📊', label: 'Spreadsheet' },
  DOCUMENT: { icon: '📄', label: 'Document' },
  TEXT:     { icon: '📝', label: 'Text file' },
};

function AttachmentChip({ attachment, onRemove }) {
  if (!attachment) return null;
  const s = ATTACHMENT_STYLE[attachment.type] ?? ATTACHMENT_STYLE.TEXT;
  return (
    <div className="flex max-w-[360px] items-center gap-2 rounded-z-md border border-z-border bg-z-card-2 px-3 py-2 text-z-caption font-medium text-z-text-2">
      {attachment.thumbnail ? (
        <img src={`data:image/jpeg;base64,${attachment.thumbnail}`}
             alt="preview" className="h-8 w-8 flex-shrink-0 rounded-z-sm object-cover" />
      ) : (
        <span className="flex-shrink-0 text-[16px]">{s.icon}</span>
      )}
      <span className="flex-1 truncate text-z-text">{attachment.fileName}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove attachment"
          className="ml-1 flex-shrink-0 text-current opacity-50 transition-opacity hover:opacity-100">
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function UserMessage({ text, attachment }) {
  return (
    <div className="mb-6 animate-z-rise">
      <div className="mb-1.5 font-z-mono text-[10px] uppercase tracking-[0.14em] text-z-text-3">You · just now</div>
      {attachment && <div className="mb-2"><AttachmentChip attachment={attachment} /></div>}
      <div className="inline-block max-w-[80%] rounded-[14px_14px_14px_4px] border border-z-border bg-z-card-2 px-4 py-2.5 text-[14.5px] leading-[1.5] text-z-text">
        {text}
      </div>
    </div>
  );
}

// Small "view steps" toggle shown on answers produced by a Zevra Agent.
// Fetches the agent session lazily on first open and renders the tool-call
// trace with the same component used on the agent detail page.
export function AgentStepsToggle({ sessionId }) {
  const [open,    setOpen]    = useState(false);
  const [session, setSession] = useState(null);
  const [error,   setError]   = useState('');

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !session && !error) {
      try {
        setSession(await api.zevraAgents.getSession(sessionId));
      } catch (e) {
        setError(e.message || 'Could not load agent steps');
      }
    }
  };

  let steps = [];
  if (session) {
    const raw = session.steps_json ?? session.stepsJson ?? session.steps;
    try { steps = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []); }
    catch { steps = []; }
  }
  const toolCalls = steps.filter(s => s.type === 'TOOL_CALL').length;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        title="View the steps the agent executed"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-z-pill border border-z-border bg-z-card-2 px-2.5 py-0.5 text-[10.5px] font-medium text-z-text-2 transition-colors hover:border-z-primary hover:text-z-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring">
        <ListTree size={10} />
        {open
          ? `Hide steps${toolCalls > 0 ? ` (${toolCalls} tool call${toolCalls !== 1 ? 's' : ''})` : ''}`
          : 'View steps'}
      </button>
      {open && (
        <div className="mt-1.5 w-full">
          {error ? (
            <div className="text-z-caption text-z-critical-on">{error}</div>
          ) : !session ? (
            <div className="text-z-caption text-z-text-3">Loading steps…</div>
          ) : (
            <AgentStepTrace steps={steps} status={session.status} />
          )}
        </div>
      )}
    </>
  );
}

// Lift the answer's lead sentence into a serif "verdict" headline (the mockup's wow),
// with **bold** phrases picked out in emerald — but only when the answer genuinely opens
// with a short, plain sentence. Otherwise the whole answer stays as prose (safe fallback).
export function splitVerdict(md) {
  const text = (md || '').trim();
  const nl = text.indexOf('\n\n');
  const head = (nl === -1 ? text : text.slice(0, nl)).trim();
  const rest = nl === -1 ? '' : text.slice(nl + 2).trim();
  // Only a genuine one-line conclusion becomes a verdict: a plain declarative sentence
  // (ends in a period, not a colon preamble) with real body beneath it.
  const isVerdict = head
    && !head.includes('\n')
    && head.length >= 20 && head.length <= 200
    && !/^[#>\-*|`]|^\d+\./.test(head)
    && /[.!?]$/.test(head) && !head.endsWith(':')
    && rest.length > 40;
  return isVerdict ? { verdict: head, body: rest } : { verdict: null, body: text };
}

export function renderVerdict(s) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    return m
      ? <b key={i} className="font-medium text-z-primary">{m[1]}</b>
      : <span key={i}>{part}</span>;
  });
}

// ── Investigation milestones — the customer-facing presentation layer ──────────────────
// Groups the backend's six ProgressPhase ids (see ChatService / ProgressPhase.java) into
// the four business milestones a customer should actually see. The backend event model is
// untouched: this is purely a frontend projection of the same phase_started / phase_completed
// events already consumed above. A milestone's internal id/grouping is never rendered —
// only its business label is ever shown.
const MILESTONE_PHASES = {
  understanding: ['understanding', 'metadata', 'retrieval'],
  reviewing:      ['execution'],
  judgment:       ['reasoning'],
  preparing:      ['composition'],
};
export const MILESTONE_LABEL = {
  understanding: 'Understanding your business question...',
  reviewing:      'Reviewing enterprise data...',
  judgment:       'Forming business judgment...',
  preparing:      'Preparing your answer...',
};
const PHASE_TO_MILESTONE = Object.fromEntries(
  Object.entries(MILESTONE_PHASES).flatMap(([mid, phaseIds]) => phaseIds.map((pid) => [pid, mid])),
);

/** Pure projection: real backend phase events → the four customer-visible milestones.
 *  A milestone only ever appears once one of its real phases has actually started (never
 *  fabricated ahead of time), which is exactly what makes a genuinely-skipped phase (e.g.
 *  EXECUTION on a memory-only answer) silently skip its milestone too — no phase, no row.
 *  A milestone checks off only once its last constituent phase has actually completed. */
export function deriveMilestones(phaseSteps) {
  const byMilestone = new Map(); // milestoneId -> ordered raw phase entries seen so far
  for (const p of phaseSteps) {
    const mid = PHASE_TO_MILESTONE[p.phase];
    if (!mid) continue; // unknown/future phase id — ignore rather than guess
    if (!byMilestone.has(mid)) byMilestone.set(mid, []);
    byMilestone.get(mid).push(p);
  }
  return [...byMilestone.entries()].map(([mid, subPhases]) => {
    const lastPhaseId = MILESTONE_PHASES[mid][MILESTONE_PHASES[mid].length - 1];
    const lastPhase = subPhases.find((p) => p.phase === lastPhaseId);
    return { phase: mid, label: MILESTONE_LABEL[mid], done: !!lastPhase?.done };
  });
}

// Runtime Progress Projection — business-facing milestones streamed from real backend
// orchestration phases (phase_started / phase_completed SSE events, see ChatService /
// ProgressPhase). Every row reflects an actual runtime milestone; nothing here is a timer
// or a simulated animation — a phase only appears once the backend has actually started it,
// and only checks off once the backend has actually finished it. Labels are never hardcoded
// here — they come verbatim from the backend event so ProgressPhase stays the single source
// of truth for customer-facing wording.
//
// `renderDetail(phase)` is the foundation for future provenance (evidence sources, business
// objects, confidence explanation, ...): pass it once that data exists on completed phases
// and a completed row automatically gains an expand chevron — no restructuring needed here.
// Omitted (as today), rows render exactly as before: no chevron, no expand affordance.
export function RuntimeProgress({ phases, renderDetail }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (phaseId) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(phaseId)) next.delete(phaseId); else next.add(phaseId);
    return next;
  });
  return (
    <div className="flex flex-col gap-3">
      {phases.map((p, i) => {
        const detail = p.done && renderDetail ? renderDetail(p) : null;
        const isOpen = expanded.has(p.phase);
        return (
          <div key={p.phase ?? i} className="flex flex-col gap-2">
            <div className="flex animate-z-rise items-center gap-3 text-[13.5px]">
              <span className={cn(
                'grid h-[15px] w-[15px] flex-none place-items-center rounded-full border-[1.5px]',
                p.done ? 'border-z-primary bg-z-primary text-z-on-accent'
                       : 'animate-spin border-z-primary border-t-transparent',
              )}>
                {p.done && <Check size={9} strokeWidth={3} />}
              </span>
              <span className={p.done ? 'text-z-text-3' : 'text-z-text-2'}>{p.label}</span>
              {detail && (
                <button
                  type="button"
                  onClick={() => toggle(p.phase)}
                  aria-expanded={isOpen}
                  className="ml-auto flex-none text-z-text-3 transition-colors hover:text-z-text-2"
                >
                  <ChevronDown size={13} className={cn('transition-transform', isOpen && 'rotate-180')} />
                </button>
              )}
            </div>
            {detail && isOpen && (
              <div className="ml-[27px] text-[12.5px] text-z-text-3">{detail}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Live reasoning — the mockup's behaviour: steps thread onto the spine one at a time,
// each a spinning dot while busy, a filled check when done, with a mono meta on the right.
export function LiveReasoningSteps({ steps }) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const done = s.rowCount != null || s.evaluatorDecision != null;
        const meta = s.rowSummary ?? (s.rowCount != null ? `${s.rowCount.toLocaleString()} row${s.rowCount !== 1 ? 's' : ''}` : null);
        return (
          <div key={s.stepNo ?? i} className="flex animate-z-rise items-center gap-3 text-[13.5px]">
            <span className={cn(
              'grid h-[15px] w-[15px] flex-none place-items-center rounded-full border-[1.5px]',
              done ? 'border-z-primary bg-z-primary text-z-on-accent'
                   : 'animate-spin border-z-primary border-t-transparent',
            )}>
              {done && <Check size={9} strokeWidth={3} />}
            </span>
            <span className={done ? 'text-z-text-3' : 'text-z-text-2'}>{s.description}</span>
            {meta && <span className="ml-auto font-z-mono text-[11px] text-z-text-3">{meta}</span>}
          </div>
        );
      })}
    </div>
  );
}

function AssistantMessage({ content, decisionType, agentName, loading, exportMenu, queryData, quickRefinements, onAsk, reasoningSteps, learningsApplied, streamingSteps, phaseSteps, agentSessionId, runKey }) {
  const stepCount = safeArray(streamingSteps).length;
  const milestones = useMemo(() => deriveMilestones(safeArray(phaseSteps)), [phaseSteps]);
  // While Zevra is reviewing enterprise data, the governed-execution phase's own SQL
  // sub-steps (streamingSteps) thread in beneath the "Reviewing enterprise data..." row.
  const activeMilestone = milestones.find(m => !m.done);
  const showSqlSubsteps = stepCount > 0 && (!activeMilestone || activeMilestone.phase === 'reviewing');
  return (
    <div className="relative mb-8 animate-z-rise pl-7">
      <Spine live={loading} />
      {/* Role line — the mono Intelligence voice, emerald, with a live dot */}
      <Eyebrow dot className="mb-3 text-z-primary">
        Zevra
        <span className="text-[11.5px] normal-case tracking-[0.04em] text-z-text-3">
          {loading ? (milestones.length > 0 || stepCount > 0 ? 'thinking…' : 'understanding…') : 'answered'}
        </span>
      </Eyebrow>

      {loading ? (
        milestones.length > 0 ? (
          <div className="flex flex-col gap-3">
            <RuntimeProgress phases={milestones} />
            {showSqlSubsteps && <LiveReasoningSteps steps={safeArray(streamingSteps)} />}
          </div>
        ) : (
          <p className="font-z-serif text-z-body italic leading-[1.5] text-z-text-2">
            Understanding your question…
          </p>
        )
      ) : (
        <>
          {(() => {
            const { verdict, body } = splitVerdict(content);
            return (
              <div className="max-w-[68ch]">
                {verdict && (
                  <Verdict as="p" size="md" className="mb-3 animate-z-rise">{renderVerdict(verdict)}</Verdict>
                )}
                <MarkdownBody content={verdict ? body : content} />
              </div>
            );
          })()}
          {queryData?.length > 0 && <DataTable rows={queryData} />}
          {queryData?.length > 0 && <DataViz queryData={queryData} />}
          <SuggestedQuestions quickRefinements={quickRefinements} queryData={queryData} onAsk={onAsk} />
          <BusinessUnderstanding steps={reasoningSteps} runKey={runKey} />
          <ReasoningTrace steps={reasoningSteps} loading={false} />
          {(decisionType || agentName || reasoningSteps?.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-z-border pt-3">
              {agentName && decisionType === 'ZEVRA_AGENT' ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-z-pill border border-z-border bg-z-primary-soft px-2.5 py-0.5 text-[10.5px] font-medium text-z-primary">
                    <Bot size={10} />
                    Answered by {agentName}
                  </span>
                  {agentSessionId && <AgentStepsToggle sessionId={agentSessionId} />}
                </>
              ) : decisionType && (
                <span className="font-z-mono text-[10px] uppercase tracking-[0.1em] text-z-text-3">
                  via <span className="font-medium text-z-primary">{decisionType}</span>
                </span>
              )}
              {reasoningSteps?.length > 0 && (
                <span className="text-[10px] text-z-text-3">· {reasoningSteps.length} step{reasoningSteps.length !== 1 ? 's' : ''}</span>
              )}
              {learningsApplied?.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-z-pill border border-z-border bg-z-primary-soft px-2 py-0.5 text-[10px] font-medium text-z-primary"
                  title={`Learned terms applied: ${learningsApplied.join(', ')}`}>
                  🧠 {learningsApplied.length} learned term{learningsApplied.length !== 1 ? 's' : ''} applied
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Pin as Report modal ───────────────────────────────────────────────────────
function PinReportModal({ conversationTitle, messages, user, onClose }) {
  const questions = messages
    .filter((m) => m.role === 'user' && m.content?.trim())
    .map((m) => m.content.trim());

  const [name,         setName]         = useState(conversationTitle.slice(0, 80));
  const [scheduleType, setScheduleType] = useState('DAILY');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [channel,      setChannel]      = useState('EMAIL');
  const [emailTo,      setEmailTo]      = useState(user?.email || '');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [done,         setDone]         = useState(false);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const submit = async () => {
    if (!name.trim() || questions.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await api.reports.create({
        name:         name.trim(),
        questions,
        scheduleType,
        scheduleTime,
        timezone:     tz,
        channel,
        emailTo:      (channel === 'EMAIL' || channel === 'BOTH') ? emailTo.trim() : null,
        slackWebhook: (channel === 'SLACK' || channel === 'BOTH') ? slackWebhook.trim() : null,
      });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.message || 'Failed to schedule report');
    } finally {
      setSaving(false);
    }
  };

  const needsEmail = channel === 'EMAIL' || channel === 'BOTH';
  const needsSlack = channel === 'SLACK' || channel === 'BOTH';

  return (
    <Dialog
      open
      onClose={onClose}
      title="Schedule as Report"
      description={`${questions.length} question${questions.length !== 1 ? 's' : ''} from this conversation`}
      size="sm"
      footer={done ? null : (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!name.trim() || questions.length === 0}
            leadingIcon={<CalendarClock size={13} />}>
            Schedule Report
          </Button>
        </>
      )}
    >
      {done ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-z-round bg-z-primary-soft">
            <CalendarClock size={22} className="text-z-primary" />
          </div>
          <p className="text-z-body font-medium text-z-text">Report scheduled!</p>
          <p className="mt-1 text-z-caption text-z-text-3">Manage it anytime from the Reports page.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Report name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <Field label="Run">
            <SegmentedControl
              aria-label="Run frequency"
              className="w-full"
              value={scheduleType}
              onChange={setScheduleType}
              options={['DAILY', 'WEEKLY', 'MONTHLY'].map((t) => ({
                value: t, label: t.charAt(0) + t.slice(1).toLowerCase(),
              }))}
            />
          </Field>

          <div className="flex items-end gap-3">
            <Field label="At">
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </Field>
            <div className="pb-2.5 font-z-mono text-z-caption text-z-text-3">{tz}</div>
          </div>

          <Field label="Deliver via">
            <SegmentedControl
              aria-label="Delivery channel"
              className="w-full"
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'EMAIL', label: 'Email' },
                { value: 'SLACK', label: 'Slack' },
                { value: 'BOTH', label: 'Both' },
              ]}
            />
          </Field>

          {needsEmail && (
            <Field label="Email">
              <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@company.com" required={needsEmail} />
            </Field>
          )}

          {needsSlack && (
            <Field label="Slack webhook URL">
              <Input value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/…" required={needsSlack} />
            </Field>
          )}

          <div className="rounded-z-md border border-z-border bg-z-card-2 px-3 py-2.5">
            <p className="mb-1.5 font-z-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-z-text-3">
              Questions to run
            </p>
            <div className="max-h-[72px] space-y-1 overflow-y-auto">
              {questions.map((q, i) => (
                <p key={i} className="line-clamp-1 text-z-caption text-z-text-2">
                  <span className="mr-1.5 text-z-text-3">{i + 1}.</span>{q}
                </p>
              ))}
            </div>
          </div>

          {error && <InlineAlert variant="error">{error}</InlineAlert>}
        </div>
      )}
    </Dialog>
  );
}

// ── main component ────────────────────────────────────────────────────────────
// ── Report Mode presentation ────────────────────────────────────────────────
// The Investigation Workspace presented as a completed executive report — a finished
// document, not a chat transcript. The finding supplies the summary; the investigation's
// own answer supplies evidence + reasoning; the conversation is an appendix at the very
// bottom. Reuses the same components as Live Mode — one investigation, two presentations.
function ReportLabel({ children }) {
  return <div className="mb-1.5 text-z-label uppercase tracking-[0.14em] text-z-text-3">{children}</div>;
}
export function reportStatus(s) {
  const v = String(s || 'OPEN').toUpperCase();
  return (v.includes('RESOLV') || v.includes('CLOSED')) ? 'Resolved' : 'Decision Required';
}
// Pull one sentence matching a pattern out of the conclusion — presentation only, never
// fabricated: returns '' when the investigation didn't state impact / a recommendation.
// List intros ("Here are…:", sentences ending in ":") are excluded — they aren't statements.
export const isListItem  = (s) => /^(\d+[.)]|[-*•])\s+/.test(s);
export const isListIntro = (s) => /[:;]$/.test(s)
  || /^(here (are|is)|the most critical|these are|below (are|is)|following)/i.test(s);

// Split on line breaks first so list items stay separate from the prose around them
// (collapsing every whitespace run would glue "…840 units at risk" onto the next
// sentence). A list-item line is kept whole — sentence-splitting it would divorce its
// "1." marker and defeat isListItem — otherwise split on sentence boundaries.
export function toSentences(text) {
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => (isListItem(line) ? [line] : line.split(/(?<=[.!?])\s+/)))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function pickSentence(text, re) {
  const hit = toSentences(text).find((t) => {
    if (!re.test(t) || t.length < 24) return false;
    if (isListItem(t) || isListIntro(t)) return false;   // items live in Supporting Evidence
    return true;
  });
  return hit ? hit.trim() : '';
}
export const RE_RECO = /\b(recommend|prioriti[sz]e|consider|suggest|advis|renegotiat|you should|should be)\b/i;
// Genuine quantified impact only: a dollar amount, a percentage change, or explicit loss.
export const RE_IMPACT = /\$[\d,]{3,}|\b\d+(\.\d+)?%\s*(rise|increase|drop|decrease|decline|deviation|surge|higher|lower)|\blost sales\b|\bpotential (stockout|loss)\b/i;

// deriveKeyMetrics(queryData) — a queryData column-name heuristic previously used as a metrics
// fallback — was removed here. Metrics are 100% deterministic/runtime-owned by design (see
// ResponseArtifactsBuilder); composeResponse now reads only artifacts.metrics, with no frontend
// recomputation from queryData.

// Real sentences from the real answer, organized rather than fabricated: the impact
// and recommendation sentences (same extraction Report Mode already used), plus up to
// two "related facts" — remaining declarative sentences not already used elsewhere —
// plus, when the backend's own evaluator flagged something noteworthy while querying
// (a decision other than a clean first-try SUFFICIENT), its rationale as a finding.
function deriveIntelligence(full, reasoningSteps) {
  const { verdict } = splitVerdict(full);
  const recommendation = pickSentence(full, RE_RECO);
  const impact = pickSentence(full, RE_IMPACT);
  const used = [verdict, recommendation, impact].filter(Boolean);

  const relatedFacts = toSentences(full)
    .filter((s) => !isListItem(s) && !isListIntro(s))
    .filter((s) => !used.some((u) => s === u || u.includes(s) || s.includes(u)))
    .slice(0, 3);

  const rationale = safeArray(reasoningSteps)
    .find((s) => s.evaluatorRationale && s.evaluatorDecision && s.evaluatorDecision !== 'SUFFICIENT');

  const keyFindings = [impact, rationale?.evaluatorRationale].filter(Boolean).slice(0, 3);

  return { recommendation, impact, relatedFacts, keyFindings };
}

// A status-like column (matching /status|state/i) renders through the platform's own
// statusKind() mapping — the same semantic-color language used everywhere else in
// Zevra, applied to whatever real string values the query actually returned. A search
// box filters real rows client-side; nothing here alters or invents data. The dataset is
// a first-class investigation artifact (spec §8): search, a client-side column-visibility
// toggle, and a CSV export of exactly the rows/columns currently shown — all presentation-
// only, layered over the exact same rows the backend returned, with no new data derived.
function InvestigationDataset({ rows, title = 'Dataset' }) {
  const [search, setSearch] = useState('');
  const [hiddenCols, setHiddenCols] = useState(() => new Set());
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const colsMenuRef = useRef(null);

  useEffect(() => {
    if (!colsMenuOpen) return undefined;
    const onDocClick = (e) => { if (colsMenuRef.current && !colsMenuRef.current.contains(e.target)) setColsMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [colsMenuOpen]);

  if (!rows?.length) return null;
  const allCols = Object.keys(rows[0]);
  const cols = allCols.filter((c) => !hiddenCols.has(c));
  const statusCol = cols.find((c) => /status|state$/i.test(c));
  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => allCols.some((c) => String(r[c] ?? '').toLowerCase().includes(q))) : rows;

  const toggleCol = (c) => setHiddenCols((prev) => {
    const next = new Set(prev);
    if (next.has(c)) next.delete(c); else next.add(c);
    return next;
  });

  const exportCsv = () => {
    const header = cols.map(colLabel).join(',');
    const body = filtered.map((row) => cols.map((c) => csvEscape(row[c])).join(',')).join('\n');
    downloadBlob(`${slugifyFileName(title)}-${exportStamp()}.csv`, `${header}\n${body}\n`, 'text/csv;charset=utf-8');
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-z-caption font-semibold text-z-text">
          {title} <span className="ml-1 font-normal text-z-text-3">({rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''})</span>
        </span>
        <div className="flex items-center gap-1.5">
          <div className="relative w-44">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-z-text-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in results…"
              className="w-full rounded-z-sm border border-z-border-strong bg-z-surface py-1 pl-7 pr-2.5 text-[11.5px] text-z-text placeholder:text-z-text-3 focus:outline-none focus:ring-[3px] focus:ring-z-focus-ring"
            />
          </div>
          <div className="relative" ref={colsMenuRef}>
            <Button variant="ghost" size="sm" onClick={() => setColsMenuOpen((o) => !o)}>Columns</Button>
            {colsMenuOpen && (
              <div role="menu" className="absolute right-0 top-9 z-20 max-h-56 w-52 overflow-y-auto rounded-z-md border border-z-border bg-z-card py-1 shadow-z-2">
                {allCols.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-z-caption text-z-text-2 hover:bg-z-hover">
                    <input type="checkbox" checked={!hiddenCols.has(c)} onChange={() => toggleCol(c)} />
                    {colLabel(c)}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={exportCsv} leadingIcon={<Download size={13} />}>Export</Button>
        </div>
      </div>
      <TableWrap>
        <div className="max-h-[280px] overflow-y-auto">
          <Table dense>
            <THead className="sticky top-0 z-10">
              <tr>{cols.map((c) => <Th key={c} dense className="whitespace-nowrap">{colLabel(c)}</Th>)}</tr>
            </THead>
            <TBody>
              {filtered.map((row, i) => (
                <Tr key={i}>
                  {cols.map((c) => (
                    <Td key={c} dense className="max-w-[220px] truncate whitespace-nowrap">
                      {c === statusCol && row[c] != null
                        ? <Badge status={statusKind(row[c])}>{fmtValue(row[c])}</Badge>
                        : fmtCell(row[c])}
                    </Td>
                  ))}
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="border-t border-z-border bg-z-card-2 px-3 py-1 font-z-mono text-[10.5px] text-z-text-3">
          {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''}
        </div>
      </TableWrap>
    </div>
  );
}

// A quiet, intentional bordered panel — used for the left rail's Question / Executive Summary /
// Investigation Context. Real card treatment (this workspace's reference composition wants
// borders/cards for these regions), but never used for a section with nothing real to show.
function Panel({ eyebrow, accent, children, style, className }) {
  return (
    <section
      style={style}
      className={cn(
        'animate-z-rise rounded-z-lg border border-z-border bg-z-card px-4 py-3 shadow-z-1 motion-reduce:animate-none',
        accent && 'border-l-2 border-l-z-primary',
        className,
      )}
    >
      {eyebrow && <div className="mb-2 text-z-label uppercase tracking-[0.14em] text-z-text-3">{eyebrow}</div>}
      {children}
    </section>
  );
}

const PROGRESS_STAGES = [
  ['understanding', 'Business context'],
  ['reviewing', 'Data'],
  ['judgment', 'Analysis'],
  ['preparing', 'Findings'],
];

// Real progress, not a fabricated wizard: while the response is live, each stage only lights up
// once the backend's own SSE phase events say it has (see deriveMilestones — never fabricated
// ahead of time). Once answered, the whole line reads as complete — some answers genuinely skip
// a phase (e.g. a memory-only answer never opens EXECUTION), so "complete" is judged by whether
// an answer exists, not by requiring every individual phase to have fired.
// A horizontal stepper — one line, not a stacked checklist — the same real per-phase state
// (never fabricated ahead of time; see deriveMilestones) in the compact form the reference
// itself uses.
function InvestigationProgress({ milestones, loading }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {PROGRESS_STAGES.map(([phase, label], i) => {
        const m = milestones.find((x) => x.phase === phase);
        const done = !loading || !!m?.done;
        const active = loading && !!m && !m.done;
        return (
          <div key={phase} className="flex items-center gap-3">
            {i > 0 && <span className="h-px w-3 flex-none bg-z-border" aria-hidden />}
            <div className="flex items-center gap-1.5">
              {done ? (
                <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-z-primary">
                  <Check size={9} strokeWidth={3} className="text-z-on-accent" />
                </span>
              ) : active ? (
                <StatusDot status="investigating" live className="h-4 w-4" />
              ) : (
                <span className="h-2 w-2 flex-none rounded-full border border-z-border-strong" />
              )}
              <span className={cn('text-[11px]', done ? 'text-z-text-2' : active ? 'text-z-text' : 'text-z-text-3')}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Investigation Header (spec §1) — replaces the oversized masthead + separate Question card
// with: title, the question verbatim beneath it (once — never duplicated in a card, spec §2),
// and a compact metadata line built ONLY from fields the response actually carries (who
// answered it, when). No domain/connection/analyst fields are shown — this data model has no
// such fields today, and inventing them would violate spec §19's "no fabricated information".
function InvestigationHeader({ finding, loading, title, question, startedLabel, answeredBy }) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {loading && (
        <Eyebrow dot className="shrink-0 text-z-primary">Active</Eyebrow>
      )}
      {!finding && !loading && (
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-z-text-3">
          <StatusDot status="healthy" />Answered
        </span>
      )}
      {finding && <span className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-z-primary">{reportStatus(finding.status)}</span>}

      <h1 className="min-w-0 flex-1 truncate font-z-serif text-[16px] font-medium leading-[1.2] tracking-[-0.005em] text-z-text sm:text-[18px]" title={title}>
        {title}
      </h1>
      {question && question !== title && (
        <p className="min-w-0 basis-full truncate text-[12.5px] text-z-text-2">{question}</p>
      )}
      {(answeredBy || startedLabel) && (
        <p className="ml-auto flex shrink-0 flex-wrap items-center gap-x-2 font-z-mono text-[10.5px] uppercase tracking-[0.1em] text-z-text-3">
          {answeredBy && <span>{answeredBy}</span>}
          {answeredBy && startedLabel && <span aria-hidden>·</span>}
          {startedLabel && <span>{startedLabel}</span>}
        </p>
      )}
    </header>
  );
}

// Key Finding hero (spec §3) — the primary answer promoted to a prominent horizontal banner
// using Zevra's existing emerald accent (HighlightSurface). Renders the real model-generated
// understanding/answer verbatim — never a hard-coded string, never JS-derived semantics.
function KeyFindingBanner({ headline, body, agentContext }) {
  if (!headline && !body) return null;
  return (
    <HighlightSurface material="subtle" accent="primary" className="mb-2 animate-z-rise motion-reduce:animate-none" style={{ padding: '10px 14px' }}>
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-z-primary text-z-on-accent">
          <Check size={10} strokeWidth={3} />
        </span>
        <span className="text-z-label uppercase tracking-[0.14em] text-z-primary">Key Finding</span>
      </div>
      {headline && <Verdict as="p" size="md" className="mb-0.5">{renderVerdict(headline)}</Verdict>}
      {body && <MarkdownBody content={body} />}
      {agentContext?.agentName && (
        <p className="mt-2 text-z-caption text-z-text-3">
          Investigated by {agentContext.agentName}
          {agentContext.iterationsUsed ? ` · ${agentContext.iterationsUsed} step${agentContext.iterationsUsed === 1 ? '' : 's'}` : ''}
        </p>
      )}
    </HighlightSurface>
  );
}

// Investigation Assistant (spec §9) — replaces the old, more promotional "Zevra Intelligence"
// panel. The checklist re-labels the SAME real per-phase completion state InvestigationProgress
// already renders (never fabricated ahead of time — see deriveMilestones); "Suggested
// follow-ups" renders the SAME followUpQuestions composeResponse() derives from the model's own
// FOLLOW_UP_QUESTIONS section (never invented here — an empty list simply omits the block).
const ASSISTANT_CHECKLIST = [
  ['understanding', 'Business context'],
  ['reviewing', 'Data retrieved'],
  ['judgment', 'Analysis completed'],
  ['preparing', 'Findings generated'],
];

function InvestigationAssistant({ milestones, loading, followUpQuestions, onAsk }) {
  return (
    <HighlightSurface
      material="subtle" accent="primary" live={loading}
      className="h-fit"
      style={{ padding: '10px 14px' }}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-z-round bg-z-primary-soft">
          <Radar size={13} className="text-z-primary" />
        </span>
        <div className="min-w-0">
          <div className="text-z-caption font-semibold text-z-text">Investigation Assistant</div>
          <div className="text-[10.5px] text-z-text-3">
            {loading ? 'Continuously analyzing your data' : 'Keep exploring. Here are some next steps.'}
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1 border-t border-z-ai-edge pt-2">
        {ASSISTANT_CHECKLIST.map(([phase, label]) => {
          const m = milestones.find((x) => x.phase === phase);
          const done = !loading || !!m?.done;
          return (
            <div key={phase} className="flex items-center gap-2 text-[11.5px]">
              {done ? (
                <span className="grid h-3.5 w-3.5 flex-none place-items-center rounded-full bg-z-primary">
                  <Check size={8} strokeWidth={3} className="text-z-on-accent" />
                </span>
              ) : (
                <StatusDot status="investigating" live className="h-3.5 w-3.5" />
              )}
              <span className={done ? 'text-z-text-2' : 'text-z-text-3'}>{label}</span>
            </div>
          );
        })}
      </div>

      {followUpQuestions?.length > 0 && (
        <div className="mt-2 border-t border-z-ai-edge pt-2">
          <ReportLabel>Suggested follow-ups</ReportLabel>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {followUpQuestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAsk(s.prompt)}
                className="flex items-center gap-2 rounded-z-md border border-z-border bg-z-card px-2.5 py-2 text-left text-z-caption leading-[1.3] text-z-text-2 transition-colors hover:border-z-border-strong hover:bg-z-hover hover:text-z-text"
              >
                <IconBadge icon={ArrowUpRight} size={24} />
                <span className="min-w-0">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </HighlightSurface>
  );
}

// ── Response composition — the universal Zevra Intelligence Response model. Pure function:
// normalizes ResponseArtifacts (preferred, backend-composed, shared by chat/agent/future
// workflow paths) or the original client-side derivation (fallback, for a reopened past
// conversation or any response shape that predates `artifacts`) into ONE shape the renderer
// composes from. Never blends both sources for a single field. A field is genuinely absent
// (undefined/empty), never a placeholder — that absence is exactly what lets a whole section
// disappear downstream instead of rendering empty. Nothing here is invented: every value traces
// to real backend data (ResponseArtifacts) or the same regex-derived fallback already shipped
// and reviewed in prior rounds.
// Normalizes ResponseArtifacts.sections (backend snake_case) into one consistent shape —
// { type, title, purpose, display, items, content, reasoning, datasets: [{ stepNo, rows, rowCount }] }
// — so every renderer downstream works off one shape regardless of transport casing. This is
// purely a field-name/casing normalization: it does not filter, rank, reorder, or interpret
// anything. `rowCount` is the backend's own count for this dataset, which for a non-DATASET
// section (HIGHLIGHT/TEXT) is populated WITHOUT the full `rows` payload (a mechanical
// bloat-reduction — those sections cite a dataset only for traceability, never to display its
// table) — falls back to `rows.length` for an older backend response that only ever sent full
// rows. `reasoning` is meaningful only for a FOLLOW_UP_QUESTIONS section (the model's own
// reasoning for that section's own `items`, structurally attached to the same section object —
// see StructuredAnswer.Section's javadoc); null on every other section type. Not currently
// rendered — the UI shows "Suggested follow-ups" from `items` alone (see InvestigationAssistant)
// — carried through only so the shape mirrors the backend contract one-to-one.
export function normalizeSections(rawSections) {
  return safeArray(rawSections).map((s) => ({
    type: s.type ?? null,
    title: s.title ?? null,
    purpose: s.purpose ?? null,
    display: s.display,
    items: safeArray(s.items),
    content: s.content ?? null,
    reasoning: s.reasoning ?? null,
    datasets: safeArray(s.datasets).map((d) => {
      const rows = safeArray(d.rows);
      const rowCount = d.row_count ?? d.rowCount ?? rows.length;
      return { stepNo: d.step_no ?? d.stepNo ?? null, rows, rowCount };
    }),
  }));
}

// Backend JSON is snake_case (global Jackson naming strategy) — normalize once here so callers
// only ever deal with one shape regardless of transport casing. Mirrors ResponseArtifacts.Evidence
// exactly (kind/label/chartType/xKey/yKeys/rowCount/stepNo) — see composeResponse's chartHints
// derivation below for how these are matched back to the dataset they belong to.
function normalizeEvidence(rawEvidence) {
  return safeArray(rawEvidence).map((e) => ({
    kind: e.kind ?? null,
    label: e.label ?? null,
    chartType: e.chart_type || e.chartType || null,
    xKey: e.x_key || e.xKey || null,
    yKeys: safeArray(e.y_keys || e.yKeys),
    rowCount: e.row_count ?? e.rowCount ?? null,
    stepNo: e.step_no ?? e.stepNo ?? null,
    // Optional, purely presentational LLM-authored labels (see ReasoningPlanner.SYSTEM_PROMPT's
    // OPTIONAL HUMAN-READABLE LABELS guidance) — relayed verbatim; DataViz's configFromHint
    // applies them only when they mechanically align with xKey/yKeys, falling back to its own
    // fmtLabel() casing transform otherwise.
    xLabel: e.x_label || e.xLabel || null,
    yLabels: safeArray(e.y_labels || e.yLabels),
  }));
}

export function composeResponse(primary, finding, question) {
  const full = finding?.description || primary?.content || '';
  const { verdict, body } = splitVerdict(full);
  // Legacy compatibility field only — see ChatResponse#queryData. Kept on the composed result
  // for any caller that still reads it (e.g. an export/report path), but nothing in the live
  // rendering below is derived from it.
  const queryData = safeArray(primary?.queryData);
  const reasoningSteps = safeArray(primary?.reasoningSteps);
  const artifacts = primary?.artifacts || null;

  const understanding = artifacts?.understanding || verdict || null;
  const narrativeBody = understanding ? body : full;

  // Agent Brain's own UI-content plan — the authoritative semantic response structure.
  // Rendered in the exact order supplied; never reordered by type, dataset size, step number,
  // or any other signal. queryData plays no part in either bucket below.
  const sections = normalizeSections(artifacts?.sections);
  const datasetSections = sections.filter((s) => s.type === 'DATASET' && s.display !== false);
  const highlightSections = sections.filter((s) => s.type === 'HIGHLIGHT');
  // EVIDENCE is raw proof only: the actual dataset table(s), nothing else. Per
  // StructuredAnswer's javadoc, HIGHLIGHT is "a distinguished, dataset-grounded observation —
  // mechanically the same kind of content as a FINDINGS item, just additionally traceable to a
  // dataset" — i.e. narrative, not evidence, despite citing a dataset. So only DATASET sections
  // belong under "Evidence"; every other section type (HIGHLIGHT, TEXT, and any future narrative
  // type this model contract adds) is excluded here and rendered instead alongside Key
  // Findings/Related Facts/Recommendation (see insightSections below and its render site) rather
  // than under the "Evidence" heading where a user expects raw/proof data, not another finding.
  // (FINDINGS/RELATED_FACTS/RECOMMENDATION/FOLLOW_UP_QUESTIONS never reach this array either way — they
  // are consumed below through their own dedicated fields, not evidenceSections/insightSections.)
  const evidenceSections = sections.filter((s) => s.type === 'DATASET' && s.display !== false);
  // Narrative/insight sections — HIGHLIGHT (dataset-grounded observation) and TEXT (free-form
  // narrative with no required dataset grounding; "use sparingly" per ChatService's prompt).
  // Both are prose the model authored, not proof data, so both render together with the
  // Key-Findings-adjacent content (before "Evidence"), in the exact order supplied, using the
  // same bordered-card treatment (optional title + content + cited-dataset step tags) either
  // always used — only their structural bucket changed, not their shape or content. Named
  // explicitly (rather than `type !== 'DATASET'`) because `sections` also carries
  // FINDINGS/RELATED_FACTS/RECOMMENDATION/FOLLOW_UP_QUESTIONS, which must NOT land here — those already
  // render through their own dedicated fields above.
  const insightSections = sections.filter((s) => s.type === 'HIGHLIGHT' || s.type === 'TEXT');

  let keyFindings, relatedFacts, recommendation, followUpQuestions;
  if (sections.length > 0) {
    // Read directly from the model's own sections — never reconstructed from queryData,
    // column names, reasoning steps, or answer text.
    keyFindings = sections.filter((s) => s.type === 'FINDINGS').flatMap((s) => s.items);
    relatedFacts = sections.filter((s) => s.type === 'RELATED_FACTS').flatMap((s) => s.items);
    const recSection = sections.find((s) => s.type === 'RECOMMENDATION' && s.content);
    recommendation = recSection ? recSection.content : null;
    // Plain-text items from Agent Brain; label/prompt are mechanically the same string — a
    // clicked chip asks exactly what the model suggested, nothing added or inferred. An absent
    // FOLLOW_UP_QUESTIONS section yields an empty array here — never backfilled from quickRefinements or
    // any queryData-driven heuristic (see the removed buildSuggestions/deriveKeyMetrics fallback
    // paths this replaces).
    followUpQuestions = sections.filter((s) => s.type === 'FOLLOW_UP_QUESTIONS')
      .flatMap((s) => s.items)
      .map((text) => ({ label: text, prompt: text }));
  } else if (artifacts) {
    // No sections-based plan on this response (the Zevra Agent path, or a response that never
    // went through structured composition) — these flat fields are still Agent Brain's own
    // output for those paths (or, for llmSemantics===null, the existing honest sentence-derived
    // legacy heuristic) — never a queryData/column-name reconstruction.
    keyFindings = safeArray(artifacts.key_findings || artifacts.keyFindings);
    relatedFacts = safeArray(artifacts.related_facts || artifacts.relatedFacts);
    recommendation = artifacts.recommendation || null;
    followUpQuestions = safeArray(artifacts.follow_up_questions || artifacts.followUpQuestions);
  } else {
    const d = deriveIntelligence(full, reasoningSteps);
    keyFindings = d.keyFindings;
    relatedFacts = d.relatedFacts;
    recommendation = d.recommendation || null;
    followUpQuestions = [];
  }

  // Metrics remain 100% deterministic/runtime-owned by design (see ResponseArtifactsBuilder —
  // the model has no say in them) — read only from the backend's own computation. No frontend
  // recomputation from queryData: an absent metrics array renders as no metrics, honestly,
  // rather than a second, redundant column-name heuristic guessing at the same thing.
  const metrics = safeArray(artifacts?.metrics);

  // 0 → nothing to show. 1 → a single emphasized figure. 2–4 → a compact strip. 5+ (not
  // produced by the backend today, capped at 3 — see ResponseArtifactsBuilder.metrics; handled
  // here so the UI degrades gracefully rather than assuming a fixed count) → top 4 + expand.
  const singleMetric = metrics.length === 1 ? metrics[0] : null;
  const metricStrip = metrics.length >= 2 && metrics.length <= 4 ? metrics : [];
  const overflowMetrics = metrics.length > 4 ? metrics : [];

  // Chart hints (spec §5 / chart-hint architecture): the LLM decides chart type + category +
  // value columns per investigation step (see ReasoningPlanner's OPTIONAL VISUALIZATION HINT
  // guidance) — Java only relays them, tagged with the step they belong to (Evidence#stepNo).
  // Each chartable dataset below looks up its OWN hint by its OWN stepNo (see
  // EvidenceVisualizationGrid) — never one hint shared across every chart card in the response,
  // however many chartable datasets it has (0, 1, 2, 5+).
  const evidenceList = normalizeEvidence(artifacts?.evidence);
  const chartEvidence = evidenceList.filter((e) => e.kind === 'CHART');
  const chartHintsByStep = new Map(
    chartEvidence
      .filter((e) => e.stepNo != null)
      .map((e) => [e.stepNo, { chartType: e.chartType, xKey: e.xKey, yKeys: e.yKeys,
        xLabel: e.xLabel, yLabels: e.yLabels }]),
  );
  // Legacy/global fallback — a chart-evidence entry carrying no stepNo (an older backend, or the
  // single-dataset legacy `queryData` shape heuristic, which has no per-step identity) applies to
  // any chartable dataset that has no per-step hint of its own — exactly the prior behavior for a
  // response shaped that way.
  const legacyChartEntry = chartEvidence.find((e) => e.stepNo == null) || null;
  const legacyChartHint = legacyChartEntry
    ? { chartType: legacyChartEntry.chartType, xKey: legacyChartEntry.xKey, yKeys: legacyChartEntry.yKeys,
        xLabel: legacyChartEntry.xLabel, yLabels: legacyChartEntry.yLabels }
    : null;

  const rawAgentContext = artifacts?.agent_context || artifacts?.agentContext || null;
  const agentContext = rawAgentContext
    ? {
        agentName: rawAgentContext.agent_name || rawAgentContext.agentName || primary?.agentName || null,
        iterationsUsed: rawAgentContext.iterations_used ?? rawAgentContext.iterationsUsed ?? null,
      }
    : (primary?.agentSessionId ? { agentName: primary.agentName, iterationsUsed: null } : null);

  const artifactTrail = safeArray(artifacts?.trail);

  // Investigation context — only fields genuinely known. "Answered by" is a real routing fact.
  // "Fields analyzed" is a mechanical column-key extraction from the DATASET section(s) actually
  // being rendered — Agent Brain already decided which datasets matter by including them as
  // sections; this only reads off their column names for display, never queryData[0]. No
  // "Filters" line: nothing in the response contract carries authoritative filter state, so it
  // is omitted rather than presented as a fabricated "None applied".
  const answeredBy = primary?.agentName || primary?.decisionType || null;
  const fieldsAnalyzed = datasetSections.length > 0
    ? ([...new Set(datasetSections.flatMap((s) =>
        s.datasets.flatMap((d) => (d.rows[0] ? Object.keys(d.rows[0]) : []))))]
        .map(colLabel).join(', ') || null)
    : null;

  return {
    question,
    understanding,
    narrativeBody,
    singleMetric,
    metricStrip,
    overflowMetrics,
    queryData,
    chartHintsByStep,
    legacyChartHint,
    sections,
    datasetSections,
    highlightSections,
    evidenceSections,
    insightSections,
    keyFindings,
    relatedFacts,
    recommendation,
    followUpQuestions,
    artifactTrail,
    reasoningSteps,
    agentContext,
    agentSessionId: primary?.agentSessionId || null,
    runKey: primary?.runKey || null,
    answeredBy,
    fieldsAnalyzed,
  };
}

// A small circular icon badge — the recurring visual device that gives metrics/findings/facts/
// follow-up-question rows presence instead of a plain bullet. One consistent accent per section (never
// a rainbow coded by fabricated categories the response never stated — every row means the
// same thing, so every badge looks the same).
function IconBadge({ icon: Icon, tone = 'primary', size = 30 }) {
  const tones = {
    primary: 'bg-z-primary-soft text-z-primary',
    quiet: 'bg-z-card-2 text-z-text-3',
    warning: 'bg-z-warning-soft text-z-warning',
  };
  return (
    <span
      className={cn('grid flex-none place-items-center rounded-z-round', tones[tone])}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.46)} />
    </span>
  );
}

// A small, fixed set of neutral/generic icons cycled purely by a metric's position in the
// list (metric 0 → icon A, metric 1 → icon B, ... wrapping around). Deliberately content-blind:
// nothing here ever inspects a metric's label/value to "guess" an icon — that would be exactly
// the business-vocabulary inference the platform forbids. This only adds visual variety.
const METRIC_ICONS = [TrendingUp, Activity, BarChart3, Hash];

// The KPI moment (spec §4) — compact, evidence-oriented, horizontal cards rather than a
// dashboard grid or the old "Executive Summary" side card. A single real figure is emphasized
// on its own; 2–4 read as a row of compact cards; a rare 5+ shows the first 4 with an
// explicit, honest "N more" expansion rather than silently truncating. Renders only metrics
// the backend actually supplied (ResponseArtifacts.metrics) — never derived/invented here.
function InvestigationMetrics({ single, strip, overflow }) {
  const [expanded, setExpanded] = useState(false);
  if (single) {
    return (
      <div className="mb-2 flex items-baseline gap-2.5 animate-z-rise motion-reduce:animate-none">
        <span className="text-[20px] font-semibold leading-none tabular-nums text-z-text">{single.value}</span>
        <span className="text-z-caption text-z-text-3">{single.label}</span>
      </div>
    );
  }
  const list = strip.length > 0 ? strip : overflow;
  if (list.length === 0) return null;
  const shown = strip.length > 0 || expanded ? list : list.slice(0, 4);
  return (
    <div className="mb-2 animate-z-rise motion-reduce:animate-none">
      <div className="flex flex-wrap gap-1.5">
        {shown.map((m, i) => (
          <div key={i} className="flex min-w-[110px] flex-1 items-center gap-1.5 rounded-z-md border border-z-border bg-z-card px-2.5 py-1">
            <IconBadge icon={METRIC_ICONS[i % METRIC_ICONS.length]} size={16} />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold leading-tight tabular-nums text-z-text">{m.value}</div>
              <div className="text-[10px] text-z-text-3">{m.label}</div>
            </div>
          </div>
        ))}
      </div>
      {overflow.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 text-z-caption text-z-primary transition-colors hover:underline"
        >
          {expanded ? 'Show fewer' : `Show ${overflow.length - 4} more`}
        </button>
      )}
    </div>
  );
}

// Visual Evidence (spec §5) — the existing Zevra chart implementation (DataViz), never a new
// charting library, arranged so multiple charts sit side by side at desktop widths ("Orders by
// Status", "Open Orders by Buyer", etc. — whatever the response actually supplies). Only wraps
// a dataset in a chart card when DataViz's OWN selection rules would actually produce a chart
// (hasChartConfig reuses those exact rules) — never a decorative, empty chart frame.
function EvidenceVisualizationGrid({ datasetSections, chartHintsByStep, legacyChartHint }) {
  // Each DATASET section already carries its own real `title`/`purpose` (the same field the
  // Evidence list below renders as a dataset's heading) — threaded through here as-is so a
  // chart card's header names the actual dataset the model built it from, verbatim, rather than
  // a generic chart-type label. When a section genuinely has no title, DataViz's own generic
  // fallback label (CHART_TITLES, keyed by chart type) is used instead — never a fabricated one.
  //
  // Per-dataset chart hint: each candidate looks up its OWN hint by its OWN stepNo (the LLM's
  // per-step declaration — see composeResponse's chartHintsByStep derivation), falling back to
  // the legacy/global hint only when this dataset has no per-step hint of its own. This is what
  // lets two differently-shaped datasets in the same response (e.g. a status breakdown and a
  // per-buyer breakdown) each render the chart type/category the model chose for THAT dataset,
  // rather than one hint applied to every chart card.
  const candidates = safeArray(datasetSections).flatMap((s) =>
    safeArray(s.datasets).map((d) => ({ rows: d.rows, title: s.title || s.purpose || null, stepNo: d.stepNo })));
  const chartable = candidates
    .map((c) => ({
      ...c,
      hint: (c.stepNo != null && chartHintsByStep?.get(c.stepNo)) || legacyChartHint || null,
    }))
    .filter((c) => hasChartConfig(c.rows, c.hint));
  if (chartable.length === 0) return null;
  return (
    <section
      className={cn(
        'mb-2 grid animate-z-rise gap-2.5 motion-reduce:animate-none',
        chartable.length > 1 && (chartable.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'),
      )}
    >
      {chartable.map((c, i) => (
        <div key={i} className="rounded-z-lg border border-z-border bg-z-card px-3 py-2">
          <DataViz queryData={c.rows} chartHint={c.hint} title={c.title} />
        </div>
      ))}
    </section>
  );
}

// Investigation Reasoning (spec §7) — a proper three-milestone reasoning component rather than
// the old "Business understanding · 2 concepts / Technical investigation · 1 step" line. The
// headline label for each row is always the business-facing phase name (Business Understanding /
// Data Investigation / Findings & Analysis) — concept/step/finding counts are secondary metadata
// badges, never the primary label. A row only ever appears once its underlying real data exists
// (never fabricated ahead of time); the full disclosure (SQL, business-concept resolution, agent
// tool calls) is unchanged — the same BusinessUnderstanding/ReasoningTrace/AgentStepsToggle
// components, now revealed via "View full reasoning" instead of always being collapsed inline.
// Renders nothing when there is genuinely no trail to show — same condition as before.
// Three distinct semantic accents already in the token set (no purple token exists today —
// primary/investigating/warning stand in for the mockup's green/blue/purple, same "distinct
// color per step" intent using colors the design system already defines for both themes).
const STEP_TONES = ['bg-z-primary', 'bg-z-investigating', 'bg-z-warning'];

function InvestigationReasoning({ reasoningSteps, artifactTrail, runKey, agentSessionId, findingsCount }) {
  // Secondary by design (explicit user direction): Investigation Reasoning is how Zevra
  // investigated, not the answer or its proof — so it starts fully collapsed behind one quiet
  // line, not the old always-visible ①②③ summary row. `outerOpen` gates that whole summary +
  // its own nested "View full reasoning" detail toggle (`open`, unchanged below) in one place.
  const [outerOpen, setOuterOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const hasLegacySteps = safeArray(reasoningSteps).length > 0;
  const hasArtifactTrail = safeArray(artifactTrail).length > 0;
  if (!hasLegacySteps && !hasArtifactTrail && !agentSessionId) return null;

  const conceptCount = reasoningSteps.filter((s) => s.type === 'resolution').length;
  const stepCount = reasoningSteps.filter((s) => s.type !== 'resolution' && s.type !== 'literal').length;
  const dataStepBadge = hasLegacySteps
    ? (stepCount > 0 ? `${stepCount} step${stepCount === 1 ? '' : 's'}` : null)
    : (hasArtifactTrail ? `${artifactTrail.length} step${artifactTrail.length === 1 ? '' : 's'}` : null);

  const rows = [
    conceptCount > 0 && {
      title: 'Business Understanding',
      detail: 'Identified the business concepts in your question',
      badge: `${conceptCount} concept${conceptCount === 1 ? '' : 's'}`,
    },
    (stepCount > 0 || hasArtifactTrail) && {
      title: 'Data Investigation',
      detail: hasArtifactTrail ? (artifactTrail[0]?.label || 'Queried enterprise data') : 'Queried enterprise data for this question',
      badge: dataStepBadge,
    },
    findingsCount > 0 && {
      title: 'Findings & Analysis',
      detail: 'Analyzed results and identified key insights',
      badge: `${findingsCount} finding${findingsCount === 1 ? '' : 's'}`,
    },
  ].filter(Boolean);

  const hasDetail = hasLegacySteps || hasArtifactTrail || !!agentSessionId;

  // Real step count only, never fabricated — the same count already computed above for the
  // "Data Investigation" row's badge. When genuinely unavailable (e.g. an agent session with
  // no legacy steps/trail of its own), the quiet line omits a count rather than guessing one.
  const collapsedLabel = dataStepBadge
    ? `Investigated in ${dataStepBadge}`
    : 'Investigation reasoning';

  return (
    <section className="rounded-z-lg border border-z-border bg-z-card px-3 py-2 animate-z-rise motion-reduce:animate-none">
      <button
        type="button"
        onClick={() => setOuterOpen((o) => !o)}
        aria-expanded={outerOpen}
        className="flex w-full items-center justify-between gap-3 text-left text-z-caption text-z-text-3 transition-colors hover:text-z-text-2"
      >
        <span>{collapsedLabel} · {outerOpen ? 'hide reasoning' : 'view reasoning'} →</span>
        <ChevronDown size={13} className={cn('flex-none transition-transform', outerOpen && 'rotate-180')} />
      </button>

      {outerOpen && (
        <div className="mt-2.5 border-t border-z-border pt-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <ReportLabel>Investigation Reasoning</ReportLabel>
            {hasDetail && (
              <button type="button" onClick={() => setOpen((o) => !o)} className="flex-none text-z-caption text-z-primary transition-colors hover:underline">
                {open ? 'Hide full reasoning' : 'View full reasoning →'}
              </button>
            )}
          </div>

          {rows.length > 0 ? (
            // Three-stacked-row summary, matching the reference mockup: a colored numbered
            // circle, a bold step title, a description line beneath it, and a right-aligned
            // small badge naming the concept/step/finding count. The deeper SQL/agent-step
            // disclosure below (behind "View full reasoning") is unchanged — this only concerns
            // how the same three real milestones are laid out once the section is expanded.
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={row.title} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] font-semibold text-z-on-accent',
                      STEP_TONES[i % STEP_TONES.length],
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-z-text">{row.title}</div>
                    <div className="text-[11px] leading-[1.4] text-z-text-3">{row.detail}</div>
                  </div>
                  {row.badge && (
                    <span className="mt-0.5 flex-none whitespace-nowrap rounded-z-round bg-z-investigating-soft px-2 py-0.5 text-[10.5px] font-medium text-z-investigating">
                      {row.badge} ›
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <AgentStepsToggle sessionId={agentSessionId} />
          )}

          {open && rows.length > 0 && (
            <div className="mt-3 border-t border-z-border pt-3">
              {hasLegacySteps ? (
                <>
                  <BusinessUnderstanding steps={reasoningSteps} runKey={runKey} />
                  <ReasoningTrace steps={reasoningSteps} loading={false} />
                </>
              ) : hasArtifactTrail ? (
                <ul className="space-y-2">
                  {artifactTrail.map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-z-caption text-z-text-2">
                      <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-z-text-3" />
                      <span>{t.label}{t.outcome ? ` — ${t.outcome}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <AgentStepsToggle sessionId={agentSessionId} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}


// ── Zevra Intelligence Response — the universal presentation of a Zevra response, regardless of
// which execution path produced it (direct chat, a Zevra Agent, or a future workflow — the UI
// never branches on that; it only ever asks "which artifacts exist"). Three regions — QUESTION/
// UNDERSTANDING (left), EVIDENCE (center), ZEVRA INTELLIGENCE (right) — composed from whatever
// composeResponse() actually found, so a simple factual answer stays light (most panels simply
// don't render) and an analytical or agent-driven answer fills out into a full intelligence
// briefing — the SAME renderer either way, never a different UI per execution path. In Live Mode
// `primary` is always the newest turn; in Report Mode (opened from the Executive Brief) `primary`
// stays the original investigation the finding came from. Earlier turns remain fully visible
// above it via the unchanged UserMessage/AssistantMessage list.
export function IntelligenceResponse({ finding, messages, onAsk }) {
  const assistantIdxs = messages.reduce((acc, m, i) => (m.role === 'assistant' ? [...acc, i] : acc), []);
  const pIdx = finding
    ? assistantIdxs[0] ?? -1               // report mode: the original investigation the finding came from
    : assistantIdxs[assistantIdxs.length - 1] ?? -1; // live mode: the newest turn
  const primary = pIdx >= 0 ? messages[pIdx] : null;
  const question = pIdx > 0 ? messages[pIdx - 1]?.content : messages.find((m) => m.role === 'user')?.content;
  const earlier = pIdx > 0 ? messages.slice(0, pIdx - 1) : [];
  const loading = !!primary?.loading;
  const title = finding?.title || question || 'Investigation';
  const startedLabel = primary?.startedAt ? timeAgo(primary.startedAt) : null;
  const milestones = useMemo(() => deriveMilestones(safeArray(primary?.phaseSteps)), [primary?.phaseSteps]);
  const r = useMemo(() => composeResponse(primary, finding, question), [primary, finding, question]);
  const hasMetrics = !!r.singleMetric || r.metricStrip.length > 0 || r.overflowMetrics.length > 0;

  return (
    <div className="pb-4">
      {earlier.length > 0 && (
        <>
          <div className="mb-8 flex justify-center"><Eyebrow>Earlier in this investigation</Eyebrow></div>
          {earlier.map((m, i) =>
            m.role === 'user' ? (
              <UserMessage key={i} text={m.content} attachment={m.attachment} />
            ) : (
              <AssistantMessage
                key={i} content={m.content} decisionType={m.decisionType} agentName={m.agentName}
                loading={m.loading} queryData={m.queryData} quickRefinements={m.quickRefinements}
                reasoningSteps={m.reasoningSteps || []} streamingSteps={m.streamingSteps || []}
                phaseSteps={m.phaseSteps || []} agentSessionId={m.agentSessionId || null}
                runKey={m.runKey || null} onAsk={onAsk}
              />
            ),
          )}
          <div className="mb-9 mt-12 flex items-center gap-4" aria-hidden>
            <span className="h-px flex-1 bg-z-border" />
            <span className="text-z-label uppercase tracking-[0.18em] text-z-text-3">Current investigation</span>
            <span className="h-px flex-1 bg-z-border" />
          </div>
        </>
      )}

      {/* Investigation Header (spec §1/§2) — title, the question once (no separate Question
          card), and a compact real-data-only metadata line. Sticky within the workspace's own
          scroll region (see the `overflow-y-auto` wrapper in Chat()) so it stays visible while
          the rest of the investigation scrolls beneath it — a compact ~44px bar, not a masthead. */}
      <div className="sticky top-0 z-20 -mx-1 mb-2 bg-z-bg/95 px-1 py-1.5 backdrop-blur-sm">
        <InvestigationHeader
          finding={finding} loading={loading} title={title} question={question}
          startedLabel={!loading ? startedLabel : null} answeredBy={!loading ? r.answeredBy : null}
        />
      </div>

      {loading ? (
        <div className="mb-8">
          {milestones.length > 0 ? (
            <RuntimeProgress phases={milestones} />
          ) : (
            <p className="font-z-serif italic text-z-body leading-[1.5] text-z-text-2">Understanding your question…</p>
          )}
          {safeArray(primary?.streamingSteps).length > 0 && (
            <div className="mt-3"><LiveReasoningSteps steps={safeArray(primary?.streamingSteps)} /></div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ── Main investigation canvas ── */}
          <div className="min-w-0 lg:order-1">
            {/* Key Finding hero (spec §3) */}
            <KeyFindingBanner headline={r.understanding} body={r.narrativeBody} agentContext={r.agentContext} />

            {/* KPI / Investigation Metrics (spec §4) */}
            {hasMetrics && (
              <InvestigationMetrics single={r.singleMetric} strip={r.metricStrip} overflow={r.overflowMetrics} />
            )}

            {/* Visual Evidence / charts (spec §5) — only when the response's own datasets are
                actually chartable; never forced onto every investigation. */}
            <EvidenceVisualizationGrid datasetSections={r.datasetSections}
              chartHintsByStep={r.chartHintsByStep} legacyChartHint={r.legacyChartHint} />

            {/* Key Findings + related facts + recommendation + narrative insight (spec §6) —
                real model-generated content only, never fabricated or derived here. Insight
                (HIGHLIGHT + TEXT) sections render here too (see insightSections above) —
                narrative content belongs with the other answer-shaped content, not under
                "Evidence", which is DATASET-only. */}
            {(r.keyFindings.length > 0 || r.relatedFacts.length > 0 || !!r.recommendation || r.insightSections.length > 0) && (
              <section className="mb-2 animate-z-rise motion-reduce:animate-none">
                {r.keyFindings.length > 0 && (
                  <div className="mb-2 animate-z-rise rounded-z-lg border border-z-border bg-z-card px-4 py-3 shadow-z-1 motion-reduce:animate-none">
                    <div className="mb-2 flex items-center gap-2">
                      <IconBadge icon={Award} tone="warning" size={26} />
                      <span className="text-z-body font-semibold text-z-text">Key Findings</span>
                    </div>
                    <ul className="space-y-1.5">
                      {r.keyFindings.map((f, i) => (
                        <li key={i} className="flex gap-2 text-z-caption leading-[1.35] text-z-text-2">
                          <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-z-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.relatedFacts.length > 0 && (
                  <div className="mb-2">
                    <ReportLabel>Related Facts</ReportLabel>
                    <ul className="space-y-1">
                      {r.relatedFacts.map((f, i) => (
                        <li key={i} className="flex gap-2 text-[11.5px] leading-[1.35] text-z-text-3">
                          <IconBadge icon={FileText} tone="quiet" size={14} />
                          <span className="pt-0.5">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.recommendation && (
                  <div className={r.insightSections.length > 0 ? 'mb-2' : ''}>
                    <ReportLabel>Recommendation</ReportLabel>
                    <div className="flex gap-2.5 text-z-caption leading-[1.5] text-z-text-2">
                      <IconBadge icon={Compass} size={20} />
                      <span className="pt-0.5">{r.recommendation}</span>
                    </div>
                  </div>
                )}

                {/* Narrative insight (HIGHLIGHT + TEXT sections) — same bordered-card shape this
                    content always used, just relocated out from under "Evidence" (see
                    insightSections above): EVIDENCE is raw proof (DATASET only), this is
                    narrative, so it sits with the other answer-shaped content instead. A small,
                    quiet "Additional Insight" heading (same ReportLabel pattern used for Related
                    Facts/Recommendation above) makes it unambiguous this is a finding-adjacent
                    note, not part of the dataset/evidence flow — it was previously unlabeled. */}
                {r.insightSections.length > 0 && <ReportLabel>Additional Insight</ReportLabel>}
                {r.insightSections.map((s, i) => (
                  <div key={i} className={cn('rounded-z-lg border border-z-border bg-z-card px-3 py-2.5', i > 0 && 'mt-2')}>
                    {s.title && <div className="mb-1 text-z-body font-semibold text-z-text">{s.title}</div>}
                    <div className="text-z-caption leading-[1.5] text-z-text-2">
                      <MarkdownBody content={s.content} />
                    </div>
                    {s.datasets.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.datasets.map((ds, j) => (
                          <span key={j} className="rounded-z-round bg-z-card-2 px-1.5 py-0.5 text-[10px] text-z-text-3">
                            step-{ds.stepNo} · {ds.rowCount} row{ds.rowCount === 1 ? '' : 's'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Evidence — Agent Brain's own DATASET sections only, rendered in the exact order
                supplied (never reordered/grouped/sorted). Every dataset is a first-class
                InvestigationDataset artifact (spec §8: search, columns, export). HIGHLIGHT/TEXT
                narrative sections no longer appear here — see insightSections above; this
                section is raw proof data exclusively. */}
            {r.evidenceSections.length > 0 && (
              <section className="animate-z-rise motion-reduce:animate-none">
                {r.evidenceSections.map((s, i) => (
                  <div key={i} className={i > 0 ? 'mt-2.5' : ''}>
                    <div>
                      {s.purpose && <div className="mb-1 text-z-caption text-z-text-3">{s.purpose}</div>}
                      {s.datasets.map((ds, j) => (
                        <div key={j} className={j > 0 ? 'mt-2' : ''}>
                          <InvestigationDataset
                            rows={ds.rows}
                            title={s.datasets.length > 1 ? `${s.title || 'Dataset'} · step-${ds.stepNo}` : (s.title || 'Dataset')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

          </div>

          {/* ── Investigation Assistant rail (spec §9/§10) — collapses below the main canvas
              on narrower widths (grid-cols-1 above lg:), never floats over content. ── */}
          {/* Sticky below the sticky Investigation Header (spec §8) — top offset matches that
              header's own height so the rail settles directly beneath it, never under it. */}
          <div className="flex flex-col gap-2 lg:order-2 lg:sticky lg:top-11 lg:h-fit">
            <InvestigationAssistant milestones={milestones} loading={loading} followUpQuestions={r.followUpQuestions} onAsk={onAsk} />

            {/* Data & Context (spec §10) — reuses the exact same real fields as before
                ("Investigation context"); only fields genuinely known are ever shown. */}
            {(r.answeredBy || r.fieldsAnalyzed || startedLabel) && (
              <Panel eyebrow="Investigation context">
                <dl className="space-y-1 text-[11px]">
                  {r.answeredBy && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-z-text-3">Answered by</dt>
                      <dd className="text-right text-z-text-2">{r.answeredBy}</dd>
                    </div>
                  )}
                  {r.fieldsAnalyzed && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="flex-none text-z-text-3">Fields analyzed</dt>
                      <dd className="min-w-0 truncate text-right text-z-text-2">{r.fieldsAnalyzed}</dd>
                    </div>
                  )}
                  {/* No "Filters" row: nothing in the response contract carries authoritative
                      filter state. An honest omission, never a fabricated "None applied". */}
                  {startedLabel && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-z-text-3">Last updated</dt>
                      <dd className="text-z-text-2">{startedLabel}</dd>
                    </div>
                  )}
                </dl>
              </Panel>
            )}

            {/* Investigation Reasoning (spec §7) — per explicit user direction this is
                secondary/optional (how Zevra investigated, not the answer itself), and lives in
                the rail alongside the Assistant/Investigation-context panel rather than at the
                bottom of the main canvas — a pure relocation, quiet-by-default (see
                InvestigationReasoning) with all of its own logic/props unchanged. On narrow
                widths this moves with the rest of the rail (grid-cols-1 above lg:), not pinned
                to the main column. */}
            <InvestigationReasoning
              reasoningSteps={r.reasoningSteps} artifactTrail={r.artifactTrail}
              runKey={r.runKey} agentSessionId={r.agentSessionId} findingsCount={r.keyFindings.length}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Chat({ prefillQuestion = null, onPrefillUsed = null }) {
  const { user } = useAuth();

  // blank-workspace composer value (a new investigation before its first question)
  const [landingQuery, setLandingQuery] = useState('');

  // history floating panel
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [pinReportOpen,  setPinReportOpen]  = useState(false);

  // attachment (file upload / image paste)
  const [attachment,        setAttachment]        = useState(null);   // { key, fileName, type, thumbnail, summary }
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError,   setAttachmentError]   = useState('');
  const fileInputRef = useRef(null);

  // chat state
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState([]);
  // Next-step suggestions render once, inside the Investigation Assistant rail's "Suggested
  // follow-ups" (spec §9) — composeResponse() derives them from the model's own followUpQuestions
  // right there in IntelligenceResponse, so there is no separate composer-bar chip row here
  // to keep in sync (avoids the duplicate-suggestions problem spec §19 warns against).
  const conversationIdRef = useRef(null);   // useRef avoids stale-closure bugs in async handlers
  const [chatQuery, setChatQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [teachModalOpen, setTeachModalOpen] = useState(false); // /TeachZevra (Part B)
  const [openExportMenu, setOpenExportMenu] = useState(null);

  // Slash-command launcher (both composers below share this — see InvestigationComposer).
  // 'insert'-type commands (e.g. /knowledge) are handled inside the composer itself; only
  // 'modal' commands reach here, and today that's just /TeachZevra.
  const handleSlashCommand = (cmd) => {
    if (cmd.id === 'teach-zevra') setTeachModalOpen(true);
  };

  // Presentation mode of the Investigation Workspace: 'live' (conversational, work in
  // progress) or 'report' (completed investigation opened from the Executive Brief —
  // Summary → Evidence → Reasoning → Conversation). Same investigation, same data.
  const [presentationMode, setPresentationMode] = useState('live');
  const [reportFinding, setReportFinding] = useState(null);

  // history
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState('');

  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (chatMode) scrollToBottom();
  }, [messages, chatMode]);

  useEffect(() => {
    if (chatMode) chatInputRef.current?.focus();
  }, [chatMode]);

  // ── data loading ────────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError('');
    try {
      setConversations(safeArray(await api.chat.conversations()));
    } catch (err) {
      setConversationsError(err.message || 'Unable to load conversations');
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  // ── Attachment helpers ─────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    setAttachmentError('');
    setAttachmentLoading(true);
    try {
      const res = await api.attachments.upload(file, conversationIdRef.current);
      setAttachment({
        key:       res.attachment_key,
        fileName:  res.file_name,
        type:      res.attachment_type,
        thumbnail: res.thumbnail_base64,   // base64 JPEG thumbnail (images only)
        summary:   res.summary,
        mimeType:  res.mime_type,
      });
    } catch (e) {
      setAttachmentError(e.message || 'Upload failed');
    } finally {
      setAttachmentLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAttachment = useCallback(() => {
    setAttachment(null);
    setAttachmentError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Capture Ctrl+V / Command+V image paste anywhere in the chat input area
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadFile(file);
        return;
      }
    }
  }, [uploadFile]);

  const prefillFiredRef = useRef(false);

  // Auto-fire prefilled question from onboarding wizard completion.
  // Guard with a ref so React StrictMode's double-invoke doesn't send it twice.
  useEffect(() => {
    if (prefillQuestion && !prefillFiredRef.current) {
      prefillFiredRef.current = true;
      onPrefillUsed?.();
      sendQuestion(prefillQuestion, true);
      return;
    }
    // Pick up cross-page prefill stored by the Home launchpad (or Knowledge Graph "Ask Zevra")
    const stored = localStorage.getItem('zevra_chat_prefill');
    if (stored && !prefillFiredRef.current) {
      prefillFiredRef.current = true;
      localStorage.removeItem('zevra_chat_prefill');
      sendQuestion(stored, true);
      return;
    }
    // Executive Brief → "Review the analysis": open the exact investigation that produced
    // the recommendation, in Report Mode. Lineage comes from the finding (deterministic).
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const reportConv = params.get('report');
    if (reportConv && !prefillFiredRef.current) {
      prefillFiredRef.current = true;
      openInvestigationReport(reportConv, params.get('finding'));
      return;
    }
    // Pick up a "resume this investigation" request from the Home overlay's recent list
    const openId = localStorage.getItem('zevra_chat_open');
    if (openId && !prefillFiredRef.current) {
      prefillFiredRef.current = true;
      localStorage.removeItem('zevra_chat_open');
      openConversation(openId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open a completed investigation in Report Mode: the finding supplies the executive
  // summary; the conversation supplies the evidence; the workspace presents them as a
  // report with the conversation as its final section.
  const openInvestigationReport = async (conversationId, findingKey) => {
    setPresentationMode('report');
    if (findingKey) {
      try {
        const f = await api.reasoning.finding(findingKey);
        if (f) setReportFinding(f);
      } catch { /* summary falls back to the investigation's own answer */ }
    }
    await openConversation(conversationId);
  };

  // Load conversations for the History panel.
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── SSE reasoning stream ────────────────────────────────────────────────────
  // Opens a fetch-based SSE connection to /chat/runs/{runKey}/stream — see
  // src/lib/sse.js for the shared implementation (also used by onboarding's
  // job-progress stream). Calls onEvent for each parsed SSE data line;
  // returns a cancel function.
  const openReasoningStream = (runKey, onEvent) =>
    openEventStream(`/chat/runs/${runKey}/stream`, onEvent);

  // ── submit question ─────────────────────────────────────────────────────────
  const sendQuestion = async (question, isNewConv = false) => {
    if ((!question?.trim() && !attachment) || submitting) return;

    // /TeachZevra — a dedicated Teaching UI/modal, NOT a free-form chat teaching mode. Intercepted
    // here, before any chat state changes or backend call, so it is never sent to ChatService as
    // an ordinary question.
    const trimmedQuestion = question?.trim() || '';
    if (/^\/teachzevra(\s|$)/i.test(trimmedQuestion)) {
      setTeachModalOpen(true);
      return;
    }

    // Always reuse the existing conversationId unless explicitly starting a new chat
    if (isNewConv || !conversationIdRef.current) {
      conversationIdRef.current = newConversationId();
    }
    const activeConvId = conversationIdRef.current;

    // Generate a run key here so the SSE stream can be opened before the POST returns
    const clientRunKey = 'run-' + crypto.randomUUID().replace(/-/g, '');

    // Capture and clear attachment before any state updates
    const currentAttachment = attachment;
    if (attachment) clearAttachment();

    // Enter chat mode and add user message (with attachment preview if present)
    if (!chatMode) setChatMode(true);
    setMessages((prev) => [...prev, {
      role: 'user',
      content: question,
      attachment: currentAttachment ? {
        fileName:  currentAttachment.fileName,
        type:      currentAttachment.type,
        thumbnail: currentAttachment.thumbnail,
        summary:   currentAttachment.summary,
      } : null,
    }]);

    // Add loading placeholder — streamingSteps accumulates via SSE while POST is in-flight.
    // startedAt is a real client-side timestamp (when this question was actually submitted),
    // carried through to the finalised message below for the Investigation Console's
    // "Started X ago" / "Last updated" — never a fabricated or simulated value.
    const startedAt = Date.now();
    setMessages((prev) => [...prev, { role: 'assistant', content: '', loading: true, streamingSteps: [], phaseSteps: [], startedAt }]);

    setSubmitting(true);
    setSubmitError('');

    // Open SSE stream before firing POST so no events are missed
    const cancelStream = openReasoningStream(clientRunKey, (event) => {
      if (event.type === 'phase_started' || event.type === 'phase_completed') {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (!last?.loading) return prev; // already finalised
          const existing = safeArray(last.phaseSteps);

          if (event.type === 'phase_started') {
            if (existing.some(p => p.phase === event.phase && !p.done)) return prev; // defensive: no dupes
            return [...next.slice(0, -1), {
              ...last,
              phaseSteps: [...existing, { phase: event.phase, label: event.label, done: false }],
            }];
          }
          // phase_completed
          return [...next.slice(0, -1), {
            ...last,
            phaseSteps: existing.map(p => p.phase === event.phase ? { ...p, done: true } : p),
          }];
        });
        return;
      }
      if (event.type === 'step_started' || event.type === 'step_completed' || event.type === 'evaluation') {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (!last?.loading) return prev; // already finalised
          const existing = safeArray(last.streamingSteps);

          if (event.type === 'step_started') {
            return [...next.slice(0, -1), {
              ...last,
              streamingSteps: [...existing, {
                stepNo:      event.stepNo,
                description: event.description,
                rowCount:    null,  // not yet
                evaluatorDecision: null,
              }],
            }];
          }
          if (event.type === 'step_completed') {
            return [...next.slice(0, -1), {
              ...last,
              streamingSteps: existing.map(s =>
                s.stepNo === event.stepNo
                  ? { ...s, rowCount: event.rowCount, rowSummary: event.summary }
                  : s),
            }];
          }
          if (event.type === 'evaluation') {
            return [...next.slice(0, -1), {
              ...last,
              streamingSteps: existing.map(s =>
                s.stepNo === event.stepNo
                  ? { ...s, evaluatorDecision: event.decision, evaluatorRationale: event.rationale }
                  : s),
            }];
          }
          return prev;
        });
      }
    });

    try {
      const response = await api.chat.ask({
        question,
        conversation_id: activeConvId,
        agent_key:       null,
        attachment_key:  currentAttachment?.key ?? null,
        client_run_key:  clientRunKey,
      });

      cancelStream();

      setMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = {
          role: 'assistant',
          content: response.answer || response.error || 'No response received.',
          decisionType:    response.decision?.type || response.decision_type,
          agentName:       response.routed_agent_name || response.routedAgentName || null,
          queryData:       response.query_data       || response.queryData       || null,
          quickRefinements:response.quick_refinements || response.quickRefinements || [],
          reasoningSteps:  response.reasoning_steps  || response.reasoningSteps  || [],
          learningsApplied:response.learnings_applied || response.learningsApplied || [],
          agentSessionId:  response.agent_session_id  || response.agentSessionId  || null,
          runKey:          response.run_key            || response.runKey          || null,
          // Generalized "Zevra Intelligence Response Artifacts" (backend-composed; see
          // ResponseArtifacts/ResponseArtifactsBuilder). Optional — null on older/other
          // response shapes (e.g. a reopened past conversation), in which case
          // composeResponse() falls back to the same client-side derivation it always used.
          artifacts:       response.artifacts || null,
          streamingSteps:  [],   // cleared — final steps are in reasoningSteps
          phaseSteps:      [],
          startedAt,
          loading: false,
        };
        return next;
      });

      await loadConversations();
    } catch (err) {
      cancelStream();
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: `**Error:** ${err.message || 'Unable to get a response.'}`,
          loading: false,
          streamingSteps: [],
          phaseSteps: [],
          startedAt,
        };
        return next;
      });
      setSubmitError(err.message || 'Unable to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit handlers are invoked by InvestigationComposer, which already prevents the
  // default form submit — so they take no event.
  const handleLandingSubmit = () => {
    const q = landingQuery.trim() || (attachment ? 'Please analyse this attached file.' : '');
    if (!q) return;
    setLandingQuery('');
    sendQuestion(q, true);   // isNewConv=true: generate a fresh conversation ID
  };

  const handleChatSubmit = () => {
    const q = chatQuery.trim();
    if (!q) return;
    setChatQuery('');
    sendQuestion(q);
  };

  const openConversation = async (convId) => {
    try {
      const runs = safeArray(await api.chat.conversation(convId));
      const msgs = [];
      for (const run of runs) {
        if (run.question) {
          msgs.push({ role: 'user', content: run.question });
        }
        if (run.answer) {
          // query_data is now returned as a parsed array by the backend.
          // Cap at 100 rows so the table never renders an unusable wall of data.
          const qd = safeArray(run.query_data);
          msgs.push({
            role:          'assistant',
            content:       run.answer,
            decisionType:  run.decision_type || run.decisionType,
            agentName:     run.routed_agent_name || run.routedAgentName || null,
            queryData:     qd.length > 100 ? qd.slice(0, 100) : qd,
          });
        }
      }
      if (msgs.length > 0) {
        setMessages(msgs);
        conversationIdRef.current = convId;
        setChatMode(true);
      }
    } catch (err) {
      setSubmitError(err.message || 'Unable to open conversation');
    }
  };

  // A fresh conversation opens in place — clear the thread but stay in the workspace,
  // rather than bouncing back to a blank page.
  const startNewChat = () => {
    setMessages([]);
    conversationIdRef.current = null;
    setChatQuery('');
    setSubmitError('');
    setOpenExportMenu(null);
    setPresentationMode('live');
    setReportFinding(null);
    requestAnimationFrame(() => chatInputRef.current?.focus());
  };

  const conversationTitle = messages.find((m) => m.role === 'user')?.content?.slice(0, 60) || 'Investigation';
  const conversationFileBase = `${slugifyFileName(conversationTitle, 'zevra-investigation')}-${exportStamp()}`;

  const exportAnswerActions = (message, index) => {
    const tables = extractMarkdownTables(message.content);
    const answerBase = `zevra-answer-${index + 1}-${exportStamp()}`;
    return [
      {
        label: 'Copy answer',
        icon: Clipboard,
        onClick: async () => {
          await navigator.clipboard?.writeText(message.content || '');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Download answer (.md)',
        icon: FileText,
        onClick: () => {
          downloadBlob(`${answerBase}.md`, message.content || '', 'text/markdown;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Download table CSV',
        icon: FileSpreadsheet,
        disabled: tables.length === 0,
        onClick: () => {
          downloadBlob(`${answerBase}-tables.csv`, tablesToCsv(tables), 'text/csv;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Download table Excel',
        icon: FileSpreadsheet,
        disabled: tables.length === 0,
        onClick: () => {
          downloadBlob(`${answerBase}-tables.xls`, tablesToExcelHtml(tables, 'Zevra answer tables'), 'application/vnd.ms-excel;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Print / save PDF',
        icon: Printer,
        onClick: () => {
          printMarkdown('Zevra answer', message.content || '');
          setOpenExportMenu(null);
        },
      },
    ];
  };

  const exportConversationActions = () => {
    const markdown = buildConversationMarkdown(messages, conversationTitle);
    const assistantTables = messages
      .filter((msg) => msg.role === 'assistant' && !msg.loading)
      .flatMap((msg) => extractMarkdownTables(msg.content));
    return [
      {
        label: 'Download report (.md)',
        icon: FileText,
        onClick: () => {
          downloadBlob(`${conversationFileBase}.md`, markdown, 'text/markdown;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Download report HTML',
        icon: FileDown,
        onClick: () => {
          downloadBlob(`${conversationFileBase}.html`, buildReportHtml(conversationTitle, markdown), 'text/html;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Download all tables CSV',
        icon: FileSpreadsheet,
        disabled: assistantTables.length === 0,
        onClick: () => {
          downloadBlob(`${conversationFileBase}-tables.csv`, tablesToCsv(assistantTables), 'text/csv;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Download all tables Excel',
        icon: FileSpreadsheet,
        disabled: assistantTables.length === 0,
        onClick: () => {
          downloadBlob(`${conversationFileBase}-tables.xls`, tablesToExcelHtml(assistantTables, conversationTitle), 'application/vnd.ms-excel;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'PowerPoint outline',
        icon: FileDown,
        onClick: () => {
          downloadBlob(`${conversationFileBase}.ppt`, buildPowerPointHtml(conversationTitle, messages), 'application/vnd.ms-powerpoint;charset=utf-8');
          setOpenExportMenu(null);
        },
      },
      {
        label: 'Print / save PDF',
        icon: Printer,
        onClick: () => {
          printMarkdown(conversationTitle, markdown);
          setOpenExportMenu(null);
        },
      },
    ];
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-z-bg">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── BLANK WORKSPACE · a new investigation begins with the composer alone
             (launchpad content — prompts, recents — now lives on Home) ── */}
        {!chatMode && (
          <IntelligencePage measure="column" atmosphere className="pb-16 pt-[13vh]">
            {/* Attachment preview row */}
            {(attachment || attachmentLoading || attachmentError) && (
              <div className="mb-2 px-1">
                {attachmentLoading && (
                  <div className="flex items-center gap-2 text-z-caption text-z-text-3">
                    <Spinner size="xs" /> Uploading file…
                  </div>
                )}
                {attachmentError && !attachmentLoading && (
                  <InlineAlert variant="error" onDismiss={() => setAttachmentError('')}>{attachmentError}</InlineAlert>
                )}
                {attachment && !attachmentLoading && (
                  <AttachmentChip attachment={attachment} onRemove={clearAttachment} />
                )}
              </div>
            )}
            <InvestigationComposer
              value={landingQuery}
              onChange={setLandingQuery}
              onSubmit={handleLandingSubmit}
              onSlashCommand={handleSlashCommand}
              placeholder="Investigate anything — sales, operations, finance, suppliers…"
              autoFocus
              disabled={submitting || (!landingQuery.trim() && !attachment)}
              allowAttachments
              onAttachClick={() => fileInputRef.current?.click()}
              onPaste={handlePaste}
              attachmentBusy={attachmentLoading}
            />
          </IntelligencePage>
        )}

        {/* ── CHAT VIEW ── */}
        {chatMode && (
          <>
            {/* Chat header — a slim conversation toolbar (the shell composer is hidden on this
                route; the workspace owns input). The question itself is NOT repeated here —
                the Investigation Console's own masthead + Question panel already show it
                prominently; a third copy in this small italic span read as a rendering glitch
                during streaming, not intentional hierarchy. */}
            <header className="flex h-12 shrink-0 items-center gap-3 border-b border-z-border bg-transparent px-6">
              <Button variant="ghost" size="sm"
                onClick={presentationMode === 'report' ? () => { window.location.hash = '/'; } : startNewChat}
                leadingIcon={<ArrowLeft size={16} />}>
                {presentationMode === 'report' ? 'Executive Brief' : 'New chat'}
              </Button>
              <span className="min-w-0 flex-1" />
              <div className="flex items-center gap-1">
                <IconButton
                  label="Conversation history"
                  onClick={() => setHistoryOpen(o => !o)}
                  className={cn('h-8 w-8', historyOpen && 'bg-z-hover text-z-text')}
                >
                  <Clock size={15} />
                </IconButton>
                <IconButton
                  label="Schedule this conversation as a recurring report"
                  onClick={() => setPinReportOpen(true)}
                  className="h-8 w-8"
                >
                  <CalendarClock size={15} />
                </IconButton>
                <ExportMenu
                  open={openExportMenu === 'conversation'}
                  onToggle={() => setOpenExportMenu((current) => current === 'conversation' ? null : 'conversation')}
                  disabled={messages.filter((msg) => !msg.loading).length === 0}
                  actions={exportConversationActions()}
                />
              </div>
            </header>

            {/* Zevra Intelligence Response — one response dominates the page (see
                IntelligenceResponse above); this replaces the previous plain chat-bubble
                thread as the default presentation, not just Report Mode's. */}
            <div className="relative min-h-0 flex-1 overflow-y-auto scroll-smooth">
              {/* The Signature canvas atmosphere — same emerald-light glow every other
                  Intelligence Experience page uses; an Investigation is signature-forward. */}
              <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[image:var(--z-ai-atmo)]" />
              {/* measure="wide" caps at 1280px (the shared default for other Intelligence
                  pages) — overridden here via inline style (the only reliable way to beat a
                  shared component's own class, since Tailwind class cascade order isn't
                  guaranteed by className position). This workspace's center evidence column
                  benefits from real estate a narrower page wouldn't need; the extra width goes
                  entirely to the center column since left/right are fixed-width and center is
                  `minmax(0,1fr)`. */}
              <ReadingColumn measure="wide" className="relative z-[1] pb-5" style={{ maxWidth: '1600px' }}>
                <IntelligenceResponse finding={presentationMode === 'report' ? reportFinding : null} messages={messages} onAsk={q => sendQuestion(q)} />
                {submitError && (
                  <p className="text-center text-z-caption text-z-critical-on">{submitError}</p>
                )}
                <div ref={messagesEndRef} />
              </ReadingColumn>
            </div>

            {/* Composer — "Continue investigation" (spec §14). Suggested follow-ups now live
                exclusively in the Investigation Assistant rail's "Suggested follow-ups" (spec
                §9), sourced from the same composeResponse().followUpQuestions — no separate chip row
                here, so there is only ever one place suggestions can disagree from. */}
            <div className="shrink-0 border-t border-z-border bg-z-card px-6 py-2.5 backdrop-blur-sm">
              {/* Attachment preview / loading / error */}
              {(attachment || attachmentLoading || attachmentError) && (
                <div className="mx-auto mb-2 max-w-[1600px]">
                  {attachmentLoading && (
                    <div className="flex items-center gap-2 text-z-caption text-z-text-3">
                      <Spinner size="xs" /> Uploading file…
                    </div>
                  )}
                  {attachmentError && !attachmentLoading && (
                    <InlineAlert variant="error" onDismiss={() => setAttachmentError('')}>{attachmentError}</InlineAlert>
                  )}
                  {attachment && !attachmentLoading && (
                    <AttachmentChip attachment={attachment} onRemove={clearAttachment} />
                  )}
                </div>
              )}
              <InvestigationComposer
                className="mx-auto max-w-[1600px]"
                value={chatQuery}
                onChange={setChatQuery}
                onSubmit={handleChatSubmit}
                onSlashCommand={handleSlashCommand}
                placeholder={presentationMode === 'report' ? 'Ask a follow-up about this analysis… (type / for commands)' : 'Ask a follow-up or start a new investigation… (type / for commands)'}
                disabled={submitting || (!chatQuery.trim() && !attachment)}
                allowAttachments
                onAttachClick={() => fileInputRef.current?.click()}
                onPaste={handlePaste}
                attachmentBusy={attachmentLoading}
                inputRef={chatInputRef}
              />
              <p className="mt-1.5 text-center font-z-mono text-[11px] text-z-text-3">
                Zevra queries approved data sources only · Results may require validation
              </p>
            </div>
          </>
        )}
      </section>

      {/* Floating history panel */}
      {historyOpen && (
        <FloatingHistory
          conversations={conversations}
          loading={conversationsLoading}
          onOpen={openConversation}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {/* Pin as Report modal */}
      {pinReportOpen && chatMode && (
        <PinReportModal
          conversationTitle={conversationTitle}
          messages={messages}
          user={user}
          onClose={() => setPinReportOpen(false)}
        />
      )}

      {/* /TeachZevra — Explicit Teaching modal (Part B) */}
      <TeachZevraModal
        open={teachModalOpen}
        onClose={() => setTeachModalOpen(false)}
      />

      {/* Hidden file input — triggered by the paperclip in the composer (blank + docked) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.json,.xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = '';   // reset so the same file can be re-selected
        }}
      />
    </div>
  );
}
