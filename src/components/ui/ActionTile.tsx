import { ArrowRight } from 'lucide-react';
import type { ActionTile as ActionTileType } from '../../types';
import { cn } from '../../utils/cn';

interface ActionTileProps {
  tile: ActionTileType;
  className?: string;
}

export function ActionTile({ tile, className }: ActionTileProps) {
  const Icon = tile.icon;

  return (
    <a
      href={tile.href}
      className={cn(
        'group relative flex flex-col min-h-[220px] p-6 rounded-[8px]',
        'bg-surface border border-line',
        'hover:border-line-strong hover:bg-surface-muted',
        'transition-colors shadow-sm',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        className
      )}
      aria-label={tile.title}
    >
      <div
        className={cn(
          'flex items-center justify-center w-[52px] h-[52px] rounded-[8px] mb-5',
          'bg-accent-soft'
        )}
      >
        <Icon className="w-8 h-8 text-accent stroke-[1.8]" aria-hidden="true" />
      </div>

      <p className="text-[18px] font-semibold text-foreground leading-snug mb-2">
        {tile.title}
      </p>
      <p className="text-[16px] text-muted-fg leading-[1.55] pr-8 max-w-[220px]">
        {tile.description}
      </p>

      <ArrowRight
        className="absolute bottom-7 right-7 w-5 h-5 text-accent group-hover:translate-x-0.5 transition-transform"
        aria-hidden="true"
      />
    </a>
  );
}
