import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { api } from './api.js';
import { getImpersonation, saveImpersonation } from './api.js';
import { supabase } from './supabase.js';
import Login from './pages/Login.jsx';
import SetNewPassword from './pages/SetNewPassword.jsx';
import OnboardingWizard from './pages/OnboardingWizard.jsx';
import Layout from './components/Layout.jsx';
import Chat from './pages/Chat.jsx';
import Memory from './pages/Memory.jsx';
import Connections from './pages/Connections.jsx';
import Domains from './pages/Domains.jsx';
import EnterpriseMap from './pages/EnterpriseMap.jsx';
import KnowledgeGraph from './pages/KnowledgeGraph.jsx';
import TenantAdmin from './pages/TenantAdmin.jsx';
import Reports from './pages/Reports.jsx';
import Semantic from './pages/Semantic.jsx';
import Agents from './pages/Agents.jsx';
import Reasoning from './pages/Reasoning.jsx';
import Temporal from './pages/Temporal.jsx';
import KnowledgeGaps from './pages/KnowledgeGaps.jsx';
import Governance from './pages/Governance.jsx';
import Settings   from './pages/Settings.jsx';
import Automations from './pages/Automations.jsx';
import AutomationEditor from './pages/AutomationEditor.jsx';
import AgentChat from './pages/AgentChat.jsx';
import Users from './pages/Users.jsx';
import Brief from './pages/Brief.jsx';
import Usage from './pages/Usage.jsx';
import Templates from './pages/Templates.jsx';
import HomePage from './pages/home/HomePage.tsx';
import { ExperienceProvider, MockPulseSource } from './experience';

// Enterprise Pulse data boundary (Rule 2 / Rule 5). Representative for now; a real governed
// PulseSource is injected here in a later, isolated step — the runtime is unchanged.
const enterprisePulseSource = new MockPulseSource({
  coverage: 98.6, status: 'watching', reasoningLoad: 3, activityRate: 1, confidenceTrend: 'up',
});

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
          <div className="w-10 h-10 border-[3px] border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading Zevra…</p>
        </div>
      </div>
    );
  }

  // ── Password recovery ───────────────────────────────────────────────────────
  if (needsPasswordReset) {
    return (
      <ThemeProvider>
        <SetNewPassword onComplete={() => setNeedsPasswordReset(false)} />
      </ThemeProvider>
    );
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <ThemeProvider>
        <Login onLogin={payload => {
          const nextUser = normalizeAuth(payload);
          setUser(nextUser);
          localStorage.setItem('nexus_user', JSON.stringify(nextUser));
        }} />
      </ThemeProvider>
    );
  }

  // ── Onboarding wizard (shown once, on first login) ─────────────────────────
  if (onboardingComplete === false) {
    return (
      <ThemeProvider>
        <AuthContext.Provider value={{ user, logout, impersonation, startImpersonation, exitImpersonation }}>
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
    : (ROUTES[hash] ?? ROUTES[hash.split('?')[0]] ?? <Chat />);

  return (
    <ThemeProvider>
      <ExperienceProvider pulseSource={enterprisePulseSource}>
        <AuthContext.Provider value={{ user, logout, impersonation, startImpersonation, exitImpersonation }}>
          <Layout currentPath={hash}>
            {hash === '/'
              ? <HomePage user={user} />
              : hash === '/chat'
              ? React.cloneElement(<Chat />, { prefillQuestion: firstQuestion,
                                               onPrefillUsed: () => setFirstQuestion(null) })
              : page}
          </Layout>
        </AuthContext.Provider>
      </ExperienceProvider>
    </ThemeProvider>
  );
}
