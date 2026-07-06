import {
  Search, Users, AlertTriangle, CreditCard, Package,
  MoreHorizontal, CheckCircle2,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const investigations = [
  {
    id: 'INV-2024-0087',
    title: 'Shipment Delay Analysis',
    status: 'Active',
    time: 'Just now',
    icon: Package,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    iconBgDark: '#2A1500',
  },
  {
    id: 'INV-2024-0086',
    title: 'High Risk Customers',
    status: 'Active',
    time: '1h ago',
    icon: Users,
    iconBg: '#FFE4E6',
    iconColor: '#E11D48',
    iconBgDark: '#2A0F14',
  },
  {
    id: 'INV-2024-0085',
    title: 'Vendor Fraud Investigation',
    status: 'Open',
    time: '3h ago',
    icon: AlertTriangle,
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    iconBgDark: '#2A0A0A',
  },
  {
    id: 'INV-2024-0084',
    title: 'Payment Anomalies',
    status: 'Completed',
    time: '1d ago',
    icon: CreditCard,
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    iconBgDark: '#1A0F35',
  },
  {
    id: 'INV-2024-0083',
    title: 'Delayed Shipments Q1',
    status: 'Completed',
    time: '2d ago',
    icon: Search,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    iconBgDark: '#0A1535',
  },
];

const alerts = [
  { id: 1, severity: 'High',   title: 'Unusual delay spike in North Region',    time: '15m ago' },
  { id: 2, severity: 'Medium', title: 'Multiple shipments stuck at transit hub', time: '32m ago' },
  { id: 3, severity: 'Medium', title: 'High risk customer detected',             time: '1h ago'  },
  { id: 4, severity: 'High',   title: 'Payment failure rate increased',          time: '2h ago'  },
];

const statusCls: Record<string, string> = {
  Active:    'bg-[#E6F2ED] dark:bg-[#0F2A1A] text-ok',
  Open:      'bg-[#EBF2F8] dark:bg-[#0A1F35] text-note',
  Completed: 'bg-surface-muted text-dim-fg',
};

const severityCls: Record<string, string> = {
  High:   'text-risk',
  Medium: 'text-caution',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function MockupSidePanel() {
  return (
    <div className="flex flex-col h-full">

      {/* ── Recent Investigations ─────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="text-sm font-bold text-foreground">Recent Investigations</span>
          <button className="text-xs text-accent font-medium hover:underline">View all</button>
        </div>

        <div className="divide-y divide-line">
          {investigations.map(inv => {
            const Icon = inv.icon;
            return (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-item-hover transition-colors cursor-pointer group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex-none flex items-center justify-center"
                  style={{ background: inv.iconBg }}
                >
                  <Icon size={14} style={{ color: inv.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate leading-snug">
                    {inv.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xs text-dim-fg font-mono">{inv.id}</span>
                    <span className={`text-2xs px-1.5 py-0.5 rounded-full font-semibold ${statusCls[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-2xs text-dim-fg">{inv.time}</span>
                  <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-item-hover transition-all">
                    <MoreHorizontal size={13} className="text-dim-fg" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live Alerts ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col border-t border-line mt-2">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Live Alerts</span>
            <span className="w-5 h-5 rounded-full bg-risk text-white text-[10px] font-bold flex items-center justify-center">
              4
            </span>
          </div>
          <button className="text-xs text-accent font-medium hover:underline">View all</button>
        </div>

        <div className="flex-1 divide-y divide-line overflow-y-auto scrollbar-thin">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-start gap-3 px-5 py-3 hover:bg-item-hover transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0 pt-0.5">
                <div className={`text-2xs font-bold uppercase tracking-wider mb-1 ${severityCls[alert.severity]}`}>
                  ● {alert.severity}
                </div>
                <div className="text-xs text-foreground leading-snug">{alert.title}</div>
              </div>
              <span className="text-2xs text-dim-fg flex-shrink-0 pt-0.5">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── System status ────────────────────────────────────────────────── */}
      <div className="border-t border-line px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-ok" />
          <span className="text-xs text-muted-fg font-medium">All systems operational</span>
        </div>
        <button className="text-xs text-accent hover:underline font-medium">View status</button>
      </div>
    </div>
  );
}
