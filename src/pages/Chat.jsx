import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import {
  ArrowLeft, Bot, CalendarClock, Check, ChevronDown, Clipboard, Clock, Compass,
  Download, FileDown, FileSpreadsheet, FileText, ListTree, Printer, Radar, Search, Sparkles, TrendingUp, User, X,
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

import DataViz from '../components/DataViz.jsx';
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

// Generic, real-data metric tiles from queryData — no business-specific assumptions
// about what the columns mean. Up to 3: how many results, a numeric column's total
// (if one exists), a categorical column's distinct-value count (if one exists worth
// surfacing). Every figure is literally present in the dataset — nothing inferred.
function deriveKeyMetrics(queryData) {
  const rows = safeArray(queryData);
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  const metrics = [{ value: rows.length.toLocaleString(), label: rows.length === 1 ? 'result' : 'results' }];

  const numCol = cols.find((c) => {
    const vals = rows.map((r) => r[c]).filter((v) => v != null && v !== '');
    return vals.length > 0 && vals.every((v) => !isNaN(parseFloat(v)) && isFinite(v));
  });
  if (numCol) {
    const total = rows.reduce((sum, r) => sum + (parseFloat(r[numCol]) || 0), 0);
    metrics.push({ value: fmtCell(total), label: `total ${colLabel(numCol)}` });
  }

  const catCol = cols.find((c) => c !== numCol && /status|state|type|categ|supplier|owner|location|region|priority/i.test(c));
  if (catCol) {
    const unique = new Set(rows.map((r) => r[catCol]).filter(Boolean));
    if (unique.size > 1 && unique.size < rows.length) {
      metrics.push({ value: unique.size.toLocaleString(), label: `distinct ${colLabel(catCol)}` });
    }
  }
  return metrics.slice(0, 3);
}

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
// box filters real rows client-side; nothing here alters or invents data.
function InvestigationDataset({ rows }) {
  const [search, setSearch] = useState('');
  if (!rows?.length) return null;
  const cols = Object.keys(rows[0]);
  const statusCol = cols.find((c) => /status|state$/i.test(c));
  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => cols.some((c) => String(r[c] ?? '').toLowerCase().includes(q))) : rows;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-z-label uppercase tracking-[0.14em] text-z-text-3">
          Dataset <span className="normal-case tracking-normal text-z-text-2">({rows.length.toLocaleString()})</span>
        </span>
        <div className="relative w-56">
          <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-z-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dataset…"
            className="w-full rounded-z-sm border border-z-border-strong bg-z-surface py-1.5 pl-7 pr-2.5 text-z-caption text-z-text placeholder:text-z-text-3 focus:outline-none focus:ring-[3px] focus:ring-z-focus-ring"
          />
        </div>
      </div>
      <TableWrap>
        <div className="max-h-[105px] overflow-y-auto">
          <Table>
            <THead className="sticky top-0 z-10">
              <tr>{cols.map((c) => <Th key={c} className="whitespace-nowrap">{colLabel(c)}</Th>)}</tr>
            </THead>
            <TBody>
              {filtered.map((row, i) => (
                <Tr key={i}>
                  {cols.map((c) => (
                    <Td key={c} className="max-w-[220px] truncate whitespace-nowrap">
                      {c === statusCol && row[c] != null
                        ? <Badge status={statusKind(row[c])}>{String(row[c])}</Badge>
                        : fmtCell(row[c])}
                    </Td>
                  ))}
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="border-t border-z-border bg-z-card-2 px-3.5 py-1.5 font-z-mono text-[11px] text-z-text-3">
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

// ── Response composition — the universal Zevra Intelligence Response model. Pure function:
// normalizes ResponseArtifacts (preferred, backend-composed, shared by chat/agent/future
// workflow paths) or the original client-side derivation (fallback, for a reopened past
// conversation or any response shape that predates `artifacts`) into ONE shape the renderer
// composes from. Never blends both sources for a single field. A field is genuinely absent
// (undefined/empty), never a placeholder — that absence is exactly what lets a whole section
// disappear downstream instead of rendering empty. Nothing here is invented: every value traces
// to real backend data (ResponseArtifacts) or the same regex-derived fallback already shipped
// and reviewed in prior rounds.
export function composeResponse(primary, finding, question) {
  const full = finding?.description || primary?.content || '';
  const { verdict, body } = splitVerdict(full);
  const queryData = safeArray(primary?.queryData);
  const reasoningSteps = safeArray(primary?.reasoningSteps);
  const artifacts = primary?.artifacts || null;

  const understanding = artifacts?.understanding || verdict || null;
  const narrativeBody = understanding ? body : full;

  let keyFindings, relatedFacts, recommendation;
  if (artifacts) {
    keyFindings = safeArray(artifacts.key_findings || artifacts.keyFindings);
    relatedFacts = safeArray(artifacts.related_facts || artifacts.relatedFacts);
    recommendation = artifacts.recommendation || null;
  } else {
    const d = deriveIntelligence(full, reasoningSteps);
    keyFindings = d.keyFindings;
    relatedFacts = d.relatedFacts;
    recommendation = d.recommendation || null;
  }

  const metrics = (() => {
    const am = safeArray(artifacts?.metrics);
    return am.length > 0 ? am : deriveKeyMetrics(queryData);
  })();

  const nextSteps = (() => {
    const steps = safeArray(artifacts?.next_steps || artifacts?.nextSteps);
    return steps.length > 0 ? steps : buildSuggestions(primary?.quickRefinements, queryData);
  })();

  // 0 → nothing to show. 1 → a single emphasized figure. 2–4 → a compact strip. 5+ (not
  // produced by the backend today, capped at 3 — see ResponseArtifactsBuilder.metrics; handled
  // here so the UI degrades gracefully rather than assuming a fixed count) → top 4 + expand.
  const singleMetric = metrics.length === 1 ? metrics[0] : null;
  const metricStrip = metrics.length >= 2 && metrics.length <= 4 ? metrics : [];
  const overflowMetrics = metrics.length > 4 ? metrics : [];

  const evidenceList = safeArray(artifacts?.evidence);
  const rawChartEvidence = evidenceList.find((e) => e.kind === 'CHART') || null;
  // Backend JSON is snake_case (global Jackson naming strategy) — normalize once here so
  // DataViz only ever deals with one shape regardless of transport casing.
  const chartHint = rawChartEvidence
    ? {
        chartType: rawChartEvidence.chart_type || rawChartEvidence.chartType || null,
        xKey: rawChartEvidence.x_key || rawChartEvidence.xKey || null,
        yKeys: safeArray(rawChartEvidence.y_keys || rawChartEvidence.yKeys),
      }
    : null;

  const rawAgentContext = artifacts?.agent_context || artifacts?.agentContext || null;
  const agentContext = rawAgentContext
    ? {
        agentName: rawAgentContext.agent_name || rawAgentContext.agentName || primary?.agentName || null,
        iterationsUsed: rawAgentContext.iterations_used ?? rawAgentContext.iterationsUsed ?? null,
      }
    : (primary?.agentSessionId ? { agentName: primary.agentName, iterationsUsed: null } : null);

  const artifactTrail = safeArray(artifacts?.trail);

  // Investigation context — only fields genuinely known. No "Scope"/"Business context"/"Data
  // sources" here: nothing in the response contract states them, and inventing prose for them
  // would be exactly the fabrication this model exists to avoid.
  const answeredBy = primary?.agentName || primary?.decisionType || null;
  const fieldsAnalyzed = queryData.length > 0 ? Object.keys(queryData[0]).map(colLabel).join(', ') : null;

  return {
    question,
    understanding,
    narrativeBody,
    singleMetric,
    metricStrip,
    overflowMetrics,
    queryData,
    chartHint,
    keyFindings,
    relatedFacts,
    recommendation,
    nextSteps,
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
// next-steps rows presence instead of a plain bullet. One consistent accent per section (never
// a rainbow coded by fabricated categories the response never stated — every row means the
// same thing, so every badge looks the same).
function IconBadge({ icon: Icon, tone = 'primary', size = 30 }) {
  const tones = {
    primary: 'bg-z-primary-soft text-z-primary',
    quiet: 'bg-z-card-2 text-z-text-3',
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

// The metric moment — never a grid of bordered KPI tiles. A single real figure is emphasized
// on its own; 2–4 read as icon-led rows (the reference's "executive summary metrics" treatment);
// a rare 5+ shows the first 4 with an explicit, honest "N more" expansion rather than silently
// truncating.
function MetricGroup({ single, strip, overflow }) {
  const [expanded, setExpanded] = useState(false);
  if (single) {
    return (
      <div className="animate-z-rise motion-reduce:animate-none">
        <div className="text-[28px] font-semibold leading-none tabular-nums text-z-text">{single.value}</div>
        <div className="mt-1 text-z-caption text-z-text-3">{single.label}</div>
      </div>
    );
  }
  const list = strip.length > 0 ? strip : overflow;
  if (list.length === 0) return null;
  const shown = strip.length > 0 || expanded ? list : list.slice(0, 4);
  return (
    <div className="animate-z-rise motion-reduce:animate-none">
      <div className="flex flex-col gap-1.5">
        {shown.map((m, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <IconBadge icon={TrendingUp} size={24} />
            <div className="min-w-0">
              <div className="text-[16px] font-semibold leading-tight tabular-nums text-z-text">{m.value}</div>
              <div className="text-z-caption text-z-text-3">{m.label}</div>
            </div>
          </div>
        ))}
      </div>
      {overflow.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-z-caption text-z-primary transition-colors hover:underline"
        >
          {expanded ? 'Show fewer' : `Show ${overflow.length - 4} more`}
        </button>
      )}
    </div>
  );
}

// The investigation/execution trail — normalized across chat and agent alike. Collapsed to a
// scannable summary; the full disclosure (SQL, business-concept resolution) still lives in the
// unchanged BusinessUnderstanding/ReasoningTrace components. Renders nothing — no header, no
// placeholder sentence — when there is genuinely no trail to show.
function IntelligenceTrail({ reasoningSteps, artifactTrail, runKey, agentSessionId }) {
  const hasLegacySteps = safeArray(reasoningSteps).length > 0;
  const hasArtifactTrail = safeArray(artifactTrail).length > 0;
  if (!hasLegacySteps && !hasArtifactTrail && !agentSessionId) return null;

  const conceptCount = reasoningSteps.filter((s) => s.type === 'resolution').length;
  const stepCount = reasoningSteps.filter((s) => s.type !== 'resolution' && s.type !== 'literal').length;

  return (
    <section className="animate-z-rise motion-reduce:animate-none">
      <ReportLabel>Investigation trail</ReportLabel>
      {hasLegacySteps ? (
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-z-caption text-z-text-2">
            {conceptCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Clipboard size={12} className="text-z-text-3" />
                Business understanding · {conceptCount} concept{conceptCount === 1 ? '' : 's'}
              </span>
            )}
            {stepCount > 0 && (
              <span className="flex items-center gap-1.5">
                <ListTree size={12} className="text-z-text-3" />
                Technical investigation · {stepCount} step{stepCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="mt-1.5">
            <BusinessUnderstanding steps={reasoningSteps} runKey={runKey} />
            <ReasoningTrace steps={reasoningSteps} loading={false} />
          </div>
        </div>
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

      {/* Masthead */}
      <header className="mb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Eyebrow dot={loading} className={cn(loading ? 'text-z-primary' : 'text-z-text-3')}>
            {finding ? 'Investigation report' : loading ? 'Investigation active' : 'Investigation'}
          </Eyebrow>
          {!finding && (
            <>
              {startedLabel && <span className="text-z-caption text-z-text-3">Started {startedLabel}</span>}
              {!loading && <span className="flex items-center gap-1.5 text-z-caption text-z-text-3"><StatusDot status="healthy" />Answered</span>}
            </>
          )}
          {finding && <span className="text-z-caption uppercase tracking-[0.08em] text-z-primary">{reportStatus(finding.status)}</span>}
        </div>
        <h1 className="mt-1.5 font-z-serif text-[22px] font-medium leading-[1.18] tracking-[-0.01em] text-z-text sm:text-[24px]">
          {title}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        {/* ── Left — Question, Zevra's understanding, Investigation context ── */}
        <div className="flex flex-col gap-3 lg:order-1">
          <Panel eyebrow="Question" style={{ animationDelay: '20ms' }}>
            <p className="font-z-serif text-[14.5px] leading-[1.35] text-z-text">{title}</p>
          </Panel>

          {!loading && (r.understanding || r.narrativeBody || hasMetrics) && (
            <Panel accent style={{ animationDelay: '70ms' }}>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={13} className="text-z-primary" />
                <span className="text-z-label uppercase tracking-[0.14em] text-z-text-3">Executive summary</span>
                <span className="ml-auto text-[10px] text-z-text-3">Generated by Zevra</span>
              </div>
              {r.understanding && (
                <Verdict as="p" size="sm" className="mb-2">{renderVerdict(r.understanding)}</Verdict>
              )}
              {hasMetrics && (
                <div className="mt-2.5 border-t border-z-border pt-2.5">
                  <MetricGroup single={r.singleMetric} strip={r.metricStrip} overflow={r.overflowMetrics} />
                </div>
              )}
            </Panel>
          )}

          {!loading && (r.answeredBy || r.fieldsAnalyzed || startedLabel) && (
            <Panel eyebrow="Investigation context" style={{ animationDelay: '130ms' }}>
              <dl className="space-y-1.5 text-[11.5px]">
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
                {r.queryData.length > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-z-text-3">Filters</dt>
                    <dd className="text-z-text-2">None applied</dd>
                  </div>
                )}
                {startedLabel && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-z-text-3">Last updated</dt>
                    <dd className="text-z-text-2">{startedLabel}</dd>
                  </div>
                )}
              </dl>
            </Panel>
          )}
        </div>

        {/* ── Center — evidence and the reasoning trail behind it ── */}
        <div className="min-w-0 lg:order-2">
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
            <>
              {(r.understanding || r.narrativeBody) && (
                <section className="mb-3 animate-z-rise motion-reduce:animate-none">
                  <MarkdownBody content={r.narrativeBody} />
                  {r.agentContext?.agentName && (
                    <p className="mt-1.5 text-z-caption text-z-text-3">
                      Investigated by {r.agentContext.agentName}
                      {r.agentContext.iterationsUsed ? ` · ${r.agentContext.iterationsUsed} step${r.agentContext.iterationsUsed === 1 ? '' : 's'}` : ''}
                    </p>
                  )}
                </section>
              )}

              {r.queryData.length > 0 && (
                <section className="mb-3 animate-z-rise motion-reduce:animate-none" style={{ animationDelay: '60ms' }}>
                  <ReportLabel>Primary evidence</ReportLabel>
                  <DataViz queryData={r.queryData} chartHint={r.chartHint} />
                  <div className="mt-2"><InvestigationDataset rows={r.queryData} /></div>
                </section>
              )}

              <IntelligenceTrail
                reasoningSteps={r.reasoningSteps} artifactTrail={r.artifactTrail}
                runKey={r.runKey} agentSessionId={r.agentSessionId}
              />
            </>
          )}
        </div>

        {/* ── Right — Zevra Intelligence, an investigation companion, not a chat ── */}
        <HighlightSurface
          material="subtle" accent="primary" live={loading}
          className="h-fit lg:order-3 lg:sticky lg:top-4"
          style={{ padding: '14px 16px' }}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-z-round bg-z-primary-soft">
              <Radar size={14} className="text-z-primary" />
            </span>
            <div className="min-w-0">
              <div className="text-z-body font-semibold text-z-text">Zevra Intelligence</div>
              <div className="text-[11px] text-z-text-3">
                {loading ? 'Continuously analyzing your data' : 'Ask a follow-up to keep investigating'}
              </div>
            </div>
          </div>

          {r.keyFindings.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 flex items-center gap-2">
                <ReportLabel>Key findings</ReportLabel>
                <span className="rounded-z-round bg-z-card-2 px-1.5 text-[10px] font-semibold text-z-text-3">{r.keyFindings.length}</span>
              </div>
              <ul className={cn('space-y-2', r.keyFindings.length > 5 && 'max-h-[168px] overflow-y-auto pr-1')}>
                {r.keyFindings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-z-caption leading-[1.5] text-z-text-2">
                    <IconBadge icon={Sparkles} size={20} />
                    <span className="pt-0.5">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.relatedFacts.length > 0 && (
            <div className="mt-2 border-t border-z-ai-edge pt-2">
              <div className="mb-2 flex items-center gap-2">
                <ReportLabel>Related facts</ReportLabel>
                <span className="rounded-z-round bg-z-card-2 px-1.5 text-[10px] font-semibold text-z-text-3">{r.relatedFacts.length}</span>
              </div>
              <ul className={cn('space-y-2', r.relatedFacts.length > 5 && 'max-h-[168px] overflow-y-auto pr-1')}>
                {r.relatedFacts.map((f, i) => (
                  <li key={i} className="flex gap-2 text-z-caption leading-[1.5] text-z-text-3">
                    <IconBadge icon={FileText} tone="quiet" size={20} />
                    <span className="pt-0.5">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strategic recommendation — real prose from the answer/artifacts, not a
              duplicate of the tactical follow-up chips (those live in the "Continue
              investigation" composer bar below, sourced from the same nextSteps). */}
          {r.recommendation && (
            <div className="mt-2 border-t border-z-ai-edge pt-2">
              <ReportLabel>Recommendation</ReportLabel>
              <div className="flex gap-2 text-z-caption leading-[1.5] text-z-text-2">
                <IconBadge icon={Compass} size={20} />
                <span className="pt-0.5">{r.recommendation}</span>
              </div>
            </div>
          )}

          <div className="mt-2 border-t border-z-ai-edge pt-2">
            <InvestigationProgress milestones={milestones} loading={loading} />
          </div>
        </HighlightSurface>
      </div>
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
  // "Continue investigation" composer chips — the same real nextSteps composeResponse()
  // already derives for the latest ANSWERED turn (live mode's newest, regardless of
  // presentationMode), so the bottom bar and the workspace body never disagree.
  const composerSuggestions = useMemo(() => {
    const lastAnswered = [...messages].reverse().find((m) => m.role === 'assistant' && !m.loading);
    return lastAnswered ? composeResponse(lastAnswered, null, null).nextSteps : [];
  }, [messages]);
  const conversationIdRef = useRef(null);   // useRef avoids stale-closure bugs in async handlers
  const [chatQuery, setChatQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [openExportMenu, setOpenExportMenu] = useState(null);

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
              <ReadingColumn measure="wide" className="relative z-[1] py-5" style={{ maxWidth: '1600px' }}>
                <IntelligenceResponse finding={presentationMode === 'report' ? reportFinding : null} messages={messages} onAsk={q => sendQuestion(q)} />
                {submitError && (
                  <p className="text-center text-z-caption text-z-critical-on">{submitError}</p>
                )}
                <div ref={messagesEndRef} />
              </ReadingColumn>
            </div>

            {/* Composer — "Continue investigation": the same tactical follow-up prompts
                composeResponse() already derives (real quickRefinements/nextSteps, never
                fabricated per composer render) sit right above the input, matching the
                reference's bottom continuation bar. The right panel's "Recommended next
                steps" stays strategic prose (the `recommendation` sentence) — these are two
                different things, not a duplicate list. */}
            <div className="shrink-0 border-t border-z-border bg-z-card px-6 py-3 backdrop-blur-sm">
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
              {composerSuggestions.length > 0 && !submitting && (
                <div className="mx-auto mb-2 flex max-w-[1600px] flex-wrap gap-2">
                  {composerSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendQuestion(s.prompt)}
                      className="rounded-z-pill border border-z-border px-3 py-1.5 text-z-caption text-z-text-2 transition-colors hover:border-z-primary hover:text-z-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <InvestigationComposer
                className="mx-auto max-w-[1600px]"
                value={chatQuery}
                onChange={setChatQuery}
                onSubmit={handleChatSubmit}
                placeholder={presentationMode === 'report' ? 'Ask a follow-up about this analysis…' : 'Ask a follow-up…'}
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
