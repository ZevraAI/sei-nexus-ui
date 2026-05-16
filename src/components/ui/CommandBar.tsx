import { useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CommandBarProps {
  placeholder?: string;
  className?: string;
}

export function CommandBar({
  placeholder = 'Ask anything or run a command...',
  className,
}: CommandBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('relative flex items-center', className)}
      role="search"
      aria-label="Investigation command bar"
    >
      <div
        className={cn(
          'flex-1 flex items-center h-[62px] border border-line rounded-[8px] bg-surface shadow-sm',
          'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20 transition-colors'
        )}
      >
        <Sparkles
          className="flex-shrink-0 ml-5 w-4 h-4 text-off-fg"
          aria-hidden="true"
        />
        <label htmlFor="cmd-query" className="sr-only">
          Ask anything or run a command
        </label>
        <input
          id="cmd-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'flex-1 h-full px-3 text-sm text-foreground placeholder:text-off-fg',
            'pr-32',
            'bg-transparent border-0 outline-none focus:outline-none'
          )}
        />
      </div>

      <button
        type="submit"
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 h-10 px-4 flex-shrink-0',
          'text-[14px] font-semibold text-surface bg-accent rounded-[6px]',
          'hover:bg-accent-hover active:bg-accent-hover',
          'transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1'
        )}
      >
        <Search className="w-4 h-4" aria-hidden="true" />
        Search
      </button>
    </form>
  );
}
