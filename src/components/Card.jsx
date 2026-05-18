import React from 'react';

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[20px] font-bold text-[#111827] tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#9CA3AF] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 5 }) {
  const px = typeof size === 'number' ? `${size * 4}px` : size;
  return (
    <div
      style={{ width: px, height: px }}
      className="border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"
    />
  );
}

// ── Badge — brighter, more readable ──────────────────────────────────────────
export function Badge({ label, color = 'blue' }) {
  const colors = {
    blue:   'bg-[#DBEAFE] text-[#1D4ED8]',
    green:  'bg-[#DCFCE7] text-[#15803D]',
    red:    'bg-[#FEE2E2] text-[#DC2626]',
    yellow: 'bg-[#FEF9C3] text-[#A16207]',
    gray:   'bg-[#F3F4F6] text-[#374151]',
    teal:   'bg-[#CCFBF1] text-[#0F766E]',
    navy:   'bg-[#EEF2FF] text-[#4338CA]',
    purple: 'bg-[#EDE9FE] text-[#6D28D9]',
    orange: 'bg-[#FFEDD5] text-[#C2410C]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${colors[color] ?? colors.gray}`}
          style={{ fontWeight: 600 }}>
      {label}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100/80 flex items-center justify-center mb-4">
          <Icon size={26} className="text-gray-300" />
        </div>
      )}
      <p className="text-[14px] font-semibold text-[#374151]">{title}</p>
      {body && <p className="text-[13px] text-[#9CA3AF] mt-1.5 max-w-xs leading-relaxed">{body}</p>}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', className = '' }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-[8px] transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'text-[12px] px-[10px] py-[6px]',
    md: 'text-[13px] px-[14px] py-[7px]',
    lg: 'text-[13px] px-[18px] py-[9px]',
  };
  const variants = {
    primary:   'bg-[#111827] hover:bg-[#1F2937] text-white shadow-sm',
    secondary: 'bg-white/80 backdrop-blur-sm border border-gray-200 text-[#374151] hover:bg-gray-50',
    danger:    'bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] border border-[#FECACA]',
    ghost:     'text-[#6B7280] hover:bg-gray-100/80 hover:text-[#111827]',
    teal:      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col border border-gray-200/70`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-[#111827]">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide">{label}</label>}
      <input
        className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] text-[#111827] bg-white/80
                   focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20
                   placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
        {...props}
      />
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide">{label}</label>}
      <select
        className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] text-[#111827] bg-white/80
                   focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide">{label}</label>}
      <textarea
        className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] text-[#111827] bg-white/80
                   focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20
                   resize-none placeholder:text-gray-300 transition-all"
        {...props}
      />
    </div>
  );
}

// ── useAsync ──────────────────────────────────────────────────────────────────
export function useAsync(fn, deps = []) {
  const [state, setState] = React.useState({ data: null, loading: false, error: null });

  const run = React.useCallback(async (...args) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn(...args);
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }));
      throw e;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, run };
}
