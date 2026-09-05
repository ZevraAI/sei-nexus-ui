import React, { useEffect, useRef, useState } from 'react';

// ── Industry Pack examples ───────────────────────────────────────────────
// Static, hand-authored list for the pre-auth login page. NOT sourced from
// api.industryPacks.list() — that endpoint is tenant-scoped and requires an
// authenticated session (it returns the packs a *specific* tenant has applied),
// which doesn't exist yet on this screen. This list instead illustrates the
// platform's general industry breadth to a visitor who hasn't signed in.
const INDUSTRIES = [
  { name: 'Retail', q: '“Which locations are showing emerging operational risk?”',
    a: '<b>3 locations</b> are trending toward risk on core operating metrics — thresholds were crossed in the last 48 hours.' },
  { name: 'Manufacturing', q: '“Which production lines are trending below target?”',
    a: '<b>4 production lines</b> show output below target, traced to two recurring maintenance windows.' },
  { name: 'Healthcare', q: '“Where are capacity pressures increasing?”',
    a: 'Capacity pressure is concentrated in <b>3 service lines</b>, tied to staffing and scheduling patterns.' },
  { name: 'Logistics & Supply Chain', q: '“Where are fulfillment delays increasing?”',
    a: 'Delays are increasing at <b>2 regional hubs</b> — transit time has grown 18% week over week.' },
  { name: 'Financial Services', q: '“Which operational indicators changed materially this week?”',
    a: 'Operating indicators shifted across <b>5 cost centers</b>, driven mainly by vendor and headcount changes.' },
  { name: 'Distribution', q: '“Which centers are falling behind on cycle time?”',
    a: '<b>2 centers</b> exceed target cycle time — congestion concentrates in outbound staging.' },
  { name: 'Technology', q: '“Where is infrastructure spend growing fastest?”',
    a: 'Spend grew fastest across <b>3 services</b>, driven by a sustained rise in usage.' },
];

const DEFAULT_EXAMPLE = {
  q: '“What changed across our operations this week?”',
  a: '<b>12 operational signals</b> changed significantly — Zevra identified several areas requiring attention across your connected business systems.',
};

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

// ── Ambient "living intelligence" network — data points quietly connecting,
// an occasional signal traveling a link. Static single frame under
// prefers-reduced-motion. Colors are sampled from the active theme's own
// CSS custom properties so it never needs its own palette. ─────────────────
function NetworkBackground({ reducedMotion }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const root = document.documentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let nodes = [];
    let pulses = []; // { a, b, start, duration }
    let W = 0, H = 0;
    let lastPulseAt = 0;

    function readVar(name) {
      return getComputedStyle(root).getPropertyValue(name).trim();
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = canvas.width = Math.max(1, Math.round(rect.width * dpr));
      H = canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const count = Math.max(12, Math.min(20, Math.round((rect.width * rect.height) / 52000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.08 * dpr,
        vy: (Math.random() - 0.5) * 0.08 * dpr,
        r: (Math.random() * 1.2 + 1.1) * dpr,
      }));
      pulses = [];
    }

    function edges() {
      const linkDist = 150 * dpr;
      const out = [];
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) out.push({ a, b, dist, linkDist });
        }
      }
      return out;
    }

    function draw(now) {
      // z-text-3 (not z-text-muted) — needed enough contrast against the light
      // "Executive Porcelain" background for the ambient nodes to actually read.
      const lineColor = readVar('--z-text-3') || '#777';
      const dotColor = readVar('--z-text-3') || '#777';
      const pulseColor = readVar('--z-primary') || '#0f7a58';

      ctx.clearRect(0, 0, W, H);

      if (!reducedMotion) {
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
      }

      const es = edges();
      ctx.lineWidth = 1;
      for (const e of es) {
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = 0.55 * (1 - e.dist / e.linkDist);
        ctx.beginPath();
        ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
        ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
        ctx.stroke();
      }

      // Occasionally send a soft signal along a live connection — drawn as a
      // small glow (outer soft ring + solid core) so it stays visible on light
      // backgrounds, not just dark ones.
      if (!reducedMotion && es.length && now - lastPulseAt > 2600) {
        const e = es[Math.floor(Math.random() * es.length)];
        pulses.push({ a: e.a, b: e.b, start: now, duration: 1100 });
        lastPulseAt = now;
      }
      pulses = pulses.filter(p => now - p.start < p.duration);
      for (const p of pulses) {
        const t = (now - p.start) / p.duration;
        const na = nodes[p.a], nb = nodes[p.b];
        if (!na || !nb) continue;
        const x = na.x + (nb.x - na.x) * t;
        const y = na.y + (nb.y - na.y) * t;
        const fade = Math.sin(t * Math.PI); // fade in, fade out
        ctx.fillStyle = pulseColor;
        ctx.globalAlpha = fade * 0.35;
        ctx.beginPath();
        ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(x, y, 2.4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = dotColor;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reducedMotion) rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    draw(0);
    if (!reducedMotion) rafRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      resize();
      draw(0);
      if (!reducedMotion) rafRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

// ── "Ask Zevra" example — staged reveal: question, then a brief intelligence
// indicator, then the response, then the metadata facets. Skipped entirely
// under prefers-reduced-motion (everything shown at once).
//
// This full sequence only plays once, on first mount. Later swaps (hovering
// an industry chip) use a quick, single crossfade instead of replaying the
// whole ~1.5s sequence — replaying it on every hover read as flicker. ──────
function AskZevraCard({ example, reducedMotion }) {
  const hasMounted = useRef(false);
  const [stage, setStage] = useState(reducedMotion ? 3 : 0);
  const [swapping, setSwapping] = useState(false);
  const [shown, setShown] = useState(example);

  // Initial staged reveal — runs once.
  useEffect(() => {
    if (reducedMotion) { setStage(3); hasMounted.current = true; return; }
    const t1 = setTimeout(() => setStage(1), 250);   // question settles in
    const t2 = setTimeout(() => setStage(2), 850);   // indicator activates
    const t3 = setTimeout(() => { setStage(3); hasMounted.current = true; }, 1450); // response + facets fade in
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Later swaps — short crossfade only, no re-triggered stage sequence.
  useEffect(() => {
    if (!hasMounted.current) { setShown(example); return; }
    if (reducedMotion) { setShown(example); return; }
    setSwapping(true);
    const t = setTimeout(() => { setShown(example); setSwapping(false); }, 140);
    return () => clearTimeout(t);
  }, [example, reducedMotion]);

  const contentOpacity = swapping ? 0 : undefined;

  return (
    <div
      className="relative mt-3 max-w-[440px] rounded-[var(--z-radius-lg)] border p-[14px_18px_13px]"
      style={{
        background: 'color-mix(in srgb, var(--z-card) 88%, transparent)',
        borderColor: 'var(--z-border)',
        boxShadow: 'var(--z-elev-3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-1.5 h-1.5 rounded-full transition-shadow duration-500"
          style={{
            background: 'var(--z-primary)',
            boxShadow: stage >= 2 ? '0 0 0 3px var(--z-primary-soft)' : '0 0 0 0px var(--z-primary-soft)',
          }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--z-text-muted)' }}>
          Ask Zevra
          {stage === 2 && (
            <span className="ml-1.5 font-normal normal-case tracking-normal" style={{ color: 'var(--z-primary)' }}>
              analyzing&hellip;
            </span>
          )}
        </span>
      </div>

      <p
        className="text-[13.5px] font-medium leading-snug transition-opacity duration-150"
        style={{ color: 'var(--z-text)', opacity: contentOpacity ?? (stage >= 1 ? 1 : 0) }}
        dangerouslySetInnerHTML={{ __html: shown.q }}
      />

      <p
        className="mt-2 text-[12.5px] leading-relaxed pl-3 border-l-2 transition-opacity duration-150"
        style={{ color: 'var(--z-text-2)', borderColor: 'var(--z-border-strong)', opacity: contentOpacity ?? (stage >= 3 ? 1 : 0) }}
        dangerouslySetInnerHTML={{ __html: shown.a }}
      />

      <div
        className="flex flex-wrap gap-3 mt-[11px] pt-[10px] border-t transition-opacity duration-150"
        style={{ borderColor: 'var(--z-border)', opacity: contentOpacity ?? (stage >= 3 ? 1 : 0) }}
      >
        {[
          { label: 'Connected systems', d: 'M9 2v4M15 2v4M9 18v4M15 18v4M4 9H2m20 0h-2M4 15H2m20 0h-2' },
          { label: 'Business concepts', d: 'M20.6 12.6L12.6 20.6a2 2 0 0 1-2.83 0L3 13.83V3h10.83l6.77 6.77a2 2 0 0 1 0 2.83z' },
          { label: 'Data sources', d: null },
          { label: 'Governed & traceable', d: 'M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z' },
        ].map(f => (
          <span key={f.label} className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--z-text-3)' }}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--z-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {f.label === 'Data sources'
                ? <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" /></>
                : f.label === 'Business concepts'
                ? <><path d={f.d} /><circle cx="7.5" cy="7.5" r="1.3" /></>
                : f.label === 'Governed & traceable'
                ? <><path d={f.d} /><path d="M9.5 12l1.8 1.8L15 10" /></>
                : <><rect x="7" y="7" width="10" height="10" rx="2" /><path d={f.d} /></>}
            </svg>
            {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LoginIntelligencePanel({ logo }) {
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndustry, setActiveIndustry] = useState(null);
  const example = activeIndustry
    ? { q: activeIndustry.q, a: activeIndustry.a }
    : DEFAULT_EXAMPLE;

  return (
    <aside
      className="relative hidden md:flex flex-col overflow-hidden"
      style={{
        padding: 'clamp(16px,2.6vh,32px) clamp(28px,4.2vw,60px) clamp(14px,2.2vh,24px)',
        // Wide, low-alpha tints (not the stronger --z-spine-glow token, which is tuned
        // for small UI accents, not a full-panel wash) so this reads as ambient light
        // rather than a visible colored patch — especially in the light theme.
        background:
          'radial-gradient(75% 60% at 88% -6%, color-mix(in srgb, var(--z-primary) 8%, transparent), transparent 72%), ' +
          'radial-gradient(50% 40% at 4% 104%, color-mix(in srgb, var(--z-primary) 5%, transparent), transparent 65%), ' +
          'linear-gradient(170deg, var(--z-card) 0%, var(--z-bg) 55%, var(--z-card-2) 100%)',
      }}
    >
      {/* fine structural grid, faded toward the lower-right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--z-border) 1px, transparent 1px), ' +
            'linear-gradient(to bottom, var(--z-border) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          opacity: 0.4,
          WebkitMaskImage: 'radial-gradient(90% 65% at 22% 0%, black 0%, transparent 68%)',
          maskImage: 'radial-gradient(90% 65% at 22% 0%, black 0%, transparent 68%)',
        }}
      />
      <NetworkBackground reducedMotion={reducedMotion} />

      <div className="relative z-10 flex items-center gap-2.5 flex-none">
        {logo}
        <span className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--z-text)' }}>Zevra</span>
      </div>

      <div
        className="relative z-10 flex-none text-[11px] font-bold uppercase tracking-[0.16em]"
        style={{ marginTop: 'clamp(10px,1.8vh,18px)', color: 'var(--z-text-3)' }}
      >
        Enterprise Operational Intelligence
      </div>

      <h1
        className="relative z-10 flex-none mt-2 max-w-[16ch] leading-[1.12] tracking-tight"
        style={{
          fontFamily: 'var(--z-font-serif)',
          fontWeight: 450,
          fontSize: 'clamp(20px, 2.5vw, 30px)',
          color: 'var(--z-text)',
        }}
      >
        Ask your business data.<br />Understand what matters.<br />
        Act with <span style={{ color: 'var(--z-primary)' }}>confidence.</span>
      </h1>

      <p
        className="relative z-10 flex-none mt-2.5 text-[13.5px] leading-snug max-w-[46ch]"
        style={{ color: 'var(--z-text-2)' }}
      >
        Zevra connects to the systems your organization already runs and turns
        operational data into intelligence your teams can trust.
      </p>

      <div className="relative z-10 flex-none">
        <AskZevraCard example={example} reducedMotion={reducedMotion} />
      </div>

      <div className="relative z-10 flex-none" style={{ marginTop: 'clamp(14px,2.2vh,22px)' }}>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--z-text-3)' }}>
          One platform. Every industry.
        </div>
        <p className="mt-1 text-[12px] max-w-[42ch]" style={{ color: 'var(--z-text-muted)' }}>
          Zevra becomes industry-specific through Industry Packs.
        </p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {INDUSTRIES.map(ind => (
            <button
              key={ind.name}
              type="button"
              onMouseEnter={() => setActiveIndustry(ind)}
              onFocus={() => setActiveIndustry(ind)}
              onMouseLeave={() => setActiveIndustry(null)}
              onBlur={() => setActiveIndustry(null)}
              className="text-[12px] font-medium rounded-full border px-[13px] py-[6px] whitespace-nowrap transition-colors duration-150"
              style={
                activeIndustry?.name === ind.name
                  ? { background: 'var(--z-primary-soft)', borderColor: 'var(--z-primary)', color: 'var(--z-primary)' }
                  : { background: 'var(--z-surface)', borderColor: 'var(--z-border)', color: 'var(--z-text-2)' }
              }
            >
              {ind.name}
            </button>
          ))}
          <span
            className="text-[12px] rounded-full border border-dashed px-[13px] py-[6px] whitespace-nowrap"
            style={{ color: 'var(--z-text-muted)', borderColor: 'var(--z-border)' }}
          >
            + More
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-3 text-[11px] flex-none" style={{ color: 'var(--z-text-muted)' }}>
        &copy; Zevra
      </div>
    </aside>
  );
}
