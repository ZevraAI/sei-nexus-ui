/**
 * SlashCommandMenu — the dropdown surfaced by the shared slash-command launcher
 * (InvestigationComposer). Purely presentational and controlled: the composer owns
 * matching against the registry, the active index, and what "select" means.
 */
export default function SlashCommandMenu({ commands, activeIndex, onSelect, onHoverIndex, placement = 'top' }) {
  if (!commands || commands.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Slash commands"
      className={`absolute left-0 z-20 w-full max-w-md overflow-hidden rounded-z-md border border-z-border bg-z-surface shadow-z-3 ${
        placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
      }`}
    >
      {commands.map((cmd, i) => (
        <button
          key={cmd.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          // onMouseDown (not onClick) fires before the textarea's blur, so selection
          // via click/tap works without the composer losing its slash-mode state first.
          onMouseDown={(e) => { e.preventDefault(); onSelect(cmd); }}
          onMouseEnter={() => onHoverIndex(i)}
          className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
            i === activeIndex ? 'bg-z-selected text-z-text' : 'text-z-text-2 hover:bg-z-hover'
          }`}
        >
          <span className="flex-none rounded-z-xs border border-z-border bg-z-card-2 px-1.5 py-0.5 font-z-mono text-[11px] text-z-text-3">
            {cmd.command}
          </span>
          <span className="min-w-0 flex-1 truncate text-z-caption">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
