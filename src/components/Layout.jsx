import React, { useState } from 'react';
import { useAuth, navigate } from '../App.jsx';
import {
  Archive, Bot, Building2, ChevronDown, Command,
  GitBranch, Landmark, LogOut, ListChecks, LockKeyhole,
  Network, Settings, ShieldCheck, Sparkles,
} from 'lucide-react';

function buildGroups(isAdmin) {
  const groups = [
    {
      label: 'Workspace',
      items: [
        { path: '/chat',      label: 'Investigations', icon: Archive },
        { path: '/agents',    label: 'Agents',         icon: Bot },
        { path: '/reasoning', label: 'Tasks',           icon: ListChecks },
      ],
    },
    {
      label: 'Knowledge',
      items: [
        { path: '/memory',   label: 'AI Memory',       icon: LockKeyhole },
        { path: '/graph',    label: 'Knowledge Graph', icon: Network },
        { path: '/semantic', label: 'Semantic Layer',  icon: Landmark },
      ],
    },
    {
      label: 'Platform',
      items: [
        { path: '/connections', label: 'Connections', icon: GitBranch },
        { path: '/domains',     label: 'Admin',       icon: Settings },
        // Tenant management is only visible to ADMIN role
        ...(isAdmin ? [{ path: '/tenants', label: 'Tenants', icon: Building2 }] : []),
      ],
    },
  ];
  return groups;
}

function initials(user) {
  const label = user?.display_name || user?.name || user?.email;
  if (label) return label.split(/[ @._-]+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (user?.email || 'A').slice(0, 1).toUpperCase();
}

function tenantLabel(user) {
  const schema = user?.tenant_schema;
  if (!schema || schema === 'public') return 'Default workspace';
  // Convert "tenant_acme_corp" → "acme-corp"
  return schema.replace(/^tenant_/, '').replace(/_/g, '-');
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 text-[#2BD19B]" aria-hidden="true">
      <path d="M16 1.8l2.7 9.5 9.5 2.7-9.5 2.7-2.7 9.5-2.7-9.5-9.5-2.7 9.5-2.7L16 1.8Z"
        fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M25.5 3.5l.9 3.2 3.1.8-3.1.9-.9 3.1-.9-3.1-3.1-.9 3.1-.8.9-3.2Z" fill="currentColor" />
    </svg>
  );
}

export default function Layout({ children, currentPath }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const groups  = buildGroups(isAdmin);

  const active = (path) => {
    if (path === '/chat' && (currentPath === '/' || currentPath === '/chat')) return true;
    return currentPath === path || currentPath.startsWith(path + '?');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFAF8] text-[#111827]">
      <aside className="w-[254px] shrink-0 bg-[radial-gradient(circle_at_15%_0%,#17634E_0%,#07372E_38%,#03231E_100%)] text-white flex flex-col shadow-[18px_0_60px_rgba(3,35,30,0.18)]">

        {/* Logo */}
        <div className="px-6 pt-8 pb-5">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <div className="text-[15px] font-semibold leading-tight">Zevra</div>
              <div className="mt-0.5 text-[11px] text-white/78">Enterprise AI</div>
            </div>
          </div>
        </div>

        {/* Ask Zevra button */}
        <div className="px-5">
          <button
            onClick={() => navigate('/chat')}
            className="h-10 w-full rounded-[10px] bg-white/10 hover:bg-white/14 border border-white/8 px-3 flex items-center gap-2.5 text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_34px_rgba(0,0,0,0.12)]"
          >
            <span className="h-8 w-8 rounded-[10px] bg-[#2BD19B]/15 text-[#45E0A8] flex items-center justify-center">
              <Sparkles size={17} />
            </span>
            Ask Zevra
            <span className="ml-auto flex items-center gap-1 text-[12px] text-white/55">
              <Command size={12} /> K
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-5 space-y-5">
          {groups.map(group => (
            <div key={group.label}>
              <div className="px-2 mb-2 text-[10px] uppercase tracking-wide text-white/48">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ path, label, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`group relative w-full h-9 rounded-[10px] px-2.5 flex items-center gap-2.5 text-[13px] font-medium transition-all ${
                      active(path)
                        ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : 'text-white/78 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {active(path) && (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[#31D399]" />
                    )}
                    <span className={`h-6 w-6 rounded-[7px] flex items-center justify-center transition-colors ${
                      active(path)
                        ? 'bg-[#31D399]/15 text-[#54E3B0]'
                        : 'bg-white/6 text-white/70 group-hover:text-white'
                    }`}>
                      <Icon size={14} strokeWidth={1.7} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: tenant badge + user profile */}
        <div className="px-5 pb-6 space-y-3">

          {/* Tenant indicator */}
          <div className="flex items-center gap-2 px-2 py-2 rounded-[10px] bg-white/5 border border-white/8">
            <div className="w-5 h-5 rounded-[5px] bg-[#2BD19B]/15 flex items-center justify-center shrink-0">
              <Building2 size={11} className="text-[#45E0A8]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/35 uppercase tracking-wide leading-none mb-0.5">Workspace</p>
              <p className="text-[12px] font-medium text-white/80 truncate font-mono">
                {tenantLabel(user)}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate('/tenants')}
                title="Manage tenants"
                className="ml-auto text-white/30 hover:text-white/70 transition-colors"
              >
                <Settings size={13} />
              </button>
            )}
          </div>

          {/* User profile */}
          <div className="relative border-t border-white/12 pt-3">
            {profileOpen && (
              <div className="absolute bottom-[68px] left-0 right-0 rounded-[14px] border border-white/10 bg-[#092D26] p-2 shadow-2xl z-10">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => { navigate('/tenants'); setProfileOpen(false); }}
                    className="w-full h-9 rounded-[10px] px-3 flex items-center gap-2 text-[13px] text-white/82 hover:bg-white/8 hover:text-white mb-0.5"
                  >
                    <Building2 size={14} />
                    Tenant management
                  </button>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="w-full h-9 rounded-[10px] px-3 flex items-center gap-2 text-[13px] text-white/82 hover:bg-white/8 hover:text-white"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen(open => !open)}
              aria-expanded={profileOpen}
              className="w-full flex items-center gap-3 text-left rounded-[14px] p-2 hover:bg-white/7 transition-colors"
            >
              <span className="h-8 w-8 rounded-full bg-[#0F6B52] flex items-center justify-center text-[12px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                {initials(user)}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold truncate">
                  {user?.display_name || user?.email}
                </span>
                <span className="block text-[11px] text-white/58 truncate">
                  {user?.role} · {user?.email}
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`ml-auto text-white/60 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
