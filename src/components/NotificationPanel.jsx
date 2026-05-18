import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, CheckCheck, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const m = 60_000, h = 3_600_000, d = 86_400_000;
  if (diff < m)  return 'Just now';
  if (diff < h)  return `${Math.floor(diff / m)}m ago`;
  if (diff < d)  return `${Math.floor(diff / h)}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function safeArray(v) { return Array.isArray(v) ? v : []; }

const SEVERITY_CONFIG = {
  CRITICAL: { icon: AlertCircle,   color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500',    label: '🚨' },
  HIGH:     { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', label: '🔴' },
  MEDIUM:   { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-400',  label: '🟡' },
  LOW:      { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400',   label: '⚪' },
};

function getSeverity(alert) {
  return SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW;
}

// ── Bell button (used in Layout) ──────────────────────────────────────────────

export function AlertBell() {
  const [count, setCount]   = useState(0);
  const [open,  setOpen]    = useState(false);

  // Poll every 2 minutes
  useEffect(() => {
    const load = () => {
      api.alerts.unreadCount()
        .then(r => setCount(r?.count ?? 0))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 120_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        className={`relative h-7 w-7 rounded-[7px] flex items-center justify-center
                    border transition-all
                    ${open
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-white/80 border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
      >
        <Bell size={14} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1
                           bg-red-500 text-white rounded-full text-[9px] font-bold
                           flex items-center justify-center leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          onClose={() => setOpen(false)}
          onCountChange={setCount}
        />
      )}
    </>
  );
}

// ── Floating notification panel ───────────────────────────────────────────────

function NotificationPanel({ onClose, onCountChange }) {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const load = () => {
    setLoading(true);
    api.alerts.list(30)
      .then(r => setAlerts(safeArray(r)))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (key) => {
    await api.alerts.markRead(key).catch(() => {});
    setAlerts(prev => prev.map(a => a.delivery_key === key ? { ...a, status: 'READ' } : a));
    onCountChange(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.alerts.markAllRead().catch(() => {});
    setAlerts(prev => prev.map(a => ({ ...a, status: 'READ' })));
    onCountChange(0);
  };

  const unread = alerts.filter(a => a.status === 'UNREAD').length;

  return (
    <div
      ref={ref}
      className="fixed top-[58px] right-4 z-50 w-[360px] max-h-[76vh] flex flex-col
                 bg-white/88 backdrop-blur-xl rounded-[18px]
                 border border-gray-200/60
                 shadow-[0_24px_64px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
                 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100/80 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-amber-500" />
          <span className="text-[13px] font-semibold text-[#111827]">Alerts</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium
                         text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={12} /> All read
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400
                       hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="py-10 text-center text-[12px] text-gray-400">Loading…</div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <BellOff size={22} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#374151]">No alerts yet</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">Configure alert rules to get notified when metrics change</p>
            </div>
            <button
              onClick={() => { navigate('/temporal'); onClose(); }}
              className="px-3 py-1.5 bg-[#111827] text-white text-[12px] font-medium
                         rounded-[7px] hover:bg-[#1F2937] transition-colors"
            >
              Set up alerts →
            </button>
          </div>
        )}

        {!loading && alerts.length > 0 && (
          <div className="divide-y divide-gray-100/80">
            {alerts.map(alert => {
              const sev   = getSeverity(alert);
              const unreadItem = alert.status === 'UNREAD';
              return (
                <div
                  key={alert.delivery_key}
                  className={`px-4 py-3.5 transition-colors cursor-pointer group
                              ${unreadItem ? 'bg-amber-50/40' : 'hover:bg-gray-50/60'}`}
                  onClick={() => unreadItem && markRead(alert.delivery_key)}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity indicator */}
                    <div className={`mt-0.5 w-6 h-6 rounded-[7px] flex items-center justify-center
                                    flex-shrink-0 ${sev.bg} border ${sev.border}`}>
                      <sev.icon size={12} className={sev.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Rule name + time */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-[12.5px] font-semibold truncate ${
                          unreadItem ? 'text-[#111827]' : 'text-[#374151]'
                        }`}>
                          {alert.rule_name || alert.metric_name || 'Alert'}
                        </span>
                        <span className="text-[10.5px] text-gray-400 shrink-0">
                          {timeAgo(alert.sent_at)}
                        </span>
                      </div>

                      {/* Message */}
                      <p className="text-[12px] text-[#6B7280] leading-relaxed line-clamp-2">
                        {alert.message_text}
                      </p>

                      {/* Metrics row */}
                      {(alert.current_value != null || alert.deviation_pct != null) && (
                        <div className="flex items-center gap-3 mt-2">
                          {alert.current_value != null && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                              {Number(alert.current_value).toLocaleString()}
                            </span>
                          )}
                          {alert.deviation_pct != null && (
                            <span className="text-[11px] text-gray-400">
                              {Number(alert.deviation_pct) > 0 ? '+' : ''}
                              {Number(alert.deviation_pct).toFixed(1)}% vs baseline
                            </span>
                          )}
                          {alert.severity && (
                            <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide ${sev.color}`}>
                              {alert.severity}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Investigate link */}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/chat'); onClose(); }}
                        className="mt-2 text-[11px] font-medium text-emerald-600
                                   hover:text-emerald-700 transition-colors"
                      >
                        Investigate →
                      </button>
                    </div>

                    {/* Unread dot */}
                    {unreadItem && (
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100/80 flex-shrink-0 flex items-center justify-between">
          <button
            onClick={() => { navigate('/temporal'); onClose(); }}
            className="text-[11.5px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Manage alert rules
          </button>
          <span className="text-[11px] text-gray-300">{alerts.length} alerts</span>
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
