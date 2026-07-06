import React, { useState } from 'react';
import { api } from '../api.js';
import { supabase } from '../supabase.js';
import { Spinner } from '../components/Card.jsx';
import { ZevraLogo } from '../components/ZevraLogo.jsx';
import { Building2, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#07201A] via-[#0d2e24] to-[#09211C] p-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center mb-4">
            <ZevraLogo size={56} style={{ borderRadius: '14px' }} />
          </div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Zevra</h1>
          <p className="text-white/45 text-[13px] mt-1">Enterprise Operational Intelligence</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.45)] overflow-hidden">

          {/* Password reset view */}
          {mode === 'reset' && (
            <div className="px-8 py-7">
              {resetSent ? (
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 mb-1">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-[14px] font-semibold text-gray-800">Check your inbox</p>
                  <p className="text-[13px] text-gray-500">
                    A password reset link has been sent to <span className="font-medium text-gray-700">{form.email}</span>.
                    Check your spam folder if it doesn't arrive within a few minutes.
                  </p>
                  <button type="button" onClick={() => switchMode('login')}
                    className="mt-2 text-[13px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <p className="text-[13px] text-gray-500 mb-4">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Email
                    </label>
                    <input type="email" required autoComplete="email"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-[13px] px-3.5 py-3 rounded-lg">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading && <Spinner size={4} />}
                    Send reset link
                  </button>
                  <button type="button" onClick={() => switchMode('login')}
                    className="w-full text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors py-1">
                    Back to sign in
                  </button>
                </form>
              )}
            </div>
          )}

          {/* SSO buttons — only when Supabase is configured */}
          {mode !== 'reset' && supabase && (
            <div className="px-8 pt-7 pb-5 space-y-2.5">
              <button
                type="button"
                onClick={() => handleSso('google')}
                disabled={!!ssoLoading}
                className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {ssoLoading === 'google' ? <Spinner size={4} /> : <GoogleIcon />}
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => handleSso('azure')}
                disabled={!!ssoLoading}
                className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {ssoLoading === 'azure' ? <Spinner size={4} /> : <MicrosoftIcon />}
                Continue with Microsoft
              </button>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400">or email</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </div>
          )}

          {/* Tab strip */}
          {mode !== 'reset' && (
            <div className={`flex border-b border-gray-100 ${supabase ? '' : 'mt-0'}`}>
              {['login', 'signup'].map(m => (
                <button key={m} type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-3.5 text-[13px] font-semibold transition-colors ${
                    mode === m
                      ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/60'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {m === 'login' ? 'Sign in' : 'Join workspace'}
                </button>
              ))}
            </div>
          )}

          {mode !== 'reset' && <form onSubmit={submit} className="px-8 py-7 space-y-4">

            {/* Workspace ID — only shown in legacy mode (no Supabase) */}
            {!supabase && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Workspace ID
                </label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300 placeholder:font-sans"
                    placeholder="e.g. acme-corp"
                    value={form.tenantSlug}
                    onChange={e => set('tenantSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    required={!supabase}
                    autoComplete="organization"
                    spellCheck={false}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  {mode === 'login'
                    ? 'Your workspace ID was provided when your account was set up.'
                    : 'Ask your workspace administrator for the workspace ID.'}
                </p>
              </div>
            )}

            {/* Name (signup only, legacy mode) */}
            {mode === 'signup' && !supabase && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required={!supabase}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input type="email" required autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Password
                </label>
                {mode === 'login' && supabase && (
                  <button type="button" onClick={() => switchMode('reset')}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <input type="password" required minLength={8}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300"
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-[13px] px-3.5 py-3 rounded-lg">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1">
              {loading && <Spinner size={4} />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>}

          {mode !== 'reset' && (
            <div className="px-8 pb-6 text-center">
              <p className="text-[12px] text-gray-400">
                By signing in you agree to Zevra terms of service.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-[12px] text-white/30 mt-6">
          © 2026 Zevra · Enterprise Operational Intelligence Platform
        </p>
      </div>
    </div>
  );
}
