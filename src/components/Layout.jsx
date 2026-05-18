import React, { useState } from 'react';
import { useAuth, navigate } from '../App.jsx';
import { AlertBell } from './NotificationPanel.jsx';
import {
  Building2, ChevronDown, LogOut, Sparkles,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────
function initials(user) {
  const label = user?.display_name || user?.name || user?.email;
  if (label) return label.split(/[ @._-]+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (user?.email || 'A').slice(0, 1).toUpperCase();
}

function tenantLabel(user) {
  const schema = user?.tenant_schema;
  if (!schema || schema === 'public') return 'Default workspace';
  return schema.replace(/^tenant_/, '').replace(/_/g, '-');
}

// ── nav items ─────────────────────────────────────────────────────────────
function buildNavItems(isPlatformAdmin) {
  return [
    { path: '/chat',       label: 'Investigations' },
    { path: '/agents',     label: 'Agents' },
    { path: '/graph',      label: 'Knowledge Graph' },
    { path: '/semantic',   label: 'Semantic Layer' },
    { path: '/connections',label: 'Connections' },
    { path: '/memory',     label: 'AI Memory' },
    { path: '/reports',    label: 'Reports' },
    ...(isPlatformAdmin ? [{ path: '/tenants', label: 'Tenants' }] : []),
  ];
}

// ── component ─────────────────────────────────────────────────────────────
export default function Layout({ children, currentPath }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isPlatformAdmin = isAdmin && (user?.tenant_schema === 'public' || !user?.tenant_schema);
  const navItems = buildNavItems(isPlatformAdmin);

  const active = (path) => {
    if (path === '/chat' && (currentPath === '/' || currentPath === '/chat')) return true;
    return currentPath === path || currentPath.startsWith(path + '?');
  };

  return (
    <div className="flex flex-col h-screen">

      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <header className="h-[52px] shrink-0 flex items-center px-5 gap-0 z-50
                         bg-white/75 backdrop-blur-md border-b border-gray-200/70">

        {/* Logo */}
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 mr-7 group"
        >
          <div className="w-[26px] h-[26px] bg-gradient-to-br from-emerald-500 to-emerald-700
                          rounded-[7px] flex items-center justify-center shadow-sm
                          group-hover:shadow-emerald-200 group-hover:shadow-md transition-all">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-[14.5px] font-bold text-[#111827] tracking-tight">Zevra</span>
        </button>

        {/* Nav items */}
        <nav className="flex items-center gap-0.5 flex-1">
          {navItems.map(({ path, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`px-[11px] py-[6px] rounded-[7px] text-[13px] font-medium
                          transition-all whitespace-nowrap ${
                active(path)
                  ? 'bg-[#F3F4F6] text-[#111827] font-semibold'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Alert bell */}
          <AlertBell />

          {/* Agent pill */}
          <div className="flex items-center gap-[5px] px-[10px] py-[4px]
                          bg-emerald-50 border border-emerald-200 rounded-[7px]">
            <div className="w-[6px] h-[6px] bg-emerald-500 rounded-full" />
            <span className="text-[11.5px] font-medium text-emerald-700">Data Analyst</span>
          </div>

          {/* Workspace badge */}
          <button className="flex items-center gap-[6px] px-[10px] py-[5px] bg-white
                             border border-gray-200 rounded-[7px] text-[12px] font-medium
                             text-gray-600 hover:bg-gray-50 transition-colors">
            <div className="w-[18px] h-[18px] rounded-[4px] bg-gradient-to-br from-blue-500
                            to-purple-600 flex items-center justify-center
                            text-[8px] font-bold text-white flex-shrink-0">
              {tenantLabel(user).slice(0, 2).toUpperCase()}
            </div>
            <span className="truncate max-w-[100px]">{tenantLabel(user)}</span>
            <ChevronDown size={10} className="text-gray-400 flex-shrink-0" />
          </button>

          {/* User avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-emerald-500
                         to-blue-500 flex items-center justify-center
                         text-[11px] font-bold text-white cursor-pointer
                         hover:shadow-md transition-all"
            >
              {initials(user)}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[38px] w-[180px] bg-white border border-gray-200
                              rounded-[12px] shadow-xl py-1.5 z-50">
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">
                    {user?.display_name || user?.email}
                  </p>
                  <p className="text-[11px] text-gray-400">{user?.role}</p>
                </div>
                {isPlatformAdmin && (
                  <button
                    onClick={() => { navigate('/tenants'); setProfileOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                               text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Building2 size={13} />
                    Tenant management
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                             text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-hidden bg-transparent">
        {children}
      </main>

    </div>
  );
}
