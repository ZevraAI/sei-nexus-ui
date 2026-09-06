import React, { useState } from 'react';
import { api } from '../api.js';
import { supabase } from '../supabase.js';
import { Spinner } from '../components/Card.jsx';
import { ZevraLogo } from '../components/ZevraLogo.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import LoginIntelligencePanel, { INDUSTRIES } from './login/LoginIntelligencePanel.jsx';
import { Building2, AlertCircle, Eye, EyeOff, Sun, Moon } from 'lucide-react';

// A richer visual treatment of the same theme control used elsewhere in the
// app (Layout.jsx's ThemeToggle) — both sun and moon stay visible flanking
// the switch, matching the login page's premium visual language. It calls
// the exact same useTheme()/toggleTheme mechanism, so persistence is
// unchanged; this is local to the login page only, not a second control.
function LoginThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-[7px]"
      style={{ background: 'var(--z-card)', borderColor: 'var(--z-border)' }}
    >
      <Sun size={13} strokeWidth={1.8} style={{ color: isDark ? 'var(--z-text-muted)' : 'var(--z-brass)' }} />
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDark}
        className="relative w-9 h-[18px] rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2"
        style={{ background: isDark ? 'var(--z-primary)' : 'var(--z-border-strong)' }}
      >
        <span
          className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: isDark ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
      <Moon size={13} strokeWidth={1.8} style={{ color: isDark ? 'var(--z-primary)' : 'var(--z-text-muted)' }} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.13 17.64 11.823 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  );
}

// Maps any raw technical error into a user-facing message.
// Never exposes HTTP status codes, server state, or infrastructure details.
function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase();

  // Supabase auth errors
  if (msg.includes('invalid_credentials') || msg.includes('invalid login credentials'))
    return 'The email or password you entered is incorrect. Please try again.';
  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed'))
    return 'Please check your inbox and confirm your email address before signing in.';
  if (msg.includes('user not found'))
    return 'The email or password you entered is incorrect. Please try again.';
  if (msg.includes('too many requests') || msg.includes('rate limit'))
    return 'Too many sign-in attempts. Please wait a moment and try again.';
  if (msg.includes('user already registered'))
    return 'An account with this email already exists. Try signing in instead.';

  // Account / access errors from our backend
  if (msg.includes('http 401') || msg.includes('http 403') || msg.includes('not found in'))
    return 'Your account is not configured for this workspace. Please contact your administrator.';

  // Network / connectivity errors (backend down, CORS, DNS)
  if (msg.includes('failed to fetch') || msg.includes('networkerror') ||
      msg.includes('load failed') || msg.includes('network request failed'))
    return 'Unable to reach Zevra right now. Please check your connection and try again.';

  // Server-side errors — never say "500" or "server" to the user
  if (/http [45]\d\d/.test(msg))
    return 'Zevra is temporarily unavailable. Please try again in a moment.';

  // SSO / OAuth errors
  if (msg.includes('oauth') || msg.includes('sso') || msg.includes('provider'))
    return 'Sign-in with your identity provider failed. Please try again or use email and password.';

  // Catch-all — professional but not revealing
  return 'Sign-in failed. Please try again or contact your administrator if the problem persists.';
}

export default function Login({ onLogin }) {
  const [mode,       setMode]       = useState('login');
  const [form,       setForm]       = useState({ email: '', password: '', name: '', tenantSlug: '' });
  const [loading,    setLoading]    = useState(false);
  const [ssoLoading, setSsoLoading] = useState(null); // 'google' | 'azure' | null
  const [error,      setError]      = useState('');
  const [resetSent,  setResetSent]  = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // "Keep me signed in" is currently decorative: Supabase's client is configured with
  // persistSession: true unconditionally (see supabase.js), so the session already
  // survives a browser restart regardless of this checkbox. Wiring a real short-lived
  // vs. long-lived session distinction would be an authentication-behavior change,
  // which is out of scope for this visual refinement — flagged for product/eng follow-up.
  const [rememberMe, setRememberMe] = useState(true);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const switchMode = (m) => { setMode(m); setError(''); setResetSent(false); };

  // Password reset via Supabase
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        form.email.trim(),
        { redirectTo: window.location.origin + window.location.pathname }
      );
      if (resetError) throw new Error(resetError.message);
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // Email / password submit
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (supabase) {
        const { data, error: authError } = mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
          : await supabase.auth.signUp({ email: form.email, password: form.password });

        if (authError) throw new Error(authError.message);
        if (!data.session) {
          setError('Check your inbox — a confirmation link has been sent to your email address.');
          setLoading(false);
          return;
        }
        const u = await api.auth.me();
        onLogin({ user: u, supabaseSession: data.session });
      } else {
        // Legacy path — Supabase env vars not configured
        const result = mode === 'login'
          ? await api.auth.login(form.email, form.password, form.tenantSlug.trim())
          : await api.auth.signup(form.email, form.password, form.name, form.tenantSlug.trim());
        onLogin(result);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // SSO via Supabase OAuth
  const handleSso = async (provider) => {
    if (!supabase) { setError('SSO is not available. Please sign in with email and password.'); return; }
    setSsoLoading(provider);
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          ...(provider === 'azure' ? { scopes: 'openid profile email' } : {}),
        },
      });
      if (oauthError) throw new Error(oauthError.message);
      // Redirect happens; App.jsx onAuthStateChange handles the return
    } catch (err) {
      setError(friendlyError(err));
      setSsoLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen md:h-[100dvh] grid md:grid-cols-[1.32fr_0.68fr] md:overflow-hidden"
      style={{ background: 'var(--z-bg)', color: 'var(--z-text)' }}
    >
      {/* Dark-mode-only text brightness overrides. Light mode is untouched — every
          element below still carries its normal `var(--z-text-*)` inline color as
          the light-mode value; these classes only layer a brighter dark-mode value
          on top (via !important, the one thing that can beat an inline style),
          because the shared --z-text-2/3/muted tokens read as too washed-out for
          this page's dark background. Four levels, consistently applied:
          zv-t1 headline/primary, zv-t2 body/labels, zv-t3 secondary headings,
          zv-t4 muted/metadata (still legible, not disappearing). */}
      <style>{`
        /* No page scroll on desktop/tablet (md+, the two-column layout): the shell
           is pinned to exactly 100dvh and clips instead of scrolling. Mobile keeps
           its normal stacked-page scroll — that's standard mobile UX and is how the
           collapsed industry strip below the login card stays reachable there. */
        @media (min-width: 768px) {
          html, body { overflow: hidden; }
        }
        [data-theme="dark"] .zv-t1 { color: #f5f3ec !important; }
        [data-theme="dark"] .zv-t2 { color: #d7dcd3 !important; }
        [data-theme="dark"] .zv-t3 { color: #aab3a8 !important; }
        [data-theme="dark"] .zv-t4 { color: #8b968c !important; }
        .zv-input::placeholder { color: var(--z-text-muted); }
        [data-theme="dark"] .zv-input::placeholder { color: #7c8a80; }
        /* Ask Zevra status dot — a very slight continuous glow so the card
           reads as "live", not just a static illustration. */
        .zv-indicator-pulse { animation: zvIndicatorPulse 2.8s ease-in-out infinite; }
        @keyframes zvIndicatorPulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--z-primary-soft); }
          50%      { box-shadow: 0 0 0 4px var(--z-primary-soft); }
        }
        @media (prefers-reduced-motion: reduce) {
          .zv-indicator-pulse { animation: none; }
        }

        /* Height-based compaction for the login card, so it keeps fitting
           within the fixed-height shell on short desktop/tablet windows
           instead of ever needing its own scrollbar. */
        @media (min-width: 768px) and (max-height: 760px) {
          .zv-authwrap { max-width: 360px; }
          .zv-card-inner { padding: 20px 26px 16px !important; }
          .zv-card-head { margin-bottom: 14px !important; }
          .zv-sso-row { margin-bottom: 10px !important; gap: 7px !important; }
          .zv-field { margin-bottom: 9px !important; }
        }
        @media (min-width: 768px) and (max-height: 620px) {
          .zv-card-inner { padding: 14px 24px 12px !important; }
          .zv-card-head { margin-bottom: 10px !important; }
        }
      `}</style>

      <div className="fixed top-[18px] right-[18px] z-50">
        <LoginThemeToggle />
      </div>

      <LoginIntelligencePanel logo={<ZevraLogo size={26} style={{ borderRadius: '7px' }} />} />

      <main
        className="relative flex items-center justify-center px-6 py-10 md:border-l min-w-0 md:h-full md:overflow-hidden"
        style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border)' }}
      >
        <div className="w-full max-w-[374px] zv-authwrap">

          {/* Mobile-only compact brand + hero — the full left panel (with the
              intelligence card and industry cards) is hidden below md; this is
              the condensed stand-in so the product story isn't lost, per the
              mobile content order: logo → hero → short explanation → login card. */}
          <div className="flex md:hidden flex-col items-center text-center gap-2.5 mb-7">
            <div className="flex items-center gap-2.5">
              <ZevraLogo size={28} style={{ borderRadius: '8px' }} />
              <span className="text-[15px] font-semibold zv-t1" style={{ color: 'var(--z-text)' }}>Zevra</span>
            </div>
            <h1
              className="mt-1 text-[19px] leading-snug tracking-tight zv-t1"
              style={{ fontFamily: 'var(--z-font-serif)', fontWeight: 450, color: 'var(--z-text)' }}
            >
              Understand your business.<br />
              Act with <span style={{ color: 'var(--z-primary)' }}>confidence.</span>
            </h1>
            <p className="text-[12.5px] leading-snug max-w-[34ch] zv-t2" style={{ color: 'var(--z-text-2)' }}>
              Zevra connects to the systems your organization already runs and turns operational data into intelligence your teams can trust.
            </p>
          </div>

          <div
            className="rounded-[var(--z-radius-xl)] p-[2px]"
            style={{
              backgroundImage:
                'linear-gradient(var(--z-card), var(--z-card)), linear-gradient(155deg, color-mix(in srgb, var(--z-primary) 32%, var(--z-border-strong)), var(--z-border) 45%, color-mix(in srgb, var(--z-primary) 22%, var(--z-border-strong)) 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              border: '1px solid transparent',
              boxShadow: 'var(--z-elev-4), 0 0 34px -14px color-mix(in srgb, var(--z-primary) 45%, transparent)',
            }}
          >
            <div className="p-[28px_30px_22px] zv-card-inner">

              {/* Password reset view */}
              {mode === 'reset' && (
                <div>
                  {resetSent ? (
                    <div className="text-center space-y-4">
                      <div
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-1"
                        style={{ background: 'var(--z-primary-soft)' }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--z-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <p className="text-[14px] font-semibold zv-t1" style={{ color: 'var(--z-text)' }}>Check your inbox</p>
                      <p className="text-[13px] zv-t3" style={{ color: 'var(--z-text-3)' }}>
                        A password reset link has been sent to <span className="font-medium zv-t2" style={{ color: 'var(--z-text-2)' }}>{form.email}</span>.
                        Check your spam folder if it doesn't arrive within a few minutes.
                      </p>
                      <button type="button" onClick={() => switchMode('login')}
                        className="mt-2 text-[13px] font-medium hover:underline"
                        style={{ color: 'var(--z-primary)' }}>
                        Back to sign in
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <p className="text-[13px] mb-4 zv-t3" style={{ color: 'var(--z-text-3)' }}>
                          Enter your email address and we'll send you a link to reset your password.
                        </p>
                        <label className="block text-[11.5px] font-semibold mb-1.5 zv-t2" style={{ color: 'var(--z-text-2)' }}>
                          Email address
                        </label>
                        <input type="email" required autoComplete="email"
                          className="w-full rounded-[var(--z-radius-sm)] px-3.5 py-2.5 text-sm outline-none border transition-shadow zv-input zv-t1"
                          style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border-strong)', color: 'var(--z-text)' }}
                          onFocus={e => { e.target.style.borderColor = 'var(--z-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--z-focus-ring)'; }}
                          onBlur={e => { e.target.style.borderColor = 'var(--z-border-strong)'; e.target.style.boxShadow = 'none'; }}
                          placeholder="you@company.com"
                          value={form.email}
                          onChange={e => set('email', e.target.value)}
                        />
                      </div>
                      {error && (
                        <div className="flex items-start gap-2.5 text-[13px] px-3.5 py-3 rounded-[var(--z-radius-sm)] border"
                          style={{ background: 'color-mix(in srgb, var(--z-critical) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--z-critical) 30%, transparent)', color: 'var(--z-critical)' }}>
                          <AlertCircle size={15} className="shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}
                      <button type="submit" disabled={loading}
                        className="w-full font-semibold py-2.5 rounded-[var(--z-radius-md)] text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'var(--z-primary)', color: 'var(--z-primary-on)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--z-primary-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--z-primary)'}>
                        {loading && <Spinner size={4} />}
                        Send reset link
                      </button>
                      <button type="button" onClick={() => switchMode('login')}
                        className="w-full text-[13px] font-medium transition-colors py-1 zv-t4"
                        style={{ color: 'var(--z-text-muted)' }}>
                        Back to sign in
                      </button>
                    </form>
                  )}
                </div>
              )}

              {mode !== 'reset' && (
                <>
                  {/* Card head */}
                  <div className="mb-5 zv-card-head">
                    <ZevraLogo size={34} style={{ borderRadius: 'var(--z-radius-sm)', display: 'block', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.14)' }} />
                    <h2 className="text-[20px] font-semibold tracking-tight zv-t1" style={{ color: 'var(--z-text)' }}>Welcome back</h2>
                    <p className="mt-1 text-[13px] zv-t3" style={{ color: 'var(--z-text-3)' }}>Sign in to your Zevra workspace</p>
                  </div>

                  {/* SSO buttons — only when Supabase is configured */}
                  {supabase && (
                    <div className="flex flex-col gap-2 mb-3.5 zv-sso-row">
                      <button
                        type="button"
                        onClick={() => handleSso('google')}
                        disabled={!!ssoLoading}
                        className="w-full flex items-center justify-center gap-2.5 rounded-[var(--z-radius-md)] py-2.5 text-[13px] font-medium transition-all border disabled:opacity-50 zv-t2"
                        style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border-strong)', color: 'var(--z-text-2)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--z-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--z-surface)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        {ssoLoading === 'google' ? <Spinner size={4} /> : <GoogleIcon />}
                        Continue with Google
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSso('azure')}
                        disabled={!!ssoLoading}
                        className="w-full flex items-center justify-center gap-2.5 rounded-[var(--z-radius-md)] py-2.5 text-[13px] font-medium transition-all border disabled:opacity-50 zv-t2"
                        style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border-strong)', color: 'var(--z-text-2)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--z-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--z-surface)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        {ssoLoading === 'azure' ? <Spinner size={4} /> : <MicrosoftIcon />}
                        Continue with Microsoft
                      </button>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px" style={{ background: 'var(--z-border)' }} />
                        <span className="text-[11px] zv-t4" style={{ color: 'var(--z-text-muted)' }}>or sign in with email</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--z-border)' }} />
                      </div>
                    </div>
                  )}

                  {/* Tab strip — only relevant in legacy (no-Supabase) mode, where signup exists */}
                  {!supabase && (
                    <div className="flex border-b mb-1" style={{ borderColor: 'var(--z-border)' }}>
                      {['login', 'signup'].map(m => (
                        <button key={m} type="button"
                          onClick={() => switchMode(m)}
                          className="flex-1 py-3 text-[13px] font-semibold transition-colors border-b-2"
                          style={
                            mode === m
                              ? { color: 'var(--z-primary)', borderColor: 'var(--z-primary)', background: 'var(--z-primary-soft)' }
                              : { color: 'var(--z-text-muted)', borderColor: 'transparent' }
                          }
                        >
                          {m === 'login' ? 'Sign in' : 'Join workspace'}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={submit}>

                    {/* Workspace ID — only shown in legacy mode (no Supabase) */}
                    {!supabase && (
                      <div className="mb-3 zv-field">
                        <label className="block text-[11.5px] font-semibold mb-1.5 zv-t2" style={{ color: 'var(--z-text-2)' }}>
                          Workspace ID
                        </label>
                        <div className="relative">
                          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--z-text-muted)' }} />
                          <input
                            className="w-full rounded-[var(--z-radius-sm)] pl-10 pr-3.5 py-2.5 text-sm font-mono border outline-none zv-input zv-t1"
                            style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border-strong)', color: 'var(--z-text)' }}
                            placeholder="e.g. acme-corp"
                            value={form.tenantSlug}
                            onChange={e => set('tenantSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            required={!supabase}
                            autoComplete="organization"
                            spellCheck={false}
                          />
                        </div>
                        <p className="mt-1 text-[11px] zv-t4" style={{ color: 'var(--z-text-muted)' }}>
                          {mode === 'login'
                            ? 'Your workspace ID was provided when your account was set up.'
                            : 'Ask your workspace administrator for the workspace ID.'}
                        </p>
                      </div>
                    )}

                    {/* Name (signup only, legacy mode) */}
                    {mode === 'signup' && !supabase && (
                      <div className="mb-3 zv-field">
                        <label className="block text-[11.5px] font-semibold mb-1.5 zv-t2" style={{ color: 'var(--z-text-2)' }}>
                          Full Name
                        </label>
                        <input
                          className="w-full rounded-[var(--z-radius-sm)] px-3.5 py-2.5 text-sm border outline-none zv-input zv-t1"
                          style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border-strong)', color: 'var(--z-text)' }}
                          placeholder="Jane Smith"
                          value={form.name}
                          onChange={e => set('name', e.target.value)}
                          required={!supabase}
                        />
                      </div>
                    )}

                    {/* Email */}
                    <div className="mb-3 zv-field">
                      <label className="block text-[11.5px] font-semibold mb-1.5 zv-t2" style={{ color: 'var(--z-text-2)' }}>
                        Email address
                      </label>
                      <input type="email" required autoComplete="email"
                        className="w-full rounded-[var(--z-radius-sm)] px-3.5 py-2.5 text-sm border outline-none transition-shadow zv-input zv-t1"
                        style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border-strong)', color: 'var(--z-text)' }}
                        onFocus={e => { e.target.style.borderColor = 'var(--z-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--z-focus-ring)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--z-border-strong)'; e.target.style.boxShadow = 'none'; }}
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                      />
                    </div>

                    {/* Password */}
                    <div className="mb-3 zv-field">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11.5px] font-semibold zv-t2" style={{ color: 'var(--z-text-2)' }}>
                          Password
                        </label>
                        {mode === 'login' && supabase && (
                          <button type="button" onClick={() => switchMode('reset')}
                            className="text-[12.5px] font-medium hover:underline zv-t2"
                            style={{ color: 'var(--z-text-2)' }}>
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} required minLength={8}
                          className="w-full rounded-[var(--z-radius-sm)] pl-3.5 pr-10 py-2.5 text-sm border outline-none transition-shadow zv-input zv-t1"
                          style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border-strong)', color: 'var(--z-text)' }}
                          onFocus={e => { e.target.style.borderColor = 'var(--z-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--z-focus-ring)'; }}
                          onBlur={e => { e.target.style.borderColor = 'var(--z-border-strong)'; e.target.style.boxShadow = 'none'; }}
                          placeholder="••••••••"
                          value={form.password}
                          onChange={e => set('password', e.target.value)}
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1"
                          style={{ color: 'var(--z-text-muted)' }}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {mode === 'login' && supabase && (
                      <label className="flex items-center gap-2 mb-4 text-[12.5px] cursor-pointer zv-t2" style={{ color: 'var(--z-text-2)' }}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="w-3.5 h-3.5"
                          style={{ accentColor: 'var(--z-primary)' }}
                        />
                        Keep me signed in
                      </label>
                    )}

                    {error && (
                      <div className="flex items-start gap-2.5 text-[13px] px-3.5 py-3 rounded-[var(--z-radius-sm)] border mb-4"
                        style={{ background: 'color-mix(in srgb, var(--z-critical) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--z-critical) 30%, transparent)', color: 'var(--z-critical)' }}>
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button type="submit" disabled={loading}
                      className="w-full font-semibold py-2.5 rounded-[var(--z-radius-md)] text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, var(--z-primary) 0%, var(--z-primary-hover) 100%)', color: 'var(--z-primary-on)', boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 6px 16px -8px var(--z-spine-strong, var(--z-primary))' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1), 0 10px 24px -8px var(--z-spine-strong, var(--z-primary))'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08), 0 6px 16px -8px var(--z-spine-strong, var(--z-primary))'; }}>
                      {loading && <Spinner size={4} />}
                      {mode === 'login' ? 'Sign in' : 'Create account'}
                    </button>
                  </form>

                  <div className="text-center mt-3.5 text-[12px] zv-t4" style={{ color: 'var(--z-text-muted)' }}>
                    Need help? <span style={{ color: 'var(--z-primary)', fontWeight: 500 }}>Contact your workspace administrator</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-center mt-3.5 text-[11.5px] zv-t4" style={{ color: 'var(--z-text-muted)' }}>
            Terms of Service <span style={{ color: 'var(--z-border-strong)' }}>&middot;</span> Privacy Policy
          </p>
          <p className="hidden md:flex items-center justify-center gap-2 mt-2 text-[11px] italic zv-t4" style={{ color: 'var(--z-text-muted)' }}>
            <span style={{ width: 16, height: 1, background: 'var(--z-border-strong)' }} />
            Real operations. Greater possibilities.
          </p>

          {/* Mobile-only: Industry Packs collapsed to a compact icon strip below the
              login card, not a scrollable row of the full descriptor cards — the
              login form stays short, but the "one platform, every industry" idea
              isn't dropped entirely. */}
          <div className="md:hidden mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--z-border)' }}>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] zv-t3" style={{ color: 'var(--z-text-3)' }}>
              One platform. Every industry.
            </div>
            {/* flex-wrap, not overflow-x-auto: a non-wrapping scroll row of
                flex-none pills can force its min-content width onto the whole
                page inside a flex/grid ancestor (Login's main is a flex
                container) — wrapping sidesteps that class of bug entirely. */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {INDUSTRIES.map(ind => {
                const Icon = ind.icon;
                return (
                  <span
                    key={ind.name}
                    className="inline-flex items-center gap-1.5 rounded-[var(--z-radius-pill)] border px-2.5 py-1.5"
                    style={{ background: 'var(--z-surface)', borderColor: 'var(--z-border)' }}
                  >
                    <Icon size={12} strokeWidth={1.8} style={{ color: 'var(--z-text-3)' }} />
                    <span className="text-[11px] whitespace-nowrap zv-t3" style={{ color: 'var(--z-text-3)' }}>{ind.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
