import { useState } from 'react';
import {
  Sparkles, Bell, HelpCircle, Sun, Moon, ChevronDown,
  Globe, Search, Command,
} from 'lucide-react';
import { MockupSidePanel } from './MockupSidePanel';

interface Props {
  children: React.ReactNode;
}

export function MockupShell({ children }: Props) {
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    setDark(next);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-app)' }}>

      {/* ── Header — always dark ──────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-5 flex-shrink-0 z-10"
        style={{
          height: '58px',
          background: '#0D1117',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0 mr-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #34d3a0 0%, #149a72 100%)',
              boxShadow: '0 0 14px rgba(52,211,160,0.45)',
            }}
          >
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">Zevra</div>
            <div className="text-[10px] leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Enterprise AI
            </div>
          </div>
        </div>

        {/* Workspace selector */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.80)',
          }}
        >
          <Globe size={13} style={{ color: '#34d3a0' }} />
          Investigation Workspace
          <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </button>

        {/* Global search */}
        <div
          className="flex-1 flex items-center gap-2.5 px-3.5 rounded-lg h-9 mx-2"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <Search size={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span className="flex-1 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Ask Zevra anything…
          </span>
          <kbd
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {/* Bell */}
          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
            <Bell size={16} style={{ color: 'rgba(255,255,255,0.65)' }} />
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: '#E53E3E' }}
            >
              3
            </span>
          </button>

          {/* Help */}
          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
            <HelpCircle size={16} style={{ color: 'rgba(255,255,255,0.65)' }} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            {dark
              ? <Sun size={16} style={{ color: 'rgba(255,255,255,0.65)' }} />
              : <Moon size={16} style={{ color: 'rgba(255,255,255,0.65)' }} />
            }
          </button>

          {/* Avatar */}
          <button
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-white/10 transition-colors ml-1"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #34d3a0 0%, #149a72 100%)' }}
            >
              M
            </div>
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>
              Murali
            </span>
            <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Main content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'var(--bg-app)' }}>
          {children}
        </main>

        {/* Right panel */}
        <aside
          className="hidden lg:flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin"
          style={{
            width: '300px',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <MockupSidePanel />
        </aside>
      </div>
    </div>
  );
}
