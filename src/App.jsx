import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import Login from './pages/Login.jsx';
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
};

function normalizeAuth(payload) {
  if (!payload) return null;
  if (payload.user && payload.token) {
    localStorage.setItem('nexus_token', payload.token);
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
      if (stored?.token && stored?.user) {
        localStorage.setItem('nexus_token', stored.token);
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

  // ── Verify session on load ─────────────────────────────────────────────────
  useEffect(() => {
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
      .catch(() => {})
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
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token');
    setUser(null);
    setOnboardingComplete(null);
    navigate('/');
  }, []);

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (checking || (user && onboardingComplete === null)) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f0faf5]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading Zevra…</p>
        </div>
      </div>
    );
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <Login onLogin={payload => {
        const nextUser = normalizeAuth(payload);
        setUser(nextUser);
        localStorage.setItem('nexus_user', JSON.stringify(nextUser));
      }} />
    );
  }

  // ── Onboarding wizard (shown once, on first login) ─────────────────────────
  if (onboardingComplete === false) {
    return (
      <AuthContext.Provider value={{ user, logout }}>
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
    );
  }

  // ── Normal app ──────────────────────────────────────────────────────────────
  const page = ROUTES[hash] ?? ROUTES[hash.split('?')[0]] ?? <Chat />;

  return (
    <AuthContext.Provider value={{ user, logout }}>
      <Layout currentPath={hash}>
        {hash === '/chat' || hash === '/'
          ? React.cloneElement(<Chat />, { prefillQuestion: firstQuestion,
                                           onPrefillUsed: () => setFirstQuestion(null) })
          : page}
      </Layout>
    </AuthContext.Provider>
  );
}
