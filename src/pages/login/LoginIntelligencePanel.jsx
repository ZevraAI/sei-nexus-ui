import React, { useEffect, useState } from 'react';
import {
  ShoppingCart, Factory, Cross, Truck, Landmark, Package, Server, Plus,
  Database, Users, Share2, BarChart3, Target, CheckCircle2,
} from 'lucide-react';

// ── Industry Pack capabilities ───────────────────────────────────────────
// Static, hand-authored list for the pre-auth login page. NOT sourced from
// api.industryPacks.list() — that endpoint is tenant-scoped and requires an
// authenticated session (it returns the packs a *specific* tenant has applied),
// which doesn't exist yet on this screen. This list instead illustrates the
// platform's general industry breadth to a visitor who hasn't signed in.
export const INDUSTRIES = [
  { name: 'Retail', descriptor: 'Inventory & Store Operations', icon: ShoppingCart },
  { name: 'Manufacturing', descriptor: 'Production & Plant Operations', icon: Factory },
  { name: 'Healthcare', descriptor: 'Clinical & Operational Performance', icon: Cross },
  { name: 'Logistics & Supply Chain', descriptor: 'Movement & Fulfillment', icon: Truck },
  { name: 'Financial Services', descriptor: 'Financial & Operational Intelligence', icon: Landmark },
  { name: 'Distribution', descriptor: 'Orders & Distribution Operations', icon: Package },
  { name: 'Technology', descriptor: 'Technology & Service Operations', icon: Server },
];

// The flow's six surrounding cards — three inputs, three outputs. Deliberately
// abstract (no application logos, no industry-specific imagery) so the same
// composition reads correctly for a manufacturer, a hospital, or a bank.
// "accent" alternates the existing --z-primary (emerald) and --z-brass (warm
// copper) tokens already in the design system — variety, and a touch of
// warmth, without inventing a new color or touching the app's brand primary.
const FLOW_IN = [
  { title: 'Operational data', desc: 'Across your enterprise', icon: Database, accent: 'primary' },
  { title: 'Business context', desc: 'People, processes, and policies', icon: Users, accent: 'primary' },
  { title: 'External signals', desc: 'Market, supply, and regulatory changes', icon: Share2, accent: 'copper' },
];
const FLOW_OUT = [
  { title: 'Prioritized insights', desc: 'What needs attention', icon: BarChart3, accent: 'primary' },
  { title: 'Recommended next steps', desc: 'Options and impact', icon: Target, accent: 'copper' },
  { title: 'Measurable outcomes', desc: 'Track progress and results', icon: CheckCircle2, accent: 'primary' },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// ── Ambient backdrop — a soft orbital arc, not a dense node mesh. Pure CSS/
// SVG, no JS animation loop. Reads as atmosphere behind the flow, not a
// competing visual. Colors derive from the active theme's own tokens so it
// never needs a separate light/dark palette. ───────────────────────────────
function AmbientArc() {
  return (
    <div className="absolute -top-[8%] -right-[12%] w-[62%] h-[62%] pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <linearGradient id="zvArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--z-primary)', stopOpacity: 0 }} />
            <stop offset="45%" style={{ stopColor: 'var(--z-primary)', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: 'var(--z-primary)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="185" fill="none" stroke="url(#zvArcGrad)" strokeWidth="1" opacity="0.5" />
      </svg>
      {/* A single marker along the arc — brand atmosphere, not a claim. */}
      <span
        className="absolute rounded-full zv-indicator-pulse"
        style={{ left: '78.5%', top: '46%', width: 7, height: 7, background: 'var(--z-primary)' }}
      />
      <div
        className="absolute text-[9px] font-semibold uppercase tracking-[0.14em] leading-snug text-right zv-t4"
        style={{ left: '82%', top: '42%', width: 100, color: 'var(--z-text-muted)' }}
      >
        A clearer path forward
      </div>
    </div>
  );
}

// A handful of sparse, slowly-breathing points scattered across the panel —
// not a dense connected mesh, just atmosphere. Positions are hand-placed,
// deliberately irregular (not a grid).
const AMBIENT_DOTS = [
  [18, 10], [55, 6], [88, 22], [72, 46], [12, 62], [94, 68], [40, 88],
];
function AmbientDots() {
  return (
    <>
      <style>{`
        .zv-amb-dot { animation: zvAmbBreathe 10s ease-in-out infinite; }
        @keyframes zvAmbBreathe {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 0.65; }
        }
        @media (prefers-reduced-motion: reduce) { .zv-amb-dot { animation: none; opacity: 0.4; } }
      `}</style>
      {AMBIENT_DOTS.map(([x, y], i) => (
        <span
          key={i}
          className="absolute rounded-full pointer-events-none zv-amb-dot"
          aria-hidden="true"
          style={{
            left: `${x}%`, top: `${y}%`, width: 3, height: 3,
            background: 'var(--z-text-3)',
            animationDelay: `${i * 1.3}s`,
          }}
        />
      ))}
    </>
  );
}

// ── Signal source — a defined surface (not a heavy-blur glass card), neatly
// aligned rather than staggered, matching the reference's cleaner card
// treatment. A small corner mark pulses on its own slow, staggered cycle to
// read as "this source has activity" without becoming a busy indicator. ────
function FlowCard({ title, desc, icon: Icon, accent, align, delay = 0 }) {
  const accentVar = accent === 'copper' ? '--z-brass' : '--z-primary';
  return (
    <div
      className="relative flex items-start gap-2.5 rounded-xl px-3.5 py-3 zv-glass-card"
      style={{
        background: 'color-mix(in srgb, var(--z-card) 78%, transparent)',
        border: `1px solid color-mix(in srgb, var(${accentVar}) 24%, var(--z-border))`,
        boxShadow: `0 10px 26px -18px color-mix(in srgb, var(${accentVar}) 45%, transparent), var(--z-elev-1)`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        textAlign: align === 'right' ? 'right' : 'left',
        flexDirection: align === 'right' ? 'row-reverse' : 'row',
      }}
    >
      <div
        className="flex-none relative w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `color-mix(in srgb, var(${accentVar}) 18%, transparent)` }}
      >
        <Icon size={14} strokeWidth={1.8} style={{ color: `var(${accentVar})` }} />
        <span
          className="absolute -top-0.5 rounded-full zv-source-pulse"
          style={{
            [align === 'right' ? 'left' : 'right']: -1, width: 5, height: 5,
            background: `var(${accentVar})`, animationDelay: `${delay}s`,
          }}
        />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold leading-snug zv-t1" style={{ color: 'var(--z-text)' }}>
          {title}
        </div>
        <div className="text-[10.5px] leading-snug zv-t3" style={{ color: 'var(--z-text-3)' }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

// ── The hero visual: six signal sources flowing into a living intelligence
// core. Vivid gradient-colored curves carry real visual weight (this is the
// energy of the composition, not a faint hint), with particles traveling
// along them and a soft organic glow breathing behind a layered central
// panel. Deliberately not a chat UI, not application logos, not a rigid
// architecture diagram — no arrowheads, no uniform grid of identical boxes.
// CSS/SVG only — no canvas, no requestAnimationFrame. Every animation here
// is disabled or reduced to a static state under prefers-reduced-motion.
function IntelligenceFlow() {
  // Row centers as percentages of the connector column's own height — robust
  // regardless of actual card content height, since three roughly-even cards
  // with modest gaps land close to these thirds regardless of viewport width.
  const ROW_Y = [15, 50, 85];
  const inPath = y => `M 0 ${y} C 58 ${y}, 26 50, 6 50`;
  const outPath = y => `M 94 50 C 74 50, 42 ${y}, 100 ${y}`;
  // Every path carries an occasional traveling particle, but with wide,
  // deliberately irregular staggered delays so they rarely overlap — calm
  // most of the time, then a single signal (occasionally two) passes through.
  const PARTICLES = [
    { path: inPath(ROW_Y[0]), delay: 0, dur: 9 },
    { path: outPath(ROW_Y[0]), delay: 2.4, dur: 10 },
    { path: inPath(ROW_Y[1]), delay: 4.8, dur: 8.5 },
    { path: outPath(ROW_Y[1]), delay: 7.2, dur: 9.5 },
    { path: inPath(ROW_Y[2]), delay: 9.6, dur: 9 },
    { path: outPath(ROW_Y[2]), delay: 12, dur: 10 },
  ];

  return (
    <div className="relative mt-6 max-w-[740px] zv-flow zv-flow-signals">
      <style>{`
        .zv-conn-pulse { fill: var(--z-primary); opacity: 0; animation: zvConnPulse linear infinite; }
        @keyframes zvConnPulse {
          0%, 82%   { opacity: 0; offset-distance: 0%; }
          86%       { opacity: 1; }
          96%       { opacity: 1; offset-distance: 100%; }
          100%      { opacity: 0; offset-distance: 100%; }
        }
        .zv-core-glow { animation: zvGlow 8s ease-in-out infinite; }
        @keyframes zvGlow { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        .zv-core-panel { animation: zvCoreBreathe 8s ease-in-out infinite; }
        @keyframes zvCoreBreathe {
          0%, 100% { box-shadow: inset 0 0 20px color-mix(in srgb, var(--z-primary) 14%, transparent), 0 0 0 0 var(--z-primary-soft); }
          50%      { box-shadow: inset 0 0 30px color-mix(in srgb, var(--z-primary) 24%, transparent), 0 0 30px 4px var(--z-primary-soft); }
        }
        .zv-micro-drift { animation: zvDrift 9s ease-in-out infinite; }
        @keyframes zvDrift {
          0%, 100% { transform: translate(0,0); opacity: 0.35; }
          50%      { transform: translate(3px,-4px); opacity: 0.85; }
        }
        .zv-source-pulse { animation: zvSourcePulse 6s ease-in-out infinite; }
        @keyframes zvSourcePulse {
          0%, 88%, 100% { opacity: 0.35; transform: scale(1); }
          92%           { opacity: 1; transform: scale(1.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          .zv-conn-pulse { display: none; }
          .zv-core-glow { animation: none; opacity: 0.8; }
          .zv-core-panel { animation: none; }
          .zv-micro-drift { animation: none; opacity: 0.5; }
          .zv-source-pulse { animation: none; opacity: 0.6; }
        }
      `}</style>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 150px 1fr' }}>
        {/* Inputs */}
        <div className="flex flex-col gap-3 justify-center">
          {FLOW_IN.map((c, i) => <FlowCard key={c.title} {...c} delay={i * 1.8} />)}
        </div>

        {/* Center: the living intelligence core */}
        <div className="relative flex items-center justify-center" style={{ minHeight: 190 }}>
          {/* vivid gradient curves — the real visual energy of the composition —
              plus traveling particles riding along them */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="zvLineIn" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'var(--z-line-accent, var(--z-primary))', stopOpacity: 0.35 }} />
                <stop offset="100%" style={{ stopColor: 'var(--z-primary)', stopOpacity: 0.85 }} />
              </linearGradient>
              <linearGradient id="zvLineOut" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'var(--z-primary)', stopOpacity: 0.85 }} />
                <stop offset="100%" style={{ stopColor: 'var(--z-line-accent, var(--z-primary))', stopOpacity: 0.35 }} />
              </linearGradient>
            </defs>
            {ROW_Y.map((y, i) => (
              <path key={`in${i}`} d={inPath(y)} fill="none" strokeWidth={1.2}
                style={{ stroke: 'url(#zvLineIn)', ['--z-line-accent']: FLOW_IN[i].accent === 'copper' ? 'var(--z-brass)' : 'var(--z-primary)' }} />
            ))}
            {ROW_Y.map((y, i) => (
              <path key={`out${i}`} d={outPath(y)} fill="none" strokeWidth={1.2}
                style={{ stroke: 'url(#zvLineOut)', ['--z-line-accent']: FLOW_OUT[i].accent === 'copper' ? 'var(--z-brass)' : 'var(--z-primary)' }} />
            ))}
            {PARTICLES.map((p, i) => (
              <circle key={i} className="zv-conn-pulse" r={1.3}
                style={{ offsetPath: `path('${p.path}')`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
            ))}
          </svg>

          {/* soft organic glow — several overlapping blurred blobs rather than
              a single perfect circle, so it reads as atmosphere, not a ring */}
          <div className="absolute zv-core-glow" style={{ width: 200, height: 160, filter: 'blur(22px)' }}>
            <div className="absolute rounded-full" style={{ inset: 0, background: 'radial-gradient(ellipse at 40% 45%, color-mix(in srgb, var(--z-primary) 32%, transparent) 0%, transparent 68%)' }} />
            <div className="absolute rounded-full" style={{ inset: 0, background: 'radial-gradient(ellipse at 62% 55%, color-mix(in srgb, var(--z-brass) 16%, transparent) 0%, transparent 62%)' }} />
          </div>

          {/* a couple of drifting micro-particles within the field */}
          <span className="absolute rounded-full zv-micro-drift" style={{ width: 3, height: 3, background: 'var(--z-primary)', top: '26%', left: '80%', animationDelay: '0s' }} />
          <span className="absolute rounded-full zv-micro-drift" style={{ width: 2.5, height: 2.5, background: 'var(--z-brass)', top: '72%', left: '20%', animationDelay: '3s' }} />

          {/* layered depth behind the panel — two faint offset copies */}
          <div className="absolute rounded-2xl" style={{ width: 118, height: 100, transform: 'translate(6px, 7px)', background: 'color-mix(in srgb, var(--z-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--z-primary) 12%, transparent)' }} />
          <div className="absolute rounded-2xl" style={{ width: 118, height: 100, transform: 'translate(3px, 3.5px)', background: 'color-mix(in srgb, var(--z-primary) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--z-primary) 18%, transparent)' }} />

          {/* the core panel itself */}
          <div
            className="relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl zv-core-panel"
            style={{
              width: 118, height: 100,
              background: 'linear-gradient(160deg, var(--z-card) 0%, var(--z-card-2) 100%)',
              border: '1px solid color-mix(in srgb, var(--z-primary) 45%, var(--z-border-strong))',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-none zv-indicator-pulse" style={{ background: 'var(--z-primary)' }} />
            <span className="text-[12.5px] font-bold text-center leading-tight px-1.5" style={{ color: 'var(--z-primary)' }}>
              Zevra<br />Intelligence
            </span>
          </div>
        </div>

        {/* Outputs */}
        <div className="flex flex-col gap-3 justify-center">
          {FLOW_OUT.map((c, i) => <FlowCard key={c.title} {...c} align="right" delay={i * 1.8 + 0.9} />)}
        </div>
      </div>

      <div className="mt-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.22em] zv-t4" style={{ color: 'var(--z-text-muted)' }}>
        Understand &nbsp;·&nbsp; Reason &nbsp;·&nbsp; Act
      </div>
    </div>
  );
}

export default function LoginIntelligencePanel({ logo }) {
  usePrefersReducedMotion(); // kept for parity with the rest of the app's motion handling; the flow's own CSS handles reduced-motion directly

  return (
    <aside
      className="relative hidden md:flex flex-col overflow-hidden"
      style={{
        padding: 'clamp(16px,2.6vh,32px) clamp(28px,4.2vw,60px) clamp(14px,2.2vh,24px)',
        background:
          'radial-gradient(60% 50% at 92% -4%, color-mix(in srgb, var(--z-primary) 7%, transparent), transparent 70%), ' +
          'linear-gradient(170deg, var(--z-card) 0%, var(--z-bg) 55%, var(--z-card-2) 100%)',
      }}
    >
      {/* Height-based degradation: the aside is clipped to the shell's fixed
          100dvh (see Login.jsx) rather than scrolling, so on short desktop/
          tablet windows content must shed itself in priority order instead of
          being silently cut off mid-element. Least-essential first: the
          eyebrow line, then the supporting paragraph, then the flow's caption
          margin tightens, and only as a last resort the industries section —
          the brand row, headline, and the flow itself always survive. */}
      <style>{`
        @media (min-width: 768px) and (max-height: 860px) {
          .zv-panel-eyebrow { display: none; }
        }
        @media (min-width: 768px) and (max-height: 800px) {
          .zv-panel-sub { display: none; }
        }
        @media (min-width: 768px) and (max-height: 740px) {
          .zv-panel-headline { font-size: clamp(20px, 2.6vw, 28px) !important; margin-top: 6px !important; }
          .zv-flow-signals { margin-top: 12px !important; }
          .zv-panel-industries { margin-top: 10px !important; }
        }
        @media (min-width: 768px) and (max-height: 640px) {
          .zv-panel-industries { display: none; }
        }
        @media (min-width: 768px) and (max-height: 480px) {
          .zv-flow-signals { display: none; }
        }
      `}</style>

      <AmbientArc />
      <AmbientDots />

      <div className="relative z-10 flex items-center gap-2.5 flex-none">
        {logo}
        <span className="text-[14px] font-semibold tracking-tight zv-t1" style={{ color: 'var(--z-text)' }}>Zevra</span>
      </div>

      <div
        className="relative z-10 flex-none text-[11px] font-bold uppercase tracking-[0.16em] zv-t3 zv-panel-eyebrow"
        style={{ marginTop: 'clamp(10px,1.8vh,18px)', color: 'var(--z-text-3)' }}
      >
        Enterprise Operational Intelligence
      </div>

      {/* max-width is generous on purpose: each line below is an explicit <br />
          break, so this only needs to be wide enough that "Understand your
          business." (the longest line) never wraps a second time on its own. */}
      <h1
        className="relative z-10 flex-none mt-2.5 max-w-[42ch] leading-[1.2] tracking-tight zv-t1 zv-panel-headline"
        style={{
          fontFamily: 'var(--z-font-serif)',
          fontWeight: 450,
          fontSize: 'clamp(24px, 3.1vw, 40px)',
          color: 'var(--z-text)',
        }}
      >
        Understand your business.<br />See what matters.<br />
        Act with <span style={{ color: 'var(--z-primary)' }}>confidence.</span>
      </h1>

      <p
        className="relative z-10 flex-none mt-2.5 text-[14.5px] leading-snug max-w-[58ch] zv-t2 zv-panel-sub"
        style={{ color: 'var(--z-text-2)' }}
      >
        Zevra understands your business, connects the right context, identifies
        what matters, and helps your teams move from insight to action.
      </p>

      <div className="relative z-10 flex-none">
        <IntelligenceFlow />
      </div>

      <div className="relative z-10 flex-none zv-panel-industries" style={{ marginTop: 'clamp(16px,2.4vh,26px)' }}>
        <div className="flex items-baseline justify-between flex-wrap gap-x-4 gap-y-1">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] zv-t3" style={{ color: 'var(--z-text-3)' }}>
              One intelligence platform. Every industry.
            </div>
            <p className="mt-1 text-[12px] max-w-[42ch] zv-t4" style={{ color: 'var(--z-text-muted)' }}>
              Zevra becomes industry-specific through Industry Packs.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] zv-t4" style={{ color: 'var(--z-text-muted)' }}>
            <span style={{ width: 16, height: 1, background: 'var(--z-border-strong)' }} />
            Same intelligence. Different possibilities.
          </div>
        </div>

        {/* Capability modules, not filter chips — each is a small, static
            representation of "Zevra understands this industry through an
            Industry Pack." Not clickable navigation. */}
        <div
          className="mt-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}
        >
          {INDUSTRIES.map(ind => {
            const Icon = ind.icon;
            return (
              <div
                key={ind.name}
                className="text-left rounded-[var(--z-radius-md)] border px-3 py-2.5 transition-all duration-150 zv-industry-card"
                style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border)' }}
              >
                <div
                  className="w-8 h-8 rounded-[var(--z-radius-sm)] flex items-center justify-center mb-2"
                  style={{ background: 'color-mix(in srgb, var(--z-primary) 14%, transparent)' }}
                >
                  <Icon size={15} strokeWidth={1.8} style={{ color: 'var(--z-primary)' }} />
                </div>
                <div className="text-[12.5px] font-semibold leading-snug zv-t1" style={{ color: 'var(--z-text)' }}>
                  {ind.name}
                </div>
                <div className="text-[10.5px] mt-0.5 leading-snug zv-t3" style={{ color: 'var(--z-text-3)' }}>
                  {ind.descriptor}
                </div>
              </div>
            );
          })}
          <div
            className="rounded-[var(--z-radius-md)] border border-dashed px-3 py-2.5 flex flex-col items-start justify-center"
            style={{ borderColor: 'var(--z-border)', minHeight: 92 }}
          >
            <div
              className="w-8 h-8 rounded-[var(--z-radius-sm)] flex items-center justify-center mb-2"
              style={{ background: 'var(--z-card-2)' }}
            >
              <Plus size={14} strokeWidth={1.8} style={{ color: 'var(--z-text-3)' }} />
            </div>
            <div className="text-[11.5px] zv-t4" style={{ color: 'var(--z-text-muted)' }}>More industries</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-4 flex-none flex items-center justify-between text-[11px] zv-t4" style={{ color: 'var(--z-text-muted)' }}>
        <span>&copy; Zevra. All rights reserved.</span>
        <span className="hidden lg:inline-flex items-center gap-2">
          <span style={{ width: 16, height: 1, background: 'var(--z-border-strong)' }} />
          Real operations. Greater possibilities.
        </span>
      </div>
    </aside>
  );
}
