import { Send, Paperclip } from 'lucide-react';
import { ComposerSurface } from '../ds/intelligence';

/**
 * InvestigationComposer — the single command composer used everywhere Zevra starts
 * or continues an investigation (Home launchpad + Investigations workspace). It is
 * the same `ComposerSurface` in both places so the intelligence experience feels
 * identical; only the submit behavior differs (the consumer owns it).
 *
 * Presentational + controlled: the consumer owns `value`, submit, and (optionally)
 * attachment logic. Attachments are opt-in via `allowAttachments` (Home launch does
 * not carry attachments yet — a later story).
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
}) {
  const submit = (e) => {
    e?.preventDefault?.();
    onSubmit?.();
  };

  return (
    <form onSubmit={submit} className={className}>
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
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
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
    </form>
  );
}
