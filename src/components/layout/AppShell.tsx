import type { ReactNode } from 'react';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { navItems, activeNavId } from '../../data/navigation';

interface AppShellProps {
  children: ReactNode;
  rightPanel?: ReactNode;
}

export function AppShell({ children, rightPanel }: AppShellProps) {
  const [currentNavId, setCurrentNavId] = useState(activeNavId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        navItems={navItems}
        activeId={currentNavId}
        onNavigate={setCurrentNavId}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader
          workspaceName="Global Operations"
          environment="PROD"
          notificationCount={3}
          userInitials="JD"
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main
            className="flex-1 overflow-y-auto scrollbar-thin bg-background"
            id="main-content"
            tabIndex={-1}
          >
            {children}
          </main>

          {rightPanel && (
            <aside
              className="hidden xl:block flex-none w-[374px] border-l border-line bg-surface overflow-y-auto scrollbar-thin"
              aria-label="Investigation context"
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
