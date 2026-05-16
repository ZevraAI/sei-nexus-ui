import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-md ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ size = 5 }) {
  const px = typeof size === 'number' ? `${size * 4}px` : size;
  return (
    <div
      style={{ width: px, height: px }}
      className="border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"
    />
  );
}

export function Badge({ label, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    gray:   'bg-gray-100 text-gray-600 border-gray-200',
    teal:   'bg-teal-50 text-teal-700 border-teal-200',
    navy:   'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={40} className="text-gray-300 mb-3" />}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {body && <p className="text-xs text-gray-400 mt-1 max-w-xs">{body}</p>}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', className = '' }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-sm px-3.5 py-2', lg: 'text-sm px-5 py-2.5' };
  const variants = {
    primary:   'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
    danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-400',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
    teal:      'bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-400',
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

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Input({ label, error, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-gray-700">{label}</label>}
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-gray-700">{label}</label>}
      <select
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-gray-700">{label}</label>}
      <textarea
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-gray-400"
        {...props}
      />
    </div>
  );
}

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
