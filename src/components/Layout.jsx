import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth, navigate } from '../App.jsx';
import { AlertBell } from './NotificationPanel.jsx';
import { ZevraLogo } from './ZevraLogo.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { api } from '../api.js';
import InvestigationComposer from './InvestigationComposer.jsx';
import {
  Building2, ChevronDown, LogOut, Moon, Sun, ArrowLeftRight, X,
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

// Environment badge styling — Production (emerald), UAT/Staging (amber), Dev/other (slate).
function envMeta(env, isDark) {
  const e = (env || '').toLowerCase();
  if (e.startsWith('prod')) return { dot: 'bg-emerald-500', text: isDark ? 'text-emerald-400' : 'text-emerald-600' };
  if (e.startsWith('uat') || e.startsWith('stag')) return { dot: 'bg-amber-500', text: isDark ? 'text-amber-400' : 'text-amber-600' };
  return { dot: 'bg-slate-400', text: isDark ? 'text-slate-400' : 'text-slate-500' };
}

// Organization mark: real logo when available, otherwise a generated monogram in the Zevra emerald.
function OrgMark({ tenant, size = 30 }) {
  if (tenant.tenantLogoUrl) {
    return (
      <img
        src={tenant.tenantLogoUrl}
        alt={tenant.tenantName}
        className="rounded-[7px] object-cover border border-black/5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-[7px] flex items-center justify-center font-bold text-white
                 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {tenant.tenantShortName}
    </div>
  );
}

// ── Theme toggle switch ───────────────────────────────────────────────────
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-11 h-[22px] rounded-full transition-colors duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                  ${isDark ? 'bg-emerald-700' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full shadow-sm
                    flex items-center justify-center transition-transform duration-200
                    ${isDark ? 'translate-x-[22px] bg-[#0F1117]' : 'translate-x-[2px] bg-white'}`}
      >
        {isDark
          ? <Moon size={9} className="text-emerald-400" />
          : <Sun size={9} className="text-amber-500" />
        }
      </span>
    </button>
  );
}

// ── Nav dropdown component ────────────────────────────────────────────────
function NavDropdown({ label, items, active, isDark }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = items.some(i => active(i.path));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-[11px] py-[6px] rounded-[7px] text-[13px] font-medium
                    transition-all whitespace-nowrap ${
          isActive
            ? isDark ? 'bg-[#1E2535] text-[#F0F4F8] font-semibold'
                     : 'bg-[#F3F4F6] text-[#111827] font-semibold'
            : isDark ? 'text-[#94A3B8] hover:bg-[#1E2535] hover:text-[#F0F4F8]'
                     : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
        }`}
      >
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute top-[38px] left-0 w-[180px] border rounded-[10px]
                         shadow-xl py-1 z-50
                         ${isDark ? 'bg-[#1A1F2B] border-[#252E3F]' : 'bg-white border-gray-200'}`}>
          {items.map(({ path, label: itemLabel }) => (
            <button
              key={path}
              onClick={() => { navigate(path); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                active(path)
                  ? isDark ? 'bg-[#1E2535] text-[#F0F4F8] font-semibold'
                           : 'bg-[#F3F4F6] text-[#111827] font-semibold'
                  : isDark ? 'text-[#94A3B8] hover:bg-[#1E2535] hover:text-[#F0F4F8]'
                           : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]'
              }`}
            >
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── WorkspaceSwitcher (platform admin only) ──────────────────────────────
function WorkspaceSwitcher({ user, isDark }) {
  const { impersonation, startImpersonation, exitImpersonation } = useAuth();
  const [open,    setOpen]    = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Auto-expire stale impersonation tokens
  useEffect(() => {
    if (impersonation?.expiresAt && new Date(impersonation.expiresAt) <= new Date()) {
      exitImpersonation();
    }
  }, [impersonation, exitImpersonation]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = useCallback(async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (tenants.length === 0) {
      setLoading(true);
      try {
        const list = await api.admin.tenants.list();
        setTenants((list || []).filter(t => t.status !== 'DEPROVISIONED'));
      } catch (_) {}
      setLoading(false);
    }
  }, [open, tenants.length]);

  const handleSelect = useCallback(async (tenant) => {
    setOpen(false);
    if (impersonation?.tenantSlug === tenant.slug) return;
    try {
      const result = await api.admin.tenants.impersonate(tenant.slug);
      startImpersonation(result);
    } catch (e) {
      alert('Failed to switch workspace: ' + e.message);
    }
  }, [impersonation, startImpersonation]);

  const handleExit = useCallback((e) => {
    e.stopPropagation();
    exitImpersonation();
    setOpen(false);
  }, [exitImpersonation]);

  const label    = impersonation ? impersonation.tenantName : tenantLabel(user);
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={`flex items-center gap-[6px] px-[10px] py-[5px] rounded-[7px]
                    text-[12px] font-medium border transition-colors
                    ${
                      impersonation
                        ? isDark
                          ? 'bg-amber-900/30 border-amber-700/60 text-amber-300 hover:bg-amber-900/50'
                          : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                        : isDark
                          ? 'bg-[#1A1F2B] border-[#252E3F] text-[#94A3B8] hover:bg-[#1E2535]'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
      >
        <div className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center
                         text-[8px] font-bold text-white flex-shrink-0
                         ${
                           impersonation
                             ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                             : 'bg-gradient-to-br from-blue-500 to-purple-600'
                         }`}>
          {initials}
        </div>
        <span className="truncate max-w-[100px]">{label}</span>
        <ChevronDown size={10} className={`transition-transform flex-shrink-0 ${
          isDark ? 'text-[#64748B]' : 'text-gray-400'
        } ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute right-0 top-[38px] w-[220px] border rounded-[10px]
                         shadow-xl py-1 z-50
                         ${isDark ? 'bg-[#1A1F2B] border-[#252E3F]' : 'bg-white border-gray-200'}`}>

          {/* Platform admin option */}
          <button
            onClick={handleExit}
            className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors
                         ${
                           !impersonation
                             ? isDark ? 'bg-[#1E2535] text-[#F0F4F8] font-semibold'
                                      : 'bg-gray-50 text-gray-900 font-semibold'
                             : isDark ? 'text-[#94A3B8] hover:bg-[#1E2535] hover:text-[#F0F4F8]'
                                      : 'text-gray-600 hover:bg-gray-50'
                         }`}
          >
            <div className="w-[16px] h-[16px] rounded-[3px] bg-gradient-to-br from-blue-500
                            to-purple-600 flex items-center justify-center
                            text-[7px] font-bold text-white flex-shrink-0">
              PA
            </div>
            <span className="flex-1 text-left truncate">Platform Admin</span>
            {impersonation && <ArrowLeftRight size={11} className="opacity-50" />}
          </button>

          {/* Divider */}
          <div className={`mx-2 my-1 border-t ${isDark ? 'border-[#252E3F]' : 'border-gray-100'}`} />
          <p className={`px-3 pb-1 text-[10px] uppercase tracking-wider font-semibold
                         ${isDark ? 'text-[#475569]' : 'text-gray-400'}`}>
            Tenant Workspaces
          </p>

          {loading && (
            <p className={`px-3 py-2 text-[12px] ${isDark ? 'text-[#64748B]' : 'text-gray-400'}`}>
              Loading&hellip;
            </p>
          )}

          {!loading && tenants.map(t => (
            <button
              key={t.slug}
              onClick={() => handleSelect(t)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors
                           ${
                             impersonation?.tenantSlug === t.slug
                               ? isDark ? 'bg-[#1E2535] text-[#F0F4F8] font-semibold'
                                        : 'bg-amber-50 text-amber-800 font-semibold'
                               : isDark ? 'text-[#94A3B8] hover:bg-[#1E2535] hover:text-[#F0F4F8]'
                                        : 'text-gray-600 hover:bg-gray-50'
                           }`}
            >
              <div className="w-[16px] h-[16px] rounded-[3px] bg-gradient-to-br from-emerald-500
                              to-teal-600 flex items-center justify-center
                              text-[7px] font-bold text-white flex-shrink-0">
                {t.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 text-left truncate">{t.name}</span>
              {impersonation?.tenantSlug === t.slug && (
                <span className={`text-[10px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  active
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── nav structure ─────────────────────────────────────────────────────────
const FLAT_ITEMS = [
  { path: '/brief',   label: 'Brief' },
  { path: '/chat',    label: 'Investigations' },
  { path: '/agents',  label: 'Agents' },
  { path: '/reports', label: 'Reports' },
];

const CONFIGURE_ITEMS = [
  { path: '/connections',  label: 'Connections' },
  { path: '/templates',    label: 'Templates' },
  { path: '/automations',  label: 'Automations' },
  { path: '/graph',        label: 'Knowledge Graph' },
  { path: '/semantic',     label: 'Semantic Layer' },
  { path: '/memory',       label: 'AI Memory' },
];

function buildAdminItems(isAdmin) {
  if (!isAdmin) return [];
  return [
    { path: '/users',      label: 'Team' },
    { path: '/usage',      label: 'Usage' },
    { path: '/governance', label: 'Governance' },
    { path: '/settings',   label: 'Settings' },
  ];
}

// ── component ─────────────────────────────────────────────────────────────
export default function Layout({ children, currentPath }) {
  const { user, logout, impersonation, exitImpersonation } = useAuth();
  const { isDark } = useTheme();
  const tenant = useTenant();
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isPlatformAdmin = isAdmin && (user?.tenant_schema === 'public' || !user?.tenant_schema);
  const adminItems = buildAdminItems(isAdmin);

  const active = (path) => {
    if (path === '/chat' && (currentPath === '/' || currentPath === '/chat')) return true;
    if (currentPath === path || currentPath.startsWith(path + '?')) return true;
    if (currentPath.startsWith(path + '/')) return true;
    return false;
  };

  // ── Shell Investigation Composer — the application-level launch point ─────────
  // The same InvestigationComposer used inside the workspace. Typing here starts a NEW
  // investigation and hands off to the workspace via the existing prefill plumbing.
  const [shellQuery, setShellQuery] = useState('');
  const shellComposerRef = useRef(null);
  const showShellComposer = !currentPath.startsWith('/chat');

  const launchFromShell = () => {
    const q = shellQuery.trim();
    if (!q) return;
    localStorage.setItem('zevra_chat_prefill', q); // Chat auto-fires it as a new investigation
    setShellQuery('');
    navigate('/chat');
  };

  // ⌘K / Ctrl+K focuses the shell composer (or opens the workspace if it isn't shown).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (shellComposerRef.current) shellComposerRef.current.focus();
        else navigate('/chat');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex flex-col h-screen">

      {/* ── Impersonation banner ────────────────────────────────────── */}
      {impersonation && (
        <div className="shrink-0 flex items-center justify-between px-4 py-1.5
                        bg-amber-500 text-white text-[12px] font-medium">
          <span>
            🔍 Viewing as <strong>{impersonation.tenantName}</strong>
            &nbsp;&mdash; changes affect this tenant’s data
          </span>
          <button
            onClick={exitImpersonation}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600
                       hover:bg-amber-700 transition-colors text-[11px]"
          >
            <X size={11} /> Exit
          </button>
        </div>
      )}

      {/* ── Top navigation bar (Row 1) ──────────────────────────── */}
      <header className={`h-[52px] shrink-0 flex items-center px-6 gap-4 z-50
                          backdrop-blur-md border-b transition-colors duration-200
                          ${isDark
                            ? 'bg-[#13171F]/90 border-[#252E3F]/80'
                            : 'bg-white/75 border-gray-200/70'}`}>

        {/* Product identity — iconic Zevra. The tenant is the active workspace (right-side selector). */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 shrink-0 group"
          title="Zevra — Enterprise Intelligence"
        >
          <ZevraLogo size={30} style={{ borderRadius: '8px' }} />
          <span className={`text-[17px] font-bold tracking-[-0.01em]
                            ${isDark ? 'text-[#F0F4F8]' : 'text-[#111827]'}`}>
            Zevra
          </span>
        </button>

        {/* Nav items */}
        <nav className="flex items-center gap-0.5 flex-1">
          {/* Flat primary items */}
          {FLAT_ITEMS.map(({ path, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`px-[11px] py-[6px] rounded-[7px] text-[13px] font-medium
                          transition-all whitespace-nowrap ${
                active(path)
                  ? isDark ? 'bg-[#1E2535] text-[#F0F4F8] font-semibold'
                           : 'bg-[#F3F4F6] text-[#111827] font-semibold'
                  : isDark ? 'text-[#94A3B8] hover:bg-[#1E2535] hover:text-[#F0F4F8]'
                           : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Configure dropdown */}
          <NavDropdown label="Configure" items={CONFIGURE_ITEMS} active={active} isDark={isDark} />

          {/* Admin dropdown */}
          {isAdmin && adminItems.length > 0 && (
            <NavDropdown label="Admin" items={adminItems} active={active} isDark={isDark} />
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Alert bell */}
          <AlertBell />

          {/* Workspace badge — real switcher for platform admins, tenant-aware badge for customers.
              Two lines: the workspace (business unit / region) over the environment. */}
          {isPlatformAdmin
            ? <WorkspaceSwitcher user={user} isDark={isDark} />
            : (() => {
                const env = envMeta(tenant.environment, isDark);
                const region = tenant.workspaceName || tenant.businessUnit;
                return (
                  <div className={`flex items-center gap-[7px] px-[10px] py-[4px] rounded-[7px] border
                                  ${isDark
                                    ? 'bg-[#1A1F2B] border-[#252E3F]'
                                    : 'bg-white border-gray-200'}`}>
                    <OrgMark tenant={tenant} size={20} />
                    <div className="flex flex-col items-start leading-[1.1]">
                      <span className={`text-[12px] font-semibold truncate max-w-[150px]
                                        ${isDark ? 'text-[#E2E8F0]' : 'text-gray-800'}`}>
                        {tenant.tenantName}
                      </span>
                      <span className="flex items-center gap-[5px] text-[10px] font-medium">
                        {region && (
                          <>
                            <span className={isDark ? 'text-[#64748B]' : 'text-gray-500'}>{region}</span>
                            <span className={isDark ? 'text-[#3B4658]' : 'text-gray-300'}>•</span>
                          </>
                        )}
                        <span className={`inline-flex items-center gap-[5px] ${env.text}`}>
                          <span className={`w-[5px] h-[5px] rounded-full ${env.dot}`} />
                          {tenant.environment}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })()
          }

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
              <div className={`absolute right-0 top-[38px] w-[180px] border
                               rounded-[12px] shadow-xl py-1.5 z-50 transition-colors
                               ${isDark
                                 ? 'bg-[#1A1F2B] border-[#252E3F]'
                                 : 'bg-white border-gray-200'}`}>
                <div className={`px-3 py-2 border-b mb-1
                                 ${isDark ? 'border-[#252E3F]' : 'border-gray-100'}`}>
                  <p className={`text-[12px] font-semibold truncate
                                 ${isDark ? 'text-[#F0F4F8]' : 'text-gray-900'}`}>
                    {user?.display_name || user?.email}
                  </p>
                  <p className={`text-[11px] ${isDark ? 'text-[#64748B]' : 'text-gray-400'}`}>
                    {user?.role}
                  </p>
                </div>
                {isPlatformAdmin && (
                  <button
                    onClick={() => { navigate('/tenants'); setProfileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[13px]
                               transition-colors
                               ${isDark
                                 ? 'text-[#94A3B8] hover:bg-[#1E2535]'
                                 : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Building2 size={13} />
                    Tenant management
                  </button>
                )}
                <button
                  onClick={logout}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[13px]
                             transition-colors
                             ${isDark
                               ? 'text-red-400 hover:bg-[#2A1010]'
                               : 'text-red-500 hover:bg-red-50'}`}
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Shell Investigation Composer (Row 2) — the application-level launch point.
           The shell owns initiation: the SAME InvestigationComposer used in the workspace,
           available on every page EXCEPT the Investigations workspace (/chat), which owns
           its own composer. ⌘K focuses it. */}
      {showShellComposer && (
        <div className="shrink-0 border-b border-z-border bg-z-bg px-6 py-2.5">
          <div className="mx-auto max-w-[940px]">
            <InvestigationComposer
              inputRef={shellComposerRef}
              value={shellQuery}
              onChange={setShellQuery}
              onSubmit={launchFromShell}
              placeholder="Investigate anything about your business…"
              disabled={!shellQuery.trim()}
              align="center"
            />
          </div>
        </div>
      )}

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-hidden bg-transparent">
        {children}
      </main>

    </div>
  );
}
