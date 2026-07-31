/** Zevra Intelligence Experience — IntelligencePage. The page frame for every
 *  Intelligence Experience: scroll canvas + emerald atmosphere + the canonical
 *  ReadingColumn. Composes the base page-frame semantics (the host Layout <main>
 *  is overflow-hidden; each page owns its scroll here). */
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { ReadingColumn, type ReadingColumnProps } from './ReadingColumn';

export interface IntelligencePageProps {
  measure?: ReadingColumnProps['measure'];
  /** The Signature canvas atmosphere (emerald light + a whisper of brass). Opt-in:
   *  off by default so the frame is materially neutral; signature-forward experiences
   *  (Investigations) turn it on. */
  atmosphere?: boolean;
  className?: string;
  children?: ReactNode;
}

export function IntelligencePage({ measure = 'read', atmosphere = false, className, children }: IntelligencePageProps) {
  return (
    <div className="relative h-full overflow-y-auto bg-z-bg">
      {atmosphere && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[image:var(--z-ai-atmo)]" />
      )}
      <ReadingColumn measure={measure} className={cn('relative z-[1]', className)}>
        {children}
      </ReadingColumn>
    </div>
  );
}
