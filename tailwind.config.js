/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Signature — the verdict voice (additive; falls back to system serifs).
        'z-serif': ['var(--z-font-serif)', 'Georgia', 'serif'],
      },
      colors: {
        // ── Legacy tokens (existing pages — migrate incrementally) ──────────
        background: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          muted: 'var(--bg-surface-muted)',
        },
        'sidebar-bg': 'var(--bg-sidebar)',
        'item-hover': 'var(--bg-hover)',
        line: {
          DEFAULT: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        foreground: 'var(--text-primary)',
        'muted-fg': 'var(--text-secondary)',
        'dim-fg': 'var(--text-tertiary)',
        'off-fg': 'var(--text-disabled)',
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          soft: 'var(--accent-soft)',
          line: 'var(--accent-line)',
        },
        ok: { DEFAULT: 'var(--success)', bg: '#E6F2ED' },
        caution: { DEFAULT: 'var(--warning)', bg: '#FDF0E0' },
        risk: { DEFAULT: 'var(--danger)', bg: '#F9EAEA' },
        note: { DEFAULT: 'var(--info)', bg: '#EBF2F8' },

        // ── Zevra Design Language v1.0 (approved foundation) ────────────────
        // Structure & text
        'z-bg': 'var(--z-bg)',
        'z-surface': 'var(--z-surface)',
        'z-card': 'var(--z-card)',
        'z-card-2': 'var(--z-card-2)',
        'z-border': 'var(--z-border)',
        'z-border-strong': 'var(--z-border-strong)',
        'z-text': 'var(--z-text)',
        'z-text-2': 'var(--z-text-2)',
        'z-text-3': 'var(--z-text-3)',
        'z-text-muted': 'var(--z-text-muted)',
        'z-text-disabled': 'var(--z-text-disabled)',
        'z-on-accent': 'var(--z-text-on-accent)',
        // Interaction
        'z-hover': 'var(--z-hover)',
        'z-pressed': 'var(--z-pressed)',
        'z-selected': 'var(--z-selected)',
        'z-focus-ring': 'var(--z-focus-ring)',
        // Primary
        'z-primary': {
          DEFAULT: 'var(--z-primary)',
          hover: 'var(--z-primary-hover)',
          press: 'var(--z-primary-press)',
          soft: 'var(--z-primary-soft)',
          on: 'var(--z-primary-on)',
        },
        'z-secondary-hover': 'var(--z-secondary-hover)',
        // Semantic status (solid / soft / on)
        'z-healthy': { DEFAULT: 'var(--z-healthy)', soft: 'var(--z-healthy-soft)', on: 'var(--z-healthy-on)' },
        'z-investigating': { DEFAULT: 'var(--z-investigating)', soft: 'var(--z-investigating-soft)', on: 'var(--z-investigating-on)' },
        'z-warning': { DEFAULT: 'var(--z-warning)', soft: 'var(--z-warning-soft)', on: 'var(--z-warning-on)' },
        'z-critical': { DEFAULT: 'var(--z-critical)', soft: 'var(--z-critical-soft)', on: 'var(--z-critical-on)' },
        'z-resolved': { DEFAULT: 'var(--z-resolved)', soft: 'var(--z-resolved-soft)', on: 'var(--z-resolved-on)' },
        'z-running': { DEFAULT: 'var(--z-running)', soft: 'var(--z-running-soft)', on: 'var(--z-running-on)' },
        'z-waiting': { DEFAULT: 'var(--z-waiting)', soft: 'var(--z-waiting-soft)', on: 'var(--z-waiting-on)' },
        'z-info': { DEFAULT: 'var(--z-info)', soft: 'var(--z-info-soft)', on: 'var(--z-info-on)' },
        'z-neutral': { DEFAULT: 'var(--z-neutral)', soft: 'var(--z-neutral-soft)', on: 'var(--z-neutral-on)' },
        // Trend direction
        'z-up': 'var(--z-up)',
        'z-down': 'var(--z-down)',
        'z-flat': 'var(--z-flat)',
        // Signature — Pulse Spine (additive)
        'z-spine': 'var(--z-spine)',
        'z-spine-strong': 'var(--z-spine-strong)',
        'z-brass': 'var(--z-brass)',
      },
      boxShadow: {
        // Legacy
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        // Zevra elevation
        'z-1': 'var(--z-elev-1)',
        'z-2': 'var(--z-elev-2)',
        'z-3': 'var(--z-elev-3)',
        'z-4': 'var(--z-elev-4)',
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '10px',
        lg: '12px',
        // Zevra radii
        'z-xs': 'var(--z-radius-xs)',
        'z-sm': 'var(--z-radius-sm)',
        'z-md': 'var(--z-radius-md)',
        'z-lg': 'var(--z-radius-lg)',
        'z-xl': 'var(--z-radius-xl)',
        'z-pill': 'var(--z-radius-pill)',
        'z-round': 'var(--z-radius-round)',
      },
      spacing: {
        // Zevra semantic spacing
        'z-page': '40px',
        'z-gutter': '20px',
        'z-card': '26px',
        'z-card-sm': '20px',
        'z-section': '56px',
      },
      maxWidth: {
        'z-stage': '1120px',
        'z-narrow': '900px',
        'z-read': '66ch',
      },
      fontSize: {
        // Legacy scale
        '2xs': ['11px', { lineHeight: '1.4' }],
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.4' }],
        xl: ['18px', { lineHeight: '1.3' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
        '3xl': ['28px', { lineHeight: '1.2' }],
        // Zevra type scale (size + line-height + tracking + weight)
        'z-display-xl': ['56px', { lineHeight: '1.04', letterSpacing: '-0.03em', fontWeight: '600' }],
        'z-display-lg': ['44px', { lineHeight: '1.07', letterSpacing: '-0.03em', fontWeight: '600' }],
        'z-h1': ['32px', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '600' }],
        'z-h2': ['24px', { lineHeight: '1.22', letterSpacing: '-0.02em', fontWeight: '600' }],
        'z-h3': ['19px', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        'z-body-lg': ['18px', { lineHeight: '1.6' }],
        'z-body': ['15px', { lineHeight: '1.6' }],
        'z-caption': ['13px', { lineHeight: '1.5' }],
        'z-label': ['12px', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '600' }],
        'z-kpi': ['30px', { lineHeight: '1', letterSpacing: '-0.025em', fontWeight: '600' }],
        'z-kpi-lg': ['44px', { lineHeight: '1', letterSpacing: '-0.025em', fontWeight: '600' }],
      },
      transitionTimingFunction: {
        'z-standard': 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        'z-entrance': 'cubic-bezier(0.16, 0.84, 0.24, 1)',
      },
      transitionDuration: {
        'z-fast': '140ms',
        'z-base': '220ms',
        'z-slow': '360ms',
      },
      keyframes: {
        'z-rise': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        'z-rise-scale': { from: { opacity: '0', transform: 'translateY(-12px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'z-pulse-ring': { '0%': { transform: 'scale(1)', opacity: '0.5' }, '70%,100%': { transform: 'scale(2.4)', opacity: '0' } },
        // Signature — the Pulse Spine glint (additive): horizontal (hero) + vertical (live cards)
        'z-spine-glint': { '0%': { left: '0', opacity: '0' }, '12%': { opacity: '1' }, '80%': { opacity: '1' }, '100%': { left: '100%', opacity: '0' } },
        'z-spine-glint-y': { '0%': { top: '0%', opacity: '0' }, '15%': { opacity: '1' }, '85%': { opacity: '1' }, '100%': { top: '100%', opacity: '0' } },
      },
      animation: {
        'z-rise': 'z-rise 360ms cubic-bezier(0.2,0.7,0.2,1) both',
        'z-rise-scale': 'z-rise-scale 360ms cubic-bezier(0.16,0.84,0.24,1) both',
        'z-pulse-ring': 'z-pulse-ring 2s cubic-bezier(0.2,0.7,0.2,1) infinite',
        'z-spine-glint': 'z-spine-glint 4.4s cubic-bezier(0.45,0,0.25,1) infinite',
        'z-spine-glint-y': 'z-spine-glint-y 3.4s cubic-bezier(0.45,0,0.25,1) infinite',
      },
    },
  },
  plugins: [],
};
