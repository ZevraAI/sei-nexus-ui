import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { Spinner } from '../components/Card.jsx';
import { ZevraLogo } from '../components/ZevraLogo.jsx';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function SetNewPassword({ onComplete }) {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      // Give the user a moment to read the success message, then proceed
      setTimeout(() => onComplete(), 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
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
            <ZevraLogo size={56} style={{ borderRadius: '14px' }} />
          </div>
          <h1 className="text-z-h3 font-semibold text-white tracking-tight">Zevra</h1>
          <p className="text-white/45 text-z-caption mt-1">Enterprise Operational Intelligence</p>
        </div>

        <div className="bg-z-card rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="px-8 pt-7 pb-2 border-b border-z-border">
            <h2 className="text-z-body font-semibold text-z-text">Set a new password</h2>
            <p className="text-z-small text-z-text-3 mt-0.5">Choose a strong password for your account.</p>
          </div>

          {success ? (
            <div className="px-8 py-8 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <p className="text-z-body-sm font-semibold text-z-text">Password updated</p>
              <p className="text-z-caption text-z-text-3">You're being signed in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">

              {/* New password */}
              <div>
                <label className="block text-z-micro font-semibold text-z-text-3 uppercase tracking-wide mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full border border-z-border rounded-lg px-3.5 pr-10 py-2.5 text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-z-text-3"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-z-text-3 hover:text-z-text-2"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-z-micro font-semibold text-z-text-3 uppercase tracking-wide mb-1.5">
                  Confirm new password
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full border border-z-border rounded-lg px-3.5 py-2.5 text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-z-text-3"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>

              {/* Password strength hint */}
              {password.length > 0 && password.length < 8 && (
                <p className="text-z-micro text-amber-600">
                  Password is too short — {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed.
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-z-caption px-3.5 py-3 rounded-lg">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {loading && <Spinner size={4} />}
                Update password
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-z-small text-white/30 mt-6">
          © 2026 Zevra · Enterprise Operational Intelligence Platform
        </p>
      </div>
    </div>
  );
}
