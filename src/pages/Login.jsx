import React, { useState } from 'react';
import { api } from '../api.js';
import { Spinner } from '../components/Card.jsx';
import { ZevraLogo } from '../components/ZevraLogo.jsx';
import { Building2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [mode, setMode]     = useState('login');
  const [form, setForm]     = useState({ email: '', password: '', name: '', tenantSlug: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await api.auth.login(form.email, form.password, form.tenantSlug.trim());
      } else {
        result = await api.auth.signup(form.email, form.password, form.name, form.tenantSlug.trim());
      }
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#07201A] via-[#0d2e24] to-[#09211C] p-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center mb-4">
            <ZevraLogo size={56} />
          </div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Zevra</h1>
          <p className="text-white/45 text-[13px] mt-1">Enterprise Operational Intelligence</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.45)] overflow-hidden">

          {/* Tab strip */}
          <div className="flex border-b border-gray-100">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
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

          <form onSubmit={submit} className="px-8 py-7 space-y-4">

            {/* Workspace ID — always first, always visible */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Workspace ID
              </label>
              <div className="relative">
                <Building2
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300 placeholder:font-sans"
                  placeholder="e.g. acme-corp"
                  value={form.tenantSlug}
                  onChange={e => set('tenantSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  autoComplete="organization"
                  spellCheck={false}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                {mode === 'login'
                  ? 'Your workspace ID was provided when your account was set up.'
                  : 'Ask your workspace administrator for the workspace ID before signing up.'}
              </p>
            </div>

            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-gray-300"
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-3.5 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading && <Spinner size={4} />}
              {mode === 'login' ? 'Sign in' : 'Join workspace'}
            </button>
          </form>

          <div className="px-8 pb-6 text-center">
            <p className="text-[12px] text-gray-400">
              By signing in you agree to Zevra terms of service.
            </p>
          </div>
        </div>

        <p className="text-center text-[12px] text-white/30 mt-6">
          © 2026 Zevra · Enterprise Operational Intelligence Platform
        </p>
      </div>
    </div>
  );
}
