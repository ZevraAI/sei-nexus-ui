import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import {
  ArrowLeft, Bot, CalendarClock, Clipboard, Clock, Download, FileDown,
  FileSpreadsheet, FileText, ListTree, Printer, Search, User, X,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { cn } from '../utils/cn';
import {
  Button, IconButton, Field, Input, SegmentedControl, Dialog,
  InlineAlert, Spinner, TableWrap, Table, THead, TBody, Th, Tr, Td,
} from '../ds';
import { IntelligencePage, ReadingColumn, NarrativeSurface, Eyebrow } from '../ds/intelligence';
import InvestigationComposer from '../components/InvestigationComposer.jsx';

import DataViz from '../components/DataViz.jsx';
import ReasoningTrace from '../components/ReasoningTrace.jsx';
import AgentStepTrace from '../components/agents/AgentStepTrace.jsx';

// ── markdown ──────────────────────────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

function MarkdownBody({ content }) {
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

function timeAgo(value) {
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

function safeArray(value) {
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

function fmtCell(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  if (!isNaN(n) && isFinite(v)) {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1_000)     return n.toLocaleString();
    return Number.isInteger(n) ? n.toLocaleString() : parseFloat(n.toFixed(4)).toString();
  }
  return String(v);
}

function colLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── DataTable ─────────────────────────────────────────────────────────────────

function DataTable({ rows }) {
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

function buildSuggestions(quickRefinements, queryData) {
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
    <div className="mb-8">
      <div className="mb-2 font-z-mono text-[10px] uppercase tracking-[0.14em] text-z-text-3">You · just now</div>
      {attachment && <div className="mb-2"><AttachmentChip attachment={attachment} /></div>}
      <div className="inline-block max-w-[80%] rounded-[16px_16px_16px_4px] border border-z-border bg-z-card-2 px-5 py-3.5 text-[17px] leading-[1.5] text-z-text">
        {text}
      </div>
    </div>
  );
}

// Small "view steps" toggle shown on answers produced by a Zevra Agent.
// Fetches the agent session lazily on first open and renders the tool-call
// trace with the same component used on the agent detail page.
function AgentStepsToggle({ sessionId }) {
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

function AssistantMessage({ content, decisionType, agentName, loading, exportMenu, queryData, quickRefinements, onAsk, reasoningSteps, learningsApplied, streamingSteps, agentSessionId }) {
  const stepCount = safeArray(streamingSteps).length;
  return (
    <div className="mb-8">
      <NarrativeSurface accent="primary" live={loading}>
      {/* Role line — the mono Intelligence voice, emerald, with a live dot */}
      <Eyebrow dot className="mb-3 text-z-primary">
        Zevra
        <span className="text-[11.5px] normal-case tracking-[0.04em] text-z-text-3">
          {loading ? (stepCount > 0 ? 'thinking…' : 'understanding…') : 'answered'}
        </span>
      </Eyebrow>

      {loading ? (
        <div className="space-y-2">
          {stepCount > 0 ? (
            <ReasoningTrace steps={safeArray(streamingSteps)} loading={true} />
          ) : (
            <div className="flex items-center gap-2 text-z-caption text-z-text-2">
              <Spinner size="sm" />
              Zevra is thinking…
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-2 flex justify-end">
            {exportMenu}
          </div>
          <MarkdownBody content={content} />
          {queryData?.length > 0 && <DataTable rows={queryData} />}
          {queryData?.length > 0 && <DataViz queryData={queryData} />}
          <SuggestedQuestions quickRefinements={quickRefinements} queryData={queryData} onAsk={onAsk} />
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
      </NarrativeSurface>
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
  const conversationIdRef = useRef(null);   // useRef avoids stale-closure bugs in async handlers
  const [chatQuery, setChatQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [openExportMenu, setOpenExportMenu] = useState(null);

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
    // Pick up a "resume this investigation" request from the Home overlay's recent list
    const openId = localStorage.getItem('zevra_chat_open');
    if (openId && !prefillFiredRef.current) {
      prefillFiredRef.current = true;
      localStorage.removeItem('zevra_chat_open');
      openConversation(openId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load conversations for the History panel.
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── SSE reasoning stream ────────────────────────────────────────────────────
  // Opens a fetch-based SSE connection to /chat/runs/{runKey}/stream.
  // Uses fetch (not EventSource) so the X-Nexus-Token header can be included.
  // Calls onEvent for each parsed SSE data line; returns a cancel function.
  const openReasoningStream = (runKey, onEvent) => {
    const BASE  = import.meta.env.VITE_API_BASE ?? '';
    const token = localStorage.getItem('nexus_token') ||
                  (() => { try { return JSON.parse(localStorage.getItem('nexus_user'))?.token ?? ''; } catch { return ''; } })();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/chat/runs/${runKey}/stream`, {
          headers: { 'X-Nexus-Token': token },
        });
        if (!res.ok || !res.body) return;
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            try { onEvent(JSON.parse(line.slice(5).trim())); } catch {}
          }
        }
        reader.cancel().catch(() => {});
      } catch {}
    })();

    return () => { cancelled = true; };
  };

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

    // Add loading placeholder — streamingSteps accumulates via SSE while POST is in-flight
    setMessages((prev) => [...prev, { role: 'assistant', content: '', loading: true, streamingSteps: [] }]);

    setSubmitting(true);
    setSubmitError('');

    // Open SSE stream before firing POST so no events are missed
    const cancelStream = openReasoningStream(clientRunKey, (event) => {
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
          streamingSteps:  [],   // cleared — final steps are in reasoningSteps
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

  const startNewChat = () => {
    setMessages([]);
    conversationIdRef.current = null;
    setChatMode(false);
    setLandingQuery('');
    setChatQuery('');
    setSubmitError('');
    setOpenExportMenu(null);
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
            {/* Chat header — a slim conversation toolbar that blends with the thread
                (the shell composer is hidden on this route; the workspace owns input). */}
            <header className="flex h-12 shrink-0 items-center gap-3 border-b border-z-border bg-transparent px-6">
              <Button variant="ghost" size="sm" onClick={startNewChat} leadingIcon={<ArrowLeft size={16} />}>
                New chat
              </Button>
              <span className="min-w-0 flex-1 truncate px-2 text-center font-z-serif text-z-caption italic text-z-text-3">
                {conversationTitle}
              </span>
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

            {/* Messages */}
            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
              <ReadingColumn measure="column" className="py-10">
                <div className="mb-8 flex justify-center">
                  <Eyebrow>Today</Eyebrow>
                </div>
                {messages.map((msg, i) =>
                  msg.role === 'user' ? (
                    <UserMessage key={i} text={msg.content} attachment={msg.attachment} />
                  ) : (
                    <AssistantMessage
                      key={i}
                      content={msg.content}
                      decisionType={msg.decisionType}
                      agentName={msg.agentName}
                      loading={msg.loading}
                      queryData={msg.queryData}
                      quickRefinements={msg.quickRefinements}
                      reasoningSteps={msg.reasoningSteps || []}
                      learningsApplied={msg.learningsApplied || []}
                      streamingSteps={msg.streamingSteps || []}
                      agentSessionId={msg.agentSessionId || null}
                      onAsk={q => sendQuestion(q)}
                      exportMenu={
                        <ExportMenu
                          open={openExportMenu === i}
                          onToggle={() => setOpenExportMenu((current) => current === i ? null : i)}
                          disabled={msg.loading}
                          actions={exportAnswerActions(msg, i)}
                        />
                      }
                    />
                  )
                )}
                {submitError && (
                  <p className="text-center text-z-caption text-z-critical-on">{submitError}</p>
                )}
                <div ref={messagesEndRef} />
              </ReadingColumn>
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-z-border bg-z-card px-6 py-4 backdrop-blur-sm">
              {/* Attachment preview / loading / error */}
              {(attachment || attachmentLoading || attachmentError) && (
                <div className="mx-auto mb-2 max-w-[800px]">
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
                className="mx-auto max-w-[800px]"
                value={chatQuery}
                onChange={setChatQuery}
                onSubmit={handleChatSubmit}
                placeholder="Ask a follow-up…"
                disabled={submitting || (!chatQuery.trim() && !attachment)}
                allowAttachments
                onAttachClick={() => fileInputRef.current?.click()}
                onPaste={handlePaste}
                attachmentBusy={attachmentLoading}
                inputRef={chatInputRef}
              />
              <p className="mt-2.5 text-center font-z-mono text-[11px] text-z-text-3">
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
