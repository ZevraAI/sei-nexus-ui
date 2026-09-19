import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { ComposerSurface } from '../ds/intelligence';
import SlashCommandMenu from './SlashCommandMenu.jsx';
import { matchSlashCommands, slashQueryFor } from '../lib/slashCommands.js';

/**
 * InvestigationComposer — the single command composer used everywhere Zevra starts
 * or continues an investigation (Home Search / shell composer, the landing composer,
 * and the Full Chat follow-up composer). It is the same `ComposerSurface` in every
 * place so the intelligence experience feels identical; only the submit behavior
 * differs (the consumer owns it).
 *
 * Presentational + controlled: the consumer owns `value`, submit, and (optionally)
 * attachment logic. Attachments are opt-in via `allowAttachments` (Home launch does
 * not carry attachments yet — a later story).
 *
 * Slash-command launcher: typing "/" surfaces a filtered, keyboard-navigable dropdown
 * from the global registry (see lib/slashCommands.js). This is the one place the
 * launcher lives — every composer gets it for free, so Home Search and Full Chat stay
 * in sync by construction rather than by two separate implementations. `onSlashCommand`
 * fires for a selected 'modal' command (e.g. /TeachZevra); the consumer decides what
 * "launch" means on its surface. 'insert' commands (e.g. /knowledge) are handled here:
 * they just fill in "<command> " and leave focus in place for the user's own text.
 */
export default function InvestigationComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Investigate anything about your business…',
  autoFocus = false,
  disabled = false,
  onFocus,
  onBlur,
  onPaste,
  allowAttachments = false,
  onAttachClick,
  attachmentBusy = false,
  align = 'end',
  compact = false,   // slim, single-line bar composer (the shell)
  inputRef,
  className,
  enableSlashCommands = true,
  onSlashCommand,
}) {
  const ownInputRef = useRef(null);
  const textareaRef = inputRef || ownInputRef;

  const [menuIndex, setMenuIndex] = useState(0);
  // Escape dismisses the launcher for the *current* command token without touching what
  // was typed; typing further (a different token) implicitly un-dismisses it.
  const [dismissedFor, setDismissedFor] = useState(null);
  const slashQuery = enableSlashCommands ? slashQueryFor(value) : null;
  const slashMatches = slashQuery !== null ? matchSlashCommands(slashQuery) : [];
  const menuOpen = slashMatches.length > 0 && slashQuery !== dismissedFor;

  // Keep the highlighted row in range as the filtered list shrinks while typing.
  useEffect(() => {
    if (menuIndex >= slashMatches.length) setMenuIndex(0);
  }, [slashMatches.length, menuIndex]);

  const selectCommand = (cmd) => {
    if (cmd.action === 'modal') {
      onChange('');
      onSlashCommand?.(cmd);
    } else {
      onChange(`${cmd.command} `);
      textareaRef.current?.focus();
    }
    setMenuIndex(0);
  };

  const submit = (e) => {
    e?.preventDefault?.();
    onSubmit?.();
  };

  return (
    <form onSubmit={submit} className={`relative ${className || ''}`}>
      <ComposerSurface align={align} size={compact ? 'sm' : 'md'}>
        {allowAttachments && (
          <button
            type="button"
            onClick={onAttachClick}
            disabled={attachmentBusy}
            title="Attach a file or paste an image (PDF, Excel, CSV, image, text — up to 20 MB)"
            className="mb-1 flex-shrink-0 text-z-text-3 transition-colors hover:text-z-primary disabled:opacity-40"
          >
            <Paperclip size={16} />
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (menuOpen) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMenuIndex((i) => (i + 1) % slashMatches.length);
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMenuIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
                return;
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectCommand(slashMatches[menuIndex]);
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                // Escape dismisses the launcher only — it does not clear what was typed.
                setDismissedFor(slashQuery);
                return;
              }
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus={autoFocus}
          placeholder={placeholder}
          rows={1}
          role={menuOpen ? 'combobox' : undefined}
          aria-expanded={menuOpen}
          aria-haspopup={menuOpen ? 'listbox' : undefined}
          className={`max-h-32 flex-1 resize-none overflow-y-auto bg-transparent text-z-text outline-none placeholder:text-z-text-3 ${compact ? 'text-[14px]' : 'text-[16px]'}`}
          style={{ lineHeight: compact ? '1.4' : '1.6' }}
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label="Send"
          className={`grid flex-none place-items-center rounded-z-md bg-z-primary text-z-on-accent shadow-z-1 transition-all hover:bg-z-primary-hover disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'h-7 w-7' : 'mb-0.5 h-9 w-9'}`}
        >
          <Send size={compact ? 13 : 15} />
        </button>
      </ComposerSurface>

      {menuOpen && (
        <SlashCommandMenu
          commands={slashMatches}
          activeIndex={menuIndex}
          onSelect={selectCommand}
          onHoverIndex={setMenuIndex}
          // The slim shell composer sits at the very top of the page — there's no room to
          // open upward there, so it drops below instead; every other composer opens above.
          placement={compact ? 'bottom' : 'top'}
        />
      )}
    </form>
  );
}
