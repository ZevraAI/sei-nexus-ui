import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  // How a message is sent. 'enter' (follow-ups): Enter sends while the text is a single line; once
  // it has a second line Enter adds a line. 'mod-enter' (the brief editor): Enter always adds a
  // line. In both, Ctrl/Cmd+Enter sends and Shift+Enter adds a line.
  submitKey = 'enter',
  minRows = 1,
  menuPlacement = 'top',   // where the slash-command menu opens relative to the box
  inputRef,
  className,
  enableSlashCommands = true,
  onSlashCommand,
}) {
  const ownInputRef = useRef(null);
  const textareaRef = inputRef || ownInputRef;

  // Grow with the text, up to a cap, so a multi-line investigation is fully visible while typing.
  // (Enter sends; Shift+Enter adds a line.)
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, textareaRef]);

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
      <ComposerSurface align={align} size="md">
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
            if (e.key === 'Enter') {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                submit();
                return;
              }
              if (e.shiftKey) return;   // a new line
              if (submitKey === 'enter' && !value.includes('\n')) {
                e.preventDefault();
                submit();
              }
            }
          }}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus={autoFocus}
          placeholder={placeholder}
          rows={minRows}
          role={menuOpen ? 'combobox' : undefined}
          aria-expanded={menuOpen}
          aria-haspopup={menuOpen ? 'listbox' : undefined}
          className="max-h-[40vh] flex-1 resize-none overflow-y-auto bg-transparent text-z-lead text-z-text outline-none placeholder:text-z-text-3"
          style={{ lineHeight: '1.6' }}
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label="Send"
          title={submitKey === 'mod-enter' ? 'Investigate (Ctrl+Enter)' : undefined}
          className="mb-0.5 grid h-9 w-9 flex-none place-items-center rounded-z-md bg-z-primary text-z-on-accent shadow-z-1 transition-all hover:bg-z-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </ComposerSurface>

      {submitKey === 'mod-enter' && (
        <p className="mt-1.5 text-z-caption text-z-text-3">Enter adds a line · Ctrl+Enter (\u2318+Enter on Mac) to investigate</p>
      )}

      {menuOpen && (
        <SlashCommandMenu
          commands={slashMatches}
          activeIndex={menuIndex}
          onSelect={selectCommand}
          onHoverIndex={setMenuIndex}
          placement={menuPlacement}
        />
      )}
    </form>
  );
}
