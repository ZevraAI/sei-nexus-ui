import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, ArrowUp, Paperclip, Mic, ChevronDown,
  Globe, Search, Package, Truck, Users, TrendingUp,
  BarChart3, ArrowRight, Loader2, CreditCard, Bot,
} from 'lucide-react';
import { PulseSpine } from '../../ds';

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_NAME = 'Murali';

// ── KPI strip (real enterprise status) ──────────────────────────────────────────

const KPIS = [
  { label: 'Active investigations', value: '128',   trend: '↑ 18% vs last 7 days' },
  { label: 'New alerts',            value: '32',     trend: '↑ 12% vs last 7 days' },
  { label: 'Data sources',          value: '24',     trend: '4 new this week'      },
  { label: 'Queries this week',     value: '1,842',  trend: '↑ 28% vs last week'   },
];

// ── Recommended actions — grounded in the two HIGH live alerts ──────────────────

const RECOMMENDATIONS = [
  {
    icon: TrendingUp,
    title: 'Investigate the North Region delay spike',
    body: 'An unusual delay spike was detected 15 minutes ago — shipments are backing up at the transit hub.',
    impact: 'Prevents SLA breaches on in-flight shipments.',
    action: 'Open investigation',
  },
  {
    icon: CreditCard,
    title: 'Review the rising payment-failure rate',
    body: 'Payment failures have climbed over the last two hours across multiple regions.',
    impact: 'Protects revenue that is currently at risk.',
    action: 'Review alert',
  },
];

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Package,    label: 'Show me all the orders'           },
  { icon: Truck,      label: 'List delayed shipments by region' },
  { icon: Users,      label: 'Top 10 high risk customers'       },
  { icon: TrendingUp, label: 'Shipment delays analysis'         },
  { icon: Search,     label: 'Revenue anomalies this quarter'   },
  { icon: BarChart3,  label: 'Agent activity summary'           },
];

// ── Recent conversations ──────────────────────────────────────────────────────

const RECENT = [
  { id: 1, text: 'Show me orders and their shipment details',                            time: 'Just now' },
  { id: 2, text: 'List me out all the orders where shipment is delayed more than 5 days', time: '1h ago'   },
  { id: 3, text: 'Which customers have highest shipment delays in last 30 days?',        time: '2h ago'   },
  { id: 4, text: 'Compare vendor performance across Q2 and Q3',                          time: '1d ago'   },
  { id: 5, text: 'Show payment failure trends by region this month',                     time: '1d ago'   },
];

// The signature emerald mark gradient (reused by the sparkle icon + avatars).
const MARK_GRADIENT = 'linear-gradient(135deg, var(--z-primary-hover) 0%, var(--z-primary-press) 100%)';

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
    <div className="flex flex-col min-h-full bg-z-bg text-z-text">

      {/* ════════════════════════════════════════════════════════════════
          EXECUTIVE HOME — shown when no conversation active
      ════════════════════════════════════════════════════════════════ */}
      {!inChat && (
        <div className="px-6 md:px-10 pt-12 pb-14">
          <div className="max-w-[920px] mx-auto">

            {/* ── Hero ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 text-z-text-3 text-sm mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-z-primary opacity-60 animate-z-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-z-primary" />
              </span>
              Understood live · Monitoring 24 sources · 4 live alerts
            </div>
            <PulseSpine className="mb-6" />

            <p className="text-z-text-2 text-base mb-3">{timeLabel}, <span className="text-z-text font-medium">{USER_NAME}</span>.</p>
            <h1 className="font-z-serif font-normal text-[38px] md:text-[44px] leading-[1.08] tracking-[-0.02em] text-z-text max-w-[20ch]">
              Two situations <span className="italic text-z-warning">need your attention</span> — the rest is nominal.
            </h1>

            {/* KPI strip — machined, spine on the leading edge */}
            <div className="relative mt-9 overflow-hidden flex flex-col sm:flex-row rounded-z-lg border border-z-border bg-z-card shadow-z-2
              before:pointer-events-none before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[2px] before:rounded-full
              before:bg-[linear-gradient(180deg,transparent,var(--z-spine-strong)_18%,var(--z-spine-strong)_82%,transparent)] before:shadow-[0_0_12px_var(--z-spine-glow)]">
              {KPIS.map((k, i) => (
                <div key={k.label} className={`flex-1 px-6 py-5 ${i > 0 ? 'border-t sm:border-t-0 sm:border-l border-z-border' : ''}`}>
                  <div className="text-[28px] font-semibold text-z-text tabular-nums leading-none">{k.value}</div>
                  <div className="text-z-caption text-z-text-3 mt-2">{k.label}</div>
                  <div className="text-2xs text-z-up mt-1.5 font-medium">{k.trend}</div>
                </div>
              ))}
            </div>

            {/* Narrative */}
            <p className="mt-8 max-w-z-read text-z-body-lg leading-[1.6] text-z-text-2">
              Zevra is watching <b className="text-z-text font-medium">24 connected sources</b> with <b className="text-z-text font-medium">128 investigations</b> in flight.
              Overnight it raised <b className="text-z-text font-medium">4 live alerts</b> — two high-priority: a delay spike in the North Region and a
              rising payment-failure rate. Everything else is running to plan.
            </p>

            {/* ── Ask Zevra ─────────────────────────────────────────── */}
            <div className="mt-10">
              <InputBox
                query={query}
                setQuery={setQuery}
                focused={focused}
                setFocused={setFocused}
                textareaRef={textareaRef}
                thinking={thinking}
                onKey={onKey}
                send={send}
                placeholder="Ask Zevra anything, or commission an investigation…"
              />
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="text-sm text-z-text-3 font-medium flex-shrink-0">Try asking</span>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTIONS.map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.label}
                        onClick={() => pick(s.label)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-z-md border border-z-border bg-z-card shadow-z-1 hover:bg-z-hover hover:border-z-border-strong text-sm text-z-text-2 hover:text-z-text transition-all"
                      >
                        <Icon size={13} className="text-z-text-3 flex-shrink-0" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Recommended actions ───────────────────────────────── */}
            <SectionLabel>Recommended actions</SectionLabel>
            <div className="grid md:grid-cols-2 gap-z-gutter">
              {RECOMMENDATIONS.map(r => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.title}
                    className="relative overflow-hidden bg-z-card border border-z-border rounded-z-lg p-z-card pl-7 shadow-z-1 hover:shadow-z-2 hover:-translate-y-[3px] transition-all
                      before:pointer-events-none before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[2px] before:rounded-full
                      before:bg-[linear-gradient(180deg,transparent,var(--z-spine-strong)_18%,var(--z-spine-strong)_82%,transparent)] before:shadow-[0_0_12px_var(--z-spine-glow)]"
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className="w-7 h-7 rounded-z-sm bg-z-primary-soft flex items-center justify-center flex-none">
                        <Icon size={14} className="text-z-primary" />
                      </span>
                      <span className="text-z-label uppercase text-z-primary">Recommended action</span>
                    </div>
                    <h3 className="font-z-serif text-z-h3 text-z-text mb-1.5">{r.title}</h3>
                    <p className="text-z-body text-z-text-2 leading-[1.55]">{r.body}</p>
                    <p className="mt-3 text-z-body text-z-text"><span className="font-medium">Expected impact:</span> {r.impact}</p>
                    <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-z-primary hover:gap-2 transition-all">
                      {r.action} <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── AI workforce — honest empty state ─────────────────── */}
            <SectionLabel>Your AI workforce</SectionLabel>
            <div className="rounded-z-lg border border-dashed border-z-border-strong bg-z-card-2 px-8 py-10 text-center">
              <span className="inline-flex w-12 h-12 rounded-z-lg bg-z-primary-soft items-center justify-center mb-4">
                <Bot size={22} className="text-z-primary" />
              </span>
              <h3 className="font-z-serif text-z-h3 text-z-text mb-2">No AI agents deployed yet</h3>
              <p className="text-z-body text-z-text-2 max-w-[52ch] mx-auto leading-[1.6]">
                Zevra can run investigations autonomously and watch your data around the clock. Deploy your first
                agent to put a standing workforce to work — it will surface findings here as they happen.
              </p>
              <button
                className="mt-6 inline-flex items-center gap-2 rounded-z-pill px-5 py-2.5 text-sm font-semibold text-z-on-accent shadow-z-1 hover:-translate-y-px hover:shadow-z-2 transition-all"
                style={{ background: MARK_GRADIENT }}
              >
                <Sparkles size={15} /> Deploy an agent
              </button>
            </div>

            {/* ── Recent conversations ──────────────────────────────── */}
            <SectionLabel>Recent conversations</SectionLabel>
            <div className="bg-z-card border border-z-border rounded-z-lg overflow-hidden shadow-z-1">
              <div className="divide-y divide-z-border">
                {RECENT.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => pick(conv.text)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-z-hover transition-colors group text-left"
                  >
                    <span className="text-sm text-z-text group-hover:text-z-primary transition-colors truncate block flex-1 min-w-0">
                      {conv.text}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-z-text-3">{conv.time}</span>
                      <ArrowRight size={14} className="text-z-text-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
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
                      className="w-8 h-8 rounded-z-md flex items-center justify-center"
                      style={{ background: MARK_GRADIENT, boxShadow: '0 0 0 3px var(--z-primary-soft)' }}
                    >
                      <Sparkles size={14} style={{ color: 'var(--z-primary-on)' }} />
                    </div>
                  </div>
                )}
                <div
                  className={`relative text-sm leading-relaxed rounded-z-lg px-4 py-3 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'text-z-on-accent rounded-tr-z-xs'
                      : 'bg-z-card border border-z-border text-z-text rounded-tl-z-xs shadow-z-1 pl-5 overflow-hidden'
                  }`}
                  style={
                    msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, var(--z-primary) 0%, var(--z-primary-press) 100%)' }
                      : {}
                  }
                >
                  {msg.role === 'ai' && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                      style={{
                        background: 'linear-gradient(180deg, transparent, var(--z-spine-strong) 18%, var(--z-spine-strong) 82%, transparent)',
                        boxShadow: '0 0 12px var(--z-spine-glow)',
                      }}
                    />
                  )}
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
                    className="w-8 h-8 rounded-z-md flex items-center justify-center"
                    style={{ background: MARK_GRADIENT }}
                  >
                    <Sparkles size={14} style={{ color: 'var(--z-primary-on)' }} />
                  </div>
                </div>
                <div className="relative bg-z-card border border-z-border rounded-z-lg rounded-tl-z-xs px-4 py-3.5 pl-5 shadow-z-1 overflow-hidden">
                  <span
                    aria-hidden
                    className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, transparent, var(--z-spine-strong) 18%, var(--z-spine-strong) 82%, transparent)',
                      boxShadow: '0 0 12px var(--z-spine-glow)',
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-z-primary animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-z-primary animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-z-primary animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Sticky input in chat mode */}
          <div className="border-t border-z-border bg-z-bg/95 px-6 py-4">
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
    </div>
  );
}

// ── Section label (Signature — spine tick + section rhythm) ─────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mt-14 mb-5 pl-3.5 text-z-label uppercase text-z-text-3
      before:absolute before:left-0 before:top-[1px] before:h-[11px] before:w-[2px] before:rounded-full before:bg-z-spine-strong">
      {children}
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
      className="rounded-z-xl border bg-z-card transition-all duration-z-base ease-z-standard"
      style={
        focused
          ? {
              borderColor: 'var(--z-primary)',
              boxShadow: '0 0 0 3px var(--z-focus-ring), var(--z-elev-3)',
            }
          : {
              borderColor: 'var(--z-border)',
              boxShadow: 'var(--z-elev-2)',
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
          className="w-full bg-transparent text-z-text placeholder:text-z-text-3 text-base outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-3">
        {/* Left: mode + sources selectors */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-z-md text-xs font-medium border border-z-border bg-z-card-2 text-z-text-2 transition-colors hover:border-z-border-strong">
            <Sparkles size={12} className="text-z-primary" />
            Auto
            <ChevronDown size={11} />
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-z-md text-xs font-medium border border-z-border bg-z-card-2 text-z-text-2 transition-colors hover:border-z-border-strong">
            <Globe size={12} />
            All Sources
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Right: attach, mic, send */}
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-z-md flex items-center justify-center hover:bg-z-hover transition-colors text-z-text-3 hover:text-z-text-2">
            <Paperclip size={15} />
          </button>
          <button className="w-8 h-8 rounded-z-md flex items-center justify-center hover:bg-z-hover transition-colors text-z-text-3 hover:text-z-text-2">
            <Mic size={15} />
          </button>
          <button
            onClick={send}
            disabled={!query.trim() || thinking}
            className="w-9 h-9 rounded-z-round flex items-center justify-center transition-all"
            style={
              query.trim() && !thinking
                ? {
                    background: 'linear-gradient(135deg, var(--z-primary) 0%, var(--z-primary-press) 100%)',
                    boxShadow: '0 6px 18px -6px var(--z-spine-glow)',
                  }
                : {
                    background: 'var(--z-card-2)',
                    cursor: 'not-allowed',
                  }
            }
          >
            {thinking
              ? <Loader2 size={15} className="animate-spin text-z-text-3" />
              : <ArrowUp size={15} style={{ color: query.trim() ? 'var(--z-primary-on)' : 'var(--z-text-disabled)' }} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
