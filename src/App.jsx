import React, { createContext, lazy, Suspense, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { api } from './api.js';
import { getImpersonation, saveImpersonation } from './api.js';
import { supabase } from './supabase.js';
import Layout from './components/Layout.jsx';
import { TenantProvider } from './context/TenantContext.jsx';
import HomePage from './pages/home/HomePage.tsx';
import PageSkeleton from './components/PageSkeleton.jsx';
import { ExperienceProvider } from './experience';
import { DerivedPulseSource } from './pulse/DerivedPulseSource';
import { EmptyPreviewResolver } from './preview/EmptyPreviewResolver';

// ─── Pages (code-split: each page loads on first visit, so the first paint stays light) ──
const loaders = {
  Login: () => import('./pages/Login.jsx'),
  SetNewPassword: () => import('./pages/SetNewPassword.jsx'),
  OnboardingWizard: () => import('./pages/OnboardingWizard.jsx'),
  Chat: () => import('./pages/Chat.jsx'),
  Memory: () => import('./pages/Memory.jsx'),
  Connections: () => import('./pages/Connections.jsx'),
  Domains: () => import('./pages/Domains.jsx'),
  EnterpriseMap: () => import('./pages/EnterpriseMap.jsx'),
  KnowledgeGraph: () => import('./pages/KnowledgeGraph.jsx'),
  TenantAdmin: () => import('./pages/TenantAdmin.jsx'),
  Reports: () => import('./pages/Reports.jsx'),
  Semantic: () => import('./pages/Semantic.jsx'),
  Agents: () => import('./pages/Agents.jsx'),
  Reasoning: () => import('./pages/Reasoning.jsx'),
  Temporal: () => import('./pages/Temporal.jsx'),
  KnowledgeGaps: () => import('./pages/KnowledgeGaps.jsx'),
  Instructions: () => import('./pages/Instructions.jsx'),
  Governance: () => import('./pages/Governance.jsx'),
  Settings: () => import('./pages/Settings.jsx'),
  Automations: () => import('./pages/Automations.jsx'),
  AutomationEditor: () => import('./pages/AutomationEditor.jsx'),
  AgentChat: () => import('./pages/AgentChat.jsx'),
  Users: () => import('./pages/Users.jsx'),
  Brief: () => import('./pages/Brief.jsx'),
  Usage: () => import('./pages/Usage.jsx'),
  Templates: () => import('./pages/Templates.jsx'),
  Guide: () => import('./pages/Guide.jsx'),
};
const { Login, SetNewPassword, OnboardingWizard, Chat, Memory, Connections, Domains, EnterpriseMap, KnowledgeGraph, TenantAdmin, Reports, Semantic, Agents, Reasoning, Temporal, KnowledgeGaps, Instructions, Governance, Settings, Automations, AutomationEditor, AgentChat, Users, Brief, Usage, Templates, Guide } = Object.fromEntries(
  Object.entries(loaders).map(([name, load]) => [name, lazy(load)])
);

// After sign-in, quietly fetch the remaining pages while the browser is idle so navigation is instant.
function prefetchPages() {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  idle(() => Object.values(loaders).forEach((load) => load().catch(() => {})));
}

// Runtime data boundaries (Rule 2 / Rule 5) — REAL sources in BOTH dev and production, so local
// development behaves exactly like production. No representative/mock data is ever injected.
const enterprisePulseSource = new DerivedPulseSource();
const enterprisePreviewResolver = new EmptyPreviewResolver();

// ─── Auth context ─────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── Simple hash router ───────────────────────────────────────────────────────
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.replace('#', '') || '/');
  useEffect(() => {
    const handler = () => setHash(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

export function navigate(path) {
  window.location.hash = path;
}

// ─── Route map ────────────────────────────────────────────────────────────────
const ROUTES = {
  '/':             <Chat />,
  '/chat':         <Chat />,
  '/memory':       <Memory />,
  '/connections':  <Connections />,
  '/domains':      <Domains />,
  '/enterprise':   <EnterpriseMap />,
  '/graph':        <KnowledgeGraph />,
  '/tenants':      <TenantAdmin />,
  '/semantic':     <Semantic />,
  '/agents':       <Agents />,
  '/reasoning':    <Reasoning />,
  '/temporal':     <Temporal />,
  '/reports':      <Reports />,
  '/gaps':         <KnowledgeGaps />,
  '/instructions': <Instructions />,
  '/governance':   <Governance />,
  '/settings':     <Settings />,
  '/automations':  <Automations />,
  '/users':        <Users />,
  '/brief':        <Brief />,
  '/usage':        <Usage />,
  '/templates':    <Templates />,
};

function normalizeAuth(payload) {
  if (!payload) return null;
  // Legacy: { token, user } format from old email/password login
  if (payload.user && payload.token) {
    localStorage.setItem('nexus_token', payload.token);
    return payload.user;
  }
  // Supabase: { user, supabaseSession } — extract just the user object
  if (payload.user && payload.supabaseSession) {
    return payload.user;
  }
  return payload;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const hash = useHash();

  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('nexus_user'));
      // Legacy: { token, user } format
      if (stored?.token && stored?.user) {
        localStorage.setItem('nexus_token', stored.token);
        localStorage.setItem('nexus_user', JSON.stringify(stored.user));
        return stored.user;
      }
      // Stale Supabase format: { user, supabaseSession } — fix and re-store
      if (stored?.user && stored?.supabaseSession) {
        localStorage.setItem('nexus_user', JSON.stringify(stored.user));
        return stored.user;
      }
      return stored;
    } catch {
      return null;
    }
  });

  const [checking,          setChecking]          = useState(true);
  // null = not yet checked, false = show wizard, true = skip wizard
  const [onboardingComplete, setOnboardingComplete] = useState(null);
  // First question to pre-fill in chat after onboarding
  const [firstQuestion,      setFirstQuestion]      = useState(null);
  // True while the user must set a new password (password recovery flow)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  // Active impersonation session (platform admin only)
  const [impersonation, setImpersonation] = useState(() => getImpersonation());

  const startImpersonation = useCallback((data) => {
    saveImpersonation(data);
    setImpersonation(data);
    // Hard refresh so all views/data reset to the new tenant immediately
    setTimeout(() => window.location.reload(), 0);
  }, []);

  const exitImpersonation = useCallback(() => {
    if (!impersonation) return;
    const token = impersonation.token;
    // Clear locally first — UI updates immediately
    saveImpersonation(null);
    setImpersonation(null);
    // Fire-and-forget server cleanup; token expires in 30 min regardless
    api.admin.tenants.exitImpersonation(token).catch(() => {});
    // Hard refresh so any tenant-scoped state and caches are cleared
    setTimeout(() => window.location.reload(), 0);
  }, [impersonation]);

  // ── Verify session on load ─────────────────────────────────────────────────
  useEffect(() => {
    if (supabase) {
      // If we already have a cached user, stop the spinner immediately so the
      // app renders without waiting for network. Session is then verified in
      // the background and the user is updated silently if needed.
      if (user) setChecking(false);

      supabase.auth.getSession()
        .then(async ({ data: { session } }) => {
          if (!session) {
            // Supabase session expired or missing — send to login
            setUser(null);
            localStorage.removeItem('nexus_user');
          } else {
            // Valid session — refresh user from backend silently
            try {
              const u = await api.auth.me();
              setUser(u);
              localStorage.setItem('nexus_user', JSON.stringify(u));
            } catch (e) {
              if (e?.status === 401 || e?.status === 403) {
                // Supabase considers the session valid but the backend rejected
                // it (expired, revoked, or no user profile). Sign out locally so
                // the dead session isn't restored on the next load — otherwise
                // every reload retries /auth/me and loops back here forever.
                setUser(null);
                localStorage.removeItem('nexus_user');
                localStorage.removeItem('nexus_token');
                try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
              }
              // Otherwise the backend is temporarily unreachable — keep the
              // cached user so the app stays usable; don't sign the user out
            }
          }
          setChecking(false);
        })
        .catch(() => {
          // Supabase itself unreachable — keep cached user if any
          setChecking(false);
        });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          // INITIAL_SESSION fires on every page load for an existing session.
          // getSession() already handled it above — skip to avoid a duplicate
          // api.auth.me() call that could race and leave stale state.
          if (event === 'INITIAL_SESSION') return;

          if (event === 'PASSWORD_RECOVERY') {
            // User arrived via a password-reset link — stop here and show the
            // "set new password" screen.  Do NOT sign them into the app yet.
            setNeedsPasswordReset(true);
            setChecking(false);
            return;
          }

          if (event === 'SIGNED_IN' && session) {
            // If we were in recovery mode and the user just updated their
            // password, Supabase fires SIGNED_IN — clear the recovery flag
            // and complete the normal sign-in flow.
            setNeedsPasswordReset(false);
            try {
              const u = await api.auth.me();
              setUser(u);
              localStorage.setItem('nexus_user', JSON.stringify(u));
            } catch (e) {
              if (e?.status === 401 || e?.status === 403) {
                // Backend rejected the fresh Supabase session — drop it so it
                // can't trigger a retry loop; Login.jsx surfaces the error.
                try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
              }
            }
          } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('nexus_user');
            localStorage.removeItem('nexus_token');
            setUser(null);
            setOnboardingComplete(null);
          }
        }
      );
      return () => subscription.unsubscribe();
    }

    // Legacy auth path (Supabase env vars not set)
    if (user && localStorage.getItem('nexus_token')) {
      setChecking(false);
      return;
    }
    if (!localStorage.getItem('nexus_token')) {
      localStorage.removeItem('nexus_user');
      setUser(null);
      setChecking(false);
      return;
    }
    api.auth.me()
      .then(u => { setUser(u); localStorage.setItem('nexus_user', JSON.stringify(u)); })
      .catch(e => {
        if (e?.status === 401 || e?.status === 403) {
          // Stale legacy token — drop it so it isn't retried on every load
          localStorage.removeItem('nexus_token');
          localStorage.removeItem('nexus_user');
          setUser(null);
        }
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => { if (user) prefetchPages(); }, [!!user]);

  // ── Check onboarding status once authenticated ─────────────────────────────
  useEffect(() => {
    if (!user) return;
    // Platform admins (ADMIN in the default/public workspace) manage tenants —
    // they never need to run the onboarding wizard themselves.
    const isPlatformAdmin = user.role === 'ADMIN' &&
      (!user.tenant_schema || user.tenant_schema === 'public');
    if (isPlatformAdmin) {
      setOnboardingComplete(true);
      return;
    }
    api.onboarding.status()
      .then(s => setOnboardingComplete(!!s.complete))
      .catch(() => setOnboardingComplete(true)); // fail open — don't block the app
  }, [user]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch (_) {}
    if (supabase) { try { await supabase.auth.signOut(); } catch (_) {} }
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token');
    setUser(null);
    setOnboardingComplete(null);
    navigate('/');
  }, []);

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (checking || (user && onboardingComplete === null)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-z-border border-t-z-primary" />
          <p className="text-z-caption text-z-text-3">Loading Zevra…</p>
        </div>
      </div>
    );
  }

  // ── Password recovery ───────────────────────────────────────────────────────
  if (needsPasswordReset) {
    return (
      <ThemeProvider>
        <Suspense fallback={<PageSkeleton />}>
          <SetNewPassword onComplete={() => setNeedsPasswordReset(false)} />
        </Suspense>
      </ThemeProvider>
    );
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <ThemeProvider>
        <Suspense fallback={<PageSkeleton />}>
          <Login onLogin={payload => {
            const nextUser = normalizeAuth(payload);
            setUser(nextUser);
            localStorage.setItem('nexus_user', JSON.stringify(nextUser));
          }} />
        </Suspense>
      </ThemeProvider>
    );
  }

  // ── Onboarding wizard (shown once, on first login) ─────────────────────────
  if (onboardingComplete === false) {
    return (
      <ThemeProvider>
        <AuthContext.Provider value={{ user, logout, impersonation, startImpersonation, exitImpersonation }}>
          <Suspense fallback={<PageSkeleton />}>
          <OnboardingWizard
            user={user}
            onComplete={(question) => {
              setOnboardingComplete(true);
              if (question) {
                setFirstQuestion(question);
              }
              navigate('/chat');
            }}
          />
          </Suspense>
        </AuthContext.Provider>
      </ThemeProvider>
    );
  }

  // ── Normal app ──────────────────────────────────────────────────────────────
  // Dynamic route: /automations/:id/edit
  const automationEditMatch = hash.match(/^\/automations\/([^/?]+)\/edit/);
  // Dynamic route: /agents/:id
  const agentChatMatch = hash.match(/^\/agents\/([^/?]+)$/);
  const page = automationEditMatch
    ? <AutomationEditor workflowId={automationEditMatch[1]} />
    : agentChatMatch
    ? <AgentChat agentId={agentChatMatch[1]} />
    : hash.split('?')[0] === '/guide'
    ? <Guide user={user} />
    : (ROUTES[hash] ?? ROUTES[hash.split('?')[0]] ?? <Chat />);

  return (
    <ThemeProvider>
      <ExperienceProvider pulseSource={enterprisePulseSource} previewResolver={enterprisePreviewResolver}>
        <AuthContext.Provider value={{ user, logout, impersonation, startImpersonation, exitImpersonation }}>
          <TenantProvider>
            <Layout currentPath={hash}>
              <Suspense fallback={<PageSkeleton />}>
              {hash === '/'
                ? <HomePage user={user} />
                : hash === '/chat'
                ? React.cloneElement(<Chat />, { prefillQuestion: firstQuestion,
                                                 onPrefillUsed: () => setFirstQuestion(null) })
                : page}
              </Suspense>
            </Layout>
          </TenantProvider>
        </AuthContext.Provider>
      </ExperienceProvider>
    </ThemeProvider>
  );
}
