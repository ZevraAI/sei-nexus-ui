/** Zevra Design Language — Theme layer.
 *  Reuses the app's existing ThemeProvider so legacy and new pages share ONE theme
 *  state (sets <html data-theme>, persists to localStorage, no flash on load). */
// @ts-ignore — ThemeContext is authored in JSX (no local .d.ts); resolved by Vite at build.
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { IconButton } from './components/Button';

export { ThemeProvider, useTheme };

export interface ThemeToggleProps {
  className?: string;
}

/** Light/Dark toggle. Requires a ThemeProvider ancestor. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const ctx = useTheme() as { isDark: boolean; toggleTheme: () => void } | null;
  if (!ctx) return null;
  const { isDark, toggleTheme } = ctx;
  return (
    <IconButton
      label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggleTheme}
      className={className}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}
