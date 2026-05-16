import { ShieldCheck } from 'lucide-react';
import type { NavItem } from '../../types';
import { cn } from '../../utils/cn';

function HexLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14 1.7L26 8.5V21.5L14 28.3L2 21.5V8.5L14 1.7Z"
        fill="currentColor"
      />
      <path
        d="M14 7.1L21.3 11.2V18.8L14 22.9L6.7 18.8V11.2L14 7.1Z"
        fill="white"
      />
    </svg>
  );
}

interface SidebarProps {
  navItems: NavItem[];
  activeId: string;
  onNavigate?: (id: string) => void;
}

export function Sidebar({ navItems, activeId, onNavigate }: SidebarProps) {
  return (
    <aside
      className="flex flex-col flex-none w-[226px] h-full bg-sidebar-bg border-r border-line"
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-center h-14 px-4 border-b border-line flex-shrink-0">
        <HexLogo className="w-7 h-7 text-accent" />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2" aria-label="Sidebar navigation">
        <ul role="list" className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;

            return (
              <li key={item.id} className="relative">
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute left-0 inset-y-1.5 w-[2px] rounded-r-full bg-accent-line"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 w-full pl-4 pr-3 py-2 text-sm rounded-xs transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1',
                    isActive
                      ? 'bg-accent-soft text-foreground font-medium'
                      : 'text-muted-fg hover:bg-item-hover hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0',
                      isActive ? 'text-accent' : 'text-dim-fg'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-shrink-0 px-4 py-3 border-t border-line">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-ok flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">SOC 2 Type II</p>
            <div className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-ok flex-shrink-0"
              />
              <p className="text-2xs text-dim-fg truncate">Compliant</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
