import React, { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import {
  ArrowLeft, Bot, Database, FileText, Filter,
  MoreHorizontal, Search, Send, Sparkles, User, Users, X,
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

function AssistantMessage({ content, decisionType, loading }) {
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

  // Auto-fire prefilled question from onboarding wizard completion
  useEffect(() => {
    if (prefillQuestion) {
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
  };

  const metricText = (val, noun) => val === null ? `Loading ${noun}` : `${val} ${noun}`;

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
                {messages.find((m) => m.role === 'user')?.content?.slice(0, 60) || 'Investigation'}
              </span>
              <span className="ml-auto h-7 rounded-full border border-[#DDE4E1] bg-white px-3 flex items-center gap-1.5 text-[11px] font-medium text-[#253248]">
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
