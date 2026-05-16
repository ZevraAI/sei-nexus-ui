import { Search, Bell, Plus, ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TopHeaderProps {
  workspaceName: string;
  environment: string;
  notificationCount?: number;
  userInitials?: string;
  onNewInvestigation?: () => void;
}

export function TopHeader({
  workspaceName,
  environment,
  notificationCount = 0,
  userInitials = 'JD',
  onNewInvestigation,
}: TopHeaderProps) {
  const envLabel = environment.toLowerCase() === 'production' ? 'PROD' : environment;
  const isProd = envLabel === 'PROD';

  return (
    <header
      className="flex items-center h-20 px-7 gap-5 bg-surface border-b border-line flex-shrink-0"
      aria-label="Application header"
    >
      <button
        type="button"
        className={cn(
          'flex items-center gap-3 flex-shrink-0 h-10 px-0 rounded-xs',
          'text-[16px] font-semibold text-foreground',
          'hover:text-accent transition-colors',
          'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1'
        )}
      >
        {workspaceName}
        <ChevronDown className="w-4 h-4 text-dim-fg" aria-hidden="true" />
      </button>

      <div className="h-8 w-px bg-line" aria-hidden="true" />

      <span
        className={cn(
          'flex items-center gap-2 flex-shrink-0 h-9 px-4 text-[14px] font-medium rounded-[7px] border',
          isProd
            ? 'bg-surface border-line text-[#31363D]'
            : 'bg-surface-muted border-line text-dim-fg'
        )}
        aria-label={`Environment: ${envLabel}`}
      >
        <span
          aria-hidden="true"
          className={cn('w-2 h-2 rounded-full', isProd ? 'bg-ok' : 'bg-dim-fg')}
        />
        {envLabel}
      </span>

      <div className="flex-1 max-w-[536px] mx-auto">
        <label htmlFor="global-search" className="sr-only">
          Search investigations, entities, cases
        </label>
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#68717D] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="global-search"
            type="search"
            placeholder="Search investigations, entities, cases..."
            className={cn(
              'w-full h-10 pl-12 pr-16 text-[15px] rounded-[7px]',
              'bg-surface border border-line text-foreground shadow-sm',
              'placeholder:text-[#747B85]',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20',
              'transition-colors'
            )}
          />
          <kbd
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none',
              'inline-flex items-center px-2 py-0.5',
              'text-[12px] text-off-fg font-medium',
              'bg-surface border border-line rounded-[5px]'
            )}
            aria-hidden="true"
          >
            Ctrl K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
        <button
          type="button"
          aria-label={`${notificationCount} notifications`}
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-full',
            'text-[#3D444F] hover:bg-item-hover hover:text-foreground',
            'transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1'
          )}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {notificationCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-surface text-[11px] font-semibold flex items-center justify-center"
            >
              {notificationCount}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label="Help"
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-full',
            'text-[#3D444F] hover:bg-item-hover hover:text-foreground',
            'transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1'
          )}
        >
          <HelpCircle className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="User menu"
          className={cn(
            'flex items-center gap-2 h-10 px-1 rounded-xs',
            'hover:bg-item-hover transition-colors',
            'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1'
          )}
        >
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-[#EFEFEE] flex items-center justify-center flex-shrink-0"
          >
            <span className="text-[14px] font-semibold text-[#343941]">{userInitials}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-dim-fg" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onNewInvestigation}
          className={cn(
            'flex items-center gap-2 h-11 px-5 ml-1',
            'text-[15px] font-semibold text-surface bg-accent',
            'rounded-[6px] shadow-md',
            'hover:bg-accent-hover active:bg-accent-hover',
            'transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
          )}
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          New investigation
        </button>
      </div>
    </header>
  );
}
