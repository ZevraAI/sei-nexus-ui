/** Zevra Design Language — Spine. The vertical thread of an assistant's reasoning.
 *  Rests as a faint emerald hairline; while `live`, it lights and a glint travels down
 *  it (reduced-motion stills the glint). The same identity as the hero PulseSpine and the
 *  Card accent, expressed as a message thread. The parent must be `relative`.
 *  Reusable across AI surfaces (Investigations/Chat, Reasoning, Findings). */
import { cn } from '../../utils/cn';

export function Spine({ live = false, className }: { live?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[2px]', className)}>
      <span
        className={cn(
          'absolute inset-0 rounded-full',
          live
            ? 'bg-[linear-gradient(180deg,transparent,var(--z-primary)_6%,var(--z-primary)_94%,transparent)] shadow-[0_0_14px_var(--z-spine-glow)]'
            : 'bg-[linear-gradient(180deg,transparent,var(--z-spine)_8%,var(--z-spine)_92%,transparent)]',
        )}
      />
      {live && (
        <span className="absolute left-[-1.5px] h-[6px] w-[5px] rounded-full bg-z-primary shadow-[0_0_12px_var(--z-spine-glow)] animate-z-spine-glint-y motion-reduce:hidden" />
      )}
    </span>
  );
}
