import React, { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import {
  ArrowLeft, Bot, Clipboard, Database, Download, FileDown, FileSpreadsheet,
  FileText, MoreHorizontal, Printer, Search, Send, Sparkles, User, Users, X,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

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

// ── chat history sidebar ──────────────────────────────────────────────────────
function HistoryCard({ item, onOpen }) {
  const title = item.first_question || item.title || item.conversation_id;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.conversation_id)}
      className="w-full text-left rounded-[8px] border border-[#E6E2DD] bg-white p-4 hover:bg-[#FBFAF8]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-[#111827] leading-snug line-clamp-2">{title}</h3>
        <span className="text-[11px] text-[#667085] shrink-0">{timeAgo(item.last_activity)}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {item.pinned && (
          <span className="rounded-[6px] border border-[#DDE4E1] bg-[#F7FAF8] px-2 py-1 text-[11px] text-[#385047]">
            Pinned
          </span>
        )}
        <span className="text-[11px] text-[#667085]">{item.run_count || 0} runs</span>
        <MoreHorizontal size={16} className="ml-auto text-[#667085]" />
      </div>
    </button>
  );
}

function ChatHistory({ conversations, loading, error, onRefresh, onOpen }) {
  const [search, setSearch] = useState('');
  const filtered = conversations.filter((c) => {
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
    <aside className="hidden xl:flex w-[320px] shrink-0 flex-col bg-[#FCFBFA] border-l border-[#E7E2DD]">
      <div className="h-[72px] px-5 flex items-center justify-between border-b border-[#E7E2DD]">
        <h2 className="text-[15px] font-semibold text-[#111827]">History</h2>
        <button type="button" className="text-[#667085] hover:text-[#111827]" aria-label="Close history">
          <X size={17} />
        </button>
      </div>

      <div className="p-4 border-b border-[#EEEAE5]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-[7px] border border-[#DDD8D2] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#0B624F]"
            placeholder="Search conversations..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {loading && <p className="text-[13px] text-[#667085]">Loading…</p>}
        {!loading && error && <p className="text-[13px] text-red-700">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-[13px] text-[#667085]">No conversations yet.</p>
        )}
        {['Today', 'Yesterday', 'Earlier'].map((label) =>
          grouped[label]?.length ? (
            <section key={label}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8A96A6]">{label}</div>
              <div className="space-y-2">
                {grouped[label].map((item) => (
                  <HistoryCard key={item.conversation_id} item={item} onOpen={onOpen} />
                ))}
              </div>
            </section>
          ) : null
        )}
      </div>
    </aside>
  );
}

// ── message bubbles ────────────────────────────────────────────────────────────
function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="rounded-[14px] bg-[#0C5847] px-5 py-3.5 text-[14px] leading-[1.6] text-white">
          {text}
        </div>
        <div className="mt-1 w-8 h-8 rounded-full bg-[#E8EBF0] flex items-center justify-center shrink-0">
          <User size={15} className="text-[#415268]" />
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ content, decisionType, loading, exportMenu }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-3 max-w-[90%]">
        <div className="mt-1 w-8 h-8 rounded-full bg-[#0C5847]/10 flex items-center justify-center shrink-0">
          <Bot size={15} className="text-[#0C5847]" />
        </div>
        <div className="rounded-[14px] border border-[#E8EBF0] bg-white px-6 py-5 shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-[13px] text-[#667085]">
              <span className="animate-pulse">Zevra is thinking…</span>
            </div>
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                {exportMenu}
              </div>
              <MarkdownBody content={content} />
              {decisionType && (
                <div className="mt-3 pt-3 border-t border-[#F0EDE8] flex items-center gap-1.5">
                  <span className="text-[11px] text-[#8A96A6]">via</span>
                  <span className="text-[11px] font-medium text-[#0C5847]">{decisionType}</span>
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
    <div className="h-full flex overflow-hidden bg-[#FBFAF8]">
      <section className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── LANDING VIEW ── */}
        {!chatMode && (
          <>
            <header className="h-[72px] shrink-0 border-b border-[#E7E2DD] bg-white/80 backdrop-blur px-8 flex items-center justify-end gap-4">
              <span className="h-8 rounded-full border border-[#DDE4E1] bg-white px-3.5 flex items-center gap-2 text-[12px] font-medium text-[#253248]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1FB981]" />
                {envLabel()}
              </span>
            </header>

            <main className="flex-1 flex items-center justify-center px-8 overflow-y-auto">
              <div className="w-full max-w-[700px] -mt-8">
                <div className="text-center mb-10">
                  <h1 className="font-serif text-[40px] leading-tight tracking-[-0.02em] text-[#101828]">
                    Good morning, {firstName(user)}.
                  </h1>
                  <p className="mt-2.5 text-[15px] text-[#46566D]">
                    Ask across your enterprise systems and approved memory.
                  </p>
                </div>

                <form
                  onSubmit={handleLandingSubmit}
                  className="rounded-[14px] border border-[#DDD8D2] bg-white shadow-[0_18px_60px_rgba(16,24,40,0.09)]"
                >
                  <textarea
                    value={landingQuery}
                    onChange={(e) => setLandingQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleLandingSubmit(e);
                      }
                    }}
                    placeholder="What would you like to investigate?"
                    rows={4}
                    className="w-full resize-none rounded-t-[14px] bg-transparent px-7 pt-6 pb-2 text-[15px] text-[#101828] outline-none placeholder:text-[#9AA6B5]"
                  />
                  <div className="px-6 pb-5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#667085]">
                      <Sparkles size={14} className="text-[#53647C]" />
                      Press Enter to send
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !landingQuery.trim()}
                      className="h-9 px-4 rounded-full bg-[#0C5847] text-white text-[13px] font-medium flex items-center gap-2 hover:bg-[#084B3D] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send size={14} />
                      Investigate
                    </button>
                  </div>
                </form>

                {/* Suggested first questions from onboarding */}
                {suggestedQuestions.length > 0 && (
                  <div className="mt-7">
                    <p className="text-[11px] font-semibold text-[#9AA6B5] uppercase tracking-wider text-center mb-3">
                      Try asking
                    </p>
                    <div className="space-y-2">
                      {suggestedQuestions.map((q, i) => (
                        <button key={i} onClick={() => { setLandingQuery(q); }}
                          className="w-full text-left px-4 py-3 rounded-[10px] border border-[#E8EBF0] hover:border-[#0C5847]/40 hover:bg-[#f0faf5] text-[13px] text-[#344054] transition-all group flex items-center gap-2.5">
                          <span className="text-[#0C5847] opacity-60 shrink-0 group-hover:opacity-100">→</span>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-9 flex items-center justify-center gap-8 text-[13px] font-medium text-[#415268]">
                  <div className="flex items-center gap-2.5">
                    <Database size={17} strokeWidth={1.7} />
                    {metricText(metrics.connections, 'systems')}
                  </div>
                  <div className="h-5 w-px bg-[#DDD8D2]" />
                  <div className="flex items-center gap-2.5">
                    <FileText size={17} strokeWidth={1.7} />
                    {metricText(metrics.documents, 'documents')}
                  </div>
                  <div className="h-5 w-px bg-[#DDD8D2]" />
                  <div className="flex items-center gap-2.5">
                    <Users size={17} strokeWidth={1.7} />
                    {metricText(metrics.agents, 'agents')}
                  </div>
                </div>
              </div>
            </main>
          </>
        )}

        {/* ── CHAT VIEW ── */}
        {chatMode && (
          <>
            {/* Chat header */}
            <header className="h-[60px] shrink-0 border-b border-[#E7E2DD] bg-white px-6 flex items-center gap-4">
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
              <div className="ml-auto">
                <ExportMenu
                  open={openExportMenu === 'conversation'}
                  onToggle={() => setOpenExportMenu((current) => current === 'conversation' ? null : 'conversation')}
                  disabled={messages.filter((msg) => !msg.loading).length === 0}
                  actions={exportConversationActions()}
                />
              </div>
              <span className="h-7 rounded-full border border-[#DDE4E1] bg-white px-3 flex items-center gap-1.5 text-[11px] font-medium text-[#253248]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1FB981]" />
                {envLabel()}
              </span>
            </header>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-[800px] mx-auto px-6 py-8 space-y-6">
                {messages.map((msg, i) =>
                  msg.role === 'user' ? (
                    <UserMessage key={i} text={msg.content} />
                  ) : (
                    <AssistantMessage
                      key={i}
                      content={msg.content}
                      decisionType={msg.decisionType}
                      loading={msg.loading}
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
                className="max-w-[800px] mx-auto flex items-end gap-3 rounded-[12px] border border-[#DDD8D2] bg-[#FAFAF9] px-5 py-3.5 focus-within:border-[#0C5847] transition-colors"
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

      <ChatHistory
        conversations={conversations}
        loading={conversationsLoading}
        error={conversationsError}
        onRefresh={loadConversations}
        onOpen={openConversation}
      />
    </div>
  );
}
