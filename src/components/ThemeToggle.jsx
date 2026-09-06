import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { Moon, Sun } from 'lucide-react';

// Extracted from Layout.jsx so it can be reused by pre-auth pages (Login) without
// pulling in Layout.jsx's authenticated-app dependency graph (useAuth/navigate from
// App.jsx, TenantContext, NotificationPanel, InvestigationComposer, etc.) — importing
// Layout.jsx directly from Login.jsx would also create a circular import, since
// Layout.jsx depends on App.jsx, which renders Login.jsx.
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
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

export default ThemeToggle;
