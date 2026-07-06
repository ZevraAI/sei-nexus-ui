import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, ArrowUp, Paperclip, Mic, ChevronDown,
  Globe, Search, Package, Truck, Users, TrendingUp,
  Bell, Database, BarChart3, ArrowRight, Loader2,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_NAME = 'Murali';

// ── Stat cards ────────────────────────────────────────────────────────────────

const STATS = [
  {
    label:    'Investigations',
    value:    '128',
    sub:      'Active',
    trend:    '↑ 18% vs last 7 days',
    icon:     Search,
    iconBg:   '#DBEAFE',
    iconColor:'#2563EB',
    iconBgDark:'#0A1535',
  },
  {
    label:    'Alerts',
    value:    '32',
    sub:      'New',
    trend:    '↑ 12% vs last 7 days',
    icon:     Bell,
    iconBg:   '#FEF3C7',
    iconColor:'#D97706',
    iconBgDark:'#2A1500',
  },
  {
    label:    'Data Sources',
    value:    '24',
    sub:      'Connected',
    trend:    '↑ 4 new this week',
    icon:     Database,
    iconBg:   '#D1FAE5',
    iconColor:'#059669',
    iconBgDark:'#0A2A1A',
  },
  {
    label:    'Queries Run',
    value:    '1,842',
    sub:      'This week',
    trend:    '↑ 28% vs last week',
    icon:     BarChart3,
    iconBg:   '#EDE9FE',
    iconColor:'#7C3AED',
    iconBgDark:'#1A0F35',
  },
];

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Package,    label: 'Show me all the orders'                    },
  { icon: Truck,      label: 'List delayed shipments by region'          },
  { icon: Users,      label: 'Top 10 high risk customers'                },
  { icon: TrendingUp, label: 'Shipment delays analysis'                  },
  { icon: Search,     label: 'Revenue anomalies this quarter'            },
  { icon: BarChart3,  label: 'Agent activity summary'                    },
];

// ── Recent conversations ──────────────────────────────────────────────────────

const RECENT = [
  { id: 1, text: 'Show me orders and their shipment details',                           time: 'Just now' },
  { id: 2, text: 'List me out all the orders where shipment is delayed more than 5 days', time: '1h ago'   },
  { id: 3, text: 'Which customers have highest shipment delays in last 30 days?',       time: '2h ago'   },
  { id: 4, text: 'Compare vendor performance across Q2 and Q3',                         time: '1d ago'   },
  { id: 5, text: 'Show payment failure trends by region this month',                    time: '1d ago'   },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'ai'; text: string };

// ── Component ─────────────────────────────────────────────────────────────────

export function HomePageMockup() {
  const [query, setQuery]     = useState('');
  const [focused, setFocused] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef      = useRef<HTMLDivElement>(null);

  const hour = new Date().getHours();
  const timeLabel = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const inChat = messages.length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [query]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  function send() {
    const text = query.trim();
    if (!text || thinking) return;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: 'I found 1,284 orders with their full shipment details across your connected sources. Here\'s a summary:\n\n- 847 orders are on-time (66%)\n- 312 orders are delayed by 1–5 days (24%)\n- 125 orders are critically delayed by 5+ days (10%)\n\nThe highest concentration of delays is in the North Region (41% of all delays). Would you like me to drill deeper into any category?',
        },
      ]);
    }, 2000);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function pick(text: string) {
    setQuery(text);
    textareaRef.current?.focus();
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ════════════════════════════════════════════════════════════════
          HERO — shown when no conversation active
      ════════════════════════════════════════════════════════════════ */}
      {!inChat && (
        <div className="flex flex-col items-center pt-14 pb-8 px-6">

          {/* Sparkle icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(140deg, #075D61 0%, #2F8EDB 100%)',
              boxShadow: '0 0 0 6px var(--accent-soft), 0 8px 24px rgba(7,93,97,0.25)',
            }}
          >
            <Sparkles size={20} className="text-white" />
          </div>

          {/* Greeting */}
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3 text-center">
            {timeLabel},{' '}
            <span style={{ color: 'var(--accent-primary)' }}>{USER_NAME}</span>
          </h1>
          <p className="text-base text-muted-fg text-center mb-8">
            Ask anything. Investigate anything. Zevra will find answers.
          </p>

          {/* ── Input box ────────────────────────────────────────────── */}
          <div className="w-full max-w-[760px]">
            <InputBox
              query={query}
              setQuery={setQuery}
              focused={focused}
              setFocused={setFocused}
              textareaRef={textareaRef}
              thinking={thinking}
              onKey={onKey}
              send={send}
              placeholder="Ask Zevra anything about your data…"
            />

            {/* Try asking */}
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <span className="text-sm text-muted-fg font-medium flex-shrink-0">Try asking</span>
              <div className="flex gap-2 flex-wrap">
                {SUGGESTIONS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => pick(s.label)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-surface hover:bg-item-hover hover:border-line-strong text-sm text-muted-fg hover:text-foreground transition-all"
                    >
                      <Icon size={13} className="text-dim-fg flex-shrink-0" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CHAT VIEW — active conversation
      ════════════════════════════════════════════════════════════════ */}
      {inChat && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="max-w-[760px] w-full mx-auto px-6 py-8 flex flex-col gap-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="flex-none pt-0.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(140deg, #075D61 0%, #2F8EDB 100%)',
                        boxShadow: '0 0 0 3px var(--accent-soft)',
                      }}
                    >
                      <Sparkles size={14} className="text-white" />
                    </div>
                  </div>
                )}
                <div
                  className={`text-sm leading-relaxed rounded-xl px-4 py-3 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'text-white rounded-tr-xs'
                      : 'bg-surface border border-line text-foreground rounded-tl-xs shadow-sm'
                  }`}
                  style={
                    msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-line) 100%)' }
                      : {}
                  }
                >
                  {msg.text.split('\n\n').map((p, j) => (
                    <p key={j} className={j > 0 ? 'mt-3' : ''}>{p}</p>
                  ))}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-4">
                <div className="flex-none pt-0.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(140deg, #075D61 0%, #2F8EDB 100%)' }}
                  >
                    <Sparkles size={14} className="text-white" />
                  </div>
                </div>
                <div className="bg-surface border border-line rounded-xl rounded-tl-xs px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Sticky input in chat mode */}
          <div className="border-t border-line bg-background/95 px-6 py-4">
            <div className="max-w-[760px] mx-auto">
              <InputBox
                query={query}
                setQuery={setQuery}
                focused={focused}
                setFocused={setFocused}
                textareaRef={textareaRef}
                thinking={thinking}
                onKey={onKey}
                send={send}
                placeholder="Follow up or ask another question…"
              />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STATS + RECENT — shown in home (no chat)
      ════════════════════════════════════════════════════════════════ */}
      {!inChat && (
        <div className="px-6 pb-10">
          <div className="max-w-[760px] mx-auto space-y-8">

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map(s => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="bg-surface border border-line rounded-xl p-4 shadow-sm hover:shadow-md hover:border-line-strong transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm text-muted-fg font-medium">{s.label}</span>
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: s.iconBg }}
                      >
                        <Icon size={16} style={{ color: s.iconColor }} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-bold text-foreground tabular-nums leading-none">
                        {s.value}
                      </span>
                      <span className="text-sm text-muted-fg">{s.sub}</span>
                    </div>
                    <div className="text-xs text-ok font-medium">{s.trend}</div>
                  </div>
                );
              })}
            </div>

            {/* Recent conversations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-foreground">Recent Conversations</h2>
              </div>

              <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-line">
                  {RECENT.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => pick(conv.text)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-item-hover transition-colors group text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground group-hover:text-accent transition-colors truncate block">
                          {conv.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-dim-fg">{conv.time}</span>
                        <ArrowRight
                          size={14}
                          className="text-dim-fg opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center mt-4">
                <button className="text-sm font-medium hover:underline transition-colors"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  View all conversations →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared input box component ────────────────────────────────────────────────

interface InputBoxProps {
  query: string;
  setQuery: (v: string) => void;
  focused: boolean;
  setFocused: (v: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  thinking: boolean;
  onKey: (e: React.KeyboardEvent) => void;
  send: () => void;
  placeholder: string;
}

function InputBox({
  query, setQuery, focused, setFocused,
  textareaRef, thinking, onKey, send, placeholder,
}: InputBoxProps) {
  return (
    <div
      className="rounded-xl border bg-surface transition-all duration-150"
      style={
        focused
          ? {
              borderColor: 'var(--accent-line)',
              boxShadow: '0 0 0 3px var(--accent-soft), 0 8px 32px rgba(7,93,97,0.10)',
            }
          : {
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-md)',
            }
      }
    >
      {/* Textarea */}
      <div className="px-4 pt-4 pb-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent text-foreground placeholder:text-dim-fg text-base outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-3">
        {/* Left: mode + sources selectors */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:border-line-strong"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface-muted)',
            }}
          >
            <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
            Auto
            <ChevronDown size={11} />
          </button>
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:border-line-strong"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface-muted)',
            }}
          >
            <Globe size={12} />
            All Sources
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Right: attach, mic, send */}
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-item-hover transition-colors text-dim-fg hover:text-muted-fg">
            <Paperclip size={15} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-item-hover transition-colors text-dim-fg hover:text-muted-fg">
            <Mic size={15} />
          </button>
          <button
            onClick={send}
            disabled={!query.trim() || thinking}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={
              query.trim() && !thinking
                ? {
                    background: 'linear-gradient(140deg, var(--accent-primary) 0%, #2F8EDB 100%)',
                    boxShadow: '0 4px 14px rgba(7,93,97,0.40)',
                  }
                : {
                    background: 'var(--bg-surface-muted)',
                    cursor: 'not-allowed',
                  }
            }
          >
            {thinking
              ? <Loader2 size={15} className="animate-spin text-dim-fg" />
              : <ArrowUp size={15} className={query.trim() ? 'text-white' : 'text-off-fg'} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
