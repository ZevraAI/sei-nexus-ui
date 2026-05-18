import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import {
  ArrowLeft, Bot, Clipboard, Clock, Database, Download, FileDown, FileSpreadsheet,
  FileText, Layers, MoreHorizontal, Network, Printer, Search, Send, Sparkles,
  User, Users, X,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth, navigate } from '../App.jsx';

// ── Quick access tiles shown on the home landing ──────────────────────────
const QUICK_TILES = [
  { label: 'Investigations', path: '/chat',        gradient: 'bg-gradient-to-br from-emerald-100 to-emerald-200', iconColor: '#059669', Icon: Sparkles   },
  { label: 'Agents',         path: '/agents',      gradient: 'bg-gradient-to-br from-blue-100 to-blue-200',       iconColor: '#3B82F6', Icon: Users      },
  { label: 'Knowledge Graph',path: '/graph',       gradient: 'bg-gradient-to-br from-violet-100 to-violet-200',   iconColor: '#7C3AED', Icon: Network    },
  { label: 'Semantic Layer', path: '/semantic',    gradient: 'bg-gradient-to-br from-orange-100 to-orange-200',   iconColor: '#EA580C', Icon: Layers     },
  { label: 'Connections',    path: '/connections', gradient: 'bg-gradient-to-br from-sky-100 to-sky-200',         iconColor: '#0284C7', Icon: Database   },
  { label: 'AI Memory',      path: '/memory',      gradient: 'bg-gradient-to-br from-pink-100 to-pink-200',       iconColor: '#9333EA', Icon: FileText   },
  { label: 'Reports',        path: '/reports',     gradient: 'bg-gradient-to-br from-indigo-100 to-indigo-200',   iconColor: '#4338CA', Icon: Users      },
];
import DataViz from '../components/DataViz.jsx';

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
function displayName(user) {
  return user?.display_name || user?.name || user?.email || 'there';
}

function firstName(user) {
  return displayName(user).split(/[ @._-]+/).filter(Boolean)[0] || 'there';
}

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
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="h-8 px-3 rounded-[7px] border border-[#DDE4E1] bg-white text-[12px] font-medium text-[#344054] flex items-center gap-2 hover:bg-[#F7FAF8] disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Export"
      >
        <Download size={14} />
        Export
      </button>
      {open && (
        <div className={`absolute top-9 ${align === 'left' ? 'left-0' : 'right-0'} z-20 w-56 rounded-[8px] border border-[#E6E2DD] bg-white shadow-lg py-1`}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className="w-full px-3 py-2 text-left text-[13px] text-[#253248] hover:bg-[#F7FAF8] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <action.icon size={14} className="text-[#53647C]" />
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
      className="fixed top-[58px] right-4 z-50 w-[310px] max-h-[72vh] flex flex-col
                 bg-white/88 backdrop-blur-xl rounded-[18px]
                 border border-gray-200/60
                 shadow-[0_24px_64px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
                 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100/80 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-emerald-500" />
          <span className="text-[13px] font-semibold text-[#111827]">History</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400
                     hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-gray-100/60 flex-shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-[30px] rounded-[8px] bg-gray-100/80 pl-7 pr-3
                       text-[12.5px] text-[#111827] outline-none border border-transparent
                       focus:border-emerald-400 focus:bg-white/80 transition-all
                       placeholder:text-gray-300"
          />
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 px-2 py-2">
        {loading && (
          <div className="py-8 text-center text-[12px] text-gray-400">Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-8 text-center">
            <div className="text-[12px] text-gray-400">No conversations yet</div>
            <div className="text-[11px] text-gray-300 mt-1">Ask your first question to start</div>
          </div>
        )}
        {['Today', 'Yesterday', 'Earlier'].map((label) =>
          grouped[label]?.length ? (
            <div key={label} className="mb-3">
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-300">
                {label}
              </div>
              <div className="space-y-px">
                {grouped[label].map((item) => (
                  <button
                    key={item.conversation_id}
                    type="button"
                    onClick={() => { onOpen(item.conversation_id); onClose(); }}
                    className="w-full text-left rounded-[10px] px-3 py-2.5
                               hover:bg-gray-100/70 active:bg-gray-200/60 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-[#111827] line-clamp-1 leading-snug">
                        {item.first_question || item.title || 'Investigation'}
                      </span>
                      <span className="text-[10.5px] text-gray-400 shrink-0 mt-px">
                        {timeAgo(item.last_activity)}
                      </span>
                    </div>
                    {item.run_count > 0 && (
                      <span className="text-[11px] text-gray-400 mt-0.5 block">
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
    <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                {cols.map(col => (
                  <th key={col}
                      className="bg-[#0C5847] px-3.5 py-2.5 text-left text-[11px] font-semibold text-white/90 tracking-wide whitespace-nowrap">
                    {colLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8faf9]'}>
                  {cols.map(col => (
                    <td key={col}
                        className="px-3.5 py-2 text-[#344054] border-t border-gray-100 whitespace-nowrap max-w-[220px] truncate">
                      {fmtCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="px-3.5 py-1.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-400">
        {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''}
      </div>
    </div>
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
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#F0EDE8]">
      <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider self-center mr-0.5">
        Ask next
      </span>
      {chips.map((c, i) => (
        <button key={i} onClick={() => onAsk(c.prompt)}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-[#D1E9E2] bg-[#f0faf5] text-[#0C5847] hover:bg-[#0C5847] hover:text-white hover:border-[#0C5847] transition-all">
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ── message bubbles ────────────────────────────────────────────────────────────
function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-start gap-2.5 max-w-[78%]">
        <div className="rounded-[12px] bg-[#0C5847] px-4 py-2.5 text-[13px] leading-[1.55] text-white">
          {text}
        </div>
        <div className="mt-0.5 w-7 h-7 rounded-full bg-[#E8EBF0] flex items-center justify-center shrink-0">
          <User size={13} className="text-[#415268]" />
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ content, decisionType, loading, exportMenu, queryData, quickRefinements, onAsk }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2.5 w-full">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-[#0C5847]/10 flex items-center justify-center shrink-0">
          <Bot size={13} className="text-[#0C5847]" />
        </div>
        <div className="flex-1 min-w-0 rounded-[12px] border border-[#E8EBF0] bg-white px-5 py-4 shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-[12px] text-[#667085]">
              <span className="animate-pulse">Zevra is thinking…</span>
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
              {decisionType && (
                <div className="mt-2.5 pt-2.5 border-t border-[#F0EDE8] flex items-center gap-1.5">
                  <span className="text-[10px] text-[#8A96A6]">via</span>
                  <span className="text-[10px] font-medium text-[#0C5847]">{decisionType}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function Chat({ prefillQuestion = null, onPrefillUsed = null }) {
  const { user } = useAuth();

  // landing state
  const [landingQuery, setLandingQuery] = useState('');
  const [metrics, setMetrics] = useState({ connections: null, documents: null, agents: null });
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);

  // history floating panel
  const [historyOpen, setHistoryOpen] = useState(false);

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

  // Fetch suggested questions from onboarding status
  useEffect(() => {
    api.onboarding.status()
      .then(s => { if (s.suggested_questions?.length) setSuggestedQuestions(s.suggested_questions); })
      .catch(() => {});
  }, []);

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
    // Pick up cross-page prefill stored by Knowledge Graph "Ask Zevra" button
    const stored = localStorage.getItem('zevra_chat_prefill');
    if (stored && !prefillFiredRef.current) {
      prefillFiredRef.current = true;
      localStorage.removeItem('zevra_chat_prefill');
      sendQuestion(stored, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadConversations();
    (async () => {
      try {
        const [conns, agents, domains] = await Promise.allSettled([
          api.connections.list(),
          api.agents.list(),
          api.domains.list(),
        ]);
        setMetrics({
          connections: conns.status === 'fulfilled' ? safeArray(conns.value).length : 0,
          documents: 0,
          agents: agents.status === 'fulfilled' ? safeArray(agents.value).filter((a) => a.status !== 'ARCHIVED').length : 0,
        });
      } catch {}
    })();
  }, [loadConversations]);

  // ── submit question ─────────────────────────────────────────────────────────
  const sendQuestion = async (question, isNewConv = false) => {
    if (!question?.trim() || submitting) return;

    // Always reuse the existing conversationId unless explicitly starting a new chat
    if (isNewConv || !conversationIdRef.current) {
      conversationIdRef.current = newConversationId();
    }
    const activeConvId = conversationIdRef.current;

    // Enter chat mode and add user message
    if (!chatMode) setChatMode(true);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);

    // Add loading placeholder
    setMessages((prev) => [...prev, { role: 'assistant', content: '', loading: true }]);

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await api.chat.ask({
        question,
        conversation_id: activeConvId,
        agent_key: null,
      });

      setMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = {
          role: 'assistant',
          content: response.answer || response.error || 'No response received.',
          decisionType: response.decision?.type || response.decision_type,
          queryData: response.query_data || response.queryData || null,
          quickRefinements: response.quick_refinements || response.quickRefinements || [],
          loading: false,
        };
        return next;
      });

      await loadConversations();
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: `**Error:** ${err.message || 'Unable to get a response.'}`,
          loading: false,
        };
        return next;
      });
      setSubmitError(err.message || 'Unable to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLandingSubmit = (e) => {
    e.preventDefault();
    const q = landingQuery.trim();
    if (!q) return;
    setLandingQuery('');
    sendQuestion(q, true);   // isNewConv=true: generate a fresh conversation ID
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
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
        if (run.question) msgs.push({ role: 'user', content: run.question });
        if (run.answer) msgs.push({
          role: 'assistant',
          content: run.answer,
          decisionType: run.decision_type || run.decisionType,
        });
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

  const metricText = (val, noun) => val === null ? `Loading ${noun}` : `${val} ${noun}`;
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
    <div className="h-full flex overflow-hidden bg-transparent">
      <section className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── LANDING VIEW ── */}
        {!chatMode && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
            {/* Greeting */}
            <h1 className="text-[32px] font-bold text-[#111827] tracking-[-0.03em] text-center mb-2">
              Good morning, {firstName(user)}.
            </h1>
            <p className="text-[15px] text-[#9CA3AF] text-center mb-8">
              What would you like to investigate today?
            </p>

            {/* Search box */}
            <form onSubmit={handleLandingSubmit} className="w-full max-w-[640px] mb-4">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-[16px]
                              border border-gray-200/80 px-4 py-3.5
                              shadow-[0_4px_24px_rgba(0,0,0,0.07)]
                              focus-within:border-emerald-400
                              focus-within:shadow-[0_4px_24px_rgba(0,0,0,0.07),0_0_0_3px_rgba(5,150,105,0.10)]
                              transition-all">
                <Sparkles size={18} className="text-emerald-500 flex-shrink-0" />
                <input
                  value={landingQuery}
                  onChange={(e) => setLandingQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleLandingSubmit(e);
                    }
                  }}
                  placeholder="Ask anything — orders, suppliers, shipments, inventory…"
                  className="flex-1 bg-transparent text-[15px] text-[#111827] outline-none placeholder:text-[#C4C9D4]"
                />
                <button
                  type="submit"
                  disabled={submitting || !landingQuery.trim()}
                  className="w-[34px] h-[34px] bg-[#111827] rounded-[9px] flex items-center justify-center
                             flex-shrink-0 hover:bg-[#1F2937] disabled:opacity-40
                             disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={13} className="text-white" />
                </button>
              </div>
            </form>

            {/* Suggestion chips — from onboarding */}
            {suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-[640px] mb-10">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} onClick={() => setLandingQuery(q)}
                    className="px-3.5 py-1.5 bg-white/70 backdrop-blur-sm border border-gray-200
                               rounded-full text-[12.5px] text-gray-600
                               hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700
                               transition-all">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Quick access tiles */}
            <p className="text-[10.5px] font-semibold text-gray-300 uppercase tracking-[0.09em] mb-4">
              Quick access
            </p>
            <div className="grid grid-cols-6 gap-2.5 w-full max-w-[640px]">
              {QUICK_TILES.map(({ label, path, gradient, iconColor, Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-2 py-[18px] px-2
                             bg-white/70 backdrop-blur-sm border border-gray-100/80
                             rounded-[14px] hover:border-gray-200/80
                             hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)]
                             hover:-translate-y-[2px] transition-all group"
                >
                  <div className={`w-[44px] h-[44px] rounded-[12px] flex items-center justify-center
                                  group-hover:scale-[1.06] transition-transform ${gradient}`}>
                    <Icon size={22} style={{ color: iconColor }} strokeWidth={1.6} />
                  </div>
                  <span className="text-[11.5px] font-medium text-gray-600 text-center leading-tight">
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* Status + history shortcut */}
            <div className="flex items-center gap-4 mt-10 text-[11.5px] text-gray-300">
              <span className="flex items-center gap-1.5">
                <span className="w-[5px] h-[5px] bg-emerald-500 rounded-full" />
                {metricText(metrics.connections, 'connections')}
              </span>
              <span>·</span>
              <span>{metricText(metrics.agents, 'agents active')}</span>
              <span>·</span>
              <button
                onClick={() => setHistoryOpen(o => !o)}
                className="flex items-center gap-1 text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <Clock size={12} /> Recent conversations
              </button>
            </div>
          </div>
        )}

        {/* ── CHAT VIEW ── */}
        {chatMode && (
          <>
            {/* Chat header */}
            <header className="h-[48px] shrink-0 border-b border-gray-200/70 bg-white/80 backdrop-blur-sm px-5 flex items-center gap-3">
              <button
                type="button"
                onClick={startNewChat}
                className="flex items-center gap-2 text-[13px] text-[#415268] hover:text-[#101828] transition-colors"
              >
                <ArrowLeft size={16} />
                New chat
              </button>
              <div className="h-5 w-px bg-[#E0DBD5]" />
              <span className="text-[13px] font-medium text-[#101828] truncate">
                {conversationTitle}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {/* History button */}
                <button
                  type="button"
                  onClick={() => setHistoryOpen(o => !o)}
                  title="Conversation history"
                  className={`h-7 px-2.5 rounded-[7px] flex items-center gap-1.5 text-[12px] font-medium
                              border transition-all
                              ${historyOpen
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-white/80 border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                >
                  <Clock size={13} />
                  History
                </button>

                <ExportMenu
                  open={openExportMenu === 'conversation'}
                  onToggle={() => setOpenExportMenu((current) => current === 'conversation' ? null : 'conversation')}
                  disabled={messages.filter((msg) => !msg.loading).length === 0}
                  actions={exportConversationActions()}
                />
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-[1100px] mx-auto px-5 py-5 space-y-4">
                {messages.map((msg, i) =>
                  msg.role === 'user' ? (
                    <UserMessage key={i} text={msg.content} />
                  ) : (
                    <AssistantMessage
                      key={i}
                      content={msg.content}
                      decisionType={msg.decisionType}
                      loading={msg.loading}
                      queryData={msg.queryData}
                      quickRefinements={msg.quickRefinements}
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
                  <p className="text-center text-[13px] text-red-600">{submitError}</p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat input */}
            <div className="shrink-0 border-t border-[#E7E2DD] bg-white px-6 py-4">
              <form
                onSubmit={handleChatSubmit}
                className="max-w-[1100px] mx-auto flex items-end gap-3 rounded-[12px] border border-[#DDD8D2] bg-[#FAFAF9] px-5 py-3 focus-within:border-[#0C5847] transition-colors"
              >
                <textarea
                  ref={chatInputRef}
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit(e);
                    }
                  }}
                  placeholder="Follow up or ask another question…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[14px] text-[#101828] outline-none placeholder:text-[#9AA6B5] max-h-32 overflow-y-auto"
                  style={{ lineHeight: '1.6' }}
                />
                <button
                  type="submit"
                  disabled={submitting || !chatQuery.trim()}
                  className="mb-0.5 h-8 w-8 rounded-full bg-[#0C5847] text-white flex items-center justify-center hover:bg-[#084B3D] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              </form>
              <p className="text-center mt-2 text-[11px] text-[#9AA6B5]">
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
    </div>
  );
}
